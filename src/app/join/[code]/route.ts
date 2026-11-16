// Invite link: /join/ABCD-EFGH-JKLM. Remembers the code (httpOnly, 14 days) and sends the friend to sign up.
// The code is only checked when the player is created (public.ensure_player), never here.
import { NextResponse, type NextRequest } from "next/server";
import { INVITE_COOKIE } from "@/lib/server/session";

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  if (req.headers.get("next-router-prefetch") || req.headers.get("purpose") === "prefetch") return new NextResponse(null, { status: 204 });
  const code = (await params).code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const res = NextResponse.redirect(new URL("/sign-up", req.nextUrl.origin));
  if (code.length >= 6 && code.length <= 40) {
    res.cookies.set(INVITE_COOKIE, code, { httpOnly: true, secure: req.nextUrl.protocol === "https:", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 14 });
  }
  return res;
}
