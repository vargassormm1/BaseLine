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
| `User` | `players`: username, names, avatar, `userId` → `legacy_user_id`, `clerkId` kept as `clerk_user_id` (history); email → `player_private`. `auth_user_id` starts empty: each player links on their **first Google sign-in** by that same email. |
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
1. ★ **Google Cloud console** (free, about 10 minutes):
   - **Create a project.**
   - **OAuth consent screen:**
     - External, app name "Baseline".
     - Scopes: `openid`, `email`, `profile` only.
     - **Publish** it ("In production"). Basic scopes need no Google review, and while it's in "Testing" only listed test users can sign in.
   - **Credentials → OAuth client ID:**
     - Type: Web application.
     - Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`.
     - Keep the client ID and secret.
2. ★ **Create the Supabase project** (Free). In its dashboard:
   - **Auth → Sign In / Providers:**
     - **Google** on, with the client ID and secret.
     - **Email** provider **off**.
     - Anonymous sign-ins **off**.
     - "Allow new users to sign up" stays on. Google needs it to create accounts, and Baseline still requires an invite or a V1 email match before anyone becomes a player.
   - **Auth → URL Configuration:**
     - Site URL: `https://base-line.vercel.app`.
     - Redirect URLs: `https://base-line.vercel.app/auth/callback**`, plus your Vercel preview URL pattern if you want to test previews.
3. **Apply migrations:** run `supabase link --project-ref <ref>`, then `supabase db push`. Do **not** run `seed.sql` remotely.
4. **Freeze V1.** It's been inactive since 2025-10-02. Tell the group not to log matches during the switch.
5. ★ **Fresh backup of V1** and verify it, exactly as above.
6. ★ **Run the migration:** `--dry-run` first, then for real. Use the session-pooler or direct URL, with `--target-ca`.
7. **Set Vercel env vars:**
   - Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`.
   - Leave the V1 vars (`DATABASE_URL`, `POSTGRES_*`, `UPSTASH_*`, Clerk keys) in place until V2 is verified, so V1 can still be rolled back to; remove them after.
8. ★ **Deploy a preview and smoke test it:**
   - Sign in with **your Google account**. You should land on Home as yourself, with your V1 rank and history.
   - Check that rankings match V1. Record a test match and withdraw it.
9. **Make yourself admin:** `update public.players set is_admin = true where username = '<yours>';`
10. ★ **Production deploy** of branch `v2` (merge to `main`).
11. **Friends sign in** with their Google accounts and link automatically.
    - If someone lands on "Get on the board" instead, their Google email differs from V1's.
    - Link them with the snippet at the end of `supabase/migrations/…0600_supabase_auth.sql`. Don't send them an invite.
12. **Afterwards:**
    - Keep Neon read-only for 30 days, then decide whether to archive it. The backup stays in `~/Backups/baseline/`.
    - Once V2 has been stable for 30 days, delete the Clerk application. V1 rollback needs it until then.
    - V1 profile photos are served by Clerk until each player's first Google sign-in replaces them with their Google photo.

### Writes between steps 5 and 10
If anything was logged in V1 after the backup, re-run steps 5 and 6. The target refuses to import twice, so first empty it with `truncate public.players, public.matches, … cascade; truncate legacy.* ;` or recreate the project.

### Rollback
- **Instant:** Vercel → Deployments → the last V1 deployment → *Promote to production* (V1 still uses Clerk and Neon, both untouched).
- **V1's data is untouched,** because the migration only reads it. Matches logged in V2 after cutover would need re-entering in V1.
- **V2's data stays** in Supabase for a retry.

## Known follow-ups
- Google sign-in only. Adding email sign-in later needs an email provider (and a domain to send from).
