import { Users } from "lucide-react";
import { displayName, shortName } from "@/components/ui/Avatar";
import { Avatar } from "@/components/ui/Avatar";
import { Empty } from "@/components/ui/bits";
import { SplitBar } from "@/components/tennis/SplitBar";
import { DMatchCard } from "@/components/doubles/DoublesScoreboard";
import { sideName } from "@/components/pickleball/PbScoreboard";
import { doublesOpponents, pairKey, partnerships, teamH2H } from "@/lib/sides/standings";
import type { DMatch } from "@/lib/server/doubles";
import type { Player } from "@/lib/tennis/types";

export type DMode = "teams" | "opponents" | "partner";
type Props = { mode: DMode; players: Player[]; byId: ReadonlyMap<string, Player>; matches: DMatch[]; today: string; a: string[]; b: string[] };

const sel = (name: string, label: string, value: string | undefined, players: Player[]) => (
  <label className="min-w-0">
    <span className="eyebrow">{label}</span>
    <select name={name} defaultValue={value} aria-label={label} className="mt-1 h-11 w-full rounded-xl border border-line-strong bg-surface px-3 text-sm font-semibold outline-none focus:border-accent-ink">
      <option value="">Choose…</option>
      {players.map((p) => <option key={p.id} value={p.username}>{displayName(p)}</option>)}
    </select>
  </label>
);

/** Doubles head-to-head: team vs team, two players as doubles opponents (any partners), or one partnership's record. */
export function DoublesH2H({ mode, players, byId, matches, today, a, b }: Props) {
  const u = (id?: string) => (id ? byId.get(id)?.username : undefined);
  const picker = (
    <form action="/h2h" className="grid max-w-2xl gap-3">
      <input type="hidden" name="mode" value={mode} />
      {mode === "teams" ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_auto_1fr_1fr] sm:items-end">
          {sel("a1", "Team A", u(a[0]), players)}{sel("a2", "and", u(a[1]), players)}
          <span className="col-span-2 pb-3 text-center text-sm font-bold text-text-3 sm:col-span-1">vs</span>
          {sel("b1", "Team B", u(b[0]), players)}{sel("b2", "and", u(b[1]), players)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">{sel("a", mode === "partner" ? "Partner" : "Player", u(a[0]), players)}{sel("b", mode === "partner" ? "Partner" : "Opponent", u(b[0]), players)}</div>
      )}
      <button type="submit" className="press h-11 rounded-full bg-surface-3 px-5 text-sm font-semibold hover:bg-line-strong sm:w-fit">Compare</button>
    </form>
  );
  const need = mode === "teams" ? 4 : 2;
  const chosen = [...a, ...b];
  if (chosen.length !== need || new Set(chosen).size !== need) return <div className="space-y-6">{picker}<Empty title={mode === "teams" ? "Pick four different players" : "Pick two different players"} /></div>;

  if (mode === "partner") {
    const p = partnerships(matches).find((x) => pairKey(x.pair) === pairKey([a[0]!, b[0]!]));
    const ms = matches.filter((m) => m.status === "confirmed" && (pairKey(m.side1) === pairKey([a[0]!, b[0]!]) || pairKey(m.side2) === pairKey([a[0]!, b[0]!])));
    return (
      <div className="space-y-6">{picker}
        <section className="card p-5" aria-label="Partnership record">
          <div className="flex items-center gap-3"><span className="flex -space-x-2">{[a[0]!, b[0]!].map((id) => <Avatar key={id} player={byId.get(id)} size="md" />)}</span><p className="text-lg font-bold">{sideName([a[0]!, b[0]!], byId)}</p></div>
          {p ? <p className="mt-3 num text-sm text-text-2">{p.wins}–{p.losses} together · {Math.round(p.winPct)}% · {p.played} {p.played === 1 ? "match" : "matches"}{p.streak.current > 1 ? ` · won last ${p.streak.current}` : ""} · longest streak {p.streak.longest}</p> : <p className="mt-3 text-sm text-text-2">They haven&apos;t played doubles together yet.</p>}
        </section>
        {ms.length ? <div className="grid gap-3 lg:grid-cols-2">{ms.map((m) => <DMatchCard key={m.id} m={m} byId={byId} today={today} />)}</div> : null}
      </div>
    );
  }
  const h = mode === "teams" ? teamH2H(matches, a, b) : doublesOpponents(matches, a[0]!, b[0]!);
  const nameA = mode === "teams" ? sideName(a, byId) : shortName(byId.get(a[0]!)), nameB = mode === "teams" ? sideName(b, byId) : shortName(byId.get(b[0]!));
  const played = h.matches.length;
  return (
    <div className="space-y-8">{picker}
      <section aria-label={`${nameA} versus ${nameB}: ${h.aWins} to ${h.bWins}`} className="rounded-[28px] border border-white/10 bg-[#123f35] px-4 pt-6 pb-7 text-center text-[#fafaf6] sm:px-8">
        <p className="text-caption font-bold text-[#a9c4b9]">{mode === "teams" ? "Team vs team" : "As doubles opponents, any partners"}</p>
        <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <p className="display truncate text-[18px] sm:text-[24px]">{nameA}</p>
          <p className="score num text-[56px] sm:text-[88px]"><span className={h.aWins >= h.bWins ? "text-[#7be5b3]" : ""}>{h.aWins}</span><span className="px-2 font-light text-[#a9c4b9]">-</span><span className={h.bWins > h.aWins ? "text-[#7be5b3]" : ""}>{h.bWins}</span></p>
          <p className="display truncate text-[18px] sm:text-[24px]">{nameB}</p>
        </div>
        {played ? <div className="mt-5"><SplitBar a={h.aWins} b={h.bWins} /></div> : <p className="mt-2 text-sm text-[#a9c4b9]">Never played</p>}
      </section>
      {played === 0 ? <Empty icon={<Users size={22} aria-hidden="true" />} title="No doubles matches between them yet">Doubles results show up here once confirmed. Singles never counts here.</Empty> : (
        <section aria-labelledby="dmeet"><h2 id="dmeet" className="mb-3 text-lg font-bold">Every meeting <span className="font-normal text-text-3">({played})</span></h2>
          <div className="grid gap-3 lg:grid-cols-2">{h.matches.map((m) => <DMatchCard key={m.id} m={m as DMatch} byId={byId} today={today} />)}</div>
        </section>
      )}
    </div>
  );
}
