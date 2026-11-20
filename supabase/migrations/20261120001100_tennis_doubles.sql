-- Tennis doubles (docs/TENNIS_DOUBLES.md). ADDITIVE ONLY: tennis singles tables, rows and functions and every pickleball
-- object are untouched. One doubles match = one row with two sides of two players (the same side model as pickleball).
-- Rules: 2026 ITF Rules of Tennis 5–7, 14–15, Appendix VI; USTA Regulation I.E.4 (pro sets).
-- Policy (Matt, 2026-11-19): individual doubles board; each winning player earns the format's points (mirrors singles);
-- any one player on the other side confirms; no daily cap.

create table public.tennis_doubles_challenges (
  id uuid primary key default gen_random_uuid(),
  format text not null check (format in ('one_set', 'std', 'bo3', 'bo3_adv', 'bo5', 'short1', 'short3', 'pro8')),
  short_tie_at smallint check (short_tie_at in (3, 4)),
  no_ad boolean not null default false,
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
create unique index tennis_doubles_challenges_one_open on public.tennis_doubles_challenges (sides_key) where status in ('pending', 'accepted');
create table public.tennis_doubles_challenge_players (
  challenge_id uuid not null references public.tennis_doubles_challenges (id) on delete cascade,
  player_id uuid not null references public.players (id),
  side smallint not null check (side in (1, 2)),
  primary key (challenge_id, player_id)
);
create index tennis_doubles_challenge_players_player on public.tennis_doubles_challenge_players (player_id);

create table public.tennis_doubles_matches (
  id uuid primary key default gen_random_uuid(),
  format text not null check (format in ('one_set', 'std', 'bo3', 'bo3_adv', 'bo5', 'short1', 'short3', 'pro8')),
  -- short sets only: tiebreak at 4–4 (standard) or 3–3 (ITF Appendix VI alternative)
  short_tie_at smallint check (short_tie_at in (3, 4)),
  no_ad boolean not null default false, -- a label (Baseline records final scores, not points)
  recorded_by uuid not null references public.players (id),
  recorder_side smallint not null check (recorder_side in (1, 2)),
  winner_side smallint not null check (winner_side in (1, 2)),
  sides_key text not null, -- "a,b|c,d" sorted: same partnership pair in any order
  status public.match_status not null default 'pending',
  played_on date not null,
  points_awarded smallint check (points_awarded between 0 and 100), -- to each winner, fixed at confirmation
  challenge_id uuid references public.tennis_doubles_challenges (id),
  client_key uuid unique,
  note text check (note is null or length(note) <= 140),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  responded_by uuid references public.players (id),
  confirmed_at timestamptz,
  voided_at timestamptz,
  void_reason text check (void_reason is null or length(void_reason) <= 200),
  voided_by uuid references public.players (id),
  check ((format in ('short1', 'short3')) = (short_tie_at is not null)),
  check ((status in ('confirmed', 'voided')) = (confirmed_at is not null)),
  check ((status in ('confirmed', 'voided')) = (points_awarded is not null)),
  check ((status = 'voided') = (voided_at is not null))
);
create unique index tennis_doubles_matches_one_live_per_challenge on public.tennis_doubles_matches (challenge_id)
  where challenge_id is not null and status in ('pending', 'confirmed', 'voided');
create index tennis_doubles_matches_status_played on public.tennis_doubles_matches (status, played_on desc);
create index tennis_doubles_matches_sides on public.tennis_doubles_matches (sides_key);

create table public.tennis_doubles_players (
  match_id uuid not null references public.tennis_doubles_matches (id) on delete cascade,
  player_id uuid not null references public.players (id),
  side smallint not null check (side in (1, 2)),
  primary key (match_id, player_id)
);
create index tennis_doubles_players_player on public.tennis_doubles_players (player_id);

create table public.tennis_doubles_sets (
  match_id uuid not null references public.tennis_doubles_matches (id) on delete cascade,
  set_number smallint not null check (set_number between 1 and 5),
  side1_games smallint not null check (side1_games between 0 and 99), -- a match tiebreak: its points
  side2_games smallint not null check (side2_games between 0 and 99),
  side1_tiebreak smallint check (side1_tiebreak between 0 and 99),
  side2_tiebreak smallint check (side2_tiebreak between 0 and 99),
  is_match_tiebreak boolean not null default false,
  primary key (match_id, set_number)
);

-- ---- rules (mirrors src/lib/tennis/doubles.ts) ----------------------------------------------------------------------
create or replace function public.tennis_doubles_format_info(p_format text,
  out sets_to_win int, out max_sets int, out games int, out tie_at int, out decider text, out points int)
language sql immutable set search_path = '' as $$
  select v.w, v.m, v.g, v.t, v.d, v.p from (values
    ('one_set', 1, 1, 6, 6, 'same', 5), ('std', 2, 3, 6, 6, 'match_tiebreak', 10), ('bo3', 2, 3, 6, 6, 'same', 10),
    ('bo3_adv', 2, 3, 6, 6, 'advantage', 10), ('bo5', 3, 5, 6, 6, 'same', 20), ('short1', 1, 1, 4, 4, 'same', 3),
    ('short3', 2, 3, 4, 4, 'match_tiebreak', 5), ('pro8', 1, 1, 8, 8, 'same', 5)) as v(f, w, m, g, t, d, p)
  where v.f = p_format
$$;

-- A race to p_to won by 2, ended the moment it was won: 'done' | 'in_progress' | 'invalid'
create or replace function public.tennis_race(a int, b int, p_to int) returns text
language sql immutable set search_path = '' as $$
  select case when greatest(a, b) < p_to or abs(a - b) < 2 then 'in_progress'
              when greatest(a, b) = p_to or abs(a - b) = 2 then 'done' else 'invalid' end
$$;

-- Sets: [[6,4], [7,6,7,5], [10,7]] (side 1, side 2[, tb1, tb2]). Returns the winning side or raises invalid_score.
create or replace function public.tennis_doubles_validate(p_format text, p_short_tie_at smallint, p_sets jsonb) returns smallint
language plpgsql immutable set search_path = '' as $$
declare
  f record; s jsonb; i int := 0; a int; b int; ta int; tb int; hi int; lo int; g int; tie int; mtb boolean; adv boolean;
  done boolean; is_tb boolean; w int; w1 int := 0; w2 int := 0;
begin
  select * into f from public.tennis_doubles_format_info(p_format);
  if f.sets_to_win is null then raise exception 'invalid_score'; end if;
  if (p_format in ('short1', 'short3')) <> (p_short_tie_at is not null) or coalesce(p_short_tie_at, 4) not in (3, 4) then raise exception 'invalid_score'; end if;
  if p_sets is null or jsonb_typeof(p_sets) <> 'array' or jsonb_array_length(p_sets) = 0 or jsonb_array_length(p_sets) > f.max_sets then raise exception 'invalid_score'; end if;
  for s in select e from jsonb_array_elements(p_sets) as t(e) loop
    if w1 = f.sets_to_win or w2 = f.sets_to_win then raise exception 'invalid_score'; end if;
    if jsonb_typeof(s) <> 'array' or jsonb_array_length(s) not in (2, 4) then raise exception 'invalid_score'; end if;
    for k in 0 .. jsonb_array_length(s) - 1 loop
      if not (jsonb_typeof(s -> k) = 'null' and k >= 2) and ((s ->> k) is null or (s ->> k) !~ '^\d{1,2}$') then raise exception 'invalid_score'; end if;
    end loop;
    a := (s ->> 0)::int; b := (s ->> 1)::int; ta := (s ->> 2)::int; tb := (s ->> 3)::int;
    hi := greatest(a, b); lo := least(a, b);
    mtb := f.max_sets > 1 and i = f.max_sets - 1 and f.decider = 'match_tiebreak';
    adv := f.max_sets > 1 and i = f.max_sets - 1 and f.decider = 'advantage';
    g := f.games; tie := case when p_format in ('short1', 'short3') then p_short_tie_at else f.tie_at end;
    if mtb then
      if ta is not null or tb is not null or public.tennis_race(a, b, 10) <> 'done' then raise exception 'invalid_score'; end if;
    else
      is_tb := false;
      if adv then
        done := hi >= g and hi - lo >= 2 and (hi = g or hi - lo = 2);
      elsif tie = g then
        is_tb := hi = g + 1 and lo = g; done := (hi = g and lo <= g - 2) or (hi = g + 1 and lo = g - 1) or is_tb;
      else
        is_tb := hi = g and lo = g - 1; done := (hi = g and lo <= g - 2) or is_tb;
      end if;
      if not done then raise exception 'invalid_score'; end if;
      if ta is not null or tb is not null then
        if not is_tb or ta is null or tb is null or public.tennis_race(ta, tb, 7) <> 'done' or ((ta > tb) <> (a > b)) then raise exception 'invalid_score'; end if;
      end if;
    end if;
    if a > b then w1 := w1 + 1; else w2 := w2 + 1; end if;
    i := i + 1;
  end loop;
  if w1 < f.sets_to_win and w2 < f.sets_to_win then raise exception 'invalid_score'; end if;
  return case when w1 > w2 then 1 else 2 end;
end $$;

-- ---- record / confirm / cancel / void ----------------------------------------------------------------------------
create or replace function public.record_tennis_doubles(
  p_client_key uuid, p_format text, p_short_tie_at smallint, p_no_ad boolean, p_side1 uuid[], p_side2 uuid[],
  p_played_on date, p_sets jsonb, p_challenge uuid default null, p_note text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public.require_me(); v_id uuid; v_winner smallint; v_key text; c public.tennis_doubles_challenges;
begin
  if p_client_key is null then raise exception 'invalid_input'; end if;
  select id into v_id from public.tennis_doubles_matches where client_key = p_client_key and recorded_by = v_me;
  if v_id is not null then return v_id; end if;
  perform public.take_rate_limit(v_me, 'record_match', 20, interval '1 hour');
  perform public.pickleball_check_sides(v_me, 'doubles', p_side1, p_side2); -- 2 v 2, distinct real players, I'm on side 1
  if p_played_on is null or p_played_on > public.app_today() or p_played_on < public.app_today() - 365 then raise exception 'invalid_date'; end if;
  if p_note is not null and length(p_note) > 140 then raise exception 'invalid_note'; end if;
  v_winner := public.tennis_doubles_validate(p_format, p_short_tie_at, p_sets);
  v_key := public.pickleball_sides_key(p_side1, p_side2);
  if p_challenge is not null then
    select * into c from public.tennis_doubles_challenges where id = p_challenge for update;
    if not found or c.status <> 'accepted' or c.sides_key <> v_key or c.format <> p_format then raise exception 'invalid_challenge'; end if;
  end if;
  begin
    insert into public.tennis_doubles_matches (format, short_tie_at, no_ad, recorded_by, recorder_side, winner_side, sides_key, played_on, challenge_id, client_key, note)
    values (p_format, p_short_tie_at, coalesce(p_no_ad, false), v_me, 1, v_winner, v_key, p_played_on, p_challenge, p_client_key, nullif(trim(p_note), ''))
    returning id into v_id;
  exception when unique_violation then
    select id into v_id from public.tennis_doubles_matches where client_key = p_client_key and recorded_by = v_me;
    if v_id is not null then return v_id; end if;
    raise exception 'duplicate_match';
  end;
  insert into public.tennis_doubles_players (match_id, player_id, side)
    select v_id, u, 1 from unnest(p_side1) u union all select v_id, u, 2 from unnest(p_side2) u;
  insert into public.tennis_doubles_sets (match_id, set_number, side1_games, side2_games, side1_tiebreak, side2_tiebreak, is_match_tiebreak)
    select v_id, t.ord, (t.e ->> 0)::smallint, (t.e ->> 1)::smallint, (t.e ->> 2)::smallint, (t.e ->> 3)::smallint,
           (select decider = 'match_tiebreak' and t.ord = max_sets from public.tennis_doubles_format_info(p_format))
    from jsonb_array_elements(p_sets) with ordinality as t(e, ord);
  return v_id;
end $$;

-- Any player on the other side confirms (points fixed now) or rejects. Answering twice the same way is a no-op.
create or replace function public.respond_tennis_doubles(p_match uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public.require_me(); m public.tennis_doubles_matches; v_side smallint;
  v_to public.match_status := case when p_accept then 'confirmed' else 'rejected' end;
begin
  select * into m from public.tennis_doubles_matches where id = p_match for update;
  if not found then raise exception 'not_allowed' using errcode = '42501'; end if;
  select side into v_side from public.tennis_doubles_players where match_id = p_match and player_id = v_me;
  if v_side is null or v_side = m.recorder_side then raise exception 'not_allowed' using errcode = '42501'; end if;
  if m.status = v_to then return; end if;
  if m.status <> 'pending' then raise exception 'already_answered'; end if;
  perform public.take_rate_limit(v_me, 'respond', 120, interval '1 hour');
  if p_accept and m.played_on < public.app_today() - 365 then raise exception 'too_old_to_confirm'; end if;
  if not p_accept then
    update public.tennis_doubles_matches set status = v_to, responded_at = now(), responded_by = v_me where id = p_match;
    return;
  end if;
  update public.tennis_doubles_matches set status = v_to, responded_at = now(), responded_by = v_me, confirmed_at = now(),
    points_awarded = (select points from public.tennis_doubles_format_info(m.format)) where id = p_match;
  if m.challenge_id is not null then
    update public.tennis_doubles_challenges set status = 'completed', closed_at = now() where id = m.challenge_id and status = 'accepted';
  end if;
end $$;

create or replace function public.cancel_tennis_doubles(p_match uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public.require_me(); m public.tennis_doubles_matches;
begin
  select * into m from public.tennis_doubles_matches where id = p_match for update;
  if not found or m.recorded_by <> v_me then raise exception 'not_allowed' using errcode = '42501'; end if;
  if m.status = 'canceled' then return; end if;
  if m.status <> 'pending' then raise exception 'already_answered'; end if;
  update public.tennis_doubles_matches set status = 'canceled', responded_at = now() where id = p_match;
end $$;

create or replace function public.void_tennis_doubles(p_match uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public.require_me(); m public.tennis_doubles_matches;
begin
  if not public.is_admin() then raise exception 'not_allowed' using errcode = '42501'; end if;
  if p_reason is null or length(trim(p_reason)) not between 3 and 200 then raise exception 'invalid_reason'; end if;
  select * into m from public.tennis_doubles_matches where id = p_match for update;
  if not found then raise exception 'not_found'; end if;
  if m.status = 'voided' then return; end if;
  if m.status <> 'confirmed' then raise exception 'not_confirmed'; end if;
  update public.tennis_doubles_matches set status = 'voided', voided_at = now(), voided_by = v_me, void_reason = trim(p_reason) where id = p_match;
end $$;

-- ---- challenges ----------------------------------------------------------------------------------------------------
create or replace function public.create_tennis_doubles_challenge(p_format text, p_short_tie_at smallint, p_no_ad boolean, p_side1 uuid[], p_side2 uuid[],
  p_message text default null, p_proposed_for date default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public.require_me(); v_id uuid; v_key text;
begin
  perform public.take_rate_limit(v_me, 'challenge', 15, interval '1 day');
  perform public.pickleball_check_sides(v_me, 'doubles', p_side1, p_side2);
  if (select sets_to_win from public.tennis_doubles_format_info(p_format)) is null
     or (p_format in ('short1', 'short3')) <> (p_short_tie_at is not null) or coalesce(p_short_tie_at, 4) not in (3, 4) then raise exception 'invalid_input'; end if;
  if p_message is not null and length(p_message) > 140 then raise exception 'invalid_note'; end if;
  if p_proposed_for is not null and (p_proposed_for < public.app_today() or p_proposed_for > public.app_today() + 90) then raise exception 'invalid_date'; end if;
  v_key := public.pickleball_sides_key(p_side1, p_side2);
  update public.tennis_doubles_challenges set status = 'expired', closed_at = now()
    where sides_key = v_key and ((status = 'pending' and expires_at < now()) or (status = 'accepted' and responded_at < now() - interval '30 days'));
  begin
    insert into public.tennis_doubles_challenges (format, short_tie_at, no_ad, challenger, sides_key, message, proposed_for)
    values (p_format, p_short_tie_at, coalesce(p_no_ad, false), v_me, v_key, nullif(trim(p_message), ''), p_proposed_for) returning id into v_id;
  exception when unique_violation then raise exception 'challenge_open';
  end;
  insert into public.tennis_doubles_challenge_players (challenge_id, player_id, side)
    select v_id, u, 1 from unnest(p_side1) u union all select v_id, u, 2 from unnest(p_side2) u;
  return v_id;
end $$;

create or replace function public.respond_tennis_doubles_challenge(p_challenge uuid, p_action text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public.require_me(); c public.tennis_doubles_challenges; v_side smallint;
begin
  select * into c from public.tennis_doubles_challenges where id = p_challenge for update;
  if not found then raise exception 'not_allowed' using errcode = '42501'; end if;
  select side into v_side from public.tennis_doubles_challenge_players where challenge_id = p_challenge and player_id = v_me;
  if v_side is null then raise exception 'not_allowed' using errcode = '42501'; end if;
  perform public.take_rate_limit(v_me, 'respond', 120, interval '1 hour');
  if (c.status = 'pending' and c.expires_at < now()) or (c.status = 'accepted' and c.responded_at < now() - interval '30 days') then
    update public.tennis_doubles_challenges set status = 'expired', closed_at = now() where id = p_challenge;
    return 'expired';
  end if;
  if p_action = 'cancel' then
    if c.status = 'pending' and c.challenger <> v_me then raise exception 'not_allowed' using errcode = '42501'; end if;
    if c.status not in ('pending', 'accepted') then raise exception 'already_answered'; end if;
    update public.tennis_doubles_challenges set status = 'canceled', closed_at = now() where id = p_challenge;
  elsif p_action in ('accept', 'decline') then
    if v_side <> 2 then raise exception 'not_allowed' using errcode = '42501'; end if;
    if c.status <> 'pending' then
      if (p_action = 'accept' and c.status = 'accepted') or (p_action = 'decline' and c.status = 'declined') then return c.status::text; end if;
      raise exception 'already_answered';
    end if;
    update public.tennis_doubles_challenges set status = (case p_action when 'accept' then 'accepted' else 'declined' end)::public.challenge_status,
      responded_at = now(), responded_by = v_me, closed_at = case when p_action = 'decline' then now() end where id = p_challenge;
  else
    raise exception 'invalid_input';
  end if;
  return (select status::text from public.tennis_doubles_challenges where id = p_challenge);
end $$;

-- ---- access -------------------------------------------------------------------------------------------------------
alter table public.tennis_doubles_matches enable row level security;
alter table public.tennis_doubles_matches force row level security;
alter table public.tennis_doubles_players enable row level security;
alter table public.tennis_doubles_players force row level security;
alter table public.tennis_doubles_sets enable row level security;
alter table public.tennis_doubles_sets force row level security;
alter table public.tennis_doubles_challenges enable row level security;
alter table public.tennis_doubles_challenges force row level security;
alter table public.tennis_doubles_challenge_players enable row level security;
alter table public.tennis_doubles_challenge_players force row level security;
revoke all on public.tennis_doubles_matches, public.tennis_doubles_players, public.tennis_doubles_sets, public.tennis_doubles_challenges,
  public.tennis_doubles_challenge_players from public, anon, authenticated;

create or replace function public.tennis_doubles_in_match(p_match uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.tennis_doubles_players where match_id = p_match and player_id = public.me())
$$;
create or replace function public.tennis_doubles_in_challenge(p_challenge uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.tennis_doubles_challenge_players where challenge_id = p_challenge and player_id = public.me())
$$;

grant select (id, format, short_tie_at, no_ad, recorded_by, recorder_side, winner_side, sides_key, status, played_on, points_awarded,
  challenge_id, note, created_at, responded_at, confirmed_at, voided_at, void_reason) on public.tennis_doubles_matches to authenticated;
grant select on public.tennis_doubles_players, public.tennis_doubles_sets to authenticated;
create policy tennis_doubles_matches_read on public.tennis_doubles_matches for select to authenticated using (
  public.me() is not null and (status in ('confirmed', 'voided') or public.tennis_doubles_in_match(id)));
create policy tennis_doubles_players_read on public.tennis_doubles_players for select to authenticated using (
  exists (select 1 from public.tennis_doubles_matches m where m.id = match_id));
create policy tennis_doubles_sets_read on public.tennis_doubles_sets for select to authenticated using (
  exists (select 1 from public.tennis_doubles_matches m where m.id = match_id));
grant select on public.tennis_doubles_challenges, public.tennis_doubles_challenge_players to authenticated;
create policy tennis_doubles_challenges_read on public.tennis_doubles_challenges for select to authenticated using (public.tennis_doubles_in_challenge(id));
create policy tennis_doubles_challenge_players_read on public.tennis_doubles_challenge_players for select to authenticated using (
  exists (select 1 from public.tennis_doubles_challenges c where c.id = challenge_id));

revoke all on function public.tennis_doubles_format_info(text), public.tennis_race(int, int, int), public.tennis_doubles_validate(text, smallint, jsonb),
  public.record_tennis_doubles(uuid, text, smallint, boolean, uuid[], uuid[], date, jsonb, uuid, text), public.respond_tennis_doubles(uuid, boolean),
  public.cancel_tennis_doubles(uuid), public.void_tennis_doubles(uuid, text),
  public.create_tennis_doubles_challenge(text, smallint, boolean, uuid[], uuid[], text, date), public.respond_tennis_doubles_challenge(uuid, text),
  public.tennis_doubles_in_match(uuid), public.tennis_doubles_in_challenge(uuid)
  from public, anon;
grant execute on function public.tennis_doubles_validate(text, smallint, jsonb),
  public.record_tennis_doubles(uuid, text, smallint, boolean, uuid[], uuid[], date, jsonb, uuid, text), public.respond_tennis_doubles(uuid, boolean),
  public.cancel_tennis_doubles(uuid), public.void_tennis_doubles(uuid, text),
  public.create_tennis_doubles_challenge(text, smallint, boolean, uuid[], uuid[], text, date), public.respond_tennis_doubles_challenge(uuid, text),
  public.tennis_doubles_in_match(uuid), public.tennis_doubles_in_challenge(uuid)
  to authenticated;
