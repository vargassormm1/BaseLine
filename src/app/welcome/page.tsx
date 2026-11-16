import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSession, INVITE_COOKIE } from "@/lib/server/session";
import { Wordmark } from "@/components/shell/Nav";
import { ProfileForm } from "@/components/settings/ProfileForm";

export const metadata = { title: "Welcome" };

export default async function Welcome() {
  const s = await getSession();
  if (!s) redirect("/sign-in");
  if (s.me) redirect("/home");
  const p = await s.id.profile();
  return (
    <main className="pt-safe mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <Wordmark />
      <h1 className="display mt-8 text-[40px]">Get on the board</h1>
      <p className="mt-3 text-text-2">Your username is how other players find you and how you show up in the rankings.</p>
      <div className="mt-8"><ProfileForm mode="welcome" initial={{ username: p.username ?? "", firstName: p.firstName, lastName: p.lastName, invite: (await cookies()).get(INVITE_COOKIE)?.value ?? "" }} /></div>
    </main>
  );
}
