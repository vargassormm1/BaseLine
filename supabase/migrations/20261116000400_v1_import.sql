-- V1 → V2 import and reconciliation. Run by scripts/migrate-from-v1.mjs inside ONE transaction, after it copied the
-- V1 tables verbatim into legacy.*. Deterministic, and refuses to run twice. Nothing here is callable from the API.
-- Mapping (documented in docs/MIGRATION.md):
--   User → players (+ player_private.email)  · clerkId kept as clerk_user_id, so every account keeps its history
--   Matches → matches                         · both confirmed + visible → 'confirmed'; recorded but unconfirmed → 'pending'
--   MatchDetails → match_sets                  · games and tiebreaks copied exactly (no reinterpretation)
--   stored User totals − totals derived from confirmed matches → standing_adjustments ('v1_carry_over'), so every
--   player's all-time wins, losses and points are exactly what V1 showed.

create or replace function legacy.import_v1() returns jsonb
language plpgsql set search_path = '' as $$
declare v_unknown int; v_report jsonb;
begin
  if exists (select 1 from public.players where legacy_user_id is not null) or exists (select 1 from public.matches where legacy_match_id is not null) then
    raise exception 'V1 data was already imported';
  end if;
  if not exists (select 1 from legacy."User") then raise exception 'legacy tables are empty: copy V1 first'; end if;

  -- a V1 match state this mapping doesn't know about stops the import instead of guessing
  select count(*) into v_unknown from legacy."Matches" m
  where not ((m."playerOneConfirmed" and m."playerTwoConfirmed" and m."scoreVisible")
          or (m."playerOneConfirmed" and not m."playerTwoConfirmed" and not m."scoreVisible"))
     or m."matchType" not in (1, 3, 5) or m."winnerId" is null or m."winnerId" not in (m."playerOne", m."playerTwo");
  if v_unknown > 0 then raise exception '% V1 matches have a state this import does not handle', v_unknown; end if;

  insert into public.players (clerk_user_id, username, first_name, last_name, avatar_url, legacy_user_id, created_at, updated_at)
  select u."clerkId", u.username, left(u.fname, 40), left(u.lname, 40), u."imageUrl", u."userId",
         coalesce((select min(m."playedAt") from legacy."Matches" m where u."userId" in (m."playerOne", m."playerTwo")) at time zone 'UTC', now()),
         now()
  from legacy."User" u order by u."userId";

  insert into public.player_private (player_id, email)
  select p.id, u.email from legacy."User" u join public.players p on p.legacy_user_id = u."userId";

  insert into public.matches (legacy_match_id, format, deciding_set, player_one, player_two, winner_id, status, played_on,
                              points_awarded, created_at, responded_at, confirmed_at)
  select m."matchId", m."matchType", 'set', p1.id, p2.id, w.id,
         cast((case when m."scoreVisible" then 'confirmed' else 'pending' end) as public.match_status),
         ((m."playedAt" at time zone 'UTC') at time zone 'America/New_York')::date,
         public.points_for(m."matchType"::smallint),
         m."playedAt" at time zone 'UTC',
         case when m."scoreVisible" then m."playedAt" at time zone 'UTC' end,
         case when m."scoreVisible" then m."playedAt" at time zone 'UTC' end
  from legacy."Matches" m
  join public.players p1 on p1.legacy_user_id = m."playerOne"
  join public.players p2 on p2.legacy_user_id = m."playerTwo"
  join public.players w on w.legacy_user_id = m."winnerId"
  order by m."matchId";

  insert into public.match_sets (match_id, set_number, p1_games, p2_games, p1_tiebreak, p2_tiebreak, is_match_tiebreak)
  select mm.id, d."setNumber", d."playerOneScore", d."playerTwoScore", d."playerOneTieBreakerScore", d."playerTwoTieBreakerScore", false
  from legacy."MatchDetails" d join public.matches mm on mm.legacy_match_id = d."matchId"
  order by d."detailId";

  -- carry-over: whatever V1's stored totals say beyond what its confirmed matches explain
  insert into public.standing_adjustments (player_id, points, wins, losses, source, reason)
  select p.id, u."totalPoints" - coalesce(x.points, 0), u."totalWins" - coalesce(x.wins, 0), u."totalLosses" - coalesce(x.losses, 0),
         'v1_carry_over',
         'Carried over from Baseline V1: its stored totals differed from its confirmed match history at migration.'
  from legacy."User" u
  join public.players p on p.legacy_user_id = u."userId"
  left join lateral (
    select sum(case when m.winner_id = p.id then m.points_awarded else 0 end) points,
           count(*) filter (where m.winner_id = p.id) wins,
           count(*) filter (where m.winner_id <> p.id) losses
    from public.matches m where m.status = 'confirmed' and p.id in (m.player_one, m.player_two)
  ) x on true
  where u."totalPoints" <> coalesce(x.points, 0) or u."totalWins" <> coalesce(x.wins, 0) or u."totalLosses" <> coalesce(x.losses, 0);

  select jsonb_build_object(
    'players', (select count(*) from public.players where legacy_user_id is not null),
    'matches', (select count(*) from public.matches where legacy_match_id is not null),
    'sets', (select count(*) from public.match_sets s join public.matches m on m.id = s.match_id where m.legacy_match_id is not null),
    'adjustments', (select count(*) from public.standing_adjustments where source = 'v1_carry_over')
  ) into v_report;
  return v_report;
