-- Pickleball, Baseline's second sport (docs/PICKLEBALL.md). ADDITIVE ONLY: no tennis table, row or function changes.
-- Rules: 2026 USA Pickleball Official Rulebook 4.A/4.B (scoring), 14.A (provisional rally scoring), 15.C (formats,
-- win by 2). Singles (1 v 1) and doubles (2 v 2). Separate singles/doubles boards; points fixed at confirmation;
-- only the first 3 confirmed matches per day between the same sides earn points.

create table public.pickleball_challenges (
  id uuid primary key default gen_random_uuid(),
  discipline text not null check (discipline in ('singles', 'doubles')),
  format text not null check (format in ('g11', 'g15', 'g21', 'bo3', 'bo5')),
  scoring text not null default 'side_out' check (scoring in ('side_out', 'rally')),
  challenger uuid not null references public.players (id),
  sides_key text not null,
  message text check (message is null or length(message) <= 140),
  proposed_for date,
  status public.challenge_status not null default 'pending',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  responded_at timestamptz,
  responded_by uuid references public.players (id),
  closed_at timestamptz
);
-- one open challenge between the same sides at a time
create unique index pickleball_challenges_one_open on public.pickleball_challenges (sides_key) where status in ('pending', 'accepted');

create table public.pickleball_challenge_players (
  challenge_id uuid not null references public.pickleball_challenges (id) on delete cascade,
  player_id uuid not null references public.players (id),
  side smallint not null check (side in (1, 2)),
  primary key (challenge_id, player_id)
);
create index pickleball_challenge_players_player on public.pickleball_challenge_players (player_id);

create table public.pickleball_matches (
  id uuid primary key default gen_random_uuid(),
  discipline text not null check (discipline in ('singles', 'doubles')),
  format text not null check (format in ('g11', 'g15', 'g21', 'bo3', 'bo5')),
  scoring text not null default 'side_out' check (scoring in ('side_out', 'rally')),
  recorded_by uuid not null references public.players (id),
  recorder_side smallint not null check (recorder_side in (1, 2)),
  winner_side smallint not null check (winner_side in (1, 2)),
  -- the two sides as one comparable key ("a|b" singles, "a,b|c,d" doubles, sorted): head-to-head and the daily cap
  sides_key text not null,
  status public.match_status not null default 'pending',
  played_on date not null,
  -- points each winner earns, fixed when the result is confirmed (null until then)
  points_awarded smallint check (points_awarded between 0 and 100),
  challenge_id uuid references public.pickleball_challenges (id),
  client_key uuid unique,
  note text check (note is null or length(note) <= 140),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  responded_by uuid references public.players (id),
  confirmed_at timestamptz,
  voided_at timestamptz,
  void_reason text check (void_reason is null or length(void_reason) <= 200),
  voided_by uuid references public.players (id),
  check ((status in ('confirmed', 'voided')) = (confirmed_at is not null)),
  check ((status in ('confirmed', 'voided')) = (points_awarded is not null)),
  check ((status = 'voided') = (voided_at is not null))
);
create unique index pickleball_matches_one_live_per_challenge on public.pickleball_matches (challenge_id)
  where challenge_id is not null and status in ('pending', 'confirmed', 'voided');
create index pickleball_matches_status_played on public.pickleball_matches (status, played_on desc);
create index pickleball_matches_sides on public.pickleball_matches (sides_key, played_on);

create table public.pickleball_match_players (
  match_id uuid not null references public.pickleball_matches (id) on delete cascade,
  player_id uuid not null references public.players (id),
  side smallint not null check (side in (1, 2)),
  primary key (match_id, player_id)
);
create index pickleball_match_players_player on public.pickleball_match_players (player_id);

create table public.pickleball_games (
  match_id uuid not null references public.pickleball_matches (id) on delete cascade,
  game_number smallint not null check (game_number between 1 and 5),
  side1_points smallint not null check (side1_points between 0 and 99),
  side2_points smallint not null check (side2_points between 0 and 99),
  primary key (match_id, game_number)
);

-- ---- rules (mirrors src/lib/pickleball/rules.ts; tests/fixtures/pickleball-scores.json runs against both) ---------
create or replace function public.pickleball_format_info(p_format text, out games_to_win int, out max_games int, out game_to int, out points int)
language sql immutable set search_path = '' as $$
  select v.w, v.m, v.t, v.p from (values ('g11', 1, 1, 11, 5), ('g15', 1, 1, 15, 10), ('g21', 1, 1, 21, 10), ('bo3', 2, 3, 11, 10), ('bo5', 3, 5, 11, 20))
    as v(f, w, m, t, p) where v.f = p_format
