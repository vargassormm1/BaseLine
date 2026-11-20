# Tennis doubles

One doubles match = one record (`tennis_doubles_matches`) with four players on two sides (`tennis_doubles_players`) and its sets (`tennis_doubles_sets`). Singles tables (`matches`, `match_sets`, `challenges`) and every pickleball table are untouched. Migration: `supabase/migrations/20261120001100_tennis_doubles.sql` (additive only).

## Rules reference (checked 2026-11-19)

Sources: **ITF Rules of Tennis 2026** as reprinted in **USTA Friend at Court 2026** (the ITF PDF itself wouldn't download), and **USTA Regulation I.E.4** (pro sets).

| Rule | What Baseline does with it |
|---|---|
| Rule 5: game; tie-break game to 7, by 2 | Optional tiebreak points are validated as a race to 7 by 2, won by the set winner |
| Rule 6: advantage set (win by 2) / tie-break set (tiebreak at 6–6) | Regular sets: 6–0…6–4, 7–5, 7–6. Advantage final set: 6–x by 2, else exactly two ahead (8–6, 10–8) |
| Rule 7: best of 3 or 5 sets | Formats `bo3`, `bo5` |
| Rules 14–15: doubles service and receiving order | Not recorded (final scores only) |
| App. VI: No-Ad | A label on the match (`no_ad`); doesn't change validation |
| App. VI: short sets to 4, tiebreak at 4–4 (or 3–3) | `short1`/`short3`; `short_tie_at` = 4 (5–4, 5–3) or 3 (4–3) |
| App. VI: match tiebreak (to 10) replaces the deciding set | `std` (default) and `short3`: entered as e.g. [10–7]; must end the moment someone leads by 2 from 10 |
| USTA I.E.4: 8-game pro set, tiebreak at 8–8 | `pro8`: 8–x by 2, 9–7, 9–8 |

The same cases (`tests/fixtures/tennis-doubles-scores.json`) run against the TypeScript validator (`src/lib/tennis/doubles.ts`) and the database (`tennis_doubles_validate`). The database computes the winner; the browser never sends it.

## Formats and points (Matt, 2026-11-19: mirror singles)

| Key | Format | Points to each winner |
|---|---|---|
| `std` | Two sets + 10-point match tiebreak (default) | 10 |
| `one_set` | One set | 5 |
| `bo3` | Best of 3 full sets | 10 |
| `bo3_adv` | Best of 3, advantage final set | 10 |
| `bo5` | Best of 5 | 20 |
| `short1` | One short set | 3 |
| `short3` | Short sets, best of 3, match tiebreak | 5 |
| `pro8` | Pro set | 5 |

Main presets on the record screen: Standard doubles, One set, Best of 3. The rest are under "More formats". Points are fixed at confirmation.

## Policies (Matt, 2026-11-19)

- **Confirmation:** any one player on the other team confirms or rejects. Your partner can't. Answering twice is a no-op, so no double award.
- **Rankings:** an individual doubles board. Points follow the player whoever they partner (people switch partners a lot). Separate from the singles board and from pickleball.
- **Partnerships:** derived from matches, keyed by the sorted pair of player ids (A+B = B+A). "Top partnerships" ranks by win rate with a minimum of 3 matches together. It's not a points ranking. Best partner also needs 3+ matches.
- **Head to head:** Singles, Teams (exact partnership vs partnership), Doubles opponents (two players on opposite sides, any partners), and Partners (one pair's record). Doubles never counts in singles head-to-head.
- **Challenges:** me + partner vs two players. Either challenged player accepts. One open challenge per pair of teams. The result must use the challenge's teams and format.
- No mixed doubles (no gender data). No daily cap (singles has none).

## Security

- All writes go through SECURITY DEFINER functions (`record_/respond_/cancel_/void_tennis_doubles`, `create_/respond_tennis_doubles_challenge`) with `require_me()`, rate limits, and `search_path=''`.
- RLS is forced on every table. Confirmed or voided matches are visible to signed-in players; pending ones only to the four players. `client_key` is hidden by column grants. Anonymous users see nothing.
- Void is admin-only and needs a reason.