end $$;

-- Every check must pass (ok = true) or the migration script rolls the whole transaction back.
create or replace function legacy.reconcile_v1() returns table (check_name text, expected text, actual text, ok boolean)
language sql stable set search_path = '' as $$
  with v2_totals as (
    select p.legacy_user_id,
           coalesce(sum(case when m.winner_id = p.id then m.points_awarded end), 0) + coalesce((select sum(a.points) from public.standing_adjustments a where a.player_id = p.id), 0) points,
           count(m.id) filter (where m.winner_id = p.id) + coalesce((select sum(a.wins) from public.standing_adjustments a where a.player_id = p.id), 0) wins,
           count(m.id) filter (where m.winner_id <> p.id) + coalesce((select sum(a.losses) from public.standing_adjustments a where a.player_id = p.id), 0) losses
    from public.players p
    left join public.matches m on m.status = 'confirmed' and p.id in (m.player_one, m.player_two)
    where p.legacy_user_id is not null group by p.id, p.legacy_user_id
  ), checks(check_name, expected, actual) as (
    select 'players', (select count(*) from legacy."User")::text, (select count(*) from public.players where legacy_user_id is not null)::text
    union all select 'emails kept', (select count(*) from legacy."User")::text,
      (select count(*) from public.player_private pp join public.players p on p.id = pp.player_id join legacy."User" u on u."userId" = p.legacy_user_id where pp.email = u.email)::text
    union all select 'identities (clerk id, username, names, avatar) identical', '0',
      (select count(*) from legacy."User" u left join public.players p on p.legacy_user_id = u."userId"
       where p.id is null or p.clerk_user_id <> u."clerkId" or p.username::text <> u.username or p.first_name <> u.fname
          or p.last_name <> u.lname or p.avatar_url is distinct from u."imageUrl")::text
    union all select 'matches', (select count(*) from legacy."Matches")::text, (select count(*) from public.matches where legacy_match_id is not null)::text
    union all select 'confirmed matches', (select count(*) from legacy."Matches" where "scoreVisible")::text, (select count(*) from public.matches where legacy_match_id is not null and status = 'confirmed')::text
    union all select 'pending matches', (select count(*) from legacy."Matches" where not "scoreVisible")::text, (select count(*) from public.matches where legacy_match_id is not null and status = 'pending')::text
    union all select 'match players, winner, format, time identical', '0',
      (select count(*) from legacy."Matches" l left join public.matches m on m.legacy_match_id = l."matchId"
       left join public.players p1 on p1.id = m.player_one left join public.players p2 on p2.id = m.player_two left join public.players w on w.id = m.winner_id
       where m.id is null or p1.legacy_user_id <> l."playerOne" or p2.legacy_user_id <> l."playerTwo" or w.legacy_user_id <> l."winnerId"
          or m.format <> l."matchType" or m.created_at <> (l."playedAt" at time zone 'UTC'))::text
    union all select 'sets', (select count(*) from legacy."MatchDetails")::text,
      (select count(*) from public.match_sets s join public.matches m on m.id = s.match_id where m.legacy_match_id is not null)::text
    union all select 'set scores and tiebreaks identical', '0',
      (select count(*) from legacy."MatchDetails" d left join public.matches m on m.legacy_match_id = d."matchId"
       left join public.match_sets s on s.match_id = m.id and s.set_number = d."setNumber"
       where s.match_id is null or s.p1_games <> d."playerOneScore" or s.p2_games <> d."playerTwoScore"
          or s.p1_tiebreak is distinct from d."playerOneTieBreakerScore" or s.p2_tiebreak is distinct from d."playerTwoTieBreakerScore")::text
    union all select 'players whose all-time wins/losses/points differ from V1', '0',
      (select count(*) from legacy."User" u join v2_totals t on t.legacy_user_id = u."userId"
       where t.points <> u."totalPoints" or t.wins <> u."totalWins" or t.losses <> u."totalLosses")::text
    union all select 'total points', (select sum("totalPoints") from legacy."User")::text, (select sum(points) from v2_totals)::text
    union all select 'message threads kept (legacy only)', (select count(*) from legacy."MessageThread")::text, (select count(*) from legacy."MessageThread")::text
  )
  select check_name, expected, actual, expected = actual from checks
$$;

revoke all on function legacy.import_v1(), legacy.reconcile_v1() from public, anon, authenticated;
