import Link from "next/link";
import { Avatar, displayName, shortName } from "@/components/ui/Avatar";
import { Pill } from "@/components/ui/bits";
import { relativeDay } from "@/lib/tennis/dates";
import type { Player } from "@/lib/tennis/types";
import { PB_FORMATS } from "@/lib/pickleball/rules";
import { playersOf, type PbMatch } from "@/lib/pickleball/standings";

type ById = ReadonlyMap<string, Player>;
const STATUS: Record<PbMatch["status"], { label: string; tone: "warn" | "loss" | "neutral" } | null> = {
  confirmed: null, pending: { label: "Waiting for confirmation", tone: "warn" }, rejected: { label: "Rejected", tone: "loss" },
  canceled: { label: "Withdrawn", tone: "neutral" }, voided: { label: "Void", tone: "neutral" },
};

export const sideName = (ids: readonly string[], byId: ById, long = false) => ids.map((id) => (long ? displayName(byId.get(id)) : shortName(byId.get(id)))).join(" & ");

/** Two scoreboard rows (one per side; doubles show both partners) with a column per game. */
export function PbScoreRows({ m, byId, size = "md" }: { m: PbMatch; byId: ById; size?: "md" | "lg" }) {
  const lg = size === "lg";
  const row = (side: 1 | 2) => {
    const ids = playersOf(m, side), won = m.winnerSide === side && m.status !== "voided";
    return (
      <div className={`flex items-center gap-3 ${lg ? "py-3" : "py-1.5"}`}>
        <span className="flex shrink-0 -space-x-2">{ids.map((id) => <Avatar key={id} player={byId.get(id)} size={lg ? "lg" : "sm"} />)}</span>
        <span className={`min-w-0 flex-1 truncate ${lg ? "text-lg" : "text-[15px]"} ${won ? "font-bold text-text" : "font-medium text-text-2"}`}>
          {sideName(ids, byId, lg && ids.length === 1)}
          {won ? <><span className="ml-2 inline-block size-2 rounded-full bg-accent align-middle" aria-hidden="true" /><span className="sr-only"> (winner)</span></> : null}
        </span>
        <span className="flex items-baseline gap-1">
          {m.games.map(([a, b], i) => {
            const mine = side === 1 ? a : b, theirs = side === 1 ? b : a;
            return <span key={i} className={`score num text-center ${lg ? "w-11 text-[32px]" : "w-8 text-[22px]"} ${mine > theirs ? "text-text" : "text-text-3"}`}>{mine}</span>;
          })}
        </span>
      </div>
    );
  };
  return <div role="group" aria-label={pbScoreLabel(m, byId)}>{row(1)}<div className="h-px bg-line" />{row(2)}</div>;
}

export function pbScoreLabel(m: PbMatch, byId: ById) {
  const w = playersOf(m, m.winnerSide), l = playersOf(m, m.winnerSide === 1 ? 2 : 1);
  const games = m.games.map(([a, b]) => (m.winnerSide === 1 ? `${a}–${b}` : `${b}–${a}`)).join(", ");
  return `${sideName(w, byId, true)} beat ${sideName(l, byId, true)} ${games}`;
}

/** A pickleball match in a list: date, singles/doubles, format, rally tag, status or points, and the scoreboard. */
export function PbMatchCard({ m, byId, today }: { m: PbMatch; byId: ById; today: string }) {
  const st = STATUS[m.status];
  return (
    <Link href={`/pickleball/matches/${m.id}`} className="press card block px-4 pt-3 pb-2 hover:border-line-strong">
      <div className="mb-1 flex flex-wrap items-center gap-x-2 text-caption font-semibold text-text-3">
        <span>{relativeDay(m.playedOn, today)}</span><span aria-hidden="true">·</span>
        <span>{m.discipline === "doubles" ? "Doubles" : "Singles"}</span><span aria-hidden="true">·</span><span>{PB_FORMATS[m.format].short}</span>
        {m.scoring === "rally" ? <><span aria-hidden="true">·</span><span>Rally</span></> : null}
        {st ? <span className="ml-auto"><Pill tone={st.tone}>{st.label}</Pill></span> : <span className="ml-auto num">+{m.points ?? 0} pts{m.discipline === "doubles" ? " each" : ""}</span>}
      </div>
      <PbScoreRows m={m} byId={byId} />
    </Link>
  );
}
