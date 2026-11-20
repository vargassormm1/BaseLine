import Link from "next/link";
import { Wordmark } from "@/components/shell/Nav";
import { buttonClass } from "@/components/ui/Button";
import { HeroBoard } from "@/components/landing/HeroBoard";

// The public landing page: tennis and pickleball (the two live sports; nothing else is claimed). Signed-in visitors are
// sent to the app by the proxy before this renders, so the page itself never waits on an account lookup.
// Every player and score here is an illustration with the same made-up group (Alex, Jordan, Chris, Sam, Riley).
// No real player data, no invented claims (user counts, testimonials, official ratings).

const SIGN_IN = "/sign-in?next=/welcome";

// Alex vs Jordan, tennis singles, oldest → newest: Alex 8, Jordan 6.
const RIVALRY = "JAAJJAJAAJAAJA".split("") as ("A" | "J")[];
const MEETINGS = [
  { when: "Nov 8", winner: "Alex", score: "6–4, 7–5" },
  { when: "Oct 18", winner: "Jordan", score: "7–6(4), 6–3" },
  { when: "Oct 4", winner: "Alex", score: "6–2, 6–4" },
];
const TABLE = [
  { name: "Alex", pts: 145, record: "16–9", form: "WWLWW", move: 1 },
  { name: "Jordan", pts: 140, record: "15–8", form: "LWWWL", move: -1 },
  { name: "Chris", pts: 115, record: "12–10", form: "WLWLW", move: 0 },
  { name: "Sam", pts: 95, record: "9–14", form: "LLWLW", move: 1 },
  { name: "Riley", pts: 90, record: "9–11", form: "LWLLL", move: -1 },
];

