-- Security hardening after the independent review (docs/SECURITY.md lists each finding and its fix).

-- 1) Internal helpers were executable by anon/authenticated through Supabase's default grants (revoking from PUBLIC is
--    not enough). Lock them down, and stop future functions from getting those grants automatically.
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated;
revoke execute on function public.take_rate_limit(uuid, text, int, interval), public.expire_challenges(uuid, uuid),
  public.require_me() from public, anon, authenticated;
revoke execute on function public.me(), public.is_admin() from anon;

-- 2) Only tokens from trusted issuers identify a player (Clerk in production; the local test issuer in development).
--    A token minted by Supabase Auth itself (e.g. an email sign-up on the project) is never a player.
--    Fails closed: with no trusted issuer configured, nobody is signed in.
create table public.app_settings (
  id boolean primary key default true check (id),
  trusted_issuers text[] not null default '{}'
);
insert into public.app_settings default values;
alter table public.app_settings enable row level security;
alter table public.app_settings force row level security;
revoke all on public.app_settings from anon, authenticated;

create or replace function public.jwt_sub() returns text
language sql stable security definer set search_path = '' as $$
  select case when (select auth.jwt() ->> 'iss') = any (s.trusted_issuers) then (select auth.jwt() ->> 'sub') end
  from public.app_settings s
$$;
revoke all on function public.jwt_sub() from public, anon, authenticated;

create or replace function public.me() returns uuid
language sql stable security definer set search_path = '' as $$
  select p.id from public.players p where p.clerk_user_id = public.jwt_sub()
$$;

-- 3) Invite-only membership: a new player needs a one-time invite code from an existing player.
--    Codes are stored hashed; they expire after 14 days. V1 players are already linked and never need one.
create table public.invites (
  code_hash text primary key,
  created_by uuid not null references public.players (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  used_by uuid unique references public.players (id) on delete set null,
  used_at timestamptz
);
create index invites_created_by on public.invites (created_by);
alter table public.invites enable row level security;
alter table public.invites force row level security;
revoke all on public.invites from anon, authenticated;
-- a player sees the invites they created (when, and whether used), never the codes
grant select (created_at, expires_at, used_at) on public.invites to authenticated;
create policy invites_own on public.invites for select to authenticated using (created_by = public.me());

create or replace function public.create_invite() returns text
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public.require_me(); v_code text;
begin
  perform public.take_rate_limit(v_me, 'invite', 10, interval '1 day');
  -- 12 characters from an unambiguous alphabet (no 0/O, 1/I/L): ~60 bits
  select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + (get_byte(b, i) % 31), 1), '')
    into v_code from extensions.gen_random_bytes(12) b, generate_series(0, 11) i;
  insert into public.invites (code_hash, created_by) values (encode(extensions.digest(v_code, 'sha256'), 'hex'), v_me);
  return v_code;
end $$;

