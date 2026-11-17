# Database (Supabase Postgres)

Migrations in `supabase/migrations/` (apply with `supabase db reset` locally, `supabase db push` remotely).

## Tables
| Table | Purpose | Notes |
|---|---|---|
| `players` | One per person. `auth_user_id` (unique, → `auth.users`) is the sign-in; `clerk_user_id` = V1's Clerk id (history only); `username` (citext, unique, `^[A-Za-z0-9_.-]{3,24}$`); names; avatar (Google / Clerk image hosts only); `is_admin`; `legacy_user_id` (V1 id). | Column grants hide `clerk_user_id`, `legacy_user_id`. |
| `player_private` | Email (owner-only). | |
| `matches` | `format` 1/3/5, `deciding_set` set/match_tiebreak, `player_one` (recorder), `player_two` (confirmer), `winner_id`, `status` pending/confirmed/rejected/canceled/voided, `played_on`, `points_awarded` (fixed at record time), `challenge_id`, `client_key` (idempotency), note, timestamps, void info, `legacy_match_id`. | Checks: different players, winner is a player, confirmed ⇔ confirmed_at, voided ⇔ voided_at. One live result per challenge. |
| `match_sets` | `(match_id, set_number)`; games, tiebreak points, `is_match_tiebreak`. | |
| `challenges` | challenger, opponent, format, message, proposed date, status pending/accepted/declined/canceled/expired/completed, expiry (14 days). | One open challenge per pair. |
| `standing_adjustments` | Explicit, reasoned additions to all-time totals (`v1_carry_over`, `admin`). | |
| `invites` | sha256 of one-time codes, creator, expiry, who used it. | Players see only their own (no codes). |
| `rate_limits` | Fixed window per player and bucket. | No API access. |
| `auth_rate_limits` | Same, for signed-in accounts that aren't players yet (invite attempts). | No API access. |
| storage bucket `avatars` | Player-uploaded 256px WebP photos; `players.avatar_path` points at the current one. | Public read; write only in the player's own folder, 3 files max. |
| `legacy.*` | Verbatim copies of V1's tables + `import_runs` (fingerprints and report of each migration). | Not exposed to the API. |

Nothing is a counter: records, points and stats are derived from confirmed matches (+ adjustments).

## Identity
Supabase Auth (Google only). `public.me()` = the player whose `auth_user_id` is `auth.uid()` (anonymous sessions never
count). `ensure_player()` on first visit: already linked → that player; else an **unlinked** player whose email on file
equals the email on their **Google identity** (`auth.identities`, verified by Google; never a JWT claim) → link it (V1 players); else a valid invite → new player.
Admin fallback for a different Google email: see the comment at the end of migration `…0600_supabase_auth.sql`.

## RLS (read side)
- **Players and adjustments:** visible to any signed-in player.
- **Matches and their sets:** confirmed or voided results are visible to all players; pending, rejected and withdrawn ones only to the two players.
- **Challenges:** only the two players.
- **Private data:** `player_private` only to its owner; `invites` (minus the codes) only to their creator.
- **Everything else:** anonymous visitors see nothing. RLS is enabled and forced on every table.

## Write functions (the only way to change data)
| Function | Who | Rules |
|---|---|---|
| `ensure_player` | signed in | linked → that player; unlinked player with this verified Google email → link; new → valid unused invite + username |
| `update_profile` | self | username/name validation, unique |
| `create_invite` | player | 10/day; returns the code once |
| `record_match` | player | opponent ≠ self, date window, `validate_sets`, duplicate guard, challenge rules, idempotent, 20/hour |
| `respond_match` | the opponent | pending only, ≤ 1 year old to confirm, row lock, completes challenge |
| `cancel_match` | the recorder | pending only |
| `void_match` | admin | confirmed only, reason required |
| `create_challenge` / `respond_challenge` / `cancel_challenge` | involved players | one open per pair, expiry, 15/day |

All are `SECURITY DEFINER` with `search_path = ''`. EXECUTE is granted to `authenticated` only for these. Internal helpers (`take_rate_limit`, `require_me`, `expire_challenges`) aren't executable by any API role (tested).

## Types
`npm run db:types` regenerates `src/lib/db/types.ts` from the local database.
