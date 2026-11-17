# Architecture

## Shape
```
browser ──▶ Next.js on Vercel (server components + server actions; src/proxy.ts: nonce CSP, session refresh, gate)
   │            │  Supabase Auth session in httpOnly cookies (@supabase/ssr) → the player's access token
   │            ▼
   │         Supabase Postgres (PostgREST) ── RLS on every read (auth.uid() → player), writes only through
   │                                          SECURITY DEFINER functions
   └── Google sign-in: /auth/google → Google → Supabase Auth → /auth/callback (PKCE code exchange)
```
The browser never talks to Supabase. Every query runs as the signed-in player, so RLS applies even if app code is wrong.

## Directory map
| Path | What |
|---|---|
| `src/lib/tennis/` | Pure domain: score rules (`score.ts`), points, standings, stats, head-to-head, achievements, dates. No React, no DB. Unit-tested. |
| `src/lib/server/` | Server-only: `identity.ts` (Supabase Auth user via `getUser()`, or the guarded local test sign-in), `session.ts` (`getSession()`/`requirePlayer()`, links or joins on first visit), `data.ts` (one cached read per request), `redirects.ts` (`safeNext`), `env.ts`. |
| `src/app/actions.ts` | Every write: identify → zod-validate (`src/lib/validation.ts`) → one SQL function → friendly error (`src/lib/errors.ts`). |
| `src/app/(app)/` | Signed-in screens. `layout.tsx` = shell (rail / tab bar) + toasts. |
| `src/app/` | Landing, `sign-in`, `auth/google` + `auth/callback` (Google round trip), welcome, `join/[code]` (invite link), `e2e/sign-in` (local tests only). |
| `src/components/` | `ui/` primitives, `shell/`, `tennis/` (scoreboard, leaderboard row, split bar), `record/`, `actions/`, `settings/`. |
| `supabase/migrations/` | Schema, RLS, write functions, V1 import, hardening. `seed.sql` = fictional local data. |
| `scripts/migrate-from-v1.mjs` | The V1 → V2 data migration. |
| `tests/` | Unit (engine, guards), `tests/db` (RLS + every rule, against local Supabase), `e2e/` (Playwright). |
| `docs/` | This documentation. |

## Data flow for a match
1. `/record` (client form) builds `sets` with the same rules as the server (`checkMatch`) for live feedback.
2. `recordMatch` action → zod → `record_match()` SQL: player from JWT, opponent check, date window, `validate_sets()`
   (mirror of `score.ts`), duplicate check, challenge check, idempotent on the form's `client_key` → `pending`.
3. Opponent: `respond_match()` (row lock; double confirms are no-ops) → `confirmed` (+ challenge completed).
4. Screens derive standings/stats from confirmed matches in TS (`standings.ts`, `stats.ts`) — nothing is a counter.

## Reads
`loadBoard()` fetches players, visible matches (with sets), adjustments and the player's challenges in one round trip
per request (`react.cache`). At this group's scale (hundreds of matches) this is faster and simpler than many queries;
if it ever reaches thousands, page match history and move standings into a SQL view.

## Design system (sport-neutral)
- **Tokens:** `src/app/globals.css`. Charcoal and warm off-white surfaces; **forest green** (`--panel`, #163D32) for the brand panels and the icon; **sport green** (`--accent`, #22A06B, always with dark text on it) for the one primary action, selection and wins; a restrained red (`--loss`) for losses and errors. No sport in any token name.
- **Type:** Archivo across widths. `.score` (condensed 75%, heavy, tabular) for scoreboard numerals; `.display` (112% wide, heavy) for names and headings.
- **Surfaces:** solid only, no glass. The dark "athlete card" and the H2H matchup stay dark in both themes, as signature moments.
- **Contrast:** every text pair is AA (axe runs in e2e, light and dark).
- **Motion:** CSS only: `rise` on page entry and toasts, the H2H bar growing, scroll reveal on the landing page where supported. Reduced motion is honored.
- **Responsive rules:** layout children may always shrink (`min-width: 0`), headings wrap anywhere, hero numerals use `clamp()`, tap targets are at least 44px, the smallest text is 12px. A browser test sweeps 320–1440px in both orientations with a very long name.
- **Navigation:** phones get Home · Matches · Record (the ball) · Rankings · Me; Challenges is the flag on Home; head to head opens from profiles, matches and rivals. Desktop gets a left rail with everything.
- **Hierarchy rule:** one hero per screen, at most three supporting numbers, extra stats behind a disclosure. Lists use hairlines instead of a card per item where possible.

## Rendering & caching
All signed-in pages are dynamic (per-player data, RLS); Supabase fetches use `cache: "no-store"`; nothing personal is
cached across users. Writes call `revalidatePath("/", "layout")`. `loading.tsx` gives an instant skeleton.
