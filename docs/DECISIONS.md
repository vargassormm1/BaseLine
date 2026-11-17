# Decisions

Made by Claude under Matt's "full creative and technical freedom" brief (2026-11-16), except where noted. Each:
decision · alternatives · why.

1. **Modernize in place on branch `v2`.** The alternative was a new repo. Same repo keeps the history, and V1 stays on `main` until cutover.
2. **Keep Clerk on the same instance.** The alternative was Supabase Auth. Keeping it means:
   - Every player keeps the same login and all their history, with no re-registration.
   - There's zero risk of mixing up identities.
   - No email provider is needed (Supabase Auth's built-in email only reaches project members).

   Supabase verifies Clerk tokens (third-party auth), so RLS still works.
3. **Supabase Postgres with RLS, writes only through SQL functions.** The alternative was API routes with an ORM. Authorization then lives in the database, so even an app bug can't bypass it. Prisma and Upstash are gone.
4. **Derive records, points and stats from confirmed matches.** The alternative was V1's mutable counters, which had drifted for 2 players. Derived numbers are auditable and can't double-count. `points_awarded` is stored per match, so rules can change without rewriting history.
5. **Keep the original points system (5/10/20, losses cost nothing).** Elo was considered and rejected: the simple system is the heart of the game, and every V1 total is preserved exactly. The V1 drift is carried over as explicit, labelled `standing_adjustments` rather than silently "fixed".
6. **Proper tennis validation.** Sets: 6–0…6–4, 7–5, 7–6 with a tiebreak; optional match-tiebreak decider. Two V1 deciding "sets" (10–7, 9–7) show the group plays match tiebreaks. V1 data stays exactly as recorded. No pro sets, retirements, walkovers or doubles; they'd add input complexity for cases the data never shows.
7. **Invite-only** (after the security review). Open sign-up let anyone farm points with fake accounts. A one-time invite from an existing player keeps it a friends' app, enforced in SQL.
8. **Challenges for real.** V1 advertised challenges that didn't exist. They're kept simple: format, a message, an optional date, a 14-day expiry, and record the result from the challenge. No scheduling or venues.
9. **Messaging dropped.** V1 had already removed it from the UI; its 2 empty threads stay in `legacy.*`.
10. **Admin can void, not delete or edit.** Nothing is ever deleted; a void keeps the match visible with its reason. There's no score editing: reject and re-record instead.
11. **One-page score entry, tap-first.** It's the fastest flow on a phone: pick the set winner, tap a common score, and only type tiebreak points.
12. **Design: a lively green sports brand** (Matt, 2026-11-17; after lime, navy/blue/gold and a quieter forest-green pass).
    - **Colors:** rally green #19B779 (primary action, wins; ink text on it, since white fails contrast), deep evergreen #123F35 (hero panels, icon), fresh mint #B8F2D4 (soft highlights, "this is you"), warm ivory #FAFAF6, sport ink #151F1A, coral #F27A5E in small touches only.
    - **Mark:** an ivory B on a rally-green line, on evergreen. No ball, racket or court lines; tokens carry no sport in their names.
    - **Landing:** "The match ends. The rivalry doesn't." One CSS-only hero sequence, played once (result → winner → +10 → ranking change); everything is in place with motion off.
    - **Type:** Archivo widths. Wins are a filled dot, losses a hollow ring (never color alone).
13. **Tailwind and a few hand-made components, no component library.** A small app doesn't need shadcn or Radix; native `<dialog>`, links-as-tabs and buttons cover it accessibly. `motion` is used only where movement explains something.
14. **No ESLint.** ESLint's TypeScript plugin doesn't support TypeScript 7 yet. Strict `tsc` plus tests is the check (same as Guap).
15. **`.npmrc` `legacy-peer-deps=true`.** npm 10's resolver crashes on Vitest's optional peer chain. All packages are listed explicitly at exact versions.
16. **Versions:** Next 16.4.6, React 19.3.1, supabase-js 2.118.0, @supabase/ssr 0.12.7, Tailwind 4.3.3, zod 4.6.7, motion 14.7.1, TypeScript 7.0.2. These are the latest stable releases, preferring ones a couple of weeks old or proven in Guap.
17. **Local data is fictional.** `supabase/seed.sql` holds made-up players for development and tests. Real data only ever arrives through the migration script.
18. **Profile photos are uploaded by the player** (Matt, 2026-11-17), never taken from the sign-in account. Resized to a 256px WebP in the browser, stored in a Supabase Storage bucket; initials until then.
19. **No animation library.** `motion` was removed; CSS covers page entry, toasts, the head-to-head bar and scroll reveal (smaller bundle).
20. **No Turnstile for now.** Google-only sign-in plus invite-only joining leaves no form for bots to abuse; revisit with email sign-up.
21. **Speed: run next to the database, verify tokens locally, cache revisits for 30 s** (2026-11-17). See docs/PERFORMANCE.md for the measurements and trade-offs.
