import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Pill } from "@/components/ui/bits";
import { relativeDay } from "@/lib/tennis/dates";
import type { Player } from "@/lib/tennis/types";
import { D_FORMATS, doublesScoreLine, setKind } from "@/lib/tennis/doubles";
import { playersOf } from "@/lib/sides/standings";
import type { DMatch } from "@/lib/server/doubles";
import { sideName } from "@/components/pickleball/PbScoreboard";

type ById = ReadonlyMap<string, Player>;
const STATUS: Record<DMatch["status"], { label: string; tone: "warn" | "loss" | "neutral" } | null> = {
  confirmed: null, pending: { label: "Waiting for confirmation", tone: "warn" }, rejected: { label: "Rejected", tone: "loss" },
  canceled: { label: "Withdrawn", tone: "neutral" }, voided: { label: "Void", tone: "neutral" },
};

/** Two rows, one per team (both partners), a column per set; a set tiebreak shows the loser's points, a match tiebreak in brackets. */
export function DScoreRows({ m, byId, size = "md" }: { m: DMatch; byId: ById; size?: "md" | "lg" }) {
  const lg = size === "lg";
  const row = (side: 1 | 2) => {
    const ids = playersOf(m, side), won = m.winnerSide === side && m.status !== "voided";
    return (
      <div className={`flex items-center gap-3 ${lg ? "py-3" : "py-1.5"}`}>
        <span className="flex shrink-0 -space-x-2">{ids.map((id) => <Avatar key={id} player={byId.get(id)} size={lg ? "lg" : "sm"} />)}</span>
        <span className={`min-w-0 flex-1 truncate ${lg ? "text-lg" : "text-[15px]"} ${won ? "font-bold text-text" : "font-medium text-text-2"}`}>
          {sideName(ids, byId)}
          {won ? <><span className="ml-2 inline-block size-2 rounded-full bg-accent align-middle" aria-hidden="true" /><span className="sr-only"> (winners)</span></> : null}
        </span>
        <span className="flex items-baseline gap-1">
          {m.sets.map((s, i) => {
            const mine = side === 1 ? s[0] : s[1], theirs = side === 1 ? s[1] : s[0];
            const mtb = "matchTiebreak" in setKind(m.format, i, m.shortTieAt ?? 4);
            const tb = s.length > 2 ? (side === 1 ? s[2] : s[3]) : null, otherTb = s.length > 2 ? (side === 1 ? s[3] : s[2]) : null;
            const showTb = tb != null && otherTb != null && mine < theirs;
            return (
              <span key={i} className={`score num relative text-center ${mtb ? (lg ? "w-14 text-[26px]" : "w-10 text-[18px]") : lg ? "w-10 text-[34px]" : "w-7 text-[22px]"} ${mine > theirs ? "text-text" : "text-text-3"}`}>
                {mtb ? `[${mine}]` : mine}{showTb ? <sup className={`absolute font-bold ${lg ? "-right-0.5 top-0 text-sm" : "-right-1 -top-0.5 text-[10px]"}`}>{tb}</sup> : null}
              </span>
            );
          })}
        </span>
      </div>
    );
  };
  return <div role="group" aria-label={dScoreLabel(m, byId)}>{row(1)}<div className="h-px bg-line" />{row(2)}</div>;
}

export function dScoreLabel(m: DMatch, byId: ById) {
  return `${sideName(playersOf(m, m.winnerSide), byId)} beat ${sideName(playersOf(m, m.winnerSide === 1 ? 2 : 1), byId)} ${doublesScoreLine(m.format, m.sets, m.winnerSide)}`;
}

export function DMatchCard({ m, byId, today }: { m: DMatch; byId: ById; today: string }) {
  const st = STATUS[m.status];
  return (
    <Link href={`/matches/doubles/${m.id}`} className="press card block px-4 pt-3 pb-2 hover:border-line-strong">
      <div className="mb-1 flex flex-wrap items-center gap-x-2 text-caption font-semibold text-text-3">
        <span>{relativeDay(m.playedOn, today)}</span><span aria-hidden="true">·</span><span>Doubles</span><span aria-hidden="true">·</span><span>{D_FORMATS[m.format].short}</span>
        {m.noAd ? <><span aria-hidden="true">·</span><span>No-ad</span></> : null}
        {st ? <span className="ml-auto"><Pill tone={st.tone}>{st.label}</Pill></span> : <span className="ml-auto num">+{m.points ?? 0} pts each</span>}
      </div>
      <DScoreRows m={m} byId={byId} />
    </Link>
  );
}
