import { requirePlayer } from "@/lib/server/session";
import { loadPickleball } from "@/lib/server/pickleball";
import { pbDoublesOpponents, pbSinglesH2H, pbTeamH2H } from "@/lib/pickleball/standings";
import { Avatar, displayName } from "@/components/ui/Avatar";
import { Empty, PageHeader } from "@/components/ui/bits";
import { Segmented } from "@/components/ui/Segmented";
import { Button } from "@/components/ui/Button";
import { PbMatchCard, sideName } from "@/components/pickleball/PbScoreboard";

export const metadata = { title: "Pickleball head to head" };
const PAGE = 20;

export default async function PbH2H({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requirePlayer();
  const b = await loadPickleball(s.sb);
  const q = await searchParams;
  const mode = q.mode === "teams" ? "teams" : q.mode === "opponents" ? "opponents" : "singles";
  const byName = new Map(b.players.map((p) => [p.username.toLowerCase(), p]));
  const ids = (v: string | undefined) => (v ?? "").split(",").map((u) => byName.get(u.trim().toLowerCase())?.id).filter((x): x is string => !!x);
  const me = b.byId.get(s.me)!;
  const A = ids(q.a ?? (q.a1 || q.a2 ? [q.a1, q.a2].filter(Boolean).join(",") : undefined)), B = ids(q.b ?? (q.b1 || q.b2 ? [q.b1, q.b2].filter(Boolean).join(",") : undefined));
  const need = mode === "teams" ? 2 : 1;
  const ready = A.length === need && B.length === need && new Set([...A, ...B]).size === 2 * need;
  const result = !ready ? null : mode === "singles" ? pbSinglesH2H(b.matches, A[0]!, B[0]!) : mode === "teams" ? pbTeamH2H(b.matches, [A[0]!, A[1]!], [B[0]!, B[1]!]) : pbDoublesOpponents(b.matches, A[0]!, B[0]!);
  const page = Math.max(1, Number(q.page) || 1);
  const LABEL: Record<string, string> = { a: "First player", b: "Second player", a1: "Team 1, player 1", a2: "Team 1, player 2", b1: "Team 2, player 1", b2: "Team 2, player 2" };
  const select = (name: string, value: string | undefined) => (
    <select name={name} aria-label={LABEL[name]} defaultValue={value ?? ""} className="h-12 min-w-0 flex-1 rounded-2xl border border-line-strong bg-surface-2 px-3 text-base outline-none focus:border-accent-ink">
      <option value="">Choose…</option>
      {b.players.map((p) => <option key={p.id} value={p.username}>{displayName(p)}</option>)}
    </select>
  );
  const [a1, a2] = (q.a ?? ([q.a1, q.a2].filter(Boolean).join(",") || (mode === "teams" ? "" : me.username))).split(","), [b1, b2] = (q.b ?? [q.b1, q.b2].filter(Boolean).join(",")).split(",");

  return (
    <div className="animate-rise">
      <PageHeader title="Head to head" subtitle="Pickleball only. Singles and doubles are kept apart." />
      <div className="mb-4"><Segmented label="Kind" items={[
        { href: "/pickleball/h2h", label: "Singles", on: mode === "singles" },
        { href: "/pickleball/h2h?mode=teams", label: "Team vs team", on: mode === "teams" },
        { href: "/pickleball/h2h?mode=opponents", label: "Doubles opponents", on: mode === "opponents" },
      ]} /></div>
      {/* a plain GET form: works without JavaScript and gives a shareable link */}
      <form className="card space-y-3 p-4" action="/pickleball/h2h">
        {mode !== "singles" ? <input type="hidden" name="mode" value={mode} /> : null}
        {mode === "teams" ? (
          <>
            <div className="flex gap-2">{select("a1", a1)}{select("a2", a2)}</div>
            <p className="text-center text-caption font-bold text-text-3">VS</p>
            <div className="flex gap-2">{select("b1", b1)}{select("b2", b2)}</div>
          </>
        ) : <div className="flex items-center gap-2">{select("a", a1)}<span className="text-caption font-bold text-text-3">VS</span>{select("b", b1)}</div>}
        <Button type="submit" full>Compare</Button>
      </form>
      {mode === "opponents" ? <p className="mt-2 text-caption text-text-3">Doubles-opponent history: every doubles match these two played against each other, with any partners.</p> : null}

      {result ? (
        <section className="mt-7" aria-label="Record">
          <div className="card flex items-center gap-4 px-5 py-5">
            <span className="flex -space-x-2">{A.map((id) => <Avatar key={id} player={b.byId.get(id)} size="md" />)}</span>
            <p className="flex-1 text-center"><span className="score num text-[44px]">{result.aWins}<span className="mx-2 text-text-3">–</span>{result.bWins}</span>
              <span className="block text-caption text-text-3">{sideName(A, b.byId)} vs {sideName(B, b.byId)}</span></p>
            <span className="flex -space-x-2">{B.map((id) => <Avatar key={id} player={b.byId.get(id)} size="md" />)}</span>
          </div>
          {result.matches.length === 0 ? <div className="mt-4"><Empty title="No matches between them yet">Confirmed results show up here.</Empty></div> : (
            <ul className="mt-4 space-y-3">{result.matches.slice(0, page * PAGE).map((m) => <li key={m.id}><PbMatchCard m={m} byId={b.byId} today={b.today} /></li>)}</ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
