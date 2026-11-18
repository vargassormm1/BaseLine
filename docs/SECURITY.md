# Security

## Model
- **Identity:**
  - Supabase Auth with Google only. Sessions live in httpOnly cookies (@supabase/ssr), refreshed in `src/proxy.ts`. The server verifies every session token's signature and expiry (`auth.getClaims()`, local, with the project's public keys), and the database verifies it again on each query. A revoked session ends when its token expires (≤ 1 hour).
  - `me()` maps `auth.uid()` to a player; anonymous sessions never count.
  - V1 players link once, by a **Google-verified** email, and only if not already linked. Email/password sign-in is off, so nobody can register someone else's email.
- **Authorization lives in the database:**
  - RLS on every table controls reads.
  - Writes only go through `SECURITY DEFINER` functions that check who is calling. API roles have no table writes.
  - The app's checks (`requirePlayer`, zod) come on top of that, not instead of it.
- **Membership:** invite-only. New players need a one-time code (hashed in the database, 14-day expiry). V1 players link by their verified Google email instead.
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
  - Sign-in abuse is limited by Supabase Auth's built-in rate limits and by Google itself.
- **Validation:** zod at the app boundary, plus the same rules in SQL (shared tennis-score test vectors). IDs are UUID-checked and usernames regex-checked.
- **Sign-in flow:**
  - Google OAuth with PKCE. `/auth/google` is a GET link, so the CSP's form-action never blocks it.
  - `/auth/callback` exchanges the one-time code. Post-sign-in destinations go through `safeNext()`, which allows same-site paths only (no open redirects).
  - Sign-out is a POST server action.
- **Headers:**
  - A per-request nonce CSP (`strict-dynamic`, `frame-ancestors 'none'`, `object-src 'none'`, `form-action 'self'`).
  - `Cache-Control: private, no-store` on pages.
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
| 3 | Medium | Supabase-issued tokens would be treated like Clerk's | **Superseded:** Supabase Auth is now the only identity, with the email provider off, anonymous sessions rejected, and linking only by Google-verified email |
| 4 | Low/Med | The same match could be recorded twice | **Fixed:** duplicate guard with explicit override |
| 5 | Low | Old pending V1 results could be confirmed years later | **Fixed:** confirmation only within one year |
| 6 | Low | Migration TLS: substring host match, no certificate check | **Fixed:** exact hostname, verified certificates |
| 7 | Low | Test sign-in guard relies on `VERCEL` | **Accepted:** also needs a loopback database and the local JWT secret; documented |
| 8 | Low | Expired challenge status was rolled back | **Fixed** |
| 9 | Low | Match idempotency keys and void-by readable | **Fixed:** column grants |

## Second independent review (2026-11-17: Supabase Auth switch, photo uploads)
| # | Severity | Finding | Status |
|---|---|---|---|
| 1 | High (conditional) | Linking a V1 player trusted JWT claims (`email` can be changed by the user, `user_metadata.email_verified` is user-editable) | **Fixed:** `ensure_player` reads the Google identity row in `auth.identities` (verified by Google); tests cover forged claims, a switched account email and an unverified identity |
| 2 | Medium | Photo deletes did nothing (no SELECT policy), uploads effectively unlimited | **Fixed:** own-folder SELECT policy, upload ticket (20/hour) before uploading, 3-file cap; tested that deletes really delete |
| 3 | Low/Med | Any object name allowed in the caller's folder | **Fixed:** name must be `<player id>/<uuid>.webp` |
| 4 | Low | Session cookies set outside the proxy lacked `Secure` | **Fixed** |
| 5 | Low | Unlimited invite attempts by a signed-in non-player | **Fixed:** 10/hour per account (`auth_rate_limits`), tested |
| 6 | Low | Photo check was magic bytes only | **Fixed:** must be a still 256×256 WebP (header parsed) |
| 7 | Low | Removed photos cached for a year | **Fixed:** 1 day |
| 8 | Low | CSP `img-src` broader than needed | **Fixed:** only the avatars bucket path |
| 9 | Info | `?q=a&q=b` on Matches returned a 500 | **Fixed** |
| 10 | Info | Invite cookie never cleared | **Fixed:** cleared on joining and sign-out |