$$;

-- Games: [[11, 8], [9, 11], [11, 6]] (side 1, side 2). Returns the winning side or raises invalid_score.
create or replace function public.pickleball_validate(p_format text, p_games jsonb) returns smallint
language plpgsql immutable set search_path = '' as $$
declare
  f record; g jsonb; a int; b int; hi int; lo int; n int := 0; w1 int := 0; w2 int := 0;
begin
  select * into f from public.pickleball_format_info(p_format);
  if f.games_to_win is null then raise exception 'invalid_score'; end if;
  if p_games is null or jsonb_typeof(p_games) <> 'array' or jsonb_array_length(p_games) = 0 or jsonb_array_length(p_games) > f.max_games then
    raise exception 'invalid_score';
  end if;
  for g in select e from jsonb_array_elements(p_games) as t(e) loop
    n := n + 1;
    if w1 = f.games_to_win or w2 = f.games_to_win then raise exception 'invalid_score'; end if; -- game after the match was won
    if jsonb_typeof(g) <> 'array' or jsonb_array_length(g) <> 2 or jsonb_typeof(g -> 0) <> 'number' or jsonb_typeof(g -> 1) <> 'number' then
      raise exception 'invalid_score';
    end if;
    if (g ->> 0) !~ '^\d{1,2}$' or (g ->> 1) !~ '^\d{1,2}$' then raise exception 'invalid_score'; end if;
    a := (g ->> 0)::int; b := (g ->> 1)::int;
    hi := greatest(a, b); lo := least(a, b);
    if hi < f.game_to or hi - lo < 2 or (hi > f.game_to and hi - lo <> 2) then raise exception 'invalid_score'; end if;
    if a > b then w1 := w1 + 1; else w2 := w2 + 1; end if;
  end loop;
  if w1 < f.games_to_win and w2 < f.games_to_win then raise exception 'invalid_score'; end if;
  return case when w1 > w2 then 1 else 2 end;
end $$;

create or replace function public.pickleball_sides_key(p_side1 uuid[], p_side2 uuid[]) returns text
language sql immutable set search_path = '' as $$
  select least(x, y) || '|' || greatest(x, y) from (
    select (select string_agg(u::text, ',' order by u::text) from unnest(p_side1) u) as x,
           (select string_agg(u::text, ',' order by u::text) from unnest(p_side2) u) as y) s
$$;

-- Sides are valid: 1 v 1 or 2 v 2, distinct real players, I'm on side 1. Returns nothing or raises.
create or replace function public.pickleball_check_sides(p_me uuid, p_discipline text, p_side1 uuid[], p_side2 uuid[]) returns void
language plpgsql stable set search_path = '' as $$
declare v_n int := case p_discipline when 'singles' then 1 when 'doubles' then 2 end;
begin
  if v_n is null or coalesce(cardinality(p_side1), 0) <> v_n or coalesce(cardinality(p_side2), 0) <> v_n
     or array_position(p_side1, null) is not null or array_position(p_side2, null) is not null then raise exception 'invalid_players'; end if;
  if (select count(distinct u) from unnest(p_side1 || p_side2) u) <> 2 * v_n then raise exception 'invalid_players'; end if;
  if not (p_me = any (p_side1)) then raise exception 'invalid_players'; end if;
  if (select count(*) from public.players where id = any (p_side1 || p_side2)) <> 2 * v_n then raise exception 'invalid_players'; end if;
end $$;

