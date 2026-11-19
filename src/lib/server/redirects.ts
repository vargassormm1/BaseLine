/** Only same-site paths are allowed as a post-sign-in destination (no open redirects). */
export function safeNext(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\") || raw.includes("://") || raw.length > 200) return "/start";
  return /^\/[A-Za-z0-9/_.?=&%-]*$/.test(raw) ? raw : "/start";
}

/** An absolute URL on the host the request actually came in on (Next's nextUrl.origin can say "localhost" when the
 *  server is bound to 127.0.0.1, which would drop the cookies just set). */
export function sameHost(req: { headers: Headers; nextUrl: { protocol: string; origin: string } }, path: string): URL {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
  return new URL(path, host && /^[A-Za-z0-9.:[\]-]+$/.test(host) ? `${proto === "https" ? "https" : "http"}://${host}` : req.nextUrl.origin);
}
