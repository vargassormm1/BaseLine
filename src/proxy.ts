import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Every request: a per-request nonce CSP, a Supabase session refresh (rotated cookies), and a sign-in gate for the
// app (pages check again with requirePlayer()). Public: landing, sign-in, the Google round trip, invite links.
const PUBLIC = [/^\/$/, /^\/sign-in$/, /^\/auth\/(google|callback)$/, /^\/join\/[^/]+$/, /^\/e2e\/sign-in$/];
const COOKIE = { httpOnly: true, sameSite: "lax" as const, path: "/" };

function csp(nonce: string) {
  const dev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'", `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`, "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: ${process.env.SUPABASE_URL ? `${process.env.SUPABASE_URL}/storage/v1/object/public/avatars/` : ""}`.trim(), "font-src 'self'", "connect-src 'self'",
    "frame-ancestors 'none'", "object-src 'none'", "base-uri 'self'", "form-action 'self'",
    // the Turnstile bot check (only when it's configured) runs in Cloudflare's frame
    ...(process.env.TURNSTILE_SITE_KEY ? ["frame-src https://challenges.cloudflare.com"] : []),
  ].join("; ");
}

const testMode = () => process.env.BASELINE_E2E === "1" && !process.env.VERCEL && /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(process.env.SUPABASE_URL ?? "");

export default async function proxy(req: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const policy = csp(nonce);
  const headers = new Headers(req.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", policy);
  let res = NextResponse.next({ request: { headers } });

  let signedIn = false;
  // local tests: the test sign-in cookie, or a real (local) Supabase session from email sign-in
  if (testMode() && req.cookies.has("baseline_e2e_user")) {
    signedIn = true;
  } else {
    const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (url && key) {
      const sb = createServerClient(url, key, {
        cookieOptions: COOKIE,
        cookies: {
          getAll: () => req.cookies.getAll(),
          setAll: (list, extra) => {
            for (const { name, value } of list) req.cookies.set(name, value);
            res = NextResponse.next({ request: { headers } });
            for (const { name, value, options } of list) res.cookies.set(name, value, { ...options, ...COOKIE, secure: req.nextUrl.protocol === "https:" });
            for (const [k, v] of Object.entries(extra)) res.headers.set(k, v);
          },
        },
      });
      // getClaims() refreshes an expired session (rotating the cookies) and verifies the token's signature with the
      // project's public signing keys, cached in memory: no round trip to the Auth server on a normal navigation.
      const { data } = await sb.auth.getClaims();
      signedIn = !!data?.claims?.sub && data.claims.is_anonymous !== true;
    }
  }
  const path = req.nextUrl.pathname;
  // If Supabase's redirect allow-list doesn't include /auth/callback, Google sign-in returns to the site root with the
  // one-time code. Hand it to the callback instead of dropping it.
  if (path === "/" && req.nextUrl.searchParams.has("code")) {
    const cb = new URL("/auth/callback", req.nextUrl.origin);
    cb.searchParams.set("code", req.nextUrl.searchParams.get("code")!);
    return NextResponse.redirect(cb);
  }
  if (!signedIn && !PUBLIC.some((r) => r.test(path))) {
    const to = new URL("/sign-in", req.nextUrl.origin);
    if (path !== "/home") to.searchParams.set("next", path);
    const redirect = NextResponse.redirect(to);
    redirect.headers.set("Content-Security-Policy", policy);
    return redirect;
  }
  res.headers.set("Content-Security-Policy", policy);
  res.headers.set("Cache-Control", "private, no-store"); // per-player pages are never cached
  return res;
}

export const config = {
  matcher: [{ source: "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|icons/|manifest.webmanifest).*)", missing: [{ type: "header", key: "next-router-prefetch" }, { type: "header", key: "purpose", value: "prefetch" }] }],
};
