import Link from "next/link";
import { notFound } from "next/navigation";
import { Swords } from "lucide-react";
import { requirePlayer } from "@/lib/server/session";
import { loadBoard } from "@/lib/server/data";
import { shortDate } from "@/lib/tennis/dates";
import { FORMAT_LABEL } from "@/lib/tennis/types";
import { uuid } from "@/lib/validation";
import { displayName, shortName } from "@/components/ui/Avatar";
import { Pill } from "@/components/ui/bits";
import { ScoreRows } from "@/components/tennis/Scoreboard";
import { ConfirmMatch, VoidMatch, WithdrawMatch } from "@/components/actions/ActionButtons";
import { buttonClass } from "@/components/ui/Button";

export const metadata = { title: "Match" };

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const s = await requirePlayer();
  const b = await loadBoard(s.sb);
  const m = b.matches.find((x) => x.id === id);
  if (!m) notFound(); // doesn't exist, or not visible to this player (RLS)
  const p1 = b.byId.get(m.p1), p2 = b.byId.get(m.p2), w = b.byId.get(m.winner);
  const me = b.byId.get(s.me) as (typeof b.players)[number] | undefined;
  const status = {
    confirmed: <Pill tone="win">Final · +{m.points} pts to {shortName(w)}</Pill>,
    pending: <Pill tone="warn">Waiting for {shortName(p2)} to confirm</Pill>,
    rejected: <Pill tone="loss">{shortName(p2)} said this score isn&apos;t right</Pill>,
    canceled: <Pill>Withdrawn by {shortName(p1)}</Pill>,
    voided: <Pill>Void{m.voidReason ? `: ${m.voidReason}` : ""}</Pill>,
  }[m.status];

  return (
    <div className="animate-rise mx-auto max-w-[640px]">
      <p className="pt-2 text-sm text-text-2">{shortDate(m.playedOn, b.today)} · {FORMAT_LABEL[m.format]}{m.deciding === "match_tiebreak" ? " · match tiebreak decider" : ""}{m.legacy ? " · from the original Baseline" : ""}</p>
      <h1 className="display mt-2 text-[30px] sm:text-[36px]">{displayName(w)} <span className="text-text-3">def.</span> {displayName(m.winner === m.p1 ? p2 : p1)}</h1>
      <div className="mt-4">{status}</div>
      <section aria-label="Score" className="card mt-6 px-5 py-2"><ScoreRows m={m} byId={b.byId} size="lg" /></section>
      {m.note ? <p className="mt-4 rounded-2xl bg-surface-3 px-4 py-3 text-sm text-text-2">“{m.note}”</p> : null}

      <div className="mt-6 space-y-4">
        {m.status === "pending" && m.p2 === s.me ? (
          <div className="card p-4"><p className="mb-3 text-sm font-semibold">Is this score right? Confirming makes it count.</p><ConfirmMatch id={m.id} /></div>
        ) : null}
        {m.status === "pending" && m.p1 === s.me ? (
          <div className="card flex flex-wrap items-center justify-between gap-2 p-4">
            <p className="text-sm text-text-2">Sent to {shortName(p2)}. It counts once they confirm.</p><WithdrawMatch id={m.id} />
          </div>
        ) : null}
        {m.status === "confirmed" && me?.isAdmin ? <div className="card p-4"><VoidMatch id={m.id} /></div> : null}
        <Link href={`/h2h?a=${p1?.username ?? ""}&b=${p2?.username ?? ""}`} className={buttonClass("secondary", "md")}><Swords size={18} aria-hidden="true" />{shortName(p1)} vs {shortName(p2)}: head to head</Link>
      </div>
    </div>
  );
}
