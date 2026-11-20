import { requirePlayer } from "@/lib/server/session";
import { loadBoard } from "@/lib/server/data";
import { PageHeader } from "@/components/ui/bits";
import { RecordMatchForm } from "@/components/record/RecordMatchForm";
import { DoublesRecordForm } from "@/components/doubles/DoublesRecordForm";
import { Segmented } from "@/components/ui/Segmented";
import { loadTennisDoubles } from "@/lib/server/doubles";
import { D_DEFAULT } from "@/lib/tennis/doubles";
import { uuid } from "@/lib/validation";
import type { Format } from "@/lib/tennis/types";

export const metadata = { title: "Record a match" };

export default async function Record({ searchParams }: { searchParams: Promise<{ opponent?: string; challenge?: string; type?: string; partner?: string; opponents?: string }> }) {
  const s = await requirePlayer();
  const b = await loadBoard(s.sb);
  const me = b.byId.get(s.me)!;
  const q = await searchParams;
  const kindSwitch = <div className="mb-6"><Segmented label="Match type" items={[{ href: "/record", label: "Singles", on: q.type !== "doubles" }, { href: "/record?type=doubles", label: "Doubles", on: q.type === "doubles" }]} /></div>;
  if (q.type === "doubles") {
    const d = await loadTennisDoubles(s.sb);
    const others = b.players.filter((p) => p.id !== me.id);
    const recentD = [...new Set(d.matches.filter((m) => m.side1.includes(me.id) || m.side2.includes(me.id)).flatMap((m) => [...m.side1, ...m.side2]).filter((x) => x !== me.id))];
    const ch = q.challenge && uuid.safeParse(q.challenge).success ? d.challenges.find((c) => c.id === q.challenge && c.status === "accepted" && [...c.side1, ...c.side2].includes(me.id)) : undefined;
    const mine = ch ? (ch.side1.includes(me.id) ? ch.side1 : ch.side2) : [], theirs = ch ? (ch.side1.includes(me.id) ? ch.side2 : ch.side1) : [];
    const ids = new Set(others.map((p) => p.id));
    return (
      <div className="animate-rise">
        <PageHeader title="Record a match" subtitle={ch ? "Result of your doubles challenge." : "Doubles: two teams of two."} />
        {kindSwitch}
        <DoublesRecordForm me={me} others={others} recent={[...new Set([...recentD, ...b.matches.filter((m) => m.p1 === me.id || m.p2 === me.id).map((m) => (m.p1 === me.id ? m.p2 : m.p1))])]} today={b.today} initial={{
          format: ch?.format ?? D_DEFAULT, shortTieAt: ch?.shortTieAt ?? 4, noAd: ch?.noAd ?? false,
          partner: ch ? mine.find((x) => x !== me.id) ?? null : q.partner && ids.has(q.partner) ? q.partner : null,
          opponents: ch ? theirs : (q.opponents ?? "").split(",").filter((x) => ids.has(x)), challenge: ch?.id ?? null,
        }} />
      </div>
    );
  }
  const opponents = b.players.filter((p) => p.id !== me.id);
  // most recent opponents first
  const recent = [...new Set(b.matches.filter((m) => m.p1 === me.id || m.p2 === me.id).map((m) => (m.p1 === me.id ? m.p2 : m.p1)))];
  // an accepted challenge pre-fills (and locks) the opponent and format
  const ch = q.challenge && uuid.safeParse(q.challenge).success
    ? b.challenges.find((c) => c.id === q.challenge && c.status === "accepted" && (c.challenger === me.id || c.opponent === me.id)) : undefined;
  const opponent = ch ? (ch.challenger === me.id ? ch.opponent : ch.challenger)
    : q.opponent && opponents.some((o) => o.id === q.opponent) ? q.opponent : null;
  const lastFormat = b.matches.find((m) => m.p1 === me.id)?.format;
  const format: Format = ch?.format ?? lastFormat ?? 1;
  return (
    <div className="animate-rise">
      <PageHeader title="Record a match" subtitle={ch ? "Result of your challenge." : "Takes about ten seconds."} />
      {ch ? null : kindSwitch}
      <RecordMatchForm me={me} opponents={opponents} recent={recent} today={b.today} initial={{ opponent, format, challenge: ch?.id ?? null }} />
    </div>
  );
}
