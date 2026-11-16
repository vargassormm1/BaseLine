-- Baseline V2 core model. Facts only: standings, records and stats are derived from confirmed matches (plus the
-- one-time V1 carry-over adjustments), never kept as counters. Every write goes through a security-definer function
-- (next migration); the API roles get read access only, filtered by RLS.
create extension if not exists citext with schema extensions;

create type public.match_status as enum ('pending', 'confirmed', 'rejected', 'canceled', 'voided');
create type public.challenge_status as enum ('pending', 'accepted', 'declined', 'canceled', 'expired', 'completed');

create table public.players (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null unique check (length(clerk_user_id) between 1 and 64),
  username extensions.citext not null unique check (username ~ '^[A-Za-z0-9_.-]{3,24}$'),
  first_name text not null default '' check (length(first_name) <= 40),
  last_name text not null default '' check (length(last_name) <= 40),
  avatar_url text check (avatar_url is null or avatar_url ~ '^https://[a-z0-9.-]+/'),
  is_admin boolean not null default false,
  legacy_user_id integer unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- private per-player data (only the player can read it)
create table public.player_private (
  player_id uuid primary key references public.players (id) on delete cascade,
  email extensions.citext unique check (email is null or length(email) <= 254)
);

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  challenger uuid not null references public.players (id),
  opponent uuid not null references public.players (id),
  format smallint not null check (format in (1, 3, 5)),
  message text check (message is null or length(message) <= 140),
  proposed_for date,
  status public.challenge_status not null default 'pending',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  responded_at timestamptz,
  closed_at timestamptz,
  check (challenger <> opponent)
);
-- one open challenge per pair at a time (either direction)
create unique index challenges_one_open_per_pair on public.challenges
  (least(challenger, opponent), greatest(challenger, opponent)) where status in ('pending', 'accepted');
create index challenges_challenger on public.challenges (challenger);
create index challenges_opponent on public.challenges (opponent);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  legacy_match_id integer unique,
  format smallint not null check (format in (1, 3, 5)),
  -- how a deciding set is played: a full set, or a match tiebreak (first to 10, win by 2)
  deciding_set text not null default 'set' check (deciding_set in ('set', 'match_tiebreak')),
  player_one uuid not null references public.players (id), -- the player who recorded it
  player_two uuid not null references public.players (id), -- the player who confirms it
  winner_id uuid not null references public.players (id),
  status public.match_status not null default 'pending',
  played_on date not null,
  -- points the winner earns once confirmed, fixed when recorded (rule changes never rewrite history)
  points_awarded smallint not null check (points_awarded between 0 and 100),
  challenge_id uuid references public.challenges (id),
  client_key uuid unique, -- idempotency key from the form (double taps / retries never create two matches)
  note text check (note is null or length(note) <= 140),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  confirmed_at timestamptz,
  voided_at timestamptz,
  void_reason text check (void_reason is null or length(void_reason) <= 200),
  voided_by uuid references public.players (id),
  check (player_one <> player_two),
  check (winner_id in (player_one, player_two)),
  check ((status in ('confirmed', 'voided')) = (confirmed_at is not null)),
  check ((status = 'voided') = (voided_at is not null))
);
-- a challenge has at most one live result (a rejected or canceled result can be re-recorded)
create unique index matches_one_live_per_challenge on public.matches (challenge_id) where challenge_id is not null and status in ('pending', 'confirmed', 'voided');
create index matches_player_one on public.matches (player_one);
create index matches_player_two on public.matches (player_two);
create index matches_winner on public.matches (winner_id);
create index matches_status_played on public.matches (status, played_on desc);

create table public.match_sets (
  match_id uuid not null references public.matches (id) on delete cascade,
  set_number smallint not null check (set_number between 1 and 5),
  p1_games smallint not null check (p1_games between 0 and 99),
  p2_games smallint not null check (p2_games between 0 and 99),
  p1_tiebreak smallint check (p1_tiebreak between 0 and 99),
  p2_tiebreak smallint check (p2_tiebreak between 0 and 99),
  is_match_tiebreak boolean not null default false,
  primary key (match_id, set_number)
);

-- Explicit, traceable corrections to all-time standings (the V1 carry-over, or a documented admin correction).
create table public.standing_adjustments (
  id bigint generated always as identity primary key,
  player_id uuid not null references public.players (id),
  points integer not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  source text not null check (source in ('v1_carry_over', 'admin')),
  reason text not null check (length(reason) between 1 and 300),
  created_at timestamptz not null default now()
);
create index standing_adjustments_player on public.standing_adjustments (player_id);

create table public.rate_limits (
  player_id uuid not null references public.players (id) on delete cascade,
  bucket text not null,
  window_start timestamptz not null,
  hits integer not null,
  primary key (player_id, bucket)
);

-- ---- identity ---------------------------------------------------------------------------------------------------
-- The signed-in player: Clerk's user id is the JWT `sub` (Supabase third-party auth verifies the token).
create or replace function public.me() returns uuid
language sql stable security definer set search_path = '' as $$
  select p.id from public.players p where p.clerk_user_id = (select auth.jwt() ->> 'sub')
$$;
revoke all on function public.me() from public;
grant execute on function public.me() to authenticated;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select p.is_admin from public.players p where p.id = public.me()), false)
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ---- row level security -------------------------------------------------------------------------------------------
alter table public.players enable row level security;            alter table public.players force row level security;
alter table public.player_private enable row level security;     alter table public.player_private force row level security;
alter table public.challenges enable row level security;         alter table public.challenges force row level security;
alter table public.matches enable row level security;            alter table public.matches force row level security;
alter table public.match_sets enable row level security;         alter table public.match_sets force row level security;
alter table public.standing_adjustments enable row level security; alter table public.standing_adjustments force row level security;
alter table public.rate_limits enable row level security;        alter table public.rate_limits force row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on functions from public;

-- Players: every signed-in player sees public profile columns (never the Clerk id or the V1 id).
grant select (id, username, first_name, last_name, avatar_url, is_admin, created_at) on public.players to authenticated;
create policy players_read on public.players for select to authenticated using (public.me() is not null);

grant select on public.player_private to authenticated;
create policy private_own on public.player_private for select to authenticated using (player_id = public.me());

-- Matches: confirmed (and voided, for history) are visible to all players; pending/rejected/canceled only to the two players.
grant select on public.matches to authenticated;
create policy matches_read on public.matches for select to authenticated using (
  public.me() is not null and (status in ('confirmed', 'voided') or public.me() in (player_one, player_two)));
grant select on public.match_sets to authenticated;
create policy sets_read on public.match_sets for select to authenticated using (
  exists (select 1 from public.matches m where m.id = match_id));

grant select on public.challenges to authenticated;
create policy challenges_read on public.challenges for select to authenticated using (public.me() in (challenger, opponent));

grant select on public.standing_adjustments to authenticated;
create policy adjustments_read on public.standing_adjustments for select to authenticated using (public.me() is not null);
-- rate_limits: no grants at all
