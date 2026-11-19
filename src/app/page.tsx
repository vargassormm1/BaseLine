import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowDown, ArrowUp } from "lucide-react";
import type { CSSProperties } from "react";
import { getSession } from "@/lib/server/session";
import { Wordmark } from "@/components/shell/Nav";
import { buttonClass } from "@/components/ui/Button";

// The public landing page. Tennis and pickleball (the two supported sports; nothing else is claimed). Everything shown is an
// illustration with made-up players (Alex, Jordan, Chris, Sam) telling one consistent story: Alex beats Jordan
// 6–4 6–3, earns 10 points and takes the top spot; their rivalry now stands at 7–5 after 12 matches.
// No real player data, no invented claims (user counts, testimonials).
const TABLE = [
  { rank: 1, name: "Alex", pts: 145, record: "16–9" },
  { rank: 2, name: "Jordan", pts: 140, record: "15–8" },
  { rank: 3, name: "Chris", pts: 115, record: "12–10" },
  { rank: 4, name: "Sam", pts: 95, record: "9–14" },
];
const LAST_FIVE: ("A" | "J")[] = ["A", "J", "A", "A", "J"]; // newest first; consistent with 7–5
const SIGN_IN = "/sign-in?next=/welcome";
/** Delay for one step of the hero sequence (CSS custom property; no animation library). */
const at = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

function Disc({ name, tone = "light", size = 40 }: { name: string; tone?: "light" | "dark" | "mint" | "coral"; size?: number }) {
  const c = { light: "bg-surface-3 text-text-2", dark: "bg-white/10 text-[#fafaf6]", mint: "bg-mint text-on-mint", coral: "bg-coral text-[#151f1a]" }[tone];
  return <span aria-hidden="true" className={`inline-grid shrink-0 place-items-center rounded-full font-bold ${c}`} style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}>{name[0]}</span>;
}

