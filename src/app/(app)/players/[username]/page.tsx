import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronDown, ChevronRight, Pencil, Swords } from "lucide-react";
import { requirePlayer } from "@/lib/server/session";
import { loadBoard } from "@/lib/server/data";
import { standings } from "@/lib/tennis/standings";
import { playerStats } from "@/lib/tennis/stats";
import { FORMAT_LABEL, type Format } from "@/lib/tennis/types";
import { Avatar, displayName, shortName } from "@/components/ui/Avatar";
import { ButtonLink } from "@/components/ui/Button";
import { Empty, FormDots, SectionHeader, Stat } from "@/components/ui/bits";
import { MatchCard } from "@/components/tennis/Scoreboard";
import { NewChallenge } from "@/components/actions/NewChallenge";

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  return { title: `@${(await params).username}` };
}

export default async function Profile({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  if (!/^[A-Za-z0-9_.-]{3,24}$/.test(username)) notFound();
  const s = await requirePlayer();
  const b = await loadBoard(s.sb);
  const p = b.players.find((x) => x.username.toLowerCase() === username.toLowerCase());
  if (!p) notFound();
  const isMe = p.id === s.me;
  const all = standings(b.players, b.matches, b.adjustments, { today: b.today }).find((r) => r.player.id === p.id)!;
  const st = playerStats(p.id, b.matches);
  const visible = b.matches.filter((m) => (m.p1 === p.id || m.p2 === p.id) && m.status !== "canceled");

  return (
    <div className="animate-rise space-y-9">
      <header className="flex flex-col items-start gap-5 pt-2 sm:flex-row sm:items-end">
        <Avatar player={p} size="hero" ring={all.rank === 1} />
        <div className="w-full min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-text-2">@{p.username}{p.isAdmin ? " · admin" : ""}</p>
          <h1 className="display mt-1 text-[clamp(30px,10vw,44px)] sm:text-[56px]">{displayName(p)}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-text-2">
            <span><span className="score num text-[22px] text-text">{all.rank ? `#${all.rank}` : "–"}</span> rank</span>
            <span><span className="score num text-[22px] text-text">{all.points}</span> pts</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {isMe ? <ButtonLink href="/settings" variant="secondary"><Pencil size={16} aria-hidden="true" />{p.avatarUrl ? "Edit profile" : "Add a photo"}</ButtonLink> : (
            <>
              <NewChallenge players={[p]} today={b.today} preset={p.id} label="Challenge" />
              <ButtonLink href={`/h2h?a=${b.byId.get(s.me)?.username ?? ""}&b=${p.username}`} variant="secondary"><Swords size={16} aria-hidden="true" />Head to head</ButtonLink>
            </>
          )}
        </div>
      </header>

      {st.played === 0 && all.wins + all.losses === 0 ? (
        <Empty title={isMe ? "No matches yet" : `${shortName(p)} hasn't played yet`}>Stats show up after the first confirmed match.</Empty>
      ) : (
        <section aria-label="Statistics">
          <div className="grid grid-cols-3 gap-4 border-y border-line-strong py-6">
            <Stat label="Record" value={<span className="num">{all.wins}–{all.losses}</span>} />
            <Stat label="Win rate" value={all.winPct === null ? "–" : `${Math.round(all.winPct)}%`} />
            <Stat label={st.currentStreak?.result === "L" ? "Losing streak" : "Win streak"} value={st.currentStreak ? st.currentStreak.length : "–"} />
          </div>
          <div className="mt-4 flex items-center gap-3 text-sm text-text-2"><span>Last {st.form.length || 0}</span><FormDots form={st.form} size={10} /></div>
          <details className="group mt-4">
            <summary className="press inline-flex min-h-11 cursor-pointer list-none items-center gap-1 text-sm font-semibold text-accent-ink [&::-webkit-details-marker]:hidden">More stats<ChevronDown size={16} className="transition-transform group-open:rotate-180" aria-hidden="true" /></summary>
            <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
              {[
                ["Sets", `${st.setsWon}–${st.setsLost}`], ["Games", `${st.gamesWon}–${st.gamesLost}`], ["Tiebreaks", `${st.tiebreaksWon}–${st.tiebreaksLost}`],
                ["Best win streak", String(st.longestWinStreak)],
                ...([1, 3, 5] as Format[]).filter((f) => st.byFormat[f].wins + st.byFormat[f].losses > 0).map((f) => [FORMAT_LABEL[f], `${st.byFormat[f].wins}–${st.byFormat[f].losses}`]),
              ].map(([k, v]) => <div key={k} className="flex items-baseline justify-between border-b border-line py-2"><dt className="text-text-2">{k}</dt><dd className="num font-bold">{v}</dd></div>)}
            </dl>
            {all.wins + all.losses !== st.played ? <p className="mt-3 text-caption text-text-3">The record includes results carried over from the original Baseline.</p> : null}
          </details>
        </section>
      )}

      {st.rivals.length ? (
        <section aria-labelledby="rivals">
          <SectionHeader id="rivals" title="Rivals" />
          <ul className="divide-y divide-line border-y border-line">
            {st.rivals.slice(0, 3).map((r) => {
              const o = b.byId.get(r.opponentId);
              return (
                <li key={r.opponentId}>
                  <Link href={`/h2h?a=${p.username}&b=${o?.username ?? ""}`} className="press flex min-h-14 items-center gap-3 py-2 hover:bg-surface-2">
                    <Avatar player={o} size="sm" /><span className="min-w-0 flex-1 truncate font-semibold">{displayName(o)}</span>
                    <span className="score num text-[24px]">{r.wins}–{r.losses}</span>
                    <ChevronRight size={16} className="text-text-3" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {visible.length ? (
        <section aria-labelledby="history">
          <SectionHeader id="history" title="Recent matches" {...(isMe ? { href: "/matches", linkLabel: "All matches" } : {})} />
          <div className="grid gap-3 lg:grid-cols-2">{visible.slice(0, 6).map((m) => <MatchCard key={m.id} m={m} byId={b.byId} today={b.today} />)}</div>
          {visible.length > 6 ? <p className="mt-3 text-caption text-text-3">Latest 6 of {visible.length}.{isMe ? " See them all under Matches." : ""}</p> : null}
        </section>
      ) : null}
    </div>
  );
}
