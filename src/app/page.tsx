import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowDown, ArrowUp } from "lucide-react";
import { getSession } from "@/lib/server/session";
import { Wordmark } from "@/components/shell/Nav";
import { buttonClass } from "@/components/ui/Button";

// The public landing page. Everything shown is an illustration with made-up players (Alex, Jordan, Chris, Sam) that
// tells one consistent story: Alex beats Jordan 6–4 6–3, earns 10 points, and takes the top spot; their rivalry
// stands at 7–5. No real player data, no invented claims (user counts, testimonials).
const TABLE = [
  { rank: 1, name: "Alex", pts: 145, move: 1 },
  { rank: 2, name: "Jordan", pts: 140, move: -1 },
  { rank: 3, name: "Chris", pts: 115, move: 0 },
  { rank: 4, name: "Sam", pts: 95, move: 0 },
];
const LAST_FIVE: ("A" | "J")[] = ["A", "J", "A", "A", "J"]; // newest first; consistent with 7–5

function Disc({ name, dark = false, size = 40 }: { name: string; dark?: boolean; size?: number }) {
  return (
    <span aria-hidden="true" className={`inline-grid shrink-0 place-items-center rounded-full font-bold ${dark ? "bg-white/10 text-[#f2f3ec]" : "bg-surface-3 text-text-2"}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}>{name[0]}</span>
  );
}

const SIGN_IN = "/sign-in?next=/welcome";

export default async function Landing() {
  if (await getSession()) redirect("/home");
  return (
    <main className="pt-safe min-h-dvh overflow-x-clip">
      <header className="mx-auto flex max-w-[1080px] items-center justify-between px-5 py-4">
        <Wordmark />
        <Link href="/sign-in" prefetch={false} className={buttonClass("ghost", "sm")}>Sign in</Link>
      </header>

      {/* ---- hero: the promise, the way in, and the product itself ---- */}
      <section className="mx-auto grid max-w-[1080px] gap-10 px-5 pt-6 pb-16 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-14 lg:pt-14 lg:pb-24">
        <div className="animate-rise">
          <p className="text-sm font-semibold text-ball-ink">Tennis with your friends, with something on the line</p>
          <h1 className="display mt-3 text-[54px] sm:text-[76px] lg:text-[88px]">Settle it on the court.</h1>
          <p className="mt-5 max-w-[42ch] text-lg text-text-2">Turn friendly matches into a real rivalry. Keep score, climb the table, and find out who&apos;s actually on top.</p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href={SIGN_IN} prefetch={false} className={buttonClass("primary", "lg")}>Join with an invite</Link>
            <a href="#how" className={buttonClass("ghost", "lg")}>See how it works</a>
          </div>
          <p className="mt-4 text-sm text-text-3">Baseline is invite-only. A friend who plays here can send you a link.</p>
        </div>

        {/* match result → what it does to the table */}
        <div className="relative" role="img" aria-label="Example: Alex beats Jordan 6–4, 6–3 in a best of three, earns 10 points and takes the top spot from Jordan.">
          <div aria-hidden="true" className="court-lines rounded-[28px] border border-white/10 bg-[#0d0f0c] p-6 text-[#f2f3ec] sm:p-7">
            <div className="flex items-center justify-between text-caption font-semibold text-[#a9ae9f]"><span>Match complete</span><span>Best of 3</span></div>
            {[{ n: "Alex", s: [6, 6], won: true }, { n: "Jordan", s: [4, 3], won: false }].map((p) => (
              <div key={p.n} className="mt-4 flex items-center gap-3">
                <Disc name={p.n} dark size={44} />
                <span className={`flex-1 text-xl font-bold ${p.won ? "" : "text-[#a9ae9f]"}`}>{p.n}{p.won ? <span className="ml-2 inline-block size-2.5 rounded-full bg-[#d6f24a] align-middle" /> : null}</span>
                {p.s.map((g, i) => <span key={i} className={`score num w-11 text-center text-[46px] ${p.won ? "" : "text-[#8f9586]"}`}>{g}</span>)}
              </div>
            ))}
            <div className="mt-6 flex items-end justify-between border-t border-white/10 pt-4">
              <p className="text-lg font-bold">Alex wins</p>
              <p className="score text-[40px] text-[#d6f24a]">+10 <span className="text-base font-semibold text-[#a9ae9f]">points</span></p>
            </div>
          </div>
          <div aria-hidden="true" className="card relative -mt-5 ml-auto w-[86%] overflow-hidden shadow-[var(--shadow)] sm:w-[72%]">
            {TABLE.slice(0, 2).map((r) => (
              <div key={r.name} className={`flex items-center gap-3 px-4 py-2.5 ${r.rank === 1 ? "bg-surface" : "border-t border-line bg-surface-2"}`}>
                <span className={`score w-6 text-[24px] ${r.rank === 1 ? "text-ball-ink" : ""}`}>{r.rank}</span>
                {r.move > 0 ? <ArrowUp size={14} strokeWidth={3} className="text-ball-ink" /> : <ArrowDown size={14} strokeWidth={3} className="text-clay-ink" />}
                <span className="flex-1 font-bold">{r.name}</span>
                <span className="score num text-[22px]">{r.pts}</span><span className="text-micro font-semibold text-text-3">pts</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- how it works: three points on one line ---- */}
      <section id="how" className="mx-auto max-w-[1080px] scroll-mt-6 px-5 pb-20" aria-labelledby="how-title">
        <h2 id="how-title" className="display text-[32px] sm:text-[40px]">Play. Record. Climb.</h2>
        <ol className="reveal relative mt-8 grid gap-8 sm:grid-cols-3 sm:gap-6">
          {[
            ["Play", "Challenge a friend, or just go hit. One set, best of three or best of five."],
            ["Record", "Tap in the score. Your opponent confirms it, so every result is agreed."],
            ["Climb", "Wins earn points. Your record, the table and every rivalry update at once."],
          ].map(([t, d], i) => (
            <li key={t} className="relative flex gap-4 sm:block sm:border-t sm:border-line-strong sm:pt-5">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-text text-micro font-bold text-bg sm:absolute sm:-top-3.5 sm:left-0">{i + 1}</span>
              <div><h3 className="text-xl font-bold tracking-[-0.02em]">{t}</h3><p className="mt-1 max-w-[30ch] text-text-2">{d}</p></div>
            </li>
          ))}
        </ol>
      </section>

      {/* ---- the rivalry: the reason Baseline exists ---- */}
      <section className="bg-[#0d0f0c] text-[#f2f3ec]" aria-labelledby="rivalry-title">
        <div className="mx-auto grid max-w-[1080px] gap-10 px-5 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
          <div>
            <p className="text-sm font-semibold text-[#d6f24a]">The rivalry</p>
            <h2 id="rivalry-title" className="display mt-3 text-[38px] sm:text-[52px]">Who&apos;s actually better?</h2>
            <p className="mt-4 max-w-[40ch] text-lg text-[#a9ae9f]">Your friends can talk all they want. The record speaks for itself: every match you&apos;ve played against each other, in one place.</p>
          </div>
          <div className="reveal" role="img" aria-label="Example head to head: Alex leads Jordan 7 to 5 after 12 matches. Alex won the last one.">
            <div aria-hidden="true">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <div className="flex flex-col items-center gap-2"><span className="rounded-full ring-2 ring-[#d6f24a] ring-offset-4 ring-offset-[#0d0f0c]"><Disc name="Alex" dark size={72} /></span><span className="display text-2xl">Alex</span></div>
                <div className="text-center">
                  <p className="text-caption font-bold text-[#8f9586]">VS</p>
                  <p className="score num text-[88px] sm:text-[112px]"><span className="text-[#d6f24a]">7</span><span className="px-2 font-light text-[#8f9586]">-</span>5</p>
                </div>
                <div className="flex flex-col items-center gap-2"><Disc name="Jordan" dark size={72} /><span className="display text-2xl">Jordan</span></div>
              </div>
              <div className="mt-6 flex h-2.5 overflow-hidden rounded-full"><span className="h-full bg-[#d6f24a]" style={{ width: `${(7 / 12) * 100}%` }} /><span className="h-full flex-1 bg-[#f07a4f]" /></div>
              <div className="mt-4 flex items-center justify-between text-sm text-[#a9ae9f]">
                <span>12 matches played</span>
                <span className="flex items-center gap-2">Last five{LAST_FIVE.map((w, i) => <span key={i} className={`size-2.5 rounded-full ${w === "A" ? "bg-[#d6f24a]" : "bg-[#f07a4f]"}`} />)}</span>
              </div>
              <p className="mt-5 text-center text-sm font-semibold">Alex leads. Jordan wants a rematch.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- the table + how points work ---- */}
      <section className="mx-auto grid max-w-[1080px] gap-12 px-5 py-16 lg:grid-cols-2 lg:gap-16 lg:py-24">
        <div>
          <h2 className="display text-[32px] sm:text-[40px]">The leaderboard doesn&apos;t lie.</h2>
          <p className="mt-3 max-w-[38ch] text-text-2">Every win gets you closer to the top. How far can you climb?</p>
          <ol className="reveal mt-7 border-y border-line-strong" aria-label="Example leaderboard">
            {TABLE.map((r) => (
              <li key={r.name} className="flex items-center gap-4 border-b border-line py-3 last:border-b-0">
                <span className={`score w-8 text-[32px] ${r.rank === 1 ? "text-ball-ink" : ""}`}>{r.rank}</span>
                <Disc name={r.name} />
                <span className="flex-1 text-lg font-bold">{r.name}</span>
                <span className="score num text-[28px]">{r.pts}</span><span className="w-6 text-micro font-semibold text-text-3">pts</span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-caption text-text-3">Five points between first and second. One match changes everything.</p>
        </div>
        <div>
          <h2 className="display text-[32px] sm:text-[40px]">More tennis. More chances to climb.</h2>
          <p className="mt-3 max-w-[38ch] text-text-2">Win and you earn points. Lose and it costs you nothing, so there&apos;s never a reason to skip a match.</p>
          <dl className="reveal mt-7 border-y border-line-strong">
            {[["One set", 5], ["Best of three", 10], ["Best of five", 20]].map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between border-b border-line py-3 last:border-b-0">
                <dt className="text-lg font-bold">{k}</dt>
                <dd><span className="score num text-[36px]">+{v}</span> <span className="text-sm text-text-2">for the win</span></dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ---- the invitation ---- */}
      <section className="px-5 pb-16" aria-labelledby="join-title">
        <div className="mx-auto max-w-[1080px] rounded-[32px] bg-ball px-6 py-14 text-center text-on-ball sm:py-20">
          <h2 id="join-title" className="display mx-auto max-w-[14ch] text-[40px] sm:text-[60px]">Your next rivalry starts here.</h2>
          <p className="mx-auto mt-4 max-w-[38ch] text-lg">Get your invite. Play your next match. Let the scoreboard do the talking.</p>
          <Link href={SIGN_IN} prefetch={false} className="press mt-8 inline-flex h-14 items-center justify-center rounded-full bg-on-ball px-7 text-base font-bold text-ball hover:opacity-90">Join with an invite</Link>
          <p className="mx-auto mt-5 max-w-[44ch] text-sm">No invite yet? Ask a friend who plays on Baseline. They can create a link for you in their Settings. Already playing? <Link href="/sign-in" prefetch={false} className="font-bold underline underline-offset-2">Sign in</Link>.</p>
        </div>
      </section>

      <footer className="border-t border-line px-5 py-7 text-center text-caption text-text-3">Baseline · Players and scores on this page are examples.</footer>
    </main>
  );
}
