import Link from "next/link";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { requirePlayer } from "@/lib/server/session";
import { loadPickleball } from "@/lib/server/pickleball";
import { shortDate } from "@/lib/tennis/dates";
import { PB_FORMATS, PB_SCORING_LABEL } from "@/lib/pickleball/rules";
import { playersOf, sideOf } from "@/lib/pickleball/standings";
import { uuid } from "@/lib/validation";
import { shortName } from "@/components/ui/Avatar";
import { Pill } from "@/components/ui/bits";
import { PbScoreRows, sideName } from "@/components/pickleball/PbScoreboard";
import { ConfirmPb, VoidPb, WithdrawPb } from "@/components/pickleball/PbActions";

export const metadata = { title: "Pickleball match" };

export default async function PbMatchPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ recorded?: string }> }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const justRecorded = (await searchParams).recorded === "1";
  const s = await requirePlayer();
  const b = await loadPickleball(s.sb);
  const m = b.matches.find((x) => x.id === id);
  if (!m) notFound(); // doesn't exist, or not visible to me (RLS)
  const mySide = sideOf(m, s.me);
  const otherSide = m.recorderSide === 1 ? 2 : 1;
  const winners = playersOf(m, m.winnerSide), them = playersOf(m, otherSide);
  const me = b.byId.get(s.me);
  const status = {
    confirmed: <Pill tone="win">Final · +{m.points ?? 0} pts to {sideName(winners, b.byId)}{m.points === 0 ? " (daily limit reached)" : ""}</Pill>,
    pending: <Pill tone="warn">Waiting for {them.length > 1 ? `${sideName(them, b.byId)} (either one)` : shortName(b.byId.get(them[0]!))} to confirm</Pill>,
    rejected: <Pill tone="loss">The other side said this score isn&apos;t right</Pill>,
    canceled: <Pill>Withdrawn by {shortName(b.byId.get(m.recordedBy))}</Pill>,
    voided: <Pill>Void</Pill>,
  }[m.status];
  const h2h = m.discipline === "singles"
    ? `/pickleball/h2h?a=${b.byId.get(m.side1[0]!)?.username ?? ""}&b=${b.byId.get(m.side2[0]!)?.username ?? ""}`
    : `/pickleball/h2h?mode=teams&a=${m.side1.map((x) => b.byId.get(x)?.username).join(",")}&b=${m.side2.map((x) => b.byId.get(x)?.username).join(",")}`;

  return (
    <div className="animate-rise mx-auto max-w-[640px]">
      {justRecorded && m.status === "pending" && m.recordedBy === s.me ? (
        <div role="status" className="mb-5 flex items-center gap-3 rounded-2xl bg-accent px-4 py-3 text-on-accent">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-on-accent text-accent"><Check size={18} strokeWidth={3} aria-hidden="true" /></span>
          <p className="text-sm font-bold">Match recorded. It counts once {sideName(them, b.byId)} confirm{them.length > 1 ? "s (either one)" : "s"}.</p>
        </div>
      ) : null}
      <p className="text-caption font-semibold text-text-3">{shortDate(m.playedOn, b.today)} · {m.discipline === "doubles" ? "Doubles" : "Singles"} · {PB_FORMATS[m.format].label} · {PB_SCORING_LABEL[m.scoring]}</p>
      <h1 className="display mt-2 text-[30px] leading-tight">{sideName(winners, b.byId, true)} won</h1>
      <div className="mt-3">{status}</div>
      <div className="card mt-5 px-4 py-2"><PbScoreRows m={m} byId={b.byId} size="lg" /></div>
      {m.note ? <p className="mt-3 text-sm text-text-2">“{m.note}”</p> : null}
      <div className="mt-6 space-y-4">
        {m.status === "pending" && mySide === otherSide ? <ConfirmPb id={m.id} /> : null}
        {m.status === "pending" && m.recordedBy === s.me ? <WithdrawPb id={m.id} /> : null}
        {m.status === "confirmed" && me?.isAdmin ? <VoidPb id={m.id} /> : null}
        <Link href={h2h} className="press inline-flex min-h-11 items-center text-sm font-semibold text-accent-ink">Head to head →</Link>
      </div>
    </div>
  );
}
