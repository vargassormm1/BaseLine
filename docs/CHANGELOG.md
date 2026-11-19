# Changelog

## 2026-11-19 — Pickleball (branch `pickleball`, not deployed)
- Second sport: singles and doubles, formats one game to 11/15/21, best of 3/5 to 11, side-out or rally scoring (tag).
  Official 2026 USA Pickleball rules (win by 2; game ends when decided). Separate Singles and Doubles boards; 5/10/10/20
  points to each winner; first 3 point-earning matches per day between the same sides; any opponent confirms.
- Sport switcher on every page (remembers the last sport), pickleball dashboard, record flow, rankings, matches,
  head to head (singles, team vs team, doubles opponents), challenges, profile tab. Landing page mentions both sports.
- Additive migration only; tennis tables, functions and data untouched.

## 2026-11-18 — Username + password sign-in (replaces the email version)
- Create account / sign in with a username and password next to Google; no email, no confirmation. Change password in Settings; the admin resets forgotten ones (SQL in `docs/PASSWORD_AUTH.md`).
- Migration 0900: Before User Created hook that only allows password accounts on the reserved `players.baseline.invalid` domain.
- Behind `BASELINE_PASSWORD_AUTH`. The email confirmation/reset flow and its templates are removed.

## 2026-11-17 — Email + password sign-in
- Create account, sign in, confirm by email, forgot/reset password, alongside Google. Behind `BASELINE_EMAIL_AUTH` until production email sending is set up (`docs/EMAIL_AUTH.md`). Optional Turnstile bot check.
- Redirects after sign-in use the host the request came in on.

## 2.0.0 — Baseline V2 (branch `v2`, not yet deployed)
**Product**
- **Home:** an athlete card (rank, points, record, season rank, form, streak), "Your move", rivals, recent matches and the top of the table.
- **Recording a match:** tap-first score entry with real tennis validation, tiebreaks and match tiebreaks, a live scoreboard, opponent confirmation, withdraw, and a duplicate guard.
- **Rankings:** all-time and per season, with 7-day movement and form. Bug fixes:
  - Season views now use that season's points, not all-time points.
  - Unconfirmed matches no longer count.
- **Head to head:** a full matchup page (record, split bar, sets, games, tiebreaks, by format, biggest wins, every meeting). It now counts confirmed matches only.
- **Athlete profiles:** stats, last 10, by format, achievements, rivals and history.
- **Challenges:** they now actually exist.
- **Google sign-in through Supabase Auth,** replacing Clerk. V1 players link automatically by email.
- **Invite-only membership:** invite links.
- **Admin void:** with a reason; the match is kept.
- **Settings:** theme (system/light/dark) and profile.

**Data**
- **Moved to Supabase:** Neon/Prisma → Supabase Postgres, with verified backup, migration and reconciliation (5 players, 119 matches, 130 sets; every total identical).
- **Nothing is a stored counter:** records and points are derived. V1 drift is kept as explicit carry-over adjustments.

**Security** (V1 issues fixed)
- Any user could confirm any match with arbitrary points.
- Any user could delete any match.
- Match creation trusted the client.
- Emails were sent to every browser.
- Next.js 14.1.3 had critical advisories, including the middleware bypass.
- Clerk 5.0.4 was vulnerable.
- There was no CSP.

New in V2: RLS, SQL write functions, rate limits, a nonce CSP, an independent review with all findings addressed, and DB, guard and browser tests.

**Tech**
- **Stack:** Next 16, React 19, TypeScript strict, Tailwind 4, Supabase (Postgres + Auth), supabase-js and @supabase/ssr.
- **Removed:** Clerk, antd, Prisma, Upstash, socket.io, @vercel/postgres and react-responsive.
- **Dependencies:** `npm audit` reports 0 vulnerabilities.
