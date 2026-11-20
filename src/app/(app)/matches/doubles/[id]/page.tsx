import Link from "next/link";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { requirePlayer } from "@/lib/server/session";
import { loadPlayers } from "@/lib/server/data";
import { loadTennisDoubles } from "@/lib/server/doubles";
import { shortDate, todayET } from "@/lib/tennis/dates";
import { D_FORMATS, isShort } from "@/lib/tennis/doubles";
import { playersOf, sideOf } from "@/lib/sides/standings";
import { uuid } from "@/lib/validation";
import { Pill } from "@/components/ui/bits";
import { sideName } from "@/components/pickleball/PbScoreboard";
import { DScoreRows } from "@/components/doubles/DoublesScoreboard";
import { ConfirmDoubles, VoidDoubles, WithdrawDoubles } from "@/components/doubles/DoublesActions";

export const metadata = { title: "Doubles match" };

export default async function DoublesMatch({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ recorded?: string }> }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const justRecorded = (await searchParams).recorded === "1";
  const s = await requirePlayer();
  const [{ byId }, d] = await Promise.all([loadPlayers(s.sb), loadTennisDoubles(s.sb)]);
  const m = d.matches.find((x) => x.id === id);
  if (!m) notFound(); // doesn't exist, or not visible to me (RLS)
  const today = todayET();
  const mySide = sideOf(m, s.me), otherSide = m.recorderSide === 1 ? 2 : 1;
  const winners = playersOf(m, m.winnerSide), them = playersOf(m, otherSide);
  const status = {
    confirmed: <Pill tone="win">Final · +{m.points ?? 0} pts each to {sideName(winners, byId)}</Pill>,
    pending: <Pill tone="warn">Waiting for {sideName(them, byId)} (either one) to confirm</Pill>,
    rejected: <Pill tone="loss">The other team said this score isn&apos;t right</Pill>,
    canceled: <Pill>Withdrawn</Pill>,
    voided: <Pill>Void{m.voidReason ? `: ${m.voidReason}` : ""}</Pill>,
  }[m.status];
  const u = (ids: string[]) => ids.map((x) => byId.get(x)?.username).join(",");
  return (
    <div className="animate-rise mx-auto max-w-[640px]">
      {justRecorded && m.status === "pending" && m.recordedBy === s.me ? (
        <div role="status" className="mb-5 flex items-center gap-3 rounded-2xl bg-accent px-4 py-3 text-on-accent">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-on-accent text-accent"><Check size={18} strokeWidth={3} aria-hidden="true" /></span>
          <p className="text-sm font-bold">Match recorded. It counts once {sideName(them, byId)} confirms (either one).</p>
        </div>
      ) : null}
      <p className="text-caption font-semibold text-text-3">{shortDate(m.playedOn, today)} · Doubles · {D_FORMATS[m.format].label}{m.noAd ? " · No-ad" : ""}{isShort(m.format) ? ` · tiebreak at ${m.shortTieAt}–${m.shortTieAt}` : ""}</p>
      <h1 className="display mt-2 text-[30px] leading-tight">{sideName(winners, byId)} won</h1>
      <div className="mt-3">{status}</div>
      <div className="card mt-5 px-4 py-2"><DScoreRows m={m} byId={byId} size="lg" /></div>
      {m.note ? <p className="mt-3 text-sm text-text-2">“{m.note}”</p> : null}
      <div className="mt-6 space-y-4">
        {m.status === "pending" && mySide === otherSide ? <ConfirmDoubles id={m.id} /> : null}
        {m.status === "pending" && m.recordedBy === s.me ? <WithdrawDoubles id={m.id} /> : null}
        {m.status === "confirmed" && byId.get(s.me)?.isAdmin ? <VoidDoubles id={m.id} /> : null}
        <Link href={`/h2h?mode=teams&a=${u(m.side1)}&b=${u(m.side2)}`} className="press inline-flex min-h-11 items-center text-sm font-semibold text-accent-ink">These two teams, head to head →</Link>
      </div>
    </div>
  );
}
