// Local browser tests only: sign in as a fixed test player (or ?u=out to sign out). 404 everywhere else.
import { NextResponse, type NextRequest } from "next/server";
import { e2eAuthEnabled } from "@/lib/server/env";
import { E2E_COOKIE } from "@/lib/server/identity";

export function GET(req: NextRequest) {
  if (!e2eAuthEnabled()) return new NextResponse("Not found", { status: 404 });
  const u = req.nextUrl.searchParams.get("u") ?? "";
  const res = NextResponse.redirect(new URL(u === "out" ? "/" : "/home", req.url));
  if (u === "out") res.cookies.delete(E2E_COOKIE);
  else if (/^[a-z]{2,12}$/.test(u)) res.cookies.set(E2E_COOKIE, u, { httpOnly: true, sameSite: "lax", path: "/" });
  return res;
}
