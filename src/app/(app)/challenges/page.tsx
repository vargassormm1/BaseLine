import { Flag } from "lucide-react";
import { requirePlayer } from "@/lib/server/session";
import { loadBoard, type ChallengeRow } from "@/lib/server/data";
import { inbox } from "@/lib/ui/inbox";
import { shortDate } from "@/lib/tennis/dates";
import { FORMAT_LABEL } from "@/lib/tennis/types";
import { Avatar, displayName } from "@/components/ui/Avatar";
import { ButtonLink } from "@/components/ui/Button";
import { Empty, PageHeader, Pill } from "@/components/ui/bits";
import { AnswerChallenge, CancelChallenge } from "@/components/actions/ActionButtons";
import { NewChallenge } from "@/components/actions/NewChallenge";

export const metadata = { title: "Challenges" };
const STATUS: Record<ChallengeRow["status"], string> = { pending: "Waiting", accepted: "On", declined: "Declined", canceled: "Canceled", expired: "Expired", completed: "Played" };

export default async function Challenges() {
  const s = await requirePlayer();
  const b = await loadBoard(s.sb);
  const box = inbox(b, s.me);
  const others = b.players.filter((p) => p.id !== s.me);
  const done = b.challenges.filter((c) => !["pending", "accepted"].includes(c.status)).slice(0, 15);
  const result = (cid: string) => b.matches.find((m) => m.challengeId === cid && m.status === "confirmed");
  const card = (c: ChallengeRow, action: React.ReactNode, mine: boolean) => {
    const other = b.byId.get(mine ? c.opponent : c.challenger);
    return (
      <li key={c.id} className="card flex flex-wrap items-center gap-3 px-4 py-3.5">
        <Avatar player={other} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{mine ? "You → " : ""}{displayName(other)}{!mine ? " → you" : ""}</p>
          <p className="text-caption text-text-2">{FORMAT_LABEL[c.format]}{c.proposedFor ? ` · suggested ${shortDate(c.proposedFor, b.today)}` : ""} · sent {shortDate(c.createdAt.slice(0, 10), b.today)}</p>
          {c.message ? <p className="mt-1 text-sm text-text-2">“{c.message}”</p> : null}
        </div>
        {action}
      </li>
    );
  };
  return (
    <div className="animate-rise">
      <PageHeader title="Challenges" subtitle="Call someone out. When they accept, play it and record the result." action={<NewChallenge players={others} today={b.today} />} />
      <div className="space-y-8">
        {box.toAnswer.length ? <section aria-labelledby="c-in"><h2 id="c-in" className="mb-3 text-lg font-bold">For you</h2><ul className="space-y-3">{box.toAnswer.map((c) => card(c, <AnswerChallenge id={c.id} />, false))}</ul></section> : null}
        {box.toPlay.length ? (
          <section aria-labelledby="c-on"><h2 id="c-on" className="mb-3 text-lg font-bold">On: play and record</h2>
            <ul className="space-y-3">{box.toPlay.map((c) => card(c, <div className="flex items-center gap-1"><ButtonLink size="sm" href={`/record?challenge=${c.id}`}>Record result</ButtonLink><CancelChallenge id={c.id} label="Call off" /></div>, c.challenger === s.me))}</ul>
          </section>
        ) : null}
        {box.sent.length ? <section aria-labelledby="c-out"><h2 id="c-out" className="mb-3 text-lg font-bold">Sent</h2><ul className="space-y-3">{box.sent.map((c) => card(c, <CancelChallenge id={c.id} />, true))}</ul></section> : null}
        {!box.toAnswer.length && !box.toPlay.length && !box.sent.length ? (
          <Empty icon={<Flag size={22} aria-hidden="true" />} title="No open challenges">Pick a rival and send a challenge. It&apos;s the best way to get a match on the calendar.</Empty>
        ) : null}
        {done.length ? (
          <section aria-labelledby="c-past"><h2 id="c-past" className="mb-3 text-lg font-bold">Past</h2>
            <ul className="space-y-3">{done.map((c) => card(c, c.status === "completed" && result(c.id) ? <ButtonLink size="sm" variant="secondary" href={`/matches/${result(c.id)!.id}`}>See result</ButtonLink> : <Pill>{STATUS[c.status]}</Pill>, c.challenger === s.me))}</ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