export default async function Landing() {
  if (await getSession()) redirect("/start");
  return (
    <main className="pt-safe min-h-dvh overflow-x-clip">
      <header className="mx-auto flex max-w-[1080px] items-center justify-between px-5 py-4">
        <Wordmark />
        <Link href="/sign-in" prefetch={false} className={buttonClass("ghost", "sm")}>Sign in</Link>
      </header>

      {/* ---- 1. hero: bright and airy; the product shows why it's fun ---- */}
      <section className="mx-auto grid max-w-[1080px] gap-10 px-5 pt-4 pb-16 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-14 lg:pt-12 lg:pb-24">
        <div className="animate-rise">
          <p className="inline-flex h-8 items-center gap-2 rounded-full bg-mint px-3 text-sm font-semibold text-on-mint"><span className="size-2 rounded-full bg-coral" aria-hidden="true" />Tennis and pickleball with your friends</p>
          <h1 className="display mt-4 text-[clamp(38px,12vw,52px)] sm:text-[68px] lg:text-[76px]">The match ends. The rivalry doesn&apos;t.</h1>
          <p className="mt-5 max-w-[42ch] text-lg text-text-2">Turn friendly matches into real competition. Track your records, settle rivalries, and climb the rankings in tennis and pickleball.</p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href={SIGN_IN} prefetch={false} className={buttonClass("primary", "lg")}>Join with an invite</Link>
            <a href="#how" className={buttonClass("ghost", "lg")}>See how it works</a>
          </div>
          <p className="mt-4 text-sm text-text-3">Invite-only: a friend who already plays here sends you a link.</p>
        </div>

        {/* the sequence, once: scores → winner → +10 → the table changes. Readable with motion off (everything ends in place). */}
        <div className="relative" role="img" aria-label="Example: Alex beats Jordan 6–4, 6–3 in a best of three, earns 10 points and moves past Jordan into first place.">
          <div aria-hidden="true">
            <div className="rounded-[28px] bg-panel p-6 text-[#fafaf6] shadow-[var(--shadow)] sm:p-7">
              <div className="flex items-center justify-between text-caption font-semibold text-[#a9c4b9]"><span>Match complete</span><span>Best of 3</span></div>
              {[{ n: "Alex", s: [6, 6], won: true, d: 150 }, { n: "Jordan", s: [4, 3], won: false, d: 300 }].map((p) => (
                <div key={p.n} className="seq mt-4 flex items-center gap-3" style={at(p.d)}>
                  <Disc name={p.n} tone={p.won ? "mint" : "dark"} size={44} />
                  <span className={`flex-1 text-xl font-bold ${p.won ? "" : "text-[#a9c4b9]"}`}>{p.n}{p.won ? <span className="seq-pop ml-2 inline-block size-2.5 rounded-full bg-[#7be5b3] align-middle" style={at(900)} /> : null}</span>
                  {p.s.map((g, i) => <span key={i} className={`score num w-9 text-center text-[40px] sm:w-11 sm:text-[46px] ${p.won ? "" : "text-[#a9c4b9]"}`}>{g}</span>)}
                </div>
              ))}
              <div className="mt-6 flex items-end justify-between border-t border-white/10 pt-4">
                <p className="seq text-lg font-bold" style={at(900)}>Alex wins</p>
                <p className="seq-pop score text-[40px] text-[#7be5b3]" style={at(1250)}>+10 <span className="text-base font-semibold text-[#a9c4b9]">points</span></p>
              </div>
            </div>
            {/* Alex was second; the win lifts him over Jordan. Rank numbers stay put; the players move. */}
            <div className="card relative -mt-5 ml-auto w-[88%] overflow-hidden shadow-[var(--shadow)] sm:w-[74%]">
              <div className="seq-up flex h-12 items-center gap-3 bg-mint pr-4 pl-12 text-on-mint" style={at(1900)}>
                <ArrowUp size={14} strokeWidth={3} /><span className="flex-1 font-bold">Alex</span><span className="score num text-[22px]">145</span><span className="text-micro font-semibold">pts</span>
              </div>
              <div className="seq-down flex h-12 items-center gap-3 bg-surface pr-4 pl-12" style={at(1900)}>
                <ArrowDown size={14} strokeWidth={3} className="text-coral-ink" /><span className="flex-1 font-bold">Jordan</span><span className="score num text-[22px]">140</span><span className="text-micro font-semibold text-text-3">pts</span>
              </div>
              <div className="pointer-events-none absolute inset-y-0 left-4 flex flex-col">
                <span className="score flex h-12 items-center text-[24px]">1</span>
                <span className="score flex h-12 items-center text-[24px]">2</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- 2. the rivalry: the reason Baseline exists ---- */}
      <section className="bg-panel text-[#fafaf6]" aria-labelledby="rivalry-title">
        <div className="mx-auto grid max-w-[1080px] gap-10 px-5 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
          <div>
            <p className="text-sm font-semibold text-[#7be5b3]">Head to head</p>
            <h2 id="rivalry-title" className="display mt-3 text-[36px] sm:text-[52px]">Finally, a way to settle the debate.</h2>
            <p className="mt-4 max-w-[40ch] text-lg text-[#a9c4b9]">Who&apos;s really the best in your group? Every match you play goes on the record, for good. Bragging rights are better with receipts.</p>
          </div>
          <div className="reveal" role="img" aria-label="Example head to head: Alex leads Jordan 7 to 5 after 12 matches. Last match: Alex won 6–4, 6–3.">
            <div aria-hidden="true" className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 sm:p-7">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <div className="flex flex-col items-center gap-2"><span className="rounded-full ring-2 ring-[#7be5b3] ring-offset-4 ring-offset-[#123f35]"><Disc name="Alex" tone="mint" size={60} /></span><span className="display text-xl sm:text-2xl">Alex</span></div>
                <div className="text-center">
                  <p className="text-caption font-bold text-[#a9c4b9]">VS</p>
                  <p className="score num text-[clamp(56px,20vw,88px)] sm:text-[112px]"><span className="text-[#7be5b3]">7</span><span className="px-2 font-light text-[#a9c4b9]">-</span>5</p>
                </div>
                <div className="flex flex-col items-center gap-2"><Disc name="Jordan" tone="coral" size={60} /><span className="display text-xl sm:text-2xl">Jordan</span></div>
              </div>
              <div className="mt-6 flex h-2.5 overflow-hidden rounded-full bg-white/10"><span className="split-grow h-full origin-left bg-[#7be5b3]" style={{ width: `${(7 / 12) * 100}%` }} /><span className="h-full flex-1 bg-coral" /></div>
              <div className="mt-4 flex items-center justify-between text-sm text-[#a9c4b9]">
                <span>12 matches played</span>
                <span className="flex items-center gap-2">Last five{LAST_FIVE.map((w, i) => <span key={i} className={`size-2.5 rounded-full ${w === "A" ? "bg-[#7be5b3]" : "bg-coral"}`} />)}</span>
              </div>
              <p className="mt-5 border-t border-white/10 pt-4 text-center text-sm"><span className="font-semibold">Last match:</span> <span className="text-[#a9c4b9]">Alex won 6–4, 6–3. Jordan wants a rematch.</span></p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- 3. how it works (points folded in) ---- */}
      <section id="how" className="mx-auto max-w-[1080px] scroll-mt-6 px-5 py-16 lg:py-24" aria-labelledby="how-title">
        <h2 id="how-title" className="display text-[32px] sm:text-[40px]">Play. Record. Climb.</h2>
        <ol className="reveal mt-9 grid gap-8 sm:grid-cols-3 sm:gap-6">
          {[
            ["Play", "Challenge a friend, or just go play: tennis sets or pickleball games, singles or doubles."],
            ["Record", "Tap in the score. Your opponent confirms it, so every result is agreed."],
            ["Climb", "Wins earn points. Your record, the rankings and every rivalry update at once."],
          ].map(([t, d], i) => (
            <li key={t} className="relative flex gap-4 sm:block sm:border-t sm:border-line-strong sm:pt-6">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-sm font-bold text-on-accent sm:absolute sm:-top-4 sm:left-0">{i + 1}</span>
              <div><h3 className="text-xl font-bold tracking-[-0.02em]">{t}</h3><p className="mt-1 max-w-[30ch] text-text-2">{d}</p></div>
            </li>
          ))}
        </ol>
        <dl className="reveal mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 rounded-[20px] bg-surface-2 px-5 py-4">
          <dt className="text-sm font-semibold text-text-2">A win is worth</dt>
          {[["One set or one game to 11", 5], ["Best of three", 10], ["Best of five", 20]].map(([k, v]) => (
            <dd key={k} className="flex items-baseline gap-2"><span className="score num text-[28px] text-accent-ink">+{v}</span><span className="text-sm text-text-2">{k}</span></dd>
          ))}
          <dd className="text-sm text-text-2 sm:ml-auto">Losing costs nothing. One more match, one more chance.</dd>
        </dl>
      </section>

      {/* ---- 3b. two sports, separate standings (a static example; same made-up players) ---- */}
      <section className="mx-auto max-w-[1080px] px-5 pb-16 lg:pb-24" aria-labelledby="sports-title">
        <div className="grid gap-8 rounded-[28px] border border-line bg-surface p-6 sm:p-8 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 id="sports-title" className="display text-[30px] sm:text-[40px]">One account. Two sports. Separate rankings.</h2>
            <p className="mt-3 max-w-[40ch] text-text-2">Your tennis record and your pickleball record never mix. Pickleball has its own singles and doubles tables, scored in games to 11, win by two.</p>
          </div>
          <div className="reveal" role="img" aria-label="Example pickleball doubles result: Alex and Chris beat Jordan and Sam 11–9, 8–11, 11–7, plus 10 points each.">
            <div aria-hidden="true" className="rounded-[20px] bg-surface-2 p-4">
              <p className="flex items-center gap-2 text-caption font-semibold text-text-3"><span>Pickleball</span><span>·</span><span>Doubles</span><span>·</span><span>Best of 3</span><span className="ml-auto num text-accent-ink">+10 pts each</span></p>
              {[{ n: "Alex & Chris", s: [11, 8, 11], won: true }, { n: "Jordan & Sam", s: [9, 11, 7], won: false }].map((r, i) => (
                <div key={r.n} className={`flex items-center gap-3 py-2 ${i ? "border-t border-line" : ""}`}>
                  <span className="flex -space-x-2"><Disc name={r.n.split(" & ")[0]!} tone={r.won ? "mint" : "light"} /><Disc name={r.n.split(" & ")[1]!} tone={r.won ? "mint" : "light"} /></span>
                  <span className={`flex-1 font-bold ${r.won ? "" : "text-text-2"}`}>{r.n}</span>
                  {r.s.map((g, j) => <span key={j} className={`score num w-8 text-center text-[22px] ${g === 11 ? "" : "text-text-3"}`}>{g}</span>)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---- 4. your own rankings ---- */}
      <section className="bg-mint text-on-mint" aria-labelledby="table-title">
        <div className="mx-auto grid max-w-[1080px] gap-10 px-5 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
          <div>
            <h2 id="table-title" className="display text-[36px] sm:text-[48px]">Pro-style rankings. For the rest of us.</h2>
            <p className="mt-4 max-w-[40ch] text-lg">Your group gets its own table and everyone gets a career record. Five friends on weekends is a league.</p>
          </div>
          <ol className="reveal overflow-hidden rounded-[24px] bg-surface text-text shadow-[var(--shadow)]" aria-label="Example rankings">
            {TABLE.map((r) => (
              <li key={r.name} className="flex items-center gap-4 border-b border-line px-5 py-3.5 last:border-b-0">
                <span className={`score w-7 text-[30px] ${r.rank === 1 ? "text-accent-ink" : ""}`}>{r.rank}</span>
                <Disc name={r.name} tone={r.rank === 1 ? "mint" : "light"} />
                <span className="min-w-0 flex-1"><span className="block text-lg font-bold">{r.name}</span><span className="num block text-caption text-text-2">{r.record}</span></span>
                <span className="score num text-[28px]">{r.pts}</span><span className="w-6 text-micro font-semibold text-text-3">pts</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---- 5. the invitation ---- */}
      <section className="px-5 py-16 lg:py-24" aria-labelledby="join-title">
        <div className="mx-auto max-w-[760px] text-center">
          <h2 id="join-title" className="display text-[40px] sm:text-[60px]">Your rivalry deserves a record.</h2>
          <p className="mx-auto mt-4 max-w-[40ch] text-lg text-text-2">Get your invite, play your next match, and start the history.</p>
          <Link href={SIGN_IN} prefetch={false} className={`${buttonClass("primary", "lg")} mt-8`}>Join with an invite</Link>
          <p className="mx-auto mt-5 max-w-[46ch] text-sm text-text-3">No invite yet? Ask a friend who plays on Baseline; they can create a link for you in their Settings. Already playing? <Link href="/sign-in" prefetch={false} className="font-semibold text-accent-ink underline underline-offset-2">Sign in</Link>.</p>
        </div>
      </section>

      <footer className="border-t border-line px-5 py-7 text-center text-caption text-text-3">Baseline · Players and scores on this page are examples.</footer>
    </main>
  );
}
