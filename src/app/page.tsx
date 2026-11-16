import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/session";
import { e2eAuthEnabled } from "@/lib/server/env";
import { Wordmark } from "@/components/shell/Nav";
import { buttonClass } from "@/components/ui/Button";

const STEPS = [
  { n: "01", title: "Play", body: "Challenge a friend, or just go hit. One set, best of three, best of five." },
  { n: "02", title: "Record", body: "Log the score in seconds. Your opponent confirms it, so every result is agreed." },
  { n: "03", title: "Climb", body: "Wins earn points. Rankings, streaks and every head-to-head update instantly." },
];

export default async function Landing() {
  if (await getSession()) redirect("/home");
  const signIn = e2eAuthEnabled() ? "/e2e/sign-in?u=ana" : "/sign-in";
  return (
    <main className="pt-safe min-h-dvh">
      <header className="mx-auto flex max-w-[1040px] items-center justify-between px-5 py-5">
        <Wordmark />
        <Link href={signIn} className={buttonClass("ghost", "sm")}>Sign in</Link>
      </header>

      <section className="mx-auto max-w-[1040px] px-5 pt-10 pb-16 sm:pt-20">
        <h1 className="display max-w-[11ch] text-[64px] sm:text-[104px]">Every match counts.</h1>
        <p className="mt-6 max-w-[46ch] text-lg text-text-2">Baseline is where your tennis group keeps score: log matches, settle rivalries and see who&apos;s really on top.</p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link href={e2eAuthEnabled() ? signIn : "/sign-up"} className={buttonClass("primary", "lg")}>Join your group</Link>
          <Link href={signIn} className={buttonClass("secondary", "lg")}>I have an account</Link>
        </div>
      </section>

      {/* the signature: a scoreboard */}
      <section aria-label="Example match" className="court-lines mx-auto max-w-[1040px] px-5 pb-16">
        <div className="overflow-hidden rounded-[28px] bg-[#0d0f0c] p-6 text-[#f2f3ec] sm:p-8">
          <p className="text-caption font-semibold text-[#a9ae9f]">Best of 3 · Final · +10 pts</p>
          {[["You", ["6", "4", "10"], true], ["Your rival", ["3", "6", "8"], false]].map(([name, sets, won]) => (
            <div key={String(name)} className="mt-4 flex items-center gap-4">
              <span className={`flex-1 text-xl font-bold ${won ? "" : "text-[#a9ae9f]"}`}>{name as string}{won ? <span className="ml-2 inline-block size-2.5 rounded-full bg-[#d6f24a] align-middle" /> : null}</span>
              {(sets as string[]).map((g, i) => <span key={i} className={`score num w-12 text-center text-[44px] ${won ? (i === 1 ? "text-[#8f9586]" : "text-[#f2f3ec]") : i === 1 ? "text-[#f2f3ec]" : "text-[#8f9586]"}`}>{g}</span>)}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-[1040px] gap-8 px-5 pb-16 sm:grid-cols-3" aria-label="How it works">
        {STEPS.map((s) => (
          <div key={s.n} className="border-t border-line-strong pt-5">
            <p className="score text-[40px] text-ball-ink">{s.n}</p>
            <h2 className="display mt-3 text-2xl">{s.title}</h2>
            <p className="mt-2 text-text-2">{s.body}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-[1040px] px-5 pb-20" aria-labelledby="points">
        <h2 id="points" className="display text-[34px]">Points</h2>
        <dl className="mt-6 grid grid-cols-3 gap-3">
          {[["One set", 5], ["Best of 3", 10], ["Best of 5", 20]].map(([k, v]) => (
            <div key={k} className="card p-5"><dt className="text-sm font-semibold text-text-2">{k}</dt><dd className="score mt-2 text-[56px]">{v}</dd></div>
          ))}
        </dl>
        <p className="mt-4 text-sm text-text-3">A win earns the points. Losing costs nothing, so play more.</p>
      </section>
      <footer className="border-t border-line px-5 py-8 text-center text-caption text-text-3">Baseline · made for a group of friends who keep score</footer>
    </main>
  );
}
