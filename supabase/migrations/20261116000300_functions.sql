-- Baseline V2 write path. Every write is one of these security-definer functions: it identifies the caller from the
-- verified JWT (public.me()), checks what that player may do, validates the input (including real tennis scores),
-- rate-limits, and writes in one transaction. API roles have no direct insert/update/delete on any table.
-- Errors: errcode 42501 = not allowed; P0001 with a short code ('invalid_score: …', 'username_taken', …) = bad input.

-- ---- rules --------------------------------------------------------------------------------------------------------
-- Points for a win (the original Baseline rule): best of 1 = 5, best of 3 = 10, best of 5 = 20.
create or replace function public.points_for(p_format smallint) returns smallint
language sql immutable set search_path = '' as $$
  select case p_format when 1 then 5 when 3 then 10 when 5 then 20 end::smallint
$$;

-- "Today" for match dates: the group plays in US Eastern time.
create or replace function public.app_today() returns date
language sql stable set search_path = '' as $$ select (now() at time zone 'America/New_York')::date $$;

-- Validates a full match score and returns the winning side (1 = player one, 2 = player two). Mirrors
-- src/lib/tennis/score.ts (shared test vectors in tests/fixtures/scores.json keep them in sync).
-- Sets: [{"p1":6,"p2":4}, {"p1":7,"p2":6,"tb1":7,"tb2":5}, {"p1":10,"p2":8}] (a match tiebreak is scored in points).
create or replace function public.validate_sets(p_format smallint, p_deciding text, p_sets jsonb) returns smallint
language plpgsql immutable set search_path = '' as $$
declare
  need int := (p_format + 1) / 2;
  n int;
  w1 int := 0; w2 int := 0;
  s jsonb; g1 int; g2 int; t1 int; t2 int; hi int; lo int; thi int; tlo int; is_mtb boolean;
begin
  if p_format not in (1, 3, 5) then raise exception 'invalid_score: format'; end if;
  if p_sets is null or jsonb_typeof(p_sets) <> 'array' then raise exception 'invalid_score: sets'; end if;
  n := jsonb_array_length(p_sets);
  if n < need or n > p_format then raise exception 'invalid_score: number of sets'; end if;
  for i in 0 .. n - 1 loop
    if w1 = need or w2 = need then raise exception 'invalid_score: a set after the match was already won'; end if;
    s := p_sets -> i;
    if jsonb_typeof(s) <> 'object' or jsonb_typeof(s -> 'p1') <> 'number' or jsonb_typeof(s -> 'p2') <> 'number'
       or (s ? 'tb1' and jsonb_typeof(s -> 'tb1') not in ('number', 'null'))
       or (s ? 'tb2' and jsonb_typeof(s -> 'tb2') not in ('number', 'null')) then
      raise exception 'invalid_score: set %', i + 1;
    end if;
    g1 := (s ->> 'p1')::int; g2 := (s ->> 'p2')::int; t1 := (s ->> 'tb1')::int; t2 := (s ->> 'tb2')::int;
    if g1 < 0 or g2 < 0 or g1 > 99 or g2 > 99 or coalesce(t1, 0) < 0 or coalesce(t2, 0) < 0 or coalesce(t1, 0) > 99 or coalesce(t2, 0) > 99 then
      raise exception 'invalid_score: set %', i + 1;
    end if;
    hi := greatest(g1, g2); lo := least(g1, g2);
    is_mtb := p_deciding = 'match_tiebreak' and p_format > 1 and i = p_format - 1;
    if is_mtb then
      if t1 is not null or t2 is not null then raise exception 'invalid_score: a match tiebreak has no separate tiebreak'; end if;
      if hi < 10 or hi - lo < 2 or (hi > 10 and hi - lo <> 2) then raise exception 'invalid_score: match tiebreak (first to 10, win by 2)'; end if;
    elsif (hi = 6 and lo <= 4) or (hi = 7 and lo = 5) then
      if t1 is not null or t2 is not null then raise exception 'invalid_score: set % has no tiebreak', i + 1; end if;
    elsif hi = 7 and lo = 6 then
      if t1 is null or t2 is null then raise exception 'invalid_score: set % needs the tiebreak score', i + 1; end if;
      if g1 > g2 then thi := t1; tlo := t2; else thi := t2; tlo := t1; end if;
      if thi < 7 or thi - tlo < 2 or (thi > 7 and thi - tlo <> 2) then raise exception 'invalid_score: set % tiebreak', i + 1; end if;
    else
      raise exception 'invalid_score: set % (%-%) is not a finished set', i + 1, g1, g2;
    end if;
    if g1 > g2 then w1 := w1 + 1; else w2 := w2 + 1; end if;
  end loop;
  if w1 <> need and w2 <> need then raise exception 'invalid_score: the match is not finished'; end if;
  return case when w1 = need then 1 else 2 end;
