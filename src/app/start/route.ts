// The app's entry (home-screen launch, after sign-in): open the sport used last. Signed-out visitors are sent to sign-in
// by the proxy before this runs.
import { NextResponse, type NextRequest } from "next/server";
import { SPORTS, SPORT_COOKIE, isSport } from "@/lib/sports";
import { sameHost } from "@/lib/server/redirects";

export function GET(req: NextRequest) {
  const c = req.cookies.get(SPORT_COOKIE)?.value;
  return NextResponse.redirect(sameHost(req, SPORTS[isSport(c) ? c : "tennis"].home));
}
