# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev       # Start dev server (localhost:3000)
npm run build     # Production build
npm run start     # Start production server
npm run lint      # Run ESLint
npx prisma generate          # Regenerate Prisma client after schema changes
npx prisma db push           # Push schema changes to database
npx prisma migrate dev       # Create and apply migrations
```

No test framework is configured.

## Architecture

BaseLine is a tennis match-tracking web app built with **Next.js 14 App Router** (JavaScript/JSX, not TypeScript). Players log matches, confirm results, earn points, and view rankings.

### Tech Stack
- **Frontend:** Next.js 14, React 18, Ant Design (antd), CSS Modules
- **Backend:** Next.js API Routes with Upstash rate limiting (100 req/15s per user)
- **Database:** PostgreSQL (Neon) via Prisma ORM
- **Auth:** Clerk (middleware protects all routes except landing, sign-in, sign-up)
- **Deployment:** Vercel

### Key Directories
- `src/app/` — Pages (App Router) and API routes (`src/app/api/`)
- `src/components/` — React components, each in its own folder with a `.module.css` file
- `src/utils/api.js` — Client-side fetch wrappers for all API endpoints
- `src/utils/db.js` — Prisma client singleton (avoids multiple instances in dev)
- `src/context/PendingMatchContext.js` — Global context for pending match badge count
- `src/middleware.js` — Clerk auth middleware; protected routes: `/home`, `/h2h`, `/rankings`, `/pending`, `/profile`, `/messages`
- `prisma/schema.prisma` — Database schema

### Data Flow
1. Client components call helpers from `src/utils/api.js`
2. API routes in `src/app/api/` validate auth, apply rate limiting, then use Prisma
3. All API responses follow `{ data: ... }` or `{ error: ... }` shape

### Match System
- Matches require **both players to confirm** before being finalized (two-step confirmation)
- Match types: Best of 1 (5 pts), Best of 3 (10 pts), Best of 5 (20 pts)
- Creating a match writes to both `Matches` and `MatchDetails` (per-set scores)
- `User.totalWins`, `totalLosses`, and `totalPoints` are updated atomically in Prisma transactions on confirm

### Database Models
- **User** — linked to Clerk via `clerkId`; tracks aggregate win/loss/points
- **Matches** — match metadata with two-player confirmation booleans
- **MatchDetails** — per-set scores (including optional tiebreaker scores)
- **MessageThread / Message** — messaging models exist in schema but feature is currently removed from UI

### Important Rules
- **Never write to the database** — only read operations. No INSERT, UPDATE, DELETE, or Prisma create/update/delete calls.
- **Always validate column names** when making new API routes or functions — verify field names against `prisma/schema.prisma` before using them in queries.

### Path Alias
`@/*` maps to `./src/*` (configured in `jsconfig.json`)

### Environment Variables
Required: `DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, plus Clerk redirect URLs (`NEXT_PUBLIC_CLERK_SIGN_IN_URL`, etc.)
