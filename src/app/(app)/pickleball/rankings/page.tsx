import { requirePlayer } from "@/lib/server/session";
import { loadPickleball } from "@/lib/server/pickleball";
import { pbStandings } from "@/lib/pickleball/standings";
import { PB_DAILY_POINT_MATCHES } from "@/lib/pickleball/rules";
import { yearOf } from "@/lib/tennis/dates";
import { PageHeader } from "@/components/ui/bits";
import { Segmented } from "@/components/ui/Segmented";
import { LeaderboardRow } from "@/components/tennis/LeaderboardRow";

export const metadata = { title: "Pickleball rankings" };

export default async function PbRankings({ searchParams }: { searchParams: Promise<{ board?: string; season?: string }> }) {
  const s = await requirePlayer();
  const b = await loadPickleball(s.sb);
  const q = await searchParams;
  const board = q.board === "doubles" ? "doubles" : "singles";
  const thisYear = yearOf(b.today);
  const years = [...new Set(b.matches.filter((m) => m.status === "confirmed" && m.discipline === board).map((m) => yearOf(m.playedOn)))].sort((x, y) => y - x);
  if (!years.includes(thisYear)) years.unshift(thisYear);
  const season = years.includes(Number(q.season)) ? Number(q.season) : undefined;
  const rows = pbStandings(b.players, b.matches, board, { today: b.today, season });
  const ranked = rows.filter((r) => r.rank !== null);
  const link = (o: { board?: string; season?: number | undefined }) => `/pickleball/rankings?board=${o.board ?? board}${o.season ? `&season=${o.season}` : ""}`;

  return (
    <div className="animate-rise">
      <PageHeader title="Pickleball rankings" subtitle="Baseline points from confirmed matches (not a DUPR or USA Pickleball rating). A win is worth 5 (one game to 11), 10 (one game to 15 or 21, or best of 3) or 20 (best of 5)." />
      <div className="mb-3"><Segmented label="Board" items={[{ href: link({ board: "singles", season }), label: "Singles", on: board === "singles" }, { href: link({ board: "doubles", season }), label: "Doubles", on: board === "doubles" }]} /></div>
      <div className="no-scrollbar -mx-4 mb-5 overflow-x-auto px-4">
        <Segmented label="Season" items={[{ href: link({}), label: "All-time", on: season === undefined }, ...years.map((y) => ({ href: link({ season: y }), label: String(y), on: season === y }))]} />
      </div>
      {ranked.length === 0 ? (
        <p className="card px-5 py-8 text-center text-sm text-text-2">No confirmed {board} matches {season ? `in ${season}` : "yet"}.</p>
      ) : (
        <ol className="card divide-y divide-line overflow-hidden" aria-label={`${board === "doubles" ? "Doubles" : "Singles"} rankings`}>
          {ranked.map((r) => <LeaderboardRow key={r.player.id} r={r} me={s.me} href={`/players/${r.player.username}?sport=pickleball`} />)}
        </ol>
      )}
      <p className="mt-6 text-caption text-text-3">
        {board === "doubles" ? "Each winner of a doubles match gets the full points. " : ""}Only the first {PB_DAILY_POINT_MATCHES} matches a day between the same players earn points; later ones still count in records and head-to-head. Ties are broken by wins, then win rate. Arrows show places moved in the last 7 days.
      </p>
    </div>
  );
}
