import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, Lock, Pencil, Swords } from "lucide-react";
import { requirePlayer } from "@/lib/server/session";
import { loadBoard } from "@/lib/server/data";
import { standings } from "@/lib/tennis/standings";
import { playerStats } from "@/lib/tennis/stats";
import { achievements } from "@/lib/tennis/achievements";
import { yearOf } from "@/lib/tennis/dates";
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
  const year = yearOf(b.today);
  const season = standings(b.players, b.matches, b.adjustments, { today: b.today, season: year }).find((r) => r.player.id === p.id)!;
  const st = playerStats(p.id, b.matches);
  const badges = achievements(p.id, st, b.matches);
  const visible = b.matches.filter((m) => (m.p1 === p.id || m.p2 === p.id) && m.status !== "canceled");

  return (
    <div className="animate-rise space-y-9">
      <header className="flex flex-col items-start gap-5 pt-2 sm:flex-row sm:items-end">
        <Avatar player={p} size="hero" ring={all.rank === 1} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text-2">@{p.username}{p.isAdmin ? " · admin" : ""}</p>
          <h1 className="display mt-1 text-[44px] sm:text-[56px]">{displayName(p)}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-text-2">
            <span><span className="score num text-[22px] text-text">{all.rank ? `#${all.rank}` : "–"}</span> all-time</span>
            <span><span className="score num text-[22px] text-text">{all.points}</span> pts</span>
            <span><span className="score num text-[22px] text-text">{season.rank ? `#${season.rank}` : "–"}</span> in {year}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {isMe ? <ButtonLink href="/settings" variant="secondary"><Pencil size={16} aria-hidden="true" />Edit profile</ButtonLink> : (
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
        <>
          <section aria-label="Statistics" className="card grid grid-cols-2 gap-x-4 gap-y-6 p-5 sm:grid-cols-4 sm:p-6">
            <Stat label="Record" value={<span className="num">{all.wins}–{all.losses}</span>} sub={all.wins + all.losses !== st.played ? "incl. carry-over" : undefined} />
            <Stat label="Win rate" value={all.winPct === null ? "–" : `${Math.round(all.winPct)}%`} />
            <Stat label="Sets won" value={st.setPct === null ? "–" : `${Math.round(st.setPct)}%`} sub={`${st.setsWon}–${st.setsLost}`} />
            <Stat label="Games won" value={st.gamePct === null ? "–" : `${Math.round(st.gamePct)}%`} sub={`${st.gamesWon}–${st.gamesLost}`} />
            <Stat label="Tiebreaks" value={<span className="num">{st.tiebreaksWon}–{st.tiebreaksLost}</span>} />
            <Stat label="Best win streak" value={st.longestWinStreak} />
            <Stat label="Current streak" value={st.currentStreak ? `${st.currentStreak.result}${st.currentStreak.length}` : "–"} />
            <div><p className="mb-3 text-caption font-semibold text-text-2">Last 10</p><FormDots form={st.form} size={10} /></div>
          </section>

          <section aria-labelledby="formats">
            <SectionHeader id="formats" title="By format" />
            <ul className="grid gap-3 sm:grid-cols-3">
              {([1, 3, 5] as Format[]).map((f) => {
                const r = st.byFormat[f];
                return (
                  <li key={f} className="card flex items-center justify-between p-4">
                    <span className="font-semibold">{FORMAT_LABEL[f]}</span>
                    <span className="score num text-[26px]">{r.wins}<span className="text-text-3">–</span>{r.losses}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}

      <section aria-labelledby="badges">
        <SectionHeader id="badges" title="Achievements" />
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {badges.map((a) => (
            <li key={a.key} className={`card p-4 ${a.earned ? "" : "opacity-70"}`}>
              <span className={`mb-3 grid size-10 place-items-center rounded-full ${a.earned ? "bg-ball text-on-ball" : "bg-surface-3 text-text-3"}`}>
                {a.earned ? <Award size={19} aria-hidden="true" /> : <Lock size={16} aria-hidden="true" />}
              </span>
              <p className="font-bold">{a.title}</p>
              <p className="mt-0.5 text-caption text-text-2">{a.description}</p>
              {!a.earned && a.progress ? <p className="num mt-2 text-caption font-semibold text-text-3">{a.progress[0]} / {a.progress[1]}</p> : null}
              <span className="sr-only">{a.earned ? "Earned" : "Not earned yet"}</span>
            </li>
          ))}
        </ul>
      </section>

      {st.rivals.length ? (
        <section aria-labelledby="rivals">
          <SectionHeader id="rivals" title="Rivals" />
          <ul className="card divide-y divide-line overflow-hidden">
            {st.rivals.slice(0, 6).map((r) => {
              const o = b.byId.get(r.opponentId);
              return (
                <li key={r.opponentId}>
                  <Link href={`/h2h?a=${p.username}&b=${o?.username ?? ""}`} className="press flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                    <Avatar player={o} size="sm" /><span className="min-w-0 flex-1 truncate font-semibold">{displayName(o)}</span>
                    <span className="text-caption text-text-3">{r.played} played</span>
                    <span className="score num w-16 text-right text-[22px]">{r.wins}–{r.losses}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {visible.length ? (
        <section aria-labelledby="history">
          <SectionHeader id="history" title="Match history" />
          <div className="grid gap-3 lg:grid-cols-2">{visible.slice(0, 30).map((m) => <MatchCard key={m.id} m={m} byId={b.byId} today={b.today} />)}</div>
          {visible.length > 30 ? <p className="mt-3 text-caption text-text-3">Showing the latest 30 of {visible.length}.</p> : null}
        </section>
      ) : null}
    </div>
  );
}
