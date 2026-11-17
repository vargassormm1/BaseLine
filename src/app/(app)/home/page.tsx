import Link from "next/link";
import { Flag, Plus } from "lucide-react";
import { requirePlayer } from "@/lib/server/session";
import { loadBoard } from "@/lib/server/data";
import { standings } from "@/lib/tennis/standings";
import { playerStats } from "@/lib/tennis/stats";
import { inbox } from "@/lib/ui/inbox";
import { Avatar, shortName } from "@/components/ui/Avatar";
import { ButtonLink } from "@/components/ui/Button";
import { Empty, FormDots, Movement, SectionHeader } from "@/components/ui/bits";
import { MatchCard, ScoreRows } from "@/components/tennis/Scoreboard";
import { LeaderboardRow } from "@/components/tennis/LeaderboardRow";
import { AnswerChallenge, ConfirmMatch } from "@/components/actions/ActionButtons";
import { FORMAT_LABEL } from "@/lib/tennis/types";

export const metadata = { title: "Home" };

export default async function Home() {
  const s = await requirePlayer();
  const b = await loadBoard(s.sb);
  const me = b.byId.get(s.me)!;
  const all = standings(b.players, b.matches, b.adjustments, { today: b.today });
  const mine = all.find((r) => r.player.id === me.id)!;
  const st = playerStats(me.id, b.matches);
  const box = inbox(b, me.id);
  const last = b.matches.find((m) => (m.p1 === me.id || m.p2 === me.id) && m.status === "confirmed");
  // the table around me: one above, me, one below (or the top three when I'm not ranked yet)
  const ranked = all.filter((r) => r.rank !== null);
  const at = ranked.findIndex((r) => r.player.id === me.id);
  const around = at === -1 ? ranked.slice(0, 3) : ranked.slice(Math.max(0, Math.min(at - 1, ranked.length - 3)), Math.max(0, Math.min(at - 1, ranked.length - 3)) + 3);
  const openChallenges = box.toAnswer.length + box.toPlay.length + box.sent.length;

  return (
    <div className="animate-rise space-y-9">
      <h1 className="sr-only">Home</h1>
      <header className="flex items-center gap-3 pt-2">
        <Avatar player={me} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-text-2">Hi {shortName(me)}</p>
          <p className="text-lg leading-tight font-bold tracking-[-0.02em]">Ready for your next match?</p>
        </div>
        <Link href="/challenges" aria-label={`Challenges${openChallenges ? `, ${openChallenges} open` : ""}`} className="press relative grid size-11 shrink-0 place-items-center rounded-full bg-surface-3 lg:hidden">
          <Flag size={19} aria-hidden="true" />
          {box.toAnswer.length ? <span className="absolute top-1.5 right-1.5 size-2.5 rounded-full bg-loss ring-2 ring-bg" aria-hidden="true" /> : null}
        </Link>
      </header>

      {/* player spotlight: rank is the hero; record and points support it */}
      <section aria-label="Your standing" className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#163d32] px-6 pt-6 pb-7 text-[#f7f8f4] sm:px-8">
        <p className="text-sm font-semibold text-[#a9bdb5]">Rank</p>
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-5">
          <p className={`score text-[clamp(84px,27vw,120px)] leading-[0.8] ${mine.rank === 1 ? "text-[#6fd3a0]" : "text-white"}`}>{mine.rank ? `#${mine.rank}` : <><span aria-hidden="true">–</span><span className="sr-only">Not ranked yet</span></>}</p>
          <dl className="grid shrink-0 grid-cols-2 gap-x-5 pb-1 text-right">
            <div><dd className="score num text-[30px] sm:text-[34px]">{mine.wins}–{mine.losses}</dd><dt className="mt-1 text-caption font-semibold text-[#a9bdb5]">Record</dt></div>
            <div><dd className="score num text-[30px] sm:text-[34px]">{mine.points}</dd><dt className="mt-1 text-caption font-semibold text-[#a9bdb5]">Points</dt></div>
          </dl>
        </div>
        <div className="mt-6 flex items-center gap-3 text-caption text-[#a9bdb5]">
          {st.form.length ? <><span>Last {Math.min(5, st.form.length)}</span><FormDots form={st.form.slice(0, 5)} onDark /></> : <span>No matches yet</span>}
          {mine.rank && mine.movement ? <span className="ml-auto inline-flex items-center gap-1"><Movement by={mine.movement} /> this week</span> : null}
        </div>
        <ButtonLink href="/record" size="lg" full className="mt-6"><Plus size={20} strokeWidth={3} aria-hidden="true" />Record match</ButtonLink>
      </section>

      {/* only when something is waiting for me */}
      {box.toConfirm.length + box.toAnswer.length + box.toPlay.length > 0 ? (
        <section aria-labelledby="your-move">
          <SectionHeader id="your-move" title="Your move" />
          <ul className="space-y-3">
            {box.toConfirm.map((m) => (
              <li key={m.id} className="card px-4 pt-3 pb-4">
                <p className="mb-1 text-sm"><span className="font-bold">{shortName(b.byId.get(m.p1))}</span> recorded a result. Is it right?</p>
                <Link href={`/matches/${m.id}`} className="block"><ScoreRows m={m} byId={b.byId} /></Link>
                <div className="mt-3"><ConfirmMatch id={m.id} size="sm" /></div>
              </li>
            ))}
            {box.toAnswer.map((c) => (
              <li key={c.id} className="card flex flex-wrap items-center gap-3 px-4 py-3.5">
                <Avatar player={b.byId.get(c.challenger)} />
                <p className="min-w-0 flex-1 text-sm"><span className="font-bold">{shortName(b.byId.get(c.challenger))}</span> challenged you to {FORMAT_LABEL[c.format].toLowerCase()}{c.message ? <span className="block text-text-2">“{c.message}”</span> : null}</p>
                <AnswerChallenge id={c.id} />
              </li>
            ))}
            {box.toPlay.map((c) => {
              const opp = c.challenger === me.id ? c.opponent : c.challenger;
              return (
                <li key={c.id} className="card flex items-center gap-3 px-4 py-3.5">
                  <Avatar player={b.byId.get(opp)} />
                  <p className="min-w-0 flex-1 text-sm">Challenge on with <span className="font-bold">{shortName(b.byId.get(opp))}</span>. Played it?</p>
                  <ButtonLink href={`/record?opponent=${opp}&challenge=${c.id}`} size="sm" variant="secondary">Record result</ButtonLink>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-9 lg:grid-cols-2">
        <section aria-labelledby="last-match">
          <SectionHeader id="last-match" title="Last match" href="/matches" linkLabel="All matches" />
          {last ? <MatchCard m={last} byId={b.byId} today={b.today} /> : (
            <Empty title="No matches yet" action={<ButtonLink href="/challenges" variant="secondary">Challenge someone</ButtonLink>}>
              Record a match you played, or call someone out. Your opponent confirms the score, then it counts.
            </Empty>
          )}
        </section>
        <section aria-labelledby="table">
          <SectionHeader id="table" title={at === -1 ? "Top of the table" : "Around you"} href="/rankings" linkLabel="Rankings" />
          {around.length ? <ol className="card divide-y divide-line overflow-hidden">{around.map((r) => <LeaderboardRow key={r.player.id} r={r} me={me.id} compact />)}</ol>
            : <p className="card px-5 py-6 text-sm text-text-2">The table fills in after the first confirmed match.</p>}
        </section>
      </div>
    </div>
  );
}
