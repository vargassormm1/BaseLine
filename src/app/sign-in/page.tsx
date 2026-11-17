import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/session";
import { e2eAuthEnabled, emailAuthEnabled, turnstileSiteKey } from "@/lib/server/env";
import { safeNext } from "@/lib/server/redirects";
import { Wordmark } from "@/components/shell/Nav";
import { EmailAuth } from "@/components/auth/EmailAuth";

export const metadata = { title: "Sign in" };

export default async function SignIn({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; mode?: string }> }) {
  if (await getSession()) redirect("/home");
  const q = await searchParams;
  const next = safeNext(q.next);
  const email = emailAuthEnabled();
  const joining = next === "/welcome" || q.mode === "sign-up";
  const error = q.error === "link" ? "That link has expired or was already used. Ask for a new one below." : q.error ? "Google sign-in didn't finish. Please try again." : null;
  const href = e2eAuthEnabled() ? "/e2e/sign-in?u=ana" : `/auth/google?next=${encodeURIComponent(next)}`;
  return (
    <main className="pt-safe mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5 py-10">
      <Link href="/" aria-label="Baseline home" prefetch={false} className="inline-flex min-h-11 items-center self-start"><Wordmark /></Link>
      <h1 className="display mt-10 text-[44px]">Game on.</h1>
      <p className="mt-3 text-text-2">{email ? "Sign in with Google or your email." : "Sign in with the Google account you play under."} New here? You&apos;ll need an invite link from a player.</p>
      {error ? <p role="alert" className="mt-5 rounded-2xl bg-warn-bg px-4 py-3 text-sm font-semibold text-warn-ink">{error}</p> : null}
      <a href={href} className="press mt-8 flex h-14 items-center justify-center gap-3 rounded-full bg-text text-base font-bold text-bg hover:opacity-90">
        <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
        Continue with Google
      </a>
      {email ? (
        <>
          <div className="my-7 flex items-center gap-3 text-caption font-semibold text-text-3" aria-hidden="true"><span className="h-px flex-1 bg-line-strong" />or use email<span className="h-px flex-1 bg-line-strong" /></div>
          <EmailAuth next={next} initialMode={joining ? "sign-up" : "sign-in"} siteKey={turnstileSiteKey()} />
        </>
      ) : null}
      <p className="mt-6 text-center text-caption text-text-3">Played on the original Baseline? Use the same Google account you used there and your history comes with you.</p>
    </main>
  );
}
