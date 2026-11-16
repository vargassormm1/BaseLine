/** Only same-site paths are allowed as a post-sign-in destination (no open redirects). */
export function safeNext(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\") || raw.includes("://") || raw.length > 200) return "/home";
  return /^\/[A-Za-z0-9/_.?=&%-]*$/.test(raw) ? raw : "/home";
}
