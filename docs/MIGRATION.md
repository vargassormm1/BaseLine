# V1 → V2 migration and cutover

## Source (V1)
Neon Postgres (us-east-1, via the Vercel Postgres integration), Prisma 5. Tables: `User` (5), `Matches` (119: 112
confirmed, 7 pending), `MatchDetails` (130 sets), `MessageThread` (2), `Message` (0), `_prisma_migrations` (5).
Integer ids; stored, mutable totals on `User`.

## Backup (done 2026-11-16, before anything else)
- `~/Backups/baseline/baseline-neon-20261116-163919.{dump,sql}` (custom + plain), sha256 in `.sha256`, fingerprint in `.fingerprint.txt`.
- **Verified:** restored into a scratch Postgres 16; every table's row count and content hash matches production (`~/Backups/baseline/fingerprint.sql`).
- **Read-only throughout:** `pg_dump` reads a single snapshot. No V1 data was changed, then or since.

## Mapping
| V1 | V2 |
|---|---|
| `User` | `players`: `clerkId` → `clerk_user_id` (**same Clerk instance**, so everyone keeps their login and history), username, names, avatar, `userId` → `legacy_user_id`; email → `player_private` |
| `Matches` | `matches`: confirmed + visible → `confirmed`; recorded but unconfirmed → `pending`; `matchType` → `format`; `playedAt` → `created_at` (exact) and `played_on` (date in US Eastern); `points_awarded` = 5/10/20 |
| `MatchDetails` | `match_sets`, games and tiebreaks copied **exactly** (two V1 deciding "sets" of 10–7 and 9–7 were match tiebreaks; they're kept as recorded, not reinterpreted) |
| `User` totals | V1 stored totals that its own match history doesn't explain → `standing_adjustments` (`v1_carry_over`): **2 rows**. Every player's all-time wins, losses and points equal V1 exactly. |
| everything | verbatim in `legacy.*` forever |

Any V1 match state the mapping doesn't know stops the import (no guessing).

## The script
`node scripts/migrate-from-v1.mjs --source <V1 url> --target <Supabase db url> [--target-ca supabase.crt] [--dry-run]`

**Reading V1:** one REPEATABLE READ, READ ONLY transaction.

**Writing the target:** one transaction, which:
1. refuses if `legacy.*` already has rows
2. copies every V1 table into `legacy.*` and proves the copy identical (counts and content hashes)
3. runs `legacy.import_v1()`
4. runs `legacy.reconcile_v1()`: 12 checks covering players, emails, identities, matches by status, players/winner/format/time, sets, set scores and tiebreaks, per-player totals, total points and threads
5. logs the run in `legacy.import_runs`

Any failure, or `--dry-run`, rolls back everything. TLS certificates are verified for any non-local host.

**Tested on the restored backup:**
- **Dry run:** every check passed, and nothing was left behind.
- **Real run:** every check passed.
- **Rerun:** refused.

## Cutover runbook (needs the owner's go-ahead at each ★)
1. ★ **Create the Supabase project** (Free). In its dashboard:
   - **Authentication:** turn off email/phone sign-ups and anonymous sign-ins.
   - **Third-party auth:** add **Clerk** with domain `capable-baboon-71.clerk.accounts.dev` (the production Clerk instance).
2. ★ **Clerk dashboard** (that instance): Integrations → **Supabase** → activate. This adds `role: authenticated` to session tokens.
3. **Apply migrations:**
   - Run `supabase link --project-ref <ref>`, then `supabase db push`.
   - Set the trusted issuer: `update public.app_settings set trusted_issuers = array['https://capable-baboon-71.clerk.accounts.dev'];`
   - Do **not** run `seed.sql` remotely.
4. **Freeze V1.** It's been inactive since 2025-10-02. Tell the group not to log matches during the switch.
5. ★ **Fresh backup of V1** and verify it, exactly as above.
6. ★ **Run the migration:** `--dry-run` first, then for real. Use the session-pooler or direct URL, with `--target-ca` (Supabase CA from the dashboard).
7. **Make yourself admin:** `update public.players set is_admin = true where username = '<yours>';`
8. **Set Vercel env vars:**
   - Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. Keep the existing Clerk keys.
   - Leave the V1 vars (`DATABASE_URL`, `POSTGRES_*`, `UPSTASH_*`) in place until V2 is verified; remove them after.
9. ★ **Deploy a preview and smoke test it** with your real sign-in: home shows your rank, rankings match V1, open a profile, record a test match and withdraw it.
10. ★ **Production deploy** of branch `v2` (merge to `main`).
11. **Afterwards:** keep Neon read-only for 30 days, then decide whether to archive it. The backup stays in `~/Backups/baseline/`.

### Writes between steps 5 and 10
If anything was logged in V1 after the backup, re-run steps 5 and 6. The target refuses to import twice, so first empty it with `truncate public.players, public.matches, … cascade; truncate legacy.* ;` or recreate the project.

### Rollback
- **Instant:** Vercel → Deployments → the last V1 deployment → *Promote to production*.
- **V1's data is untouched,** because the migration only reads it. Matches logged in V2 after cutover would need re-entering in V1.
- **V2's data stays** in Supabase for a retry.

## Known follow-ups
- Production runs on a Clerk **development** instance. That's acceptable for a friends app, but Clerk shows a dev banner and limits dev instances.
- A Clerk **production** instance needs a custom domain, and moving there changes every Clerk user id. When that happens, remap `players.clerk_user_id` by verified email; `player_private` has them.