export default function Landing() {
  const a = RIVALRY.filter((x) => x === "A").length, j = RIVALRY.length - a;
  return (
    <main className="pt-safe min-h-dvh overflow-x-clip">
      <header className="mx-auto flex max-w-[1200px] items-center gap-4 px-4 py-4 sm:px-6">
        <Wordmark />
        <span className="hidden text-sm font-semibold text-text-2 sm:inline">Tennis + Pickleball</span>
        <Link href="/sign-in" prefetch={false} className={`${buttonClass("ghost", "sm")} ml-auto`}>Sign in</Link>
      </header>

      {/* ---- hero: what it is in one line; the product shows the rest ---- */}
      <section className="mx-auto grid max-w-[1200px] gap-8 px-4 pt-4 pb-16 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center lg:gap-16 lg:pt-14 lg:pb-24" aria-labelledby="hero-title">
        <div>
          <p className="text-sm font-bold text-accent-ink sm:hidden">Tennis + Pickleball</p>
          <h1 id="hero-title" className="lp-headline mt-2 sm:mt-0">
            <span className="block">Your friends.</span><span className="block">Your rivals.</span><span className="block">Your rankings.</span>
          </h1>
          <p className="mt-6 max-w-[44ch] text-lg leading-relaxed text-text-2">
            Give every match meaning. Record your tennis and pickleball results, climb your group&apos;s leaderboard, and build a rivalry history with your friends.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-1">
            <Link href={SIGN_IN} prefetch={false} className={buttonClass("primary", "lg")}>Join with an invite</Link>
            <a href="#how" className={buttonClass("ghost", "lg")}>See how it works</a>
          </div>
          <p className="mt-4 max-w-[44ch] text-sm text-text-3">Baseline is invite-only. A friend who already plays sends you a link.</p>
        </div>
        <HeroBoard />
      </section>

      {/* ---- the rivalry: the emotional center ---- */}
      <section className="bg-panel text-[#fafaf6]" aria-labelledby="rivalry-title">
        <div className="mx-auto grid max-w-[1200px] gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-center lg:py-28">
          <div>
            <h2 id="rivalry-title" className="lp-h2">The scoreboard remembers.</h2>
            <p className="mt-5 max-w-[38ch] text-lg leading-relaxed text-[#c3d6ce]">That match you won last summer still counts. Every win, every comeback, every rematch, kept in one place for as long as you play.</p>
          </div>
          <figure className="m-0" aria-labelledby="rivalry-caption">
            <figcaption id="rivalry-caption" className="sr-only">Example tennis singles head to head: Alex leads Jordan 8 wins to 6 over 14 matches since May 2025. Most recent: Alex won 6–4, 7–5 on November 8; Jordan won 7–6(4), 6–3 on October 18; Alex won 6–2, 6–4 on October 4.</figcaption>
            <div aria-hidden="true">
              <p className="text-sm font-semibold text-[#a9c4b9]">Tennis singles head to head, since May 2025</p>
              <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-end gap-3 sm:gap-6">
                <div><p className="lp-name">Alex</p><p className="text-sm text-[#a9c4b9]">leads</p></div>
                <p className="lp-h2h flex items-center"><span className="text-[#7be5b3]">{a}</span><span className="mx-2 h-[0.06em] w-[0.2em] bg-[#4f7468] sm:mx-4" /><span>{j}</span></p>
                <div className="text-right"><p className="lp-name">Jordan</p><p className="text-sm text-[#a9c4b9]">{RIVALRY.length} matches</p></div>
              </div>
              {/* every meeting, oldest to newest: above the line Alex won, below the line Jordan won */}
              <div className="mt-8">
                <div className="relative grid h-24 items-center" style={{ gridTemplateColumns: `repeat(${RIVALRY.length}, minmax(0, 1fr))` }}>
                  <span className="absolute inset-x-0 top-1/2 h-px bg-white/20" />
                  {RIVALRY.map((w, i) => (
                    <span key={i} className="relative flex h-full justify-center">
                      <span className={`absolute w-[min(10px,40%)] rounded-full ${w === "A" ? "bottom-1/2 h-[42%] bg-[#7be5b3]" : "top-1/2 h-[42%] bg-coral"} ${i === RIVALRY.length - 1 ? "ring-2 ring-white/70 ring-offset-2 ring-offset-[#123f35]" : ""}`} />
                    </span>
                  ))}
                </div>
                <div className="mt-2 flex justify-between gap-3 text-caption text-[#a9c4b9]"><span>May 2025</span><span className="text-center">Alex wins above, Jordan below</span><span>Nov 2026</span></div>
              </div>
              <ol className="mt-7 divide-y divide-white/10 border-y border-white/10">
                {MEETINGS.map((m) => (
                  <li key={m.when} className="flex items-baseline gap-4 py-3 text-sm sm:text-base">
                    <span className="w-14 shrink-0 text-[#a9c4b9]">{m.when}</span>
                    <span className="flex-1 font-semibold">{m.winner} won</span>
                    <span className="num font-semibold">{m.score}</span>
                  </li>
                ))}
              </ol>
            </div>
          </figure>
        </div>
      </section>

      {/* ---- rankings ---- */}
      <section className="mx-auto grid max-w-[1200px] gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-center lg:py-28" aria-labelledby="table-title">
        <div className="lg:order-2">
          <h2 id="table-title" className="lp-h2">Your crew has a leaderboard now.</h2>
          <p className="mt-5 max-w-[40ch] text-lg leading-relaxed text-text-2">Every win moves the table. See who&apos;s on top, who&apos;s climbing, and who&apos;s coming for the spot.</p>
          <p className="mt-4 max-w-[40ch] text-text-2">Tennis and pickleball each keep their own rankings, with singles and doubles counted separately. Longer matches are worth more, and a loss never costs you points.</p>
        </div>
        <ol className="overflow-hidden rounded-[24px] border border-line bg-surface lg:order-1" aria-label="Example tennis singles rankings">
          <li className="flex h-10 items-center gap-3 border-b border-line px-4 text-caption font-semibold text-text-3 sm:px-6" aria-hidden="true">
            <span className="w-7">#</span><span className="flex-1 whitespace-nowrap">Tennis singles</span><span className="hidden w-[106px] sm:block">Last 5</span><span className="w-14 text-right">W–L</span><span className="w-14 text-right">Pts</span>
          </li>
          {TABLE.map((r, i) => (
            <li key={r.name} className={`flex h-16 items-center gap-3 border-b border-line px-4 last:border-b-0 sm:px-6 ${i === 0 ? "bg-mint text-on-mint" : ""}`}>
              <span className="score w-7 text-[30px]">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-lg font-bold">{r.name}</span>
                <span className={`block text-caption font-semibold ${i === 0 ? "" : r.move > 0 ? "text-accent-ink" : r.move < 0 ? "text-coral-ink" : "text-text-3"}`}>
                  {r.move > 0 ? `▲ Up ${r.move}` : r.move < 0 ? `▼ Down ${-r.move}` : "No change"}<span className="hidden sm:inline">{r.move ? " this week" : ""}</span>
                </span>
              </span>
              <span className="hidden w-[106px] gap-1 sm:flex" role="img" aria-label={`Last five: ${r.form.split("").map((x) => (x === "W" ? "win" : "loss")).join(", ")}`}>
                {r.form.split("").map((x, k) => <span key={k} className={`grid size-[18px] place-items-center rounded text-[10px] font-bold ${x === "W" ? "bg-accent text-on-accent" : "bg-surface-3 text-text-2"}`} aria-hidden="true">{x}</span>)}
              </span>
              <span className="num w-14 text-right text-sm font-semibold">{r.record}</span>
              <span className="score num w-14 text-right text-[28px]">{r.pts}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* ---- how it works: a real sequence ---- */}
      <section id="how" className="scroll-mt-6 border-t border-line" aria-labelledby="how-title">
        <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:py-20">
          <h2 id="how-title" className="lp-h3">Three steps, then you&apos;re on the board.</h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-3 md:gap-0">
            {[
              ["Play", "Get a match in: tennis or pickleball, singles or doubles. Send a challenge first if you like."],
              ["Record", "Enter the final score. Someone on the other side confirms it, so every result is agreed."],
              ["Compete", "Your record, your ranking points and every head to head update the moment it's confirmed."],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-5 md:block md:border-l md:border-line md:px-8 md:first:border-l-0 md:first:pl-0">
                <span className="score num text-[44px] text-accent-ink md:text-[56px]" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                <div className="md:mt-4"><h3 className="text-xl font-bold tracking-[-0.02em]">{t}</h3><p className="mt-1.5 max-w-[34ch] text-text-2">{d}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---- the invitation ---- */}
      <section className="bg-accent text-[#0c1f17]" aria-labelledby="join-title">
        <div className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 lg:py-24">
          <h2 id="join-title" className="lp-h2 max-w-[14ch]">Your next rivalry starts here.</h2>
          <p className="mt-5 max-w-[42ch] text-lg leading-relaxed">Grab your friends, play your next match, and let the scoreboard tell the story.</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href={SIGN_IN} prefetch={false} className="press inline-flex h-14 items-center rounded-full bg-[#123f35] px-7 text-base font-bold text-[#fafaf6] hover:bg-[#0d2f27]">Join with an invite</Link>
            <Link href="/sign-in" prefetch={false} className="press inline-flex h-14 items-center rounded-full px-5 text-base font-bold underline underline-offset-4">Already playing? Sign in</Link>
          </div>
          <p className="mt-6 max-w-[48ch] text-sm">No invite yet? Ask a friend who plays on Baseline. They can make you a link from their Settings.</p>
        </div>
      </section>

      <footer className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-4 py-7 text-caption text-text-3 sm:px-6">
        <Wordmark /><span>Players and scores on this page are examples.</span>
      </footer>
    </main>
  );
}
