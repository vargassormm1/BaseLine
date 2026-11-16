# Baseline (V2)

Tennis match tracker for a group of friends. Next.js 16 + TypeScript + Tailwind 4 + Supabase (Postgres + Auth with Google). Docs in `docs/`
(start with PRODUCT_SPEC, ARCHITECTURE, SECURITY, MIGRATION). Project status/log also in
`~/Coding/SideProjects/documentation/baseline/`.

## Commands
`npm run typecheck` · `npm test` · `npm run test:db` (needs `supabase start`) · `npm run test:e2e` · `supabase db reset`
(fictional seed) · `npm run db:types` after schema changes. Use `./node_modules/.bin/*`, never npx in scripts.

## Rules
- **Never touch production data.**
  - V1 (Neon) is read-only. The only writer to a production Supabase is `scripts/migrate-from-v1.mjs`, and only with the owner's approval.
  - Don't print emails or other personal data.
- **No production deploys, env changes or cutover steps without explicit approval** (runbook: docs/MIGRATION.md).
- **Writes go through SQL functions** (`supabase/migrations`), never direct table writes. A new write means: a function with `require_me()`, ownership checks, validation and a rate limit; `revoke … from public, anon`, `grant … to authenticated`; plus a DB test.
- **Tennis rules live in `src/lib/tennis`** (pure, unit-tested). `score.ts` and `validate_sets()` must stay in sync (`tests/fixtures/scores.json` runs against both).
- **Records and points are derived from confirmed matches.** Never add counters. Never rewrite `points_awarded` or legacy rows.
- **Server-only code stays on the server:** `src/lib/server`, never imported by `"use client"` files (guard test). No service key in the app.
- **The local test sign-in** (`BASELINE_E2E`) must stay local-only (guard test).
- **Commits:** small, plain messages, no Co-Authored-By / Claude trailers.
