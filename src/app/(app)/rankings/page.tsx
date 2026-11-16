import { requirePlayer } from "@/lib/server/session";
import { loadBoard } from "@/lib/server/data";
import { standings } from "@/lib/tennis/standings";
import { yearOf } from "@/lib/tennis/dates";
import { PageHeader } from "@/components/ui/bits";
import { Segmented } from "@/components/ui/Segmented";
import { LeaderboardRow } from "@/components/tennis/LeaderboardRow";

export const metadata = { title: "Rankings" };

export default async function Rankings({ searchParams }: { searchParams: Promise<{ season?: string }> }) {
  const s = await requirePlayer();
  const b = await loadBoard(s.sb);
  const thisYear = yearOf(b.today);
  const years = [...new Set(b.matches.filter((m) => m.status === "confirmed").map((m) => yearOf(m.playedOn)))].sort((x, y) => y - x);
  if (!years.includes(thisYear)) years.unshift(thisYear);
  const q = (await searchParams).season;
  const season = q === "all" ? undefined : years.includes(Number(q)) ? Number(q) : q === undefined ? undefined : undefined;
  const rows = standings(b.players, b.matches, b.adjustments, { today: b.today, season });
  const ranked = rows.filter((r) => r.rank !== null), unranked = rows.filter((r) => r.rank === null);
  const hasCarryOver = season === undefined && b.adjustments.length > 0;

  return (
    <div className="animate-rise">
      <PageHeader title="Rankings" subtitle="Points from confirmed matches. A win is worth 5 (one set), 10 (best of 3) or 20 (best of 5)." />
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