## Rate limits (all in Postgres; no Redis, no paid service)
| Action | Limit | Keyed by | Where |
|---|---|---|---|
| Record a match | 20 / hour | player | `record_match` |
| Confirm / reject | 120 / hour | player | `respond_match` |
| Create a challenge | 15 / day | player | `create_challenge` |
| Create an invite | 10 / day | player | `create_invite` |
| Edit profile | 10 / hour | player | `update_profile` |
| Upload a photo | 20 / hour, 3 files max | player | `avatar_upload_ticket`, storage policy |
| Join with an invite | 10 tries / hour | signed-in account | `ensure_player` |
| Sign-in | Supabase Auth's built-in limits + Google (+ Turnstile for username accounts, when on) | IP / account | Supabase dashboard → Auth → Rate Limits |
| Anonymous traffic | recommended: Vercel Firewall rule, 60 requests / minute per IP on `/sign-in`, `/auth/*`, `/join/*` | IP | **needs the Vercel dashboard** (free on Hobby: 1 rule) |

One row per player and bucket (fixed window), so the counters never grow without bound. Limits return a friendly message; the app never says whether an account exists.

## Decisions on the security brief
- **Bot challenge (Turnstile): ready, optional.** Username + password sign-up exists (behind `BASELINE_PASSWORD_AUTH`, see `PASSWORD_AUTH.md`). Turnstile turns on when `TURNSTILE_SITE_KEY` is set in Vercel and the secret is in Supabase Attack Protection. Accounts still need a one-time invite to become players.
- **Password accounts use a reserved, undeliverable address** (`<username>@players.baseline.invalid`); the Before User Created hook (migration 0900) rejects any other email for password sign-ups, so nobody can pre-create an account under a friend's real email and have Supabase merge it with their Google sign-in. Password accounts can't claim V1 history (Google-only linking).
- **CSRF:** every state change is a Next.js server action (POST with an Origin check) and cookies are `SameSite=Lax`. No GET route changes data (invite links only set a cookie).
- **PWA:** there is no service worker, so nothing is cached offline: no tokens, no private pages. Pages are sent `Cache-Control: private, no-store`. Signing out clears the session and invite cookies.
- **Scanners:** unknown paths get the sign-in redirect or a 404; `.env*` files are never deployed (`.gitignore`, and Vercel builds from git). Errors show fixed messages only.
- **Logging:** rejected actions raise Postgres errors with short codes (`rate_limited`, `not_allowed`, `invalid_score…`), visible in Supabase → Logs → Postgres; sign-in failures are in Supabase → Logs → Auth; request spikes in Vercel → Observability. No passwords, tokens, invite codes or emails are logged by the app.
- **Dependencies:** `npm audit` = 0 known vulnerabilities; exact versions pinned; the animation library was removed.

## Open risks (prioritized)
1. **Dashboard settings matter:**
   - Supabase: email provider off, anonymous sign-ins off, Google on, manual identity linking off, redirect URLs limited to `https://base-line.vercel.app/auth/callback**`.
   - Vercel: add the Firewall rate-limit rule above.
   - Even with a wrong setting, nobody becomes a player without an invite, and a V1 player can only be linked by a Google-verified identity.
2. **Two colluding invited friends could still farm points** with each other. That's a social limit, not a technical one. An admin can void results.
3. **A V1 player whose Google email differs from the one on file** can't self-link. An admin links them (SQL snippet); they must not take an invite and start over.
4. **Pending results show a 200 status for "not found".** Streaming pages return 200 before the not-found UI renders. No data is exposed (tested).
5. **The CSP allows `style-src 'unsafe-inline'`.** It's used for computed sizes (avatars, bars). Scripts stay nonce-locked.

Passing `npm audit` or these tests doesn't prove the app is secure. Re-run the review after major changes.
