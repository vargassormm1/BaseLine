# Performance

## Navigation delay (investigated 2026-11-17)
**Symptom:** tap a tab, nothing happens for a moment, then the loading state appears.

**Cause (measured / read from the code, production):**
- Server code ran in Virginia (`iad1`, from the `x-vercel-id` header); the database is in Oregon (`us-west-2`).
- Every signed-in navigation made **four cross-country round trips in sequence**:
  1. `src/proxy.ts` asked the Auth server to validate the session (`getUser`) before any byte was sent. This is the "nothing happens" part: not even the skeleton can render until it returns.
  2. The page validated the session again (`getUser`).
  3. `rpc("me")`.
  4. The board queries.
- The tapped tab only changed once the new page arrived.
- Going back to a screen refetched everything (Next's default for dynamic pages).
- Not the cause: database queries (about 1 ms each locally under RLS; `EXPLAIN ANALYZE` as a signed-in player), bundle size, images.

**Fixes:**
| Change | Effect |
|---|---|
| `vercel.json` → `regions: ["pdx1"]` | Server code runs next to the database; each remaining hop is same-region |
| `getClaims()` instead of `getUser()` in the proxy and in `identity()` | The session token is verified locally with the project's public signing keys: 2 network round trips removed per navigation (falls back to a network check if the project uses a legacy shared secret) |
| `loadBoard` starts in parallel with `rpc("me")` | 1 more sequential hop removed: one database round trip (5 parallel requests) per navigation |
| `experimental.staleTimes.dynamic = 30` | Returning to a screen within 30 s is served from the browser's memory; any write (`revalidatePath` + `router.refresh`) clears it |
| Optimistic active tab (`useOptimisticPath` in `Nav.tsx`) | The tapped tab lights up at once |
| `motion` library removed (earlier) | Less JavaScript on every signed-in page |

Sequential cross-region round trips per navigation: **4 → 0** (1 same-region database round trip remains).

**Lab measurements** (local production build, Pixel 7 profile, 4× CPU slowdown, 150 ms latency / 1.6 Mbps; not real users):
| Navigation | Tab lit | Content |
|---|---|---|
| Home → Rankings, first visit | 176 ms | 965 ms |
| Rankings → Matches, first visit | 27 ms | 813 ms |
| Matches → Home, revisit | 28 ms | 58 ms |
| Home → Rankings, revisit | 35 ms | 61 ms |

A browser test (`navigation: a tapped tab responds at once…`) slows every page request by 1.2 s and asserts the tab lights within 300 ms and a revisit renders within 600 ms.

Landing page (same profile): LCP 1.7 s, CLS 0.02. App pages: CLS 0.00. No Lighthouse run and no real-user data yet (Vercel Speed Insights is not installed).

## Trade-offs
- **Session revocation:** a revoked session keeps working until its token expires (≤ 1 hour), because tokens are verified locally. Every database query still verifies the token.
- **Freshness:** another player's new result can take up to 30 s to appear when you return to a screen you just had open. Your own actions show immediately.
- **Scale:** `loadBoard` reads all visible matches on each (uncached) navigation. That's about 120 matches today. If it grows into the thousands, page the Matches screen and move standings into a SQL view.

## Not done
- No service worker (deliberate: no private data cached on the device). The installed app starts with one normal page load.
