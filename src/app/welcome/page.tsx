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
  const p = s.id.profile;
  return (
    <main className="pt-safe mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <Wordmark />
      <h1 className="display mt-8 text-[40px]">Get on the board</h1>
      <p className="mt-3 text-text-2">Your username is how other players find you and how you show up in the rankings.</p>
      <p className="mt-3 rounded-2xl bg-surface-3 px-4 py-3 text-sm text-text-2">Played on the original Baseline? Sign in with the same Google account you used there and your history links automatically. If it didn&apos;t, ask an admin to link it rather than starting over.</p>
      <div className="mt-8"><ProfileForm mode="welcome" initial={{ username: "", firstName: p.firstName, lastName: p.lastName, invite: (await cookies()).get(INVITE_COOKIE)?.value ?? "" }} /></div>
    </main>
  );
}
