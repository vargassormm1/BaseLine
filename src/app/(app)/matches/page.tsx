import { Plus, Search } from "lucide-react";
import { requirePlayer } from "@/lib/server/session";
import { loadBoard } from "@/lib/server/data";
import { ButtonLink } from "@/components/ui/Button";
import { Empty, PageHeader } from "@/components/ui/bits";
import { Segmented } from "@/components/ui/Segmented";
import { MatchCard } from "@/components/tennis/Scoreboard";
import { DMatchCard } from "@/components/doubles/DoublesScoreboard";
import { loadTennisDoubles } from "@/lib/server/doubles";

export const metadata = { title: "Matches" };
const PAGE = 20;

export default async function Matches({ searchParams }: { searchParams: Promise<{ who?: string; show?: string; q?: string; type?: string }> }) {
  const s = await requirePlayer();
  const [b, d] = await Promise.all([loadBoard(s.sb), loadTennisDoubles(s.sb)]);
  const q = await searchParams;
  const type = q.type === "singles" || q.type === "doubles" ? q.type : undefined;
  const everyone = q.who === "all";
  // (query params can arrive as arrays: only plain strings are used)
  // search by player name or username, or a year ("2024")
  const query = (typeof q.q === "string" ? q.q : "").trim().toLowerCase().slice(0, 40);
  const hay = (id: string) => { const p = b.byId.get(id); return p ? `${p.firstName} ${p.lastName} ${p.username}`.toLowerCase() : ""; };
  const hitIds = (ids: string[], playedOn: string) => !query || playedOn.startsWith(query) || ids.some((id) => hay(id).includes(query));
  type Item = { kind: "s"; m: (typeof b.matches)[number] } | { kind: "d"; m: (typeof d.matches)[number] };
  const singles: Item[] = type === "doubles" ? [] : b.matches
    .filter((m) => (everyone ? m.status === "confirmed" : (m.p1 === s.me || m.p2 === s.me) && m.status !== "canceled") && hitIds([m.p1, m.p2], m.playedOn)).map((m) => ({ kind: "s", m }));
  const doubles: Item[] = type === "singles" ? [] : d.matches
    .filter((m) => (everyone ? m.status === "confirmed" : [...m.side1, ...m.side2].includes(s.me) && m.status !== "canceled") && hitIds([...m.side1, ...m.side2], m.playedOn)).map((m) => ({ kind: "d", m }));
  const list = [...singles, ...doubles].sort((x, y) => (x.m.playedOn === y.m.playedOn ? (x.m.createdAt < y.m.createdAt ? 1 : -1) : x.m.playedOn < y.m.playedOn ? 1 : -1));
  const show = Math.min(list.length, Math.max(PAGE, Number(q.show) || PAGE));
  const qs = (o0: Record<string, string | number | undefined>) => { const o = { type, ...o0 }; const u = new URLSearchParams(); for (const [k, v] of Object.entries(o)) if (v) u.set(k, String(v)); const t = u.toString(); return t ? `/matches?${t}` : "/matches"; };
  // group by month, newest first ("November 2026")
  const month = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const groups: { label: string; items: typeof list }[] = [];
  for (const m of list.slice(0, show)) {
    const label = month(m.m.playedOn);
    const g = groups.at(-1);
    if (g && g.label === label) g.items.push(m); else groups.push({ label, items: [m] });
  }
  return (
    <div className="animate-rise mx-auto max-w-[720px]">
      <PageHeader title="Matches" />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Segmented label="Whose matches" items={[{ href: qs({ q: query }), label: "Mine", on: !everyone }, { href: qs({ who: "all", q: query }), label: "Everyone", on: everyone }]} />
        <Segmented label="Match type" items={[{ href: qs({ type: undefined, who: everyone ? "all" : undefined, q: query }), label: "All", on: !type }, { href: qs({ type: "singles", who: everyone ? "all" : undefined, q: query }), label: "Singles", on: type === "singles" }, { href: qs({ type: "doubles", who: everyone ? "all" : undefined, q: query }), label: "Doubles", on: type === "doubles" }]} />
        <form action="/matches" role="search" className="flex h-12 min-w-0 flex-1 basis-56 items-center gap-2 rounded-full border border-line-strong bg-surface px-4 focus-within:border-accent-ink">
          {everyone ? <input type="hidden" name="who" value="all" /> : null}
          {type ? <input type="hidden" name="type" value={type} /> : null}
          <Search size={17} className="shrink-0 text-text-3" aria-hidden="true" />
          <label htmlFor="mq" className="sr-only">Search matches by player or year</label>
          <input id="mq" name="q" type="search" defaultValue={query} placeholder="Player or year" enterKeyHint="search" autoComplete="off" className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-text-3" />
        </form>
      </div>
      <p className="mb-4 text-sm text-text-2" role="status">{list.length} {list.length === 1 ? "match" : "matches"}{query ? <> for “{query}” · <a href={qs({ who: everyone ? "all" : undefined })} className="font-semibold text-accent-ink">Clear</a></> : null}</p>
      {list.length === 0 ? (
        query ? <Empty title="No matches found">Try a different name, or a year like 2024.</Empty> : (
          <Empty icon={<Plus size={22} aria-hidden="true" />} title={everyone ? "No matches yet" : "You haven't played yet"} action={<ButtonLink href="/record">Record a match</ButtonLink>}>
            Results show up here once your opponent confirms them.
          </Empty>
        )
      ) : (
        <div className="space-y-8">
          {groups.map((g) => (
            <section key={g.label} aria-label={g.label}>
              <h2 className="mb-3 text-sm font-bold text-text-2">{g.label}</h2>
              <div className="space-y-3">{g.items.map((it) => it.kind === "s" ? <MatchCard key={it.m.id} m={it.m} byId={b.byId} today={b.today} /> : <DMatchCard key={it.m.id} m={it.m} byId={b.byId} today={b.today} />)}</div>
            </section>
          ))}
          {show < list.length ? <div className="text-center"><ButtonLink href={qs({ who: everyone ? "all" : undefined, q: query, show: show + PAGE })} variant="secondary">Show more</ButtonLink></div> : null}
        </div>
      )}
    </div>
  );
}
