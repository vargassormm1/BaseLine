import { requirePlayer } from "@/lib/server/session";
import { loadBoard } from "@/lib/server/data";
import { standings } from "@/lib/tennis/standings";
import { yearOf } from "@/lib/tennis/dates";
import { PageHeader } from "@/components/ui/bits";
import { Segmented } from "@/components/ui/Segmented";
import { LeaderboardRow } from "@/components/tennis/LeaderboardRow";
import Link from "next/link";
import { loadTennisDoubles } from "@/lib/server/doubles";
import { sideStandings, topPartnerships } from "@/lib/sides/standings";
import { Avatar } from "@/components/ui/Avatar";
import { sideName } from "@/components/pickleball/PbScoreboard";

export const metadata = { title: "Rankings" };

export default async function Rankings({ searchParams }: { searchParams: Promise<{ season?: string; board?: string }> }) {
  const s = await requirePlayer();
  const b = await loadBoard(s.sb);
  const sp = await searchParams;
  const boardTabs = (on: "singles" | "doubles") => <div className="mb-3"><Segmented label="Board" items={[{ href: "/rankings", label: "Singles", on: on === "singles" }, { href: "/rankings?board=doubles", label: "Doubles", on: on === "doubles" }]} /></div>;
  if (sp.board === "doubles") {
    const d = await loadTennisDoubles(s.sb);
    const yearsD = [...new Set(d.matches.filter((m) => m.status === "confirmed").map((m) => yearOf(m.playedOn)))].sort((x, y) => y - x);
    if (!yearsD.includes(yearOf(b.today))) yearsD.unshift(yearOf(b.today));
    const seasonD = yearsD.includes(Number(sp.season)) ? Number(sp.season) : undefined;
    const rowsD = sideStandings(b.players, d.matches, { today: b.today, season: seasonD }).filter((r) => r.rank !== null);
    const pairs = topPartnerships(seasonD ? d.matches.filter((m) => yearOf(m.playedOn) === seasonD) : d.matches, 3).slice(0, 8);
    return (
      <div className="animate-rise">
        <PageHeader title="Rankings" subtitle="Doubles: individual points that follow you whoever you partner. Each winner earns the same as singles: 10 for standard doubles or best of 3, 20 for best of 5, 5 for one set, a pro set or short sets, 3 for one short set." />
        {boardTabs("doubles")}
        <div className="no-scrollbar -mx-4 mb-5 overflow-x-auto px-4">
          <Segmented label="Season" items={[{ href: "/rankings?board=doubles", label: "All-time", on: seasonD === undefined }, ...yearsD.map((y) => ({ href: `/rankings?board=doubles&season=${y}`, label: String(y), on: seasonD === y }))]} />
        </div>
        {rowsD.length === 0 ? <p className="card px-5 py-8 text-center text-sm text-text-2">No confirmed doubles matches {seasonD ? `in ${seasonD}` : "yet"}.</p> : (
          <ol className="card divide-y divide-line overflow-hidden" aria-label="Doubles rankings">{rowsD.map((r) => <LeaderboardRow key={r.player.id} r={r} me={s.me} />)}</ol>
        )}
        <section className="mt-9" aria-labelledby="pairs">
          <h2 id="pairs" className="text-lg font-bold">Top partnerships</h2>
          <p className="mt-1 text-caption text-text-3">By win rate, with at least 3 matches together. Not a points ranking.</p>
          {pairs.length === 0 ? <p className="card mt-3 px-5 py-6 text-sm text-text-2">Partnerships show up after 3 matches together.</p> : (
            <ol className="card mt-3 divide-y divide-line overflow-hidden">{pairs.map((p, i) => (
              <li key={p.pair.join()}><Link href={`/h2h?mode=partner&a=${b.byId.get(p.pair[0])?.username ?? ""}&b=${b.byId.get(p.pair[1])?.username ?? ""}`} className="press flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                <span className="score w-7 text-[22px] text-text-2">{i + 1}</span>
                <span className="flex -space-x-2">{p.pair.map((id) => <Avatar key={id} player={b.byId.get(id)} size="sm" />)}</span>
                <span className="min-w-0 flex-1"><span className="block truncate font-bold">{sideName(p.pair, b.byId)}</span><span className="num text-caption text-text-2">{p.wins}–{p.losses} · {p.played} matches{p.streak.current > 1 ? ` · won last ${p.streak.current}` : ""}</span></span>
                <span className="score num text-[22px]">{Math.round(p.winPct)}%</span>
              </Link></li>
            ))}</ol>
          )}
        </section>
      </div>
    );
  }
  const thisYear = yearOf(b.today);
  const years = [...new Set(b.matches.filter((m) => m.status === "confirmed").map((m) => yearOf(m.playedOn)))].sort((x, y) => y - x);
  if (!years.includes(thisYear)) years.unshift(thisYear);
  const q = sp.season;
  const season = q === "all" ? undefined : years.includes(Number(q)) ? Number(q) : q === undefined ? undefined : undefined;
  const rows = standings(b.players, b.matches, b.adjustments, { today: b.today, season });
  const ranked = rows.filter((r) => r.rank !== null), unranked = rows.filter((r) => r.rank === null);
  const hasCarryOver = season === undefined && b.adjustments.length > 0;

  return (
    <div className="animate-rise">
      <PageHeader title="Rankings" subtitle="Points from confirmed matches. A win is worth 5 (one set), 10 (best of 3) or 20 (best of 5)." />
      {boardTabs("singles")}
      <div className="no-scrollbar -mx-4 mb-5 overflow-x-auto px-4">
        <Segmented label="Season" items={[{ href: "/rankings", label: "All-time", on: season === undefined }, ...years.map((y) => ({ href: `/rankings?season=${y}`, label: String(y), on: season === y }))]} />
      </div>
      {ranked.length === 0 ? (
        <p className="card px-5 py-8 text-center text-sm text-text-2">No confirmed matches {season ? `in ${season}` : "yet"}.</p>
      ) : (
        <ol className="card divide-y divide-line overflow-hidden" aria-label={season ? `${season} rankings` : "All-time rankings"}>
          {ranked.map((r) => <LeaderboardRow key={r.player.id} r={r} me={s.me} />)}
        </ol>
      )}
      {unranked.length ? (
        <section className="mt-8" aria-labelledby="unranked">
          <h2 id="unranked" className="mb-3 text-sm font-bold text-text-2">{season ? `No matches in ${season}` : "No matches yet"}</h2>
          <ul className="card divide-y divide-line overflow-hidden">{unranked.map((r) => <LeaderboardRow key={r.player.id} r={r} me={s.me} compact />)}</ul>
        </section>
      ) : null}
      <p className="mt-6 text-caption text-text-3">
        Ties are broken by wins, then win rate. Arrows show places gained or lost in the last 7 days.
        {hasCarryOver ? " All-time totals include points carried over from the original Baseline, so nobody's history changed in the move." : ""}
      </p>
    </div>
  );
}
