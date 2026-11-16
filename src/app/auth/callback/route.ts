// Google → Supabase → here with a one-time code: exchange it for a session (cookies), then go on.
import { NextResponse, type NextRequest } from "next/server";
import { supabaseForRequest } from "@/lib/server/identity";
import { safeNext } from "@/lib/server/redirects";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const next = safeNext(req.nextUrl.searchParams.get("next"));
  if (code) {
    const sb = await supabaseForRequest();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, req.nextUrl.origin));
  }
  return NextResponse.redirect(new URL("/sign-in?error=google", req.nextUrl.origin));
}
