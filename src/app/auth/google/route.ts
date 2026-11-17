// "Continue with Google": starts the OAuth round trip (PKCE). A plain GET link, so the CSP's form-action never blocks it.
import { NextResponse, type NextRequest } from "next/server";
import { supabaseForRequest } from "@/lib/server/identity";
import { safeNext, sameHost } from "@/lib/server/redirects";

export async function GET(req: NextRequest) {
  const next = safeNext(req.nextUrl.searchParams.get("next"));
  const sb = await supabaseForRequest();
  const { data, error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${sameHost(req, "/auth/callback").toString()}?next=${encodeURIComponent(next)}`, queryParams: { prompt: "select_account" } },
  });
  if (error || !data.url) return NextResponse.redirect(sameHost(req, "/sign-in?error=google"));
  return NextResponse.redirect(data.url);
}
