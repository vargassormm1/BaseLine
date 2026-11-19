// The app's entry (home-screen launch, after sign-in): open the sport used last. Signed-out visitors are sent to sign-in
// by the proxy before this runs.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SPORTS, SPORT_COOKIE, isSport } from "@/lib/sports";

export default async function Start(): Promise<never> {
  const c = (await cookies()).get(SPORT_COOKIE)?.value;
  redirect(SPORTS[isSport(c) ? c : "tennis"].home);
}
