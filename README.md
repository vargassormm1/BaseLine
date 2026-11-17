# Baseline

A tennis competition app for a group of friends: record matches (your opponent confirms the score), earn points
(5 / 10 / 20 for a one-set / best-of-3 / best-of-5 win), climb the rankings, settle rivalries head to head, and
challenge each other. Invite-only.

**Stack:** Next.js 16 (App Router, TypeScript strict) · React 19 · Tailwind 4 · Supabase (Postgres with RLS and
validated SQL write functions; Auth with Google sign-in) · Vercel. Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Develop
```bash
npm install                 # uses .npmrc (legacy-peer-deps) — see docs/DECISIONS.md
supabase start              # local Supabase on ports 553xx (fictional seed data)
supabase db reset           # re-apply migrations + seed
cp .env.example .env.development.local   # point at local Supabase (Google sign-in needs a Google client; tests don't)
npm run dev                 # http://localhost:3100
```

## Test
```bash
npm run typecheck
npm test                    # tennis engine + guard tests
npm run test:db             # RLS, permissions and every write rule, against local Supabase
npm run test:e2e            # phone + desktop browser tests (production build, local test sign-in)
```

## Docs
| | |
|---|---|
| [PRODUCT_SPEC](docs/PRODUCT_SPEC.md) | what the app does, match and ranking rules |
| [ARCHITECTURE](docs/ARCHITECTURE.md) | structure, data flow, design system |
| [DATABASE](docs/DATABASE.md) | schema, RLS, write functions |
| [PERFORMANCE](docs/PERFORMANCE.md) | navigation speed: what was slow, what changed, measurements |
| [SECURITY](docs/SECURITY.md) | authorization model, protections, open risks |
| [MIGRATION](docs/MIGRATION.md) | V1 → V2 data migration, cutover runbook, rollback |
| [DECISIONS](docs/DECISIONS.md) | why things are the way they are |
| [CHANGELOG](docs/CHANGELOG.md) | what changed from V1 |

Deploying to production and the production data migration both require the owner's explicit approval
(see MIGRATION.md).
