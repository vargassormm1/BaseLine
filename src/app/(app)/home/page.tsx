import Link from "next/link";
import { ArrowRight, Flag, Plus } from "lucide-react";
import { requirePlayer } from "@/lib/server/session";
import { loadBoard } from "@/lib/server/data";
import { standings } from "@/lib/tennis/standings";
import { playerStats } from "@/lib/tennis/stats";
import { yearOf } from "@/lib/tennis/dates";
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
  const year = yearOf(b.today);
  const all = standings(b.players, b.matches, b.adjustments, { today: b.today });
  const season = standings(b.players, b.matches, b.adjustments, { today: b.today, season: year });
  const mine = all.find((r) => r.player.id === me.id)!;
  const mySeason = season.find((r) => r.player.id === me.id)!;
  const st = playerStats(me.id, b.matches);
  const box = inbox(b, me.id);
  const myMatches = b.matches.filter((m) => (m.p1 === me.id || m.p2 === me.id) && m.status !== "canceled").slice(0, 3);
  const greeting = `Hey, ${shortName(me)}`;

  return (
    <div className="animate-rise space-y-8">
      {/* athlete card */}
      <section aria-label="Your standing" className="court-lines relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0d0f0c] px-5 pt-5 pb-6 text-[#f2f3ec] sm:px-7 sm:pt-7">
        <div className="flex items-center gap-3">
          <Avatar player={me} size="md" ring />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#a9ae9f]">{greeting}</p>
            <p className="truncate text-sm text-[#a9ae9f]">@{me.username}</p>
          </div>
          <ButtonLink href="/record" size="sm" className="ml-auto"><Plus size={16} strokeWidth={3} aria-hidden="true" />Record</ButtonLink>
        </div>
        <div className="mt-6 flex items-end gap-6">
          <div>
            <p className="text-caption font-semibold text-[#a9ae9f]">All-time rank</p>
            <p className="score text-[96px] text-[#d6f24a]" aria-label={mine.rank ? `Rank ${mine.rank}` : "Not ranked yet"}>{mine.rank ? `#${mine.rank}` : "–"}</p>
          </div>
          <div className="pb-2">
            <p className="score text-[44px]">{mine.points}</p>
            <p className="text-caption font-semibold text-[#a9ae9f]">points <span className="ml-1 inline-block align-middle"><Movement by={mine.rank ? mine.movement : null} /></span></p>
          </div>
        </div>
        <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-white/10 pt-4">
          <div><dt className="text-caption text-[#a9ae9f]">Record</dt><dd className="score num mt-1 text-[26px]">{mine.wins}–{mine.losses}</dd></div>
          <div><dt className="text-caption text-[#a9ae9f]">Win rate</dt><dd className="score num mt-1 text-[26px]">{mine.winPct === null ? "–" : `${Math.round(mine.winPct)}%`}</dd></div>
          <div><dt className="text-caption text-[#a9ae9f]">{year} rank</dt><dd className="score num mt-1 text-[26px]">{mySeason.rank ? `#${mySeason.rank}` : "–"}</dd></div>
        </dl>
        <div className="mt-4 flex items-center gap-3 text-caption text-[#a9ae9f]">
          <span>Form</span><FormDots form={st.form.slice(0, 10)} />
          {st.currentStreak && st.currentStreak.length > 1 ? <span className="ml-auto font-semibold text-[#f2f3ec]">{st.currentStreak.length} {st.currentStreak.result === "W" ? "wins" : "losses"} in a row</span> : null}
        </div>
      </section>

      {/* what needs me */}
      {box.toConfirm.length + box.toAnswer.length + box.toPlay.length > 0 ? (
        <section aria-labelledby="your-move">
          <SectionHeader id="your-move" title="Your move" href="/challenges" linkLabel="Challenges" />
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
                  <span className="grid size-10 place-items-center rounded-full bg-surface-3"><Flag size={18} aria-hidden="true" /></span>
                  <p className="min-w-0 flex-1 text-sm">Challenge on with <span className="font-bold">{shortName(b.byId.get(opp))}</span>. Played it?</p>
                  <ButtonLink href={`/record?opponent=${opp}&challenge=${c.id}`} size="sm" variant="secondary">Record result</ButtonLink>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {st.played === 0 ? (
        <Empty icon={<Plus size={22} aria-hidden="true" />} title="Your first match is waiting"
          action={<div className="flex flex-wrap justify-center gap-2"><ButtonLink href="/record">Record a match</ButtonLink><ButtonLink href="/challenges" variant="secondary">Challenge someone</ButtonLink></div>}>
          Record a match you played, or challenge someone. Your opponent confirms the score, then the points count.
        </Empty>
      ) : null}

      {/* rivals */}
      {st.rivals.length ? (
        <section aria-labelledby="rivals">
          <SectionHeader id="rivals" title="Rivals" href="/h2h" linkLabel="Head to head" />
          <ul className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0">
            {st.rivals.slice(0, 6).map((r) => {
              const p = b.byId.get(r.opponentId);
              const lead = r.wins > r.losses ? "You lead" : r.wins < r.losses ? `${shortName(p)} leads` : "All square";
              return (
                <li key={r.opponentId} className="w-[44%] shrink-0 snap-start sm:w-auto">
                  <Link href={`/h2h?a=${me.username}&b=${p?.username ?? ""}`} className="press card flex h-full flex-col gap-3 p-4 hover:border-line-strong">
                    <div className="flex items-center gap-2"><Avatar player={p} size="sm" /><span className="truncate font-bold">{shortName(p)}</span></div>
                    <p className="score num text-[34px]"><span className={r.wins >= r.losses ? "text-ball-ink" : ""}>{r.wins}</span><span className="text-text-3">–</span><span className={r.losses > r.wins ? "text-clay-ink" : ""}>{r.losses}</span></p>
                    <p className="text-caption text-text-2">{lead} · {r.played} played</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-2">
        {myMatches.length ? (
          <section aria-labelledby="recent">
            <SectionHeader id="recent" title="Your recent matches" href={`/players/${me.username}`} linkLabel="All" />
            <div className="space-y-3">{myMatches.map((m) => <MatchCard key={m.id} m={m} byId={b.byId} today={b.today} />)}</div>
          </section>
        ) : null}
        <section aria-labelledby="table">
          <SectionHeader id="table" title="Top of the table" href="/rankings" linkLabel="Full rankings" />
          <ol className="card divide-y divide-line overflow-hidden">{all.filter((r) => r.rank !== null).slice(0, 5).map((r) => <LeaderboardRow key={r.player.id} r={r} me={me.id} compact />)}</ol>
          <Link href="/players" className="press mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-text-2 hover:text-text">Find a player<ArrowRight size={15} aria-hidden="true" /></Link>
        </section>
      </div>
    </div>
  );
}
