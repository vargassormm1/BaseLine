// Links from Baseline's emails land here: confirm a new account's email, or start a password reset.
// The link carries a one-time token hash (works in any browser or device); verifying it signs the person in.
import { sameHost } from "@/lib/server/redirects";
import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseForRequest } from "@/lib/server/identity";

const TYPES: Record<string, EmailOtpType> = { email: "email", signup: "signup", recovery: "recovery" };

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const tokenHash = q.get("token_hash"), type = TYPES[q.get("type") ?? ""];
  if (tokenHash && type && tokenHash.length <= 200) {
    const sb = await supabaseForRequest();
    const { error } = await sb.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(sameHost(req, type === "recovery" ? "/reset-password" : "/home"));
  }
  return NextResponse.redirect(sameHost(req, "/sign-in?error=link"));
}
