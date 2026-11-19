# Pickleball (second sport)

Status: in progress (branch `pickleball`). Not deployed.

## Rules used (official sources, checked 2026-11-19)
- 2026 USA Pickleball Official Rulebook: https://usapickleball.org/docs/rules/USAP-Official-Rulebook.pdf
  (rules index https://usapickleball.org/rules/, summary https://usapickleball.org/rules/summary/,
  side-out scoring https://usapickleball.org/pickleball-skills/level-one/pickleball-scoring-positioning-side-out-scoring/)
- **4.A Standard scoring:** a point is scored only by the serving side winning the rally (side-out scoring).
- **14.A (Provisional) Rally scoring:** a point to whoever wins each rally; singles and doubles.
- **4.B / 15.C:** a game is won by the first side to the target; all scoring options are **win by two**
  (win by one only in team play, not supported). Normal games go to 11; tournaments also use 15 or 21.
- **15.C.1 formats:** best 2-of-3 to 11, best 3-of-5 to 11, one game to 15 or 21, one game to 11.
- **Retirement / forfeit** are defined (a side stops playing / a game or match awarded for a violation) but the rulebook
  only says how they count in tournament standings. Baseline records **completed matches only** for now; special
  outcomes are deferred (documented, not invented).

Baseline records final game scores only (no rally-by-rally scoring, servers or faults).

## Formats in Baseline
| Format | Games | To | Points to each winner |
|---|---|---|---|
| One game to 11 (default) | 1 | 11 | 5 |
| One game to 15 | 1 | 15 | 10 |
| One game to 21 | 1 | 21 | 10 |
| Best of 3 to 11 | 2 of 3 | 11 | 10 |
| Best of 5 to 11 | 3 of 5 | 11 | 20 |

Scoring method: side-out (default) or rally (a label on the match; the final-score rules are the same).

## Score validation (per game, target T)
- Winner has ≥ T and leads by ≥ 2; if the winner has more than T, the margin is exactly 2 (the game ended the moment
  it was won): 11–9 ✓, 12–10 ✓, 15–13 ✓, 11–10 ✗, 12–8 ✗ (ended at 11–8), 11–11 ✗, 10–9 ✗. No upper cap.
- Match: games in order; the match ends as soon as one side has won the required games (no extra games); no ties;
  the winner is computed, never taken from the client.

## Singles and doubles
- Sides: singles 1 v 1, doubles 2 v 2; four distinct players; each player on one side only; the recorder must play.
- **Confirmation:** any one player on the other side confirms or rejects (the recorder's side can't confirm).
- **Leaderboards (Matt, 2026-11-19): separate Singles and Doubles boards**, each with its own points.
  Each winner of a doubles match gets the full reward on the Doubles board.
- **Daily cap (Matt, 2026-11-19):** only the first 3 confirmed matches per day between the same sides (same players,
  same discipline) earn points; later ones count in records and head-to-head with 0 points.
- Points are fixed when the result is confirmed (rule changes never rewrite history), awarded once, removed if an
  admin voids the match. Clients never send points.
- Tennis and pickleball never share standings, points, head-to-head or history.

## Architecture
- Tennis tables and functions are untouched. Pickleball has its own tables: `pickleball_matches`,
  `pickleball_match_players` (side 1/2), `pickleball_games`, `pickleball_challenges` (+ players).
- Shared: players, accounts, invites, sign-in, rate limits, design system.
- Code: `src/lib/pickleball/*` (score, points, standings, h2h; pure, tested), `src/lib/sports.ts` (registry: label,
  icon, routes, formats). Pickleball pages under `/pickleball/...`; the sport switcher remembers the last sport.

## Tests
- Unit: `tests/pickleball-score.test.ts` (shared cases), `tests/pickleball-standings.test.ts`, `tests/sports.test.ts`.
- Database: `tests/db/pickleball.test.ts` (same score cases in SQL, singles/doubles flows, who may confirm, idempotency,
  daily cap incl. concurrent confirmations, no direct writes, admin void, tennis isolation, challenges).
- Browser: `e2e/pickleball.spec.ts` (every screen + axe + no overflow, switcher, singles and doubles journeys, tennis
  rankings unchanged).

## Deferred (documented, not invented)
Retirements, forfeits, walkovers and unfinished matches (only completed matches are recorded); win-by-one (team play);
DUPR or any external rating (Baseline points are not a rating).

## Release plan (needs Matt's approval)
1. Backup: `pg_dump` of production (schema + data) to `~/Backups/baseline/`, verify it restores into a local database
   and that tennis counts match.
2. `supabase db push --remote` (only migration 20261119001000; additive, no tennis changes).
3. Reconcile: tennis match/set/points totals and standings identical before and after.
4. Deploy the app. Rollback: redeploy the previous build (the new tables are unused by it); drop the pickleball tables
   only if ever needed (no tennis data depends on them).
