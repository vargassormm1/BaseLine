import { Swords } from "lucide-react";
import { requirePlayer } from "@/lib/server/session";
import { loadBoard } from "@/lib/server/data";
import { headToHead, playerStats, setsFor } from "@/lib/tennis/stats";
import { standings } from "@/lib/tennis/standings";
import { scoreline } from "@/lib/tennis/score";
import { shortDate } from "@/lib/tennis/dates";
import { FORMAT_LABEL, type Match } from "@/lib/tennis/types";
import { Avatar, displayName, shortName } from "@/components/ui/Avatar";
import { ButtonLink } from "@/components/ui/Button";
import { Empty } from "@/components/ui/bits";
import { MatchCard } from "@/components/tennis/Scoreboard";
import { NewChallenge } from "@/components/actions/NewChallenge";
import { SplitBar } from "@/components/tennis/SplitBar";

export const metadata = { title: "Head to head" };

export default async function H2H({ searchParams }: { searchParams: Promise<{ a?: string; b?: string }> }) {
  const s = await requirePlayer();
  const b = await loadBoard(s.sb);
  const q = await searchParams;
  const find = (u?: string) => (u ? b.players.find((p) => p.username.toLowerCase() === u.toLowerCase()) : undefined);
  const me = b.byId.get(s.me)!;
  const pa = find(q.a) ?? me;
  const topRival = playerStats(pa.id, b.matches).rivals[0]?.opponentId;
  const pb = find(q.b) ?? (topRival ? b.byId.get(topRival) : undefined) ?? b.players.find((p) => p.id !== pa.id);
  const table = standings(b.players, b.matches, b.adjustments, { today: b.today });
  const rankOf = (id: string) => table.find((r) => r.player.id === id)?.rank;

  const select = (name: "a" | "b", label: string, value: string | undefined) => (
    <label>
      <span className="eyebrow">{label}</span>
      <select name={name} defaultValue={value} className="mt-1 h-11 w-full rounded-xl border border-line-strong bg-surface px-3 text-sm font-semibold outline-none focus:border-ball-ink">
        {b.players.map((p) => <option key={p.id} value={p.username}>{displayName(p)}</option>)}
      </select>
    </label>
  );
  const picker = (
    <form action="/h2h" className="grid grid-cols-[1fr_auto_1fr] items-end gap-2 sm:grid-cols-[1fr_auto_1fr_auto] sm:max-w-2xl">
      {select("a", "Player", pa.username)}
      <span className="pb-3 text-sm font-bold text-text-3">vs</span>
      {select("b", "Opponent", pb?.username)}
      <button type="submit" className="press col-span-3 h-11 rounded-full bg-surface-3 px-5 text-sm font-semibold hover:bg-line-strong sm:col-span-1">Compare</button>
    </form>
  );

  if (!pb || pb.id === pa.id) {
    return <div className="animate-rise space-y-6"><h1 className="display pt-2 text-[34px]">Head to head</h1>{picker}<Empty title="Pick two different players" /></div>;
  }
  const h = headToHead(pa.id, pb.id, b.matches);
  const big = (m: Match | null, id: string) => (m ? `${scoreline(m.sets, m.p1 === id ? 1 : 2)} (${shortDate(m.playedOn, b.today)})` : "–");
  const rows: [string, string | number, string | number][] = [
    ["Matches won", h.a.wins, h.b.wins],
    ["Sets won", h.a.setsWon, h.b.setsWon],
    ["Games won", h.a.gamesWon, h.b.gamesWon],
    ["Tiebreaks won", h.a.tiebreaksWon, h.b.tiebreaksWon],
  ];
  const side = (p: typeof pa, leading: boolean) => (
    <div className="flex flex-col items-center text-center">
      <Avatar player={p} size="xl" ring={leading} />
      <p className="display mt-3 text-[22px] sm:text-[28px]">{shortName(p)}</p>
      <p className="text-caption text-[#a9ae9f]">{rankOf(p.id) ? `#${rankOf(p.id)}` : "Unranked"} · @{p.username}</p>
    </div>
  );
  const lead = h.a.wins === h.b.wins ? "All square" : `${shortName(h.a.wins > h.b.wins ? pa : pb)} leads`;

  return (
    <div className="animate-rise space-y-8">
      <div className="space-y-4 pt-2"><h1 className="display text-[34px] sm:text-[40px]">Head to head</h1>{picker}</div>

      {/* the matchup */}
      <section aria-label={`${displayName(pa)} versus ${displayName(pb)}: ${h.a.wins} to ${h.b.wins}`} className="court-lines overflow-hidden rounded-[28px] border border-white/10 bg-[#0d0f0c] px-4 pt-6 pb-7 text-[#f2f3ec] sm:px-8">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          {side(pa, h.a.wins >= h.b.wins && h.played > 0)}
          <div className="text-center">
            <p className="score num text-[72px] sm:text-[104px]"><span className={h.a.wins >= h.b.wins ? "text-[#d6f24a]" : ""}>{h.a.wins}</span><span className="px-2 font-light text-[#8f9586]">-</span><span className={h.b.wins > h.a.wins ? "text-[#f58c64]" : ""}>{h.b.wins}</span></p>
            <p className="text-caption font-semibold text-[#a9ae9f]">{h.played ? lead : "Never played"}</p>
          </div>
          {side(pb, h.b.wins > h.a.wins)}
        </div>
        {h.played ? <div className="mt-6"><SplitBar a={h.a.wins} b={h.b.wins} /></div> : null}
        {h.streak && h.streak.length > 1 ? <p className="mt-4 text-center text-sm text-[#a9ae9f]">{shortName(b.byId.get(h.streak.playerId))} has won the last {h.streak.length}</p> : null}
      </section>

      {h.played === 0 ? (
        <Empty icon={<Swords size={22} aria-hidden="true" />} title={`${shortName(pa)} and ${shortName(pb)} haven't played`}
          action={pa.id === s.me ? <NewChallenge players={[pb]} today={b.today} preset={pb.id} label={`Challenge ${shortName(pb)}`} /> : undefined}>
          The rivalry starts with one match.
        </Empty>
      ) : (
        <>
          <section aria-labelledby="compare" className="card overflow-hidden">
            <h2 id="compare" className="sr-only">Comparison</h2>
            <ul className="divide-y divide-line">
              {rows.map(([label, x, y]) => (
                <li key={label} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-5 py-3.5">
                  <span className={`score num text-[28px] ${Number(x) > Number(y) ? "text-ball-ink" : ""}`}>{x}</span>
                  <span className="text-center text-caption font-semibold text-text-2">{label}</span>
                  <span className={`score num text-right text-[28px] ${Number(y) > Number(x) ? "text-ball-ink" : ""}`}>{y}</span>
                </li>
              ))}
              {h.byFormat.map((f) => (
                <li key={f.format} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-5 py-3.5">
                  <span className="score num text-[22px]">{f.a}</span><span className="text-center text-caption font-semibold text-text-2">{FORMAT_LABEL[f.format]} wins</span><span className="score num text-right text-[22px]">{f.b}</span>
                </li>
              ))}
              <li className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-5 py-3.5 text-sm">
                <span>{big(h.biggestWin.a, pa.id)}</span><span className="text-center text-caption font-semibold text-text-2">Biggest win</span><span className="text-right">{big(h.biggestWin.b, pb.id)}</span>
              </li>
            </ul>
            <p className="border-t border-line px-5 py-3 text-caption text-text-3">
              First met {h.firstMeeting ? shortDate(h.firstMeeting.playedOn, b.today) : "–"} · last met {h.lastMeeting ? shortDate(h.lastMeeting.playedOn, b.today) : "–"} · {h.played} matches
              {h.meetings.some((m) => setsFor(m, pa.id).some((x) => x.isMatchTiebreak)) ? " · games exclude match tiebreaks" : ""}
            </p>
          </section>
          <div className="flex flex-wrap gap-2">
            {pa.id === s.me || pb.id === s.me ? <NewChallenge players={[pa.id === s.me ? pb : pa]} today={b.today} preset={(pa.id === s.me ? pb : pa).id} label="Rematch" /> : null}
            {pa.id === s.me ? <ButtonLink href={`/record?opponent=${pb.id}`} variant="secondary">Record a match</ButtonLink> : null}
          </div>
          <section aria-labelledby="meetings">
            <h2 id="meetings" className="mb-3 text-lg font-bold">Every meeting</h2>
            <div className="grid gap-3 lg:grid-cols-2">{h.meetings.map((m) => <MatchCard key={m.id} m={m} byId={b.byId} today={b.today} />)}</div>
          </section>
        </>
      )}
    </div>
  );
}
