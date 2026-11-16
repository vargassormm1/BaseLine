# Changelog

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
- **Stack:** Next 16, React 19, TypeScript strict, Tailwind 4, Clerk 7, supabase-js.
- **Removed:** antd, Prisma, Upstash, socket.io, @vercel/postgres and react-responsive.
- **Dependencies:** `npm audit` reports 0 vulnerabilities.
