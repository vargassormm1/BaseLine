# Security

## Model
- **Identity:**
  - Clerk signs players in. Supabase verifies Clerk's session token (third-party auth).
  - The database trusts only tokens whose `iss` is in `app_settings.trusted_issuers`. A token minted by Supabase Auth itself is never a player.
- **Authorization lives in the database:**
  - RLS on every table controls reads.
  - Writes only go through `SECURITY DEFINER` functions that check who is calling. API roles have no table writes.
  - The app's checks (`requirePlayer`, zod) come on top of that, not instead of it.
- **Membership:** invite-only. New players need a one-time code (hashed in the database, 14-day expiry). V1 players are linked by their Clerk id.
- **Server-side only:** the Supabase client runs on the server with the player's token. No service key exists in the app.

## Protections
- **Results can't be forged or double-counted:**
  - The server computes the winner and points.
  - Only the opponent can confirm, under a row lock, so double confirms are no-ops.
  - Submissions are idempotent: a double tap or retry never creates two matches.
  - The duplicate-match guard needs an explicit override.
  - Points are fixed on each match, and standings are derived, never counters.
- **Abuse limits:**
  - Rate limits per player: recording 20/hour, answering 120/hour, challenges 15/day, invites 10/day, profile 10/hour.
  - Sign-in and sign-up abuse is handled by Clerk.
- **Validation:** zod at the app boundary, plus the same rules in SQL (shared tennis-score test vectors). IDs are UUID-checked and usernames regex-checked.
- **Headers:**
  - A nonce-based CSP via Clerk's middleware (`strict-dynamic`, `frame-ancestors 'none'`, `object-src 'none'`).
  - Also `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, COOP and HSTS. No `X-Powered-By`.
- **No raw HTML:** no `dangerouslySetInnerHTML`, no `eval`. Errors map to fixed messages, never raw database text.
- **The local test sign-in** (`/e2e/sign-in`) only works with `BASELINE_E2E=1`, a loopback `SUPABASE_URL`, and no `VERCEL` variable (guard test). Its tokens use an issuer production doesn't trust.
- **Tests:**
  - DB tests cover RLS (anonymous, two players, an unrelated player, admin), no direct writes, every function rule, untrusted issuers, locked-down helpers, invites and duplicates.
  - Guard tests cover client/server boundaries and the test sign-in switch.
  - Browser tests cover headers and visibility.

## Independent review (2026-11-16)
A separate reviewer audited the code with no access to my conclusions. Findings and status:

| # | Severity | Finding | Status |
|---|---|---|---|
| 1 | High | Open sign-up: strangers or fake accounts could farm points | **Fixed:** invite-only, enforced in SQL |
| 2 | Medium | Rate-limit and helper functions were executable by anon (could lock players out) | **Fixed:** revoked, default privileges tightened, tested |
| 3 | Medium | Supabase-issued tokens would be treated like Clerk's | **Fixed:** trusted issuers (fails closed). Also turn off Supabase Auth sign-ups (runbook) |
| 4 | Low/Med | The same match could be recorded twice | **Fixed:** duplicate guard with explicit override |
| 5 | Low | Old pending V1 results could be confirmed years later | **Fixed:** confirmation only within one year |
| 6 | Low | Migration TLS: substring host match, no certificate check | **Fixed:** exact hostname, verified certificates |
| 7 | Low | Test sign-in guard relies on `VERCEL` | **Accepted:** also needs a loopback database and the local JWT secret; documented |
| 8 | Low | Expired challenge status was rolled back | **Fixed** |
| 9 | Low | Match idempotency keys and void-by readable | **Fixed:** column grants |

## Open risks (prioritized)
1. **Two dashboard settings must be right at cutover.** Supabase Auth sign-ups off, and the Clerk issuer trusted. Both fail closed (nobody gets in) rather than open.
2. **Clerk development instance in production.** Clerk dev instances aren't meant for production; see MIGRATION.md for the follow-up.
3. **Two colluding invited friends could still farm points** with each other. That's a social limit, not a technical one. An admin can void results.
4. **Pending results show a 200 status for "not found".** Streaming pages return 200 before the not-found UI renders. No data is exposed (tested).
5. **The CSP allows `style-src 'unsafe-inline'`.** Clerk's components require it. Scripts stay nonce-locked.

Passing `npm audit` or these tests doesn't prove the app is secure. Re-run the review after major changes.
