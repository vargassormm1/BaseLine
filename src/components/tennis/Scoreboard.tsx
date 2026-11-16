import Link from "next/link";
import { Avatar, displayName, shortName } from "@/components/ui/Avatar";
import { Pill } from "@/components/ui/bits";
import { relativeDay } from "@/lib/tennis/dates";
import { FORMAT_LABEL, type Match, type Player } from "@/lib/tennis/types";

type ById = ReadonlyMap<string, Player>;
const STATUS: Record<Match["status"], { label: string; tone: "warn" | "loss" | "neutral" } | null> = {
  confirmed: null, pending: { label: "Waiting for confirmation", tone: "warn" }, rejected: { label: "Rejected", tone: "loss" },
  canceled: { label: "Withdrawn", tone: "neutral" }, voided: { label: "Void", tone: "neutral" },
};

/** Two scoreboard rows (one per player) with a column per set. */
export function ScoreRows({ m, byId, size = "md" }: { m: Match; byId: ById; size?: "md" | "lg" }) {
  const lg = size === "lg";
  const row = (side: 1 | 2) => {
    const id = side === 1 ? m.p1 : m.p2, p = byId.get(id), won = m.winner === id && m.status !== "voided";
    return (
      <div className={`flex items-center gap-3 ${lg ? "py-3" : "py-1.5"}`}>
        <Avatar player={p} size={lg ? "lg" : "sm"} />
        <span className={`min-w-0 flex-1 truncate ${lg ? "text-lg" : "text-[15px]"} ${won ? "font-bold text-text" : "font-medium text-text-2"}`}>
          {lg ? displayName(p) : shortName(p)}
          {won ? <span className="ml-2 inline-block size-2 rounded-full bg-ball align-middle" aria-label="winner" /> : null}
        </span>
        <span className="flex items-baseline gap-1">
          {m.sets.map((s, i) => {
            const mine = side === 1 ? s.p1 : s.p2, theirs = side === 1 ? s.p2 : s.p1;
            const tb = side === 1 ? s.tb1 : s.tb2, otherTb = side === 1 ? s.tb2 : s.tb1;
            const showTb = tb != null && otherTb != null && mine < theirs; // the tiebreak loser's points, as usual
            return (
              <span key={i} className={`score num relative text-center ${lg ? "w-10 text-[34px]" : "w-7 text-[22px]"} ${mine > theirs ? "text-text" : "text-text-3"}`}>
                {mine}{showTb ? <sup className={`absolute font-bold ${lg ? "-right-0.5 top-0 text-sm" : "-right-1 -top-0.5 text-[10px]"}`}>{tb}</sup> : null}
              </span>
            );
          })}
        </span>
      </div>
    );
  };
  return <div role="group" aria-label={scoreLabel(m, byId)}>{row(1)}<div className="h-px bg-line" />{row(2)}</div>;
}

export function scoreLabel(m: Match, byId: ById) {
  const w = byId.get(m.winner), l = byId.get(m.winner === m.p1 ? m.p2 : m.p1);
  const sets = m.sets.map((s) => (m.winner === m.p1 ? `${s.p1}–${s.p2}` : `${s.p2}–${s.p1}`)).join(", ");
  return `${displayName(w)} beat ${displayName(l)} ${sets}`;
}

/** A match in a list: date, format, status, and the scoreboard. */
export function MatchCard({ m, byId, today, href = `/matches/${m.id}` }: { m: Match; byId: ById; today: string; href?: string }) {
  const st = STATUS[m.status];
  return (
    <Link href={href} className="press card block px-4 pt-3 pb-2 hover:border-line-strong">
      <div className="mb-1 flex items-center gap-2 text-caption font-semibold text-text-3">
        <span>{relativeDay(m.playedOn, today)}</span><span aria-hidden="true">·</span><span>{FORMAT_LABEL[m.format]}</span>
        {st ? <span className="ml-auto"><Pill tone={st.tone}>{st.label}</Pill></span> : <span className="ml-auto num">+{m.points} pts</span>}
      </div>
      <ScoreRows m={m} byId={byId} />
    </Link>
  );
}
