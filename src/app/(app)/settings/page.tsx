import { cookies } from "next/headers";
import { requirePlayer } from "@/lib/server/session";
import { loadBoard } from "@/lib/server/data";
import { THEME_COOKIE, themeFrom } from "@/lib/ui/theme";
import { PageHeader } from "@/components/ui/bits";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { ThemeControl } from "@/components/settings/ThemeControl";
import { SignOut } from "@/components/settings/SignOut";
import { InviteFriend } from "@/components/settings/InviteFriend";
import { PhotoForm } from "@/components/settings/PhotoForm";

export const metadata = { title: "Settings" };

export default async function Settings() {
  const s = await requirePlayer();
  const b = await loadBoard(s.sb);
  const me = b.byId.get(s.me)!;
  const theme = themeFrom((await cookies()).get(THEME_COOKIE)?.value);
  const card = "card space-y-4 p-5 sm:p-6";
  return (
    <div className="animate-rise mx-auto max-w-[620px] space-y-6">
      <PageHeader title="Settings" />
      <section className={card} aria-labelledby="s-photo"><h2 id="s-photo" className="text-lg font-bold">Profile photo</h2>
        <PhotoForm current={me.avatarUrl} initials={((me.firstName[0] ?? "") + (me.lastName[0] ?? "")).toUpperCase() || me.username[0]!.toUpperCase()} />
      </section>
      <section className={card} aria-labelledby="s-profile"><h2 id="s-profile" className="text-lg font-bold">Profile</h2>
        <ProfileForm mode="edit" initial={{ username: me.username, firstName: me.firstName, lastName: me.lastName }} />
      </section>
      <section id="invite" className={`${card} scroll-mt-6`} aria-labelledby="s-invite"><h2 id="s-invite" className="text-lg font-bold">Invite a friend</h2><InviteFriend /></section>
      <section className={card} aria-labelledby="s-look"><h2 id="s-look" className="text-lg font-bold">Appearance</h2><ThemeControl initial={theme} /></section>
      <section className={card} aria-labelledby="s-rules"><h2 id="s-rules" className="text-lg font-bold">How it works</h2>
        <ul className="space-y-2 text-sm text-text-2">
          <li>Record a match you played. Your opponent confirms the score; then it counts.</li>
          <li>A win is worth 5 points (one set), 10 (best of 3) or 20 (best of 5). Losses don&apos;t cost points.</li>
          <li>Sets end at 6–4 or better, 7–5, or 7–6 with a tiebreak. A deciding set can be a match tiebreak (first to 10).</li>
          <li>Rankings: points, then wins, then win rate. Arrows show the last 7 days.</li>
          <li>Wrong score? Your opponent can reject it before confirming. After that, an admin can void it (it stays visible, marked void).</li>
        </ul>
      </section>
      <section className={card} aria-labelledby="s-account"><h2 id="s-account" className="text-lg font-bold">Account</h2>
        <p className="text-sm text-text-2">Signed in with Google{s.id.profile.email ? <> as <span className="font-semibold text-text">{s.id.profile.email}</span></> : null}. Your email is only visible to you.</p>
        <SignOut />
      </section>
    </div>
  );
}
