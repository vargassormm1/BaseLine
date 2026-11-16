# Architecture

## Shape
```
browser ──▶ Next.js on Vercel (server components + server actions; src/proxy.ts: Clerk + nonce CSP)
              │  Clerk session (auth()) → the player's Clerk session token
              ▼
           Supabase Postgres (PostgREST)  ── verifies the Clerk token (third-party auth), RLS on every read,
                                              writes only through SECURITY DEFINER functions
```
The browser never talks to Supabase. Every query runs as the signed-in player, so RLS applies even if app code is wrong.

## Directory map
| Path | What |
|---|---|
| `src/lib/tennis/` | Pure domain: score rules (`score.ts`), points, standings, stats, head-to-head, achievements, dates. No React, no DB. Unit-tested. |
| `src/lib/server/` | Server-only: `identity.ts` (Clerk, or the guarded local test sign-in), `session.ts` (Supabase client per player, `requirePlayer()`), `data.ts` (one cached read per request), `env.ts`. |
| `src/app/actions.ts` | Every write: identify → zod-validate (`src/lib/validation.ts`) → one SQL function → friendly error (`src/lib/errors.ts`). |
| `src/app/(app)/` | Signed-in screens. `layout.tsx` = shell (rail / tab bar) + toasts. |
| `src/app/` | Landing, welcome, Clerk sign-in/up, `join/[code]` (invite link), `e2e/sign-in` (local tests only). |
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

## Design system ("night court")
- **Tokens:** `src/app/globals.css`. Charcoal and chalk surfaces; **optic yellow** (`--ball`) for wins and the one primary action; **clay** (`--clay`) for losses.
- **Type:** Archivo across widths. `.score` (condensed 75%, heavy, tabular) for scoreboard numerals; `.display` (112% wide, heavy) for names and headings.
- **Surfaces:** solid only, no glass. The dark "athlete card" and the H2H matchup stay dark in both themes, as signature moments.
- **Contrast:** every text pair is AA (axe runs in e2e, light and dark).
- **Motion:** `motion` only where it explains something: set cards appearing, the H2H split bar, toasts. CSS `rise` on page entry. Reduced motion is honored.
- **Navigation:** phones get five tabs with the Record ball in the center; desktop gets a left rail. Challenges and Players are reached from Home, Rankings and the rail.

## Rendering & caching
All signed-in pages are dynamic (per-player data, RLS); Supabase fetches use `cache: "no-store"`; nothing personal is
cached across users. Writes call `revalidatePath("/", "layout")`. `loading.tsx` gives an instant skeleton.
