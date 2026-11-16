import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

// Public: the landing page and Clerk's sign-in/up. Everything else needs a signed-in player (pages check again).
const isPublic = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)"]);

const clerk = clerkMiddleware(async (auth, req) => {
  if (!isPublic(req)) await auth.protect();
}, {
  // Clerk builds a nonce-based CSP that includes what its sign-in needs; we add our image hosts.
  contentSecurityPolicy: { strict: true, directives: { "img-src": ["'self'", "data:", "https://img.clerk.com", "https://images.clerk.dev"], "frame-ancestors": ["'none'"], "object-src": ["'none'"], "base-uri": ["'self'"], "form-action": ["'self'"] } },
});

// Local browser tests only (BASELINE_E2E=1, local database, never on Vercel): no Clerk, same strict CSP shape.
function e2e(req: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const dev = process.env.NODE_ENV === "development";
  const csp = [
    "default-src 'self'", `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`, "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://img.clerk.com", "font-src 'self'", "connect-src 'self'", "frame-ancestors 'none'", "object-src 'none'",
    "base-uri 'self'", "form-action 'self'",
  ].join("; ");
  const h = new Headers(req.headers);
  h.set("x-nonce", nonce);
  h.set("Content-Security-Policy", csp);
  const res = NextResponse.next({ request: { headers: h } });
  res.headers.set("Content-Security-Policy", csp);
  return res;
}

const testMode = process.env.BASELINE_E2E === "1" && !process.env.VERCEL && /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(process.env.SUPABASE_URL ?? "");
export default testMode ? e2e : clerk;

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|.*\\.(?:png|jpg|svg|webp|ico|txt)$).*)"] };