drop function public.ensure_player(text, text, text, text, text);
create or replace function public.ensure_player(p_username text, p_first_name text, p_last_name text, p_avatar_url text, p_email text, p_invite text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_sub text := public.jwt_sub();
  v_id uuid;
  v_avatar text := case when p_avatar_url ~ '^https://(img\.clerk\.com|images\.clerk\.dev)/' then p_avatar_url end;
  v_hash text;
begin
  if v_sub is null or length(v_sub) not between 1 and 64 then raise exception 'not_signed_in' using errcode = '42501'; end if;
  select id into v_id from public.players where clerk_user_id = v_sub;
  if v_id is not null then
    update public.players set avatar_url = coalesce(v_avatar, avatar_url), updated_at = now()
      where id = v_id and avatar_url is distinct from coalesce(v_avatar, avatar_url);
    return v_id;
  end if;
  if p_username is null or p_username !~ '^[A-Za-z0-9_.-]{3,24}$' then raise exception 'invalid_username'; end if;
  if p_invite is null or length(p_invite) > 40 then raise exception 'invite_required'; end if;
  v_hash := encode(extensions.digest(upper(regexp_replace(p_invite, '[^A-Za-z0-9]', '', 'g')), 'sha256'), 'hex');
  perform 1 from public.invites where code_hash = v_hash and used_by is null and expires_at > now() for update;
  if not found then raise exception 'invalid_invite'; end if;
  begin
    insert into public.players (clerk_user_id, username, first_name, last_name, avatar_url)
    values (v_sub, p_username, left(coalesce(trim(p_first_name), ''), 40), left(coalesce(trim(p_last_name), ''), 40), v_avatar)
    returning id into v_id;
  exception when unique_violation then
    raise exception 'username_taken';
  end;
  update public.invites set used_by = v_id, used_at = now() where code_hash = v_hash;
  if nullif(trim(p_email), '') is not null and length(p_email) <= 254 then
    insert into public.player_private (player_id, email) values (v_id, trim(p_email)) on conflict do nothing;
  end if;
  return v_id;
end $$;

-- 4) The same match recorded twice (same pair, same day, same score) needs an explicit "record anyway".
drop function public.record_match(uuid, uuid, smallint, text, date, jsonb, uuid, text);
create or replace function public.record_match(
  p_client_key uuid, p_opponent uuid, p_format smallint, p_deciding text, p_played_on date, p_sets jsonb,
  p_challenge uuid default null, p_note text default null, p_allow_duplicate boolean default false
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
  if not coalesce(p_allow_duplicate, false) and exists (
    select 1 from public.matches m
    where m.status in ('pending', 'confirmed') and m.played_on = p_played_on and m.format = p_format
      and least(m.player_one, m.player_two) = least(v_me, p_opponent) and greatest(m.player_one, m.player_two) = greatest(v_me, p_opponent)
      and (select jsonb_agg(case when m.player_one = v_me then jsonb_build_array(s.p1_games, s.p2_games) else jsonb_build_array(s.p2_games, s.p1_games) end order by s.set_number)
           from public.match_sets s where s.match_id = m.id)
        = (select jsonb_agg(jsonb_build_array((e ->> 'p1')::int, (e ->> 'p2')::int) order by ord) from jsonb_array_elements(p_sets) with ordinality as t(e, ord))
  ) then
    -- (a retry of this very submission racing its original gets the original back, not a warning)
    select id into v_id from public.matches where client_key = p_client_key and player_one = v_me;
    if v_id is not null then return v_id; end if;
    raise exception 'possible_duplicate';
  end if;
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
    select id into v_id from public.matches where client_key = p_client_key and player_one = v_me;
    if v_id is not null then return v_id; end if;
    raise exception 'duplicate_match';
  end;
  insert into public.match_sets (match_id, set_number, p1_games, p2_games, p1_tiebreak, p2_tiebreak, is_match_tiebreak)
  select v_id, t.ord, (t.e ->> 'p1')::smallint, (t.e ->> 'p2')::smallint, (t.e ->> 'tb1')::smallint, (t.e ->> 'tb2')::smallint,
         v_deciding = 'match_tiebreak' and p_format > 1 and t.ord = p_format
  from jsonb_array_elements(p_sets) with ordinality as t(e, ord);
  return v_id;
end $$;

-- 5) A result can be confirmed only while it's at most a year old (old V1 results stay pending and withdrawable).
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
  if p_accept and m.played_on < public.app_today() - 365 then raise exception 'too_old_to_confirm'; end if;
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

-- 8) An expired challenge is recorded as expired (no exception afterwards to roll that back); returns the outcome.
drop function public.respond_challenge(uuid, boolean);
create or replace function public.respond_challenge(p_challenge uuid, p_accept boolean) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := public.require_me();
  c public.challenges;
  v_to public.challenge_status := 'declined';
begin
  if p_accept then v_to := 'accepted'; end if;
  select * into c from public.challenges where id = p_challenge for update;
  if not found or c.opponent <> v_me then raise exception 'not_allowed' using errcode = '42501'; end if;
  if c.status = v_to then return v_to::text; end if;
  if c.status = 'expired' then return 'expired'; end if;
  if c.status <> 'pending' then raise exception 'already_answered'; end if;
  if c.expires_at < now() then
    update public.challenges set status = 'expired', closed_at = now() where id = p_challenge;
    return 'expired';
  end if;
  if p_accept then
    update public.challenges set status = v_to, responded_at = now() where id = p_challenge;
  else
    update public.challenges set status = v_to, responded_at = now(), closed_at = now() where id = p_challenge;
  end if;
  return v_to::text;
end $$;

-- 9) Players read only the match columns the app shows (not idempotency keys or who voided).
revoke select on public.matches from authenticated;
grant select (id, legacy_match_id, format, deciding_set, player_one, player_two, winner_id, status, played_on, points_awarded,
  challenge_id, note, created_at, responded_at, confirmed_at, voided_at, void_reason) on public.matches to authenticated;

-- Postgres grants EXECUTE on every new function to PUBLIC; take that back for everything recreated here.
revoke all on function public.ensure_player(text, text, text, text, text, text), public.create_invite(),
  public.record_match(uuid, uuid, smallint, text, date, jsonb, uuid, text, boolean), public.respond_challenge(uuid, boolean),
  public.respond_match(uuid, boolean), public.jwt_sub() from public, anon;
alter default privileges for role postgres in schema public revoke execute on functions from public;

-- grants for the API (default privileges no longer hand these out)
grant execute on function public.ensure_player(text, text, text, text, text, text), public.create_invite(),
  public.record_match(uuid, uuid, smallint, text, date, jsonb, uuid, text, boolean), public.respond_challenge(uuid, boolean)
  to authenticated;
grant execute on function public.me(), public.is_admin() to authenticated;