-- ---- record / confirm / cancel / void ---------------------------------------------------------------------------
-- I record a finished match (I'm on side 1). It waits for any player on side 2 to confirm. Idempotent on p_client_key.
create or replace function public.record_pickleball_match(
  p_client_key uuid, p_discipline text, p_format text, p_scoring text, p_side1 uuid[], p_side2 uuid[],
  p_played_on date, p_games jsonb, p_challenge uuid default null, p_note text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := public.require_me();
  v_id uuid; v_winner smallint; v_key text; c public.pickleball_challenges;
begin
  if p_client_key is null then raise exception 'invalid_input'; end if;
  select id into v_id from public.pickleball_matches where client_key = p_client_key and recorded_by = v_me;
  if v_id is not null then return v_id; end if;
  perform public.take_rate_limit(v_me, 'record_match', 20, interval '1 hour');
  perform public.pickleball_check_sides(v_me, p_discipline, p_side1, p_side2);
  if coalesce(p_scoring, '') not in ('side_out', 'rally') then raise exception 'invalid_input'; end if;
  if p_played_on is null or p_played_on > public.app_today() or p_played_on < public.app_today() - 365 then raise exception 'invalid_date'; end if;
  if p_note is not null and length(p_note) > 140 then raise exception 'invalid_note'; end if;
  v_winner := public.pickleball_validate(p_format, p_games);
  v_key := public.pickleball_sides_key(p_side1, p_side2);
  if p_challenge is not null then
    select * into c from public.pickleball_challenges where id = p_challenge for update;
    if not found or c.status <> 'accepted' or c.sides_key <> v_key or c.discipline <> p_discipline or c.format <> p_format or c.scoring <> p_scoring then
      raise exception 'invalid_challenge';
    end if;
  end if;
  begin
    insert into public.pickleball_matches (discipline, format, scoring, recorded_by, recorder_side, winner_side, sides_key, status, played_on, challenge_id, client_key, note)
    values (p_discipline, p_format, p_scoring, v_me, 1, v_winner, v_key, 'pending', p_played_on, p_challenge, p_client_key, nullif(trim(p_note), ''))
    returning id into v_id;
  exception when unique_violation then
    select id into v_id from public.pickleball_matches where client_key = p_client_key and recorded_by = v_me;
    if v_id is not null then return v_id; end if;
    raise exception 'duplicate_match';
  end;
  insert into public.pickleball_match_players (match_id, player_id, side)
    select v_id, u, 1 from unnest(p_side1) u union all select v_id, u, 2 from unnest(p_side2) u;
  insert into public.pickleball_games (match_id, game_number, side1_points, side2_points)
    select v_id, t.ord, (t.e ->> 0)::smallint, (t.e ->> 1)::smallint from jsonb_array_elements(p_games) with ordinality as t(e, ord);
  return v_id;
end $$;

-- Any player on the other side confirms (points are fixed now: 0 after the day's first 3 point-earning matches between
-- these sides) or rejects. Answering twice the same way is a no-op.
create or replace function public.respond_pickleball_match(p_match uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := public.require_me();
  m public.pickleball_matches; v_side smallint; v_earlier int; v_points int; v_to public.match_status := case when p_accept then 'confirmed' else 'rejected' end;
begin
  select * into m from public.pickleball_matches where id = p_match for update;
  if not found then raise exception 'not_allowed' using errcode = '42501'; end if;
  select side into v_side from public.pickleball_match_players where match_id = p_match and player_id = v_me;
  if v_side is null or v_side = m.recorder_side then raise exception 'not_allowed' using errcode = '42501'; end if;
  if m.status = v_to then return; end if;
  if m.status <> 'pending' then raise exception 'already_answered'; end if;
  perform public.take_rate_limit(v_me, 'respond', 120, interval '1 hour');
  if p_accept and m.played_on < public.app_today() - 365 then raise exception 'too_old_to_confirm'; end if;
  if not p_accept then
    update public.pickleball_matches set status = v_to, responded_at = now(), responded_by = v_me where id = p_match;
    return;
  end if;
  -- the cap counts results confirmed today (New York) between these sides, whatever date they were played, so
  -- backdating can't get around it; serialized so two confirmations at once can't both take the third slot
  perform pg_advisory_xact_lock(hashtext('pickleball_points:' || m.sides_key || ':' || public.app_today()));
  select count(*) into v_earlier from public.pickleball_matches
    where sides_key = m.sides_key and discipline = m.discipline and status = 'confirmed' and points_awarded > 0 and id <> m.id
      and (confirmed_at at time zone 'America/New_York')::date = public.app_today();
  select case when v_earlier >= 3 then 0 else points end into v_points from public.pickleball_format_info(m.format);
  update public.pickleball_matches set status = v_to, responded_at = now(), responded_by = v_me, confirmed_at = now(), points_awarded = v_points where id = p_match;
  if m.challenge_id is not null then
    update public.pickleball_challenges set status = 'completed', closed_at = now() where id = m.challenge_id and status = 'accepted';
  end if;
end $$;

create or replace function public.cancel_pickleball_match(p_match uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public.require_me(); m public.pickleball_matches;
begin
  select * into m from public.pickleball_matches where id = p_match for update;
  if not found or m.recorded_by <> v_me then raise exception 'not_allowed' using errcode = '42501'; end if;
  if m.status = 'canceled' then return; end if;
  if m.status <> 'pending' then raise exception 'already_answered'; end if;
  update public.pickleball_matches set status = 'canceled', responded_at = now() where id = p_match;
end $$;

-- An admin voids a confirmed result: it stays visible, marked void, and stops counting. Nothing is deleted.
create or replace function public.void_pickleball_match(p_match uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public.require_me(); m public.pickleball_matches;
begin
  if not public.is_admin() then raise exception 'not_allowed' using errcode = '42501'; end if;
  if p_reason is null or length(trim(p_reason)) not between 3 and 200 then raise exception 'invalid_reason'; end if;
  select * into m from public.pickleball_matches where id = p_match for update;
  if not found then raise exception 'not_found'; end if;
  if m.status = 'voided' then return; end if;
  if m.status <> 'confirmed' then raise exception 'not_confirmed'; end if;
  update public.pickleball_matches set status = 'voided', voided_at = now(), voided_by = v_me, void_reason = trim(p_reason) where id = p_match;
end $$;

-- ---- challenges ----------------------------------------------------------------------------------------------------
create or replace function public.create_pickleball_challenge(p_discipline text, p_format text, p_scoring text, p_side1 uuid[], p_side2 uuid[],
  p_message text default null, p_proposed_for date default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public.require_me(); v_id uuid; v_key text;
begin
  perform public.take_rate_limit(v_me, 'challenge', 15, interval '1 day');
  perform public.pickleball_check_sides(v_me, p_discipline, p_side1, p_side2);
  if (select games_to_win from public.pickleball_format_info(p_format)) is null or coalesce(p_scoring, '') not in ('side_out', 'rally') then raise exception 'invalid_input'; end if;
  if p_message is not null and length(p_message) > 140 then raise exception 'invalid_note'; end if;
  if p_proposed_for is not null and (p_proposed_for < public.app_today() or p_proposed_for > public.app_today() + 90) then raise exception 'invalid_date'; end if;
  v_key := public.pickleball_sides_key(p_side1, p_side2);
  update public.pickleball_challenges set status = 'expired', closed_at = now()
    where sides_key = v_key and ((status = 'pending' and expires_at < now()) or (status = 'accepted' and responded_at < now() - interval '30 days'));
  begin
    insert into public.pickleball_challenges (discipline, format, scoring, challenger, sides_key, message, proposed_for)
    values (p_discipline, p_format, p_scoring, v_me, v_key, nullif(trim(p_message), ''), p_proposed_for) returning id into v_id;
  exception when unique_violation then raise exception 'challenge_open';
  end;
  insert into public.pickleball_challenge_players (challenge_id, player_id, side)
    select v_id, u, 1 from unnest(p_side1) u union all select v_id, u, 2 from unnest(p_side2) u;
  return v_id;
end $$;

-- Any player on the challenged side accepts or declines; the challenger cancels. Expired = past expires_at, still pending.
create or replace function public.respond_pickleball_challenge(p_challenge uuid, p_action text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public.require_me(); c public.pickleball_challenges; v_side smallint;
begin
  select * into c from public.pickleball_challenges where id = p_challenge for update;
  if not found then raise exception 'not_allowed' using errcode = '42501'; end if;
  select side into v_side from public.pickleball_challenge_players where challenge_id = p_challenge and player_id = v_me;
  if v_side is null then raise exception 'not_allowed' using errcode = '42501'; end if;
  perform public.take_rate_limit(v_me, 'respond', 120, interval '1 hour');
  if (c.status = 'pending' and c.expires_at < now()) or (c.status = 'accepted' and c.responded_at < now() - interval '30 days') then
    update public.pickleball_challenges set status = 'expired', closed_at = now() where id = p_challenge;
    return 'expired';
  end if;
  if p_action = 'cancel' then
    -- a pending challenge: only the challenger withdraws it; an accepted one: anyone in it can call it off
    if (c.status = 'pending' and c.challenger <> v_me) then raise exception 'not_allowed' using errcode = '42501'; end if;
    if c.status not in ('pending', 'accepted') then raise exception 'already_answered'; end if;
    update public.pickleball_challenges set status = 'canceled', closed_at = now() where id = p_challenge;
  elsif p_action in ('accept', 'decline') then
    if v_side <> 2 then raise exception 'not_allowed' using errcode = '42501'; end if;
    if c.status <> 'pending' then
      if (p_action = 'accept' and c.status = 'accepted') or (p_action = 'decline' and c.status = 'declined') then return c.status::text; end if;
      raise exception 'already_answered';
    end if;
    update public.pickleball_challenges set status = (case p_action when 'accept' then 'accepted' else 'declined' end)::public.challenge_status,
      responded_at = now(), responded_by = v_me, closed_at = case when p_action = 'decline' then now() end where id = p_challenge;
  else
    raise exception 'invalid_input';
  end if;
  return (select status::text from public.pickleball_challenges where id = p_challenge);
end $$;

-- ---- access -------------------------------------------------------------------------------------------------------
alter table public.pickleball_matches enable row level security;
alter table public.pickleball_matches force row level security;
alter table public.pickleball_match_players enable row level security;
alter table public.pickleball_match_players force row level security;
alter table public.pickleball_games enable row level security;
alter table public.pickleball_games force row level security;
alter table public.pickleball_challenges enable row level security;
alter table public.pickleball_challenges force row level security;
alter table public.pickleball_challenge_players enable row level security;
alter table public.pickleball_challenge_players force row level security;
revoke all on public.pickleball_matches, public.pickleball_match_players, public.pickleball_games, public.pickleball_challenges,
  public.pickleball_challenge_players from public, anon, authenticated;

-- "am I in this match/challenge?" without going through RLS again (policies on two tables that read each other would
-- recurse); definer, my id only, no other data leaves.
create or replace function public.pickleball_in_match(p_match uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.pickleball_match_players where match_id = p_match and player_id = public.me())
$$;
create or replace function public.pickleball_in_challenge(p_challenge uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.pickleball_challenge_players where challenge_id = p_challenge and player_id = public.me())
$$;
revoke all on function public.pickleball_in_match(uuid), public.pickleball_in_challenge(uuid) from public, anon;
grant execute on function public.pickleball_in_match(uuid), public.pickleball_in_challenge(uuid) to authenticated;

-- players see confirmed/voided results and the ones they're in; writes only through the functions above
grant select (id, discipline, format, scoring, recorded_by, recorder_side, winner_side, sides_key, status, played_on, points_awarded,
  challenge_id, note, created_at, responded_at, confirmed_at, voided_at, void_reason) on public.pickleball_matches to authenticated;
grant select on public.pickleball_match_players, public.pickleball_games to authenticated;
create policy pickleball_matches_read on public.pickleball_matches for select to authenticated using (
  public.me() is not null and (status in ('confirmed', 'voided')
    or public.pickleball_in_match(id)));
create policy pickleball_match_players_read on public.pickleball_match_players for select to authenticated using (
  exists (select 1 from public.pickleball_matches m where m.id = match_id));
create policy pickleball_games_read on public.pickleball_games for select to authenticated using (
  exists (select 1 from public.pickleball_matches m where m.id = match_id));
grant select on public.pickleball_challenges, public.pickleball_challenge_players to authenticated;
create policy pickleball_challenges_read on public.pickleball_challenges for select to authenticated using (public.pickleball_in_challenge(id));
create policy pickleball_challenge_players_read on public.pickleball_challenge_players for select to authenticated using (
  exists (select 1 from public.pickleball_challenges c where c.id = challenge_id));

revoke all on function public.pickleball_format_info(text), public.pickleball_validate(text, jsonb), public.pickleball_sides_key(uuid[], uuid[]),
  public.pickleball_check_sides(uuid, text, uuid[], uuid[]),
  public.record_pickleball_match(uuid, text, text, text, uuid[], uuid[], date, jsonb, uuid, text), public.respond_pickleball_match(uuid, boolean),
  public.cancel_pickleball_match(uuid), public.void_pickleball_match(uuid, text),
  public.create_pickleball_challenge(text, text, text, uuid[], uuid[], text, date), public.respond_pickleball_challenge(uuid, text)
  from public, anon;
grant execute on function public.pickleball_validate(text, jsonb),
  public.record_pickleball_match(uuid, text, text, text, uuid[], uuid[], date, jsonb, uuid, text), public.respond_pickleball_match(uuid, boolean),
  public.cancel_pickleball_match(uuid), public.void_pickleball_match(uuid, text),
  public.create_pickleball_challenge(text, text, text, uuid[], uuid[], text, date), public.respond_pickleball_challenge(uuid, text)
  to authenticated;
