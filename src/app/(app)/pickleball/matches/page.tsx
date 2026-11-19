import { requirePlayer } from "@/lib/server/session";
import { loadPickleball } from "@/lib/server/pickleball";
import { sideOf } from "@/lib/pickleball/standings";
import { Empty, PageHeader } from "@/components/ui/bits";
import { Segmented } from "@/components/ui/Segmented";
import { ButtonLink } from "@/components/ui/Button";
import { PbMatchCard } from "@/components/pickleball/PbScoreboard";

export const metadata = { title: "Pickleball matches" };
const PAGE = 30;

export default async function PbMatches({ searchParams }: { searchParams: Promise<{ show?: string; kind?: string; page?: string }> }) {
  const s = await requirePlayer();
  const b = await loadPickleball(s.sb);
  const q = await searchParams;
  const show = q.show === "everyone" ? "everyone" : "mine";
  const kind = q.kind === "singles" || q.kind === "doubles" ? q.kind : "all";
  const page = Math.max(1, Number(q.page) || 1);
  const list = b.matches.filter((m) => (show === "mine" ? sideOf(m, s.me) !== null : m.status === "confirmed" || m.status === "voided") && (kind === "all" || m.discipline === kind));
  const link = (o: Record<string, string>) => `/pickleball/matches?${new URLSearchParams({ show, kind, ...o })}`;
  return (
    <div className="animate-rise">
      <PageHeader title="Pickleball matches" action={<ButtonLink href="/pickleball/record" size="sm">Record</ButtonLink>} />
      <div className="mb-3 flex flex-wrap gap-3">
        <Segmented label="Whose" items={[{ href: link({ show: "mine" }), label: "Mine", on: show === "mine" }, { href: link({ show: "everyone" }), label: "Everyone", on: show === "everyone" }]} />
        <Segmented label="Kind" items={(["all", "singles", "doubles"] as const).map((k) => ({ href: link({ kind: k }), label: k === "all" ? "All" : k === "singles" ? "Singles" : "Doubles", on: kind === k }))} />
      </div>
      {list.length === 0 ? <Empty title="No matches here yet" action={<ButtonLink href="/pickleball/record" variant="secondary">Record a match</ButtonLink>}>Recorded matches show up here; they count once the other side confirms.</Empty> : (
        <ul className="space-y-3">{list.slice(0, page * PAGE).map((m) => <li key={m.id}><PbMatchCard m={m} byId={b.byId} today={b.today} /></li>)}</ul>
      )}
      {list.length > page * PAGE ? <div className="mt-5 text-center"><ButtonLink href={link({ page: String(page + 1) })} variant="secondary">Show more</ButtonLink></div> : null}
    </div>
  );
}
