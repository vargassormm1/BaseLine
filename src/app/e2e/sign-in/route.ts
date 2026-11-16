// Local browser tests only: sign in as a fixed test player (or ?u=out to sign out). 404 everywhere else.
import { NextResponse, type NextRequest } from "next/server";
import { e2eAuthEnabled } from "@/lib/server/env";
import { E2E_COOKIE } from "@/lib/server/identity";

export function GET(req: NextRequest) {
  if (!e2eAuthEnabled()) return new NextResponse("Not found", { status: 404 });
  // never act on a router prefetch (it would sign the browser in without a click)
  if (req.headers.get("next-router-prefetch") || req.headers.get("purpose") === "prefetch") return new NextResponse(null, { status: 204 });
  const u = req.nextUrl.searchParams.get("u") ?? "";
  // stay on the host the browser used (the cookie belongs to it)
  const res = NextResponse.redirect(new URL(u === "out" ? "/" : "/home", `http://${req.headers.get("host") ?? "127.0.0.1"}`));
  if (u === "out") res.cookies.delete(E2E_COOKIE);
  else if (/^[a-z]{2,12}$/.test(u)) res.cookies.set(E2E_COOKIE, u, { httpOnly: true, sameSite: "lax", path: "/" });
  return res;
}
