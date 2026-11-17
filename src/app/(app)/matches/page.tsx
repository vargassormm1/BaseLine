import { Plus } from "lucide-react";
import { requirePlayer } from "@/lib/server/session";
import { loadBoard } from "@/lib/server/data";
import { ButtonLink } from "@/components/ui/Button";
import { Empty, PageHeader } from "@/components/ui/bits";
import { Segmented } from "@/components/ui/Segmented";
import { MatchCard } from "@/components/tennis/Scoreboard";

export const metadata = { title: "Matches" };
const PAGE = 20;

export default async function Matches({ searchParams }: { searchParams: Promise<{ who?: string; show?: string }> }) {
  const s = await requirePlayer();
  const b = await loadBoard(s.sb);
  const q = await searchParams;
  const everyone = q.who === "all";
  const list = b.matches.filter((m) => (everyone ? m.status === "confirmed" : (m.p1 === s.me || m.p2 === s.me) && m.status !== "canceled"));
  const show = Math.min(list.length, Math.max(PAGE, Number(q.show) || PAGE));
  const base = everyone ? "/matches?who=all" : "/matches";
  // group by month, newest first ("November 2026")
  const month = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const groups: { label: string; items: typeof list }[] = [];
  for (const m of list.slice(0, show)) {
    const label = month(m.playedOn);
    const g = groups.at(-1);
    if (g && g.label === label) g.items.push(m); else groups.push({ label, items: [m] });
  }
  return (
    <div className="animate-rise mx-auto max-w-[720px]">
      <PageHeader title="Matches" />
      <div className="mb-6"><Segmented label="Whose matches" items={[{ href: "/matches", label: "Mine", on: !everyone }, { href: "/matches?who=all", label: "Everyone", on: everyone }]} /></div>
      {list.length === 0 ? (
        <Empty icon={<Plus size={22} aria-hidden="true" />} title={everyone ? "No matches yet" : "You haven't played yet"} action={<ButtonLink href="/record">Record a match</ButtonLink>}>
          Results show up here once your opponent confirms them.
        </Empty>
      ) : (
        <div className="space-y-8">
          {groups.map((g) => (
            <section key={g.label} aria-label={g.label}>
              <h2 className="mb-3 text-sm font-bold text-text-2">{g.label}</h2>
              <div className="space-y-3">{g.items.map((m) => <MatchCard key={m.id} m={m} byId={b.byId} today={b.today} />)}</div>
            </section>
          ))}
          {show < list.length ? <div className="text-center"><ButtonLink href={`${base}${everyone ? "&" : "?"}show=${show + PAGE}`} variant="secondary">Show more</ButtonLink></div> : null}
        </div>
      )}
    </div>
  );
}
