import { requirePlayer } from "@/lib/server/session";
import { loadBoard } from "@/lib/server/data";
import { PageHeader } from "@/components/ui/bits";
import { RecordMatchForm } from "@/components/record/RecordMatchForm";
import { uuid } from "@/lib/validation";
import type { Format } from "@/lib/tennis/types";

export const metadata = { title: "Record a match" };

export default async function Record({ searchParams }: { searchParams: Promise<{ opponent?: string; challenge?: string }> }) {
  const s = await requirePlayer();
  const b = await loadBoard(s.sb);
  const me = b.byId.get(s.me)!;
  const q = await searchParams;
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
      <RecordMatchForm me={me} opponents={opponents} recent={recent} today={b.today} initial={{ opponent, format, challenge: ch?.id ?? null }} />
    </div>
  );
}