end $$;

-- ---- rate limiting (fixed window per player and bucket) ----------------------------------------------------------
create or replace function public.take_rate_limit(p_player uuid, p_bucket text, p_max int, p_window interval) returns void
language plpgsql security definer set search_path = '' as $$
declare v_hits int;
begin
  insert into public.rate_limits as r (player_id, bucket, window_start, hits) values (p_player, p_bucket, now(), 1)
  on conflict (player_id, bucket) do update
    set hits = case when r.window_start < now() - p_window then 1 else r.hits + 1 end,
        window_start = case when r.window_start < now() - p_window then now() else r.window_start end
  returning hits into v_hits;
  if v_hits > p_max then raise exception 'rate_limited' using errcode = 'P0001'; end if;
end $$;
revoke all on function public.take_rate_limit(uuid, text, int, interval) from public;

create or replace function public.require_me() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare v uuid := public.me();
begin
  if v is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  return v;
end $$;
revoke all on function public.require_me() from public;

-- ---- players --------------------------------------------------------------------------------------------------------
-- Called by the server after every sign-in with the profile from Clerk. Links by Clerk user id, so every V1 player
-- keeps their identity and history. New players are created on first sign-in.
create or replace function public.ensure_player(p_username text, p_first_name text, p_last_name text, p_avatar_url text, p_email text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_sub text := (select auth.jwt() ->> 'sub');
  v_id uuid;
  v_avatar text := case when p_avatar_url ~ '^https://(img\.clerk\.com|images\.clerk\.dev)/' then p_avatar_url end;
begin
  if v_sub is null or length(v_sub) not between 1 and 64 then raise exception 'not_signed_in' using errcode = '42501'; end if;
  select id into v_id from public.players where clerk_user_id = v_sub;
  if v_id is not null then
    update public.players set avatar_url = coalesce(v_avatar, avatar_url), updated_at = now()
      where id = v_id and avatar_url is distinct from coalesce(v_avatar, avatar_url);
  else
    if p_username is null or p_username !~ '^[A-Za-z0-9_.-]{3,24}$' then raise exception 'invalid_username'; end if;
    begin
      insert into public.players (clerk_user_id, username, first_name, last_name, avatar_url)
      values (v_sub, p_username, left(coalesce(trim(p_first_name), ''), 40), left(coalesce(trim(p_last_name), ''), 40), v_avatar)
      returning id into v_id;
    exception when unique_violation then
      raise exception 'username_taken';
    end;
  end if;
  if p_email is not null and length(p_email) <= 254 then
    insert into public.player_private (player_id, email) values (v_id, p_email) on conflict do nothing;
  end if;
  return v_id;
end $$;

create or replace function public.update_profile(p_username text, p_first_name text, p_last_name text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public.require_me();
begin
  perform public.take_rate_limit(v_me, 'profile', 10, interval '1 hour');
  if p_username is null or p_username !~ '^[A-Za-z0-9_.-]{3,24}$' then raise exception 'invalid_username'; end if;
  if length(coalesce(p_first_name, '')) > 40 or length(coalesce(p_last_name, '')) > 40 then raise exception 'invalid_name'; end if;
  begin
    update public.players set username = p_username, first_name = trim(coalesce(p_first_name, '')),
      last_name = trim(coalesce(p_last_name, '')), updated_at = now() where id = v_me;
  exception when unique_violation then
    raise exception 'username_taken';
  end;
end $$;

-- ---- matches --------------------------------------------------------------------------------------------------------
-- The signed-in player records a finished match against an opponent; it waits for the opponent to confirm.
-- Idempotent on p_client_key: retrying the same submission returns the same match.
create or replace function public.record_match(
  p_client_key uuid, p_opponent uuid, p_format smallint, p_deciding text, p_played_on date, p_sets jsonb,
  p_challenge uuid default null, p_note text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := public.require_me();
  v_id uuid;
  v_side smallint;
  v_deciding text := case when p_format = 1 then 'set' else coalesce(p_deciding, 'set') end;
  v_ch public.challenges;
begin
  if p_client_key is null then raise exception 'invalid_input'; end if;
  select id into v_id from public.matches where client_key = p_client_key and player_one = v_me;
  if v_id is not null then return v_id; end if;
  perform public.take_rate_limit(v_me, 'record_match', 20, interval '1 hour');
  if p_opponent is null or p_opponent = v_me or not exists (select 1 from public.players where id = p_opponent) then
    raise exception 'invalid_opponent';
  end if;
  if v_deciding not in ('set', 'match_tiebreak') then raise exception 'invalid_input'; end if;
  if p_played_on is null or p_played_on > public.app_today() or p_played_on < public.app_today() - 365 then
    raise exception 'invalid_date';
  end if;
  if p_note is not null and length(p_note) > 140 then raise exception 'invalid_note'; end if;
  v_side := public.validate_sets(p_format, v_deciding, p_sets);
  if p_challenge is not null then
    select * into v_ch from public.challenges where id = p_challenge for update;
    if not found or v_ch.status <> 'accepted' or not (v_me in (v_ch.challenger, v_ch.opponent) and p_opponent in (v_ch.challenger, v_ch.opponent))
       or v_ch.format <> p_format then
      raise exception 'invalid_challenge';
    end if;
  end if;
  begin
    insert into public.matches (format, deciding_set, player_one, player_two, winner_id, status, played_on, points_awarded,
                                challenge_id, client_key, note)
    values (p_format, v_deciding, v_me, p_opponent, case v_side when 1 then v_me else p_opponent end, 'pending', p_played_on,
            public.points_for(p_format), p_challenge, p_client_key, nullif(trim(p_note), ''))
    returning id into v_id;
  exception when unique_violation then
    raise exception 'duplicate_match';
  end;
  insert into public.match_sets (match_id, set_number, p1_games, p2_games, p1_tiebreak, p2_tiebreak, is_match_tiebreak)
  select v_id, t.ord, (t.e ->> 'p1')::smallint, (t.e ->> 'p2')::smallint, (t.e ->> 'tb1')::smallint, (t.e ->> 'tb2')::smallint,
         v_deciding = 'match_tiebreak' and p_format > 1 and t.ord = p_format
  from jsonb_array_elements(p_sets) with ordinality as t(e, ord);
  return v_id;
end $$;

-- The opponent confirms (points count from now on) or rejects. Answering twice the same way is a no-op.
create or replace function public.respond_match(p_match uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := public.require_me();
  m public.matches;
  v_to public.match_status := 'rejected';
begin
  if p_accept then v_to := 'confirmed'; end if;
  select * into m from public.matches where id = p_match for update;
  if not found or m.player_two <> v_me then raise exception 'not_allowed' using errcode = '42501'; end if;
  if m.status = v_to then return; end if;
  if m.status <> 'pending' then raise exception 'already_answered'; end if;
  perform public.take_rate_limit(v_me, 'respond', 120, interval '1 hour');
  if p_accept then
    update public.matches set status = v_to, responded_at = now(), confirmed_at = now() where id = p_match;
  else
    update public.matches set status = v_to, responded_at = now() where id = p_match;
  end if;
  if p_accept and m.challenge_id is not null then
    update public.challenges set status = 'completed', closed_at = now() where id = m.challenge_id and status = 'accepted';
  end if;
end $$;

-- The player who recorded a match can withdraw it while it's still waiting.
create or replace function public.cancel_match(p_match uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public.require_me(); m public.matches;
begin
  select * into m from public.matches where id = p_match for update;
  if not found or m.player_one <> v_me then raise exception 'not_allowed' using errcode = '42501'; end if;
  if m.status = 'canceled' then return; end if;
  if m.status <> 'pending' then raise exception 'already_answered'; end if;
  update public.matches set status = 'canceled', responded_at = now() where id = p_match;
end $$;

-- An admin can void a confirmed result (it stays visible, marked void, and stops counting). Nothing is deleted.
create or replace function public.void_match(p_match uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public.require_me(); m public.matches;
begin
  if not public.is_admin() then raise exception 'not_allowed' using errcode = '42501'; end if;
  if p_reason is null or length(trim(p_reason)) not between 3 and 200 then raise exception 'invalid_reason'; end if;
  select * into m from public.matches where id = p_match for update;
  if not found then raise exception 'not_found'; end if;
  if m.status = 'voided' then return; end if;
  if m.status <> 'confirmed' then raise exception 'not_confirmed'; end if;
  update public.matches set status = 'voided', voided_at = now(), voided_by = v_me, void_reason = trim(p_reason) where id = p_match;
end $$;

-- ---- challenges -----------------------------------------------------------------------------------------------------
create or replace function public.expire_challenges(p_a uuid, p_b uuid) returns void
language sql security definer set search_path = '' as $$
  update public.challenges set status = 'expired', closed_at = now()
  where status = 'pending' and expires_at < now()
    and least(challenger, opponent) = least(p_a, p_b) and greatest(challenger, opponent) = greatest(p_a, p_b)
$$;
revoke all on function public.expire_challenges(uuid, uuid) from public;

create or replace function public.create_challenge(p_opponent uuid, p_format smallint, p_message text default null, p_proposed_for date default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public.require_me(); v_id uuid;
begin
  perform public.take_rate_limit(v_me, 'challenge', 15, interval '1 day');
  if p_opponent is null or p_opponent = v_me or not exists (select 1 from public.players where id = p_opponent) then
    raise exception 'invalid_opponent';
  end if;
  if p_format not in (1, 3, 5) then raise exception 'invalid_input'; end if;
  if p_message is not null and length(p_message) > 140 then raise exception 'invalid_note'; end if;
  if p_proposed_for is not null and (p_proposed_for < public.app_today() or p_proposed_for > public.app_today() + 90) then
    raise exception 'invalid_date';
  end if;
  perform public.expire_challenges(v_me, p_opponent);
  begin
    insert into public.challenges (challenger, opponent, format, message, proposed_for)
    values (v_me, p_opponent, p_format, nullif(trim(p_message), ''), p_proposed_for) returning id into v_id;
  exception when unique_violation then
    raise exception 'challenge_already_open';
  end;
  return v_id;
end $$;

create or replace function public.respond_challenge(p_challenge uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := public.require_me();
  c public.challenges;
  v_to public.challenge_status := 'declined';
begin
  if p_accept then v_to := 'accepted'; end if;
  select * into c from public.challenges where id = p_challenge for update;
  if not found or c.opponent <> v_me then raise exception 'not_allowed' using errcode = '42501'; end if;
  if c.status = v_to then return; end if;
  if c.status <> 'pending' then raise exception 'already_answered'; end if;
  if c.expires_at < now() then
    update public.challenges set status = 'expired', closed_at = now() where id = p_challenge;
    raise exception 'challenge_expired';
  end if;
  if p_accept then
    update public.challenges set status = v_to, responded_at = now() where id = p_challenge;
  else
    update public.challenges set status = v_to, responded_at = now(), closed_at = now() where id = p_challenge;
  end if;
end $$;

-- The challenger can withdraw a pending challenge; either player can call off an accepted one.
create or replace function public.cancel_challenge(p_challenge uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public.require_me(); c public.challenges;
begin
  select * into c from public.challenges where id = p_challenge for update;
  if not found or v_me not in (c.challenger, c.opponent) then raise exception 'not_allowed' using errcode = '42501'; end if;
  if c.status = 'canceled' then return; end if;
  if not ((c.status = 'pending' and c.challenger = v_me) or c.status = 'accepted') then raise exception 'not_allowed' using errcode = '42501'; end if;
  if exists (select 1 from public.matches m where m.challenge_id = p_challenge and m.status = 'pending') then
    raise exception 'challenge_has_pending_result';
  end if;
  update public.challenges set status = 'canceled', closed_at = now() where id = p_challenge;
end $$;

-- ---- grants: the API may call only these ------------------------------------------------------------------------------
revoke all on function public.points_for(smallint), public.app_today(), public.validate_sets(smallint, text, jsonb),
  public.ensure_player(text, text, text, text, text), public.update_profile(text, text, text),
  public.record_match(uuid, uuid, smallint, text, date, jsonb, uuid, text), public.respond_match(uuid, boolean),
  public.cancel_match(uuid), public.void_match(uuid, text), public.create_challenge(uuid, smallint, text, date),
  public.respond_challenge(uuid, boolean), public.cancel_challenge(uuid) from public, anon;
grant execute on function public.points_for(smallint), public.app_today(), public.validate_sets(smallint, text, jsonb),
  public.ensure_player(text, text, text, text, text), public.update_profile(text, text, text),
  public.record_match(uuid, uuid, smallint, text, date, jsonb, uuid, text), public.respond_match(uuid, boolean),
  public.cancel_match(uuid), public.void_match(uuid, text), public.create_challenge(uuid, smallint, text, date),
  public.respond_challenge(uuid, boolean), public.cancel_challenge(uuid) to authenticated;
