import { requirePlayer } from "@/lib/server/session";
import { loadBoard } from "@/lib/server/data";
import { standings } from "@/lib/tennis/standings";
import { PageHeader } from "@/components/ui/bits";
import { PlayerList } from "@/components/tennis/PlayerList";

export const metadata = { title: "Players" };

export default async function Players() {
  const s = await requirePlayer();
  const b = await loadBoard(s.sb);
  const rows = standings(b.players, b.matches, b.adjustments, { today: b.today });
  return (
    <div className="animate-rise">
      <PageHeader title="Players" subtitle={`${b.players.length} on Baseline.`} />
      <PlayerList me={s.me} rows={rows.map((r) => ({ id: r.player.id, username: r.player.username, firstName: r.player.firstName, lastName: r.player.lastName, avatarUrl: r.player.avatarUrl, rank: r.rank, wins: r.wins, losses: r.losses, points: r.points }))} />
    </div>
  );
}
