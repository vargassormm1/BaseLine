import { requirePlayer } from "@/lib/server/session";
import { loadPickleball } from "@/lib/server/pickleball";
import { isPbFormat, PB_DEFAULT_FORMAT } from "@/lib/pickleball/rules";
import { PageHeader } from "@/components/ui/bits";
import { PbRecordForm } from "@/components/pickleball/PbRecordForm";

export const metadata = { title: "Record pickleball" };

export default async function RecordPickleball({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requirePlayer();
  const b = await loadPickleball(s.sb);
  const q = await searchParams;
  const me = b.byId.get(s.me)!;
  const others = b.players.filter((p) => p.id !== me.id);
  // recent co-players first (partners and opponents)
  const recent = [...new Set(b.matches.filter((m) => m.side1.includes(me.id) || m.side2.includes(me.id)).flatMap((m) => [...m.side1, ...m.side2]).filter((id) => id !== me.id))];
  // a challenge pre-fills the match (the database re-checks it on save)
  const ch = q.challenge ? b.challenges.find((c) => c.id === q.challenge && c.status === "accepted") : undefined;
  const mine = ch ? (ch.side1.includes(me.id) ? ch.side1 : ch.side2) : [];
  const theirs = ch ? (ch.side1.includes(me.id) ? ch.side2 : ch.side1) : [];
  const ids = new Set(others.map((p) => p.id));
  return (
    <div className="animate-rise">
      <PageHeader title="Record pickleball" subtitle={ch ? "Result for your challenge." : "Under a minute: players, format, scores."} />
      <PbRecordForm me={me} others={others} recent={recent} today={b.today} initial={{
        discipline: ch ? ch.discipline : q.discipline === "doubles" ? "doubles" : "singles",
        format: ch ? ch.format : isPbFormat(q.format) ? q.format : PB_DEFAULT_FORMAT,
        scoring: ch ? ch.scoring : q.scoring === "rally" ? "rally" : "side_out",
        partner: ch ? mine.find((x) => x !== me.id) ?? null : null,
        opponents: ch ? theirs : (q.opponents ?? "").split(",").filter((x) => ids.has(x)),
        challenge: ch?.id ?? null,
      }} />
    </div>
  );
}
