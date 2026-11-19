import { requirePlayer } from "@/lib/server/session";
import { loadPickleball } from "@/lib/server/pickleball";
import { pbInbox } from "@/lib/pickleball/inbox";
import { PB_FORMATS } from "@/lib/pickleball/rules";
import { PageHeader, SectionHeader } from "@/components/ui/bits";
import { ButtonLink } from "@/components/ui/Button";
import { sideName } from "@/components/pickleball/PbScoreboard";
import { AnswerPbChallenge, CancelPbChallenge } from "@/components/pickleball/PbActions";
import { PbChallengeForm } from "@/components/pickleball/PbChallengeForm";

export const metadata = { title: "Pickleball challenges" };

export default async function PbChallenges() {
  const s = await requirePlayer();
  const b = await loadPickleball(s.sb);
  const me = b.byId.get(s.me)!;
  const box = pbInbox(b, me.id);
  const others = b.players.filter((p) => p.id !== me.id);
  const recent = [...new Set(b.matches.flatMap((m) => [...m.side1, ...m.side2]).filter((id) => id !== me.id))];
  const what = (c: (typeof b.challenges)[number]) => `${c.discipline === "doubles" ? "Doubles" : "Singles"} · ${PB_FORMATS[c.format].label}${c.scoring === "rally" ? " · Rally" : ""}${c.proposedFor ? ` · ${c.proposedFor}` : ""}`;
  const history = b.challenges.filter((c) => !["pending", "accepted"].includes(c.status)).slice(0, 10);
  return (
    <div className="animate-rise space-y-9">
      <PageHeader title="Pickleball challenges" subtitle="Call someone out. Once they accept, record the result and it counts when they confirm." />
      {box.toAnswer.length ? (
        <section aria-labelledby="pc-in"><SectionHeader id="pc-in" title="Waiting for your answer" />
          <ul className="space-y-3">{box.toAnswer.map((c) => (
            <li key={c.id} className="card space-y-3 px-4 py-3.5"><p className="text-sm"><span className="font-bold">{sideName(c.side1, b.byId)}</span> vs <span className="font-bold">{sideName(c.side2, b.byId)}</span><span className="block text-caption text-text-3">{what(c)}</span>{c.message ? <span className="block text-text-2">“{c.message}”</span> : null}</p><AnswerPbChallenge id={c.id} /></li>
          ))}</ul>
        </section>) : null}
      {box.toPlay.length ? (
        <section aria-labelledby="pc-on"><SectionHeader id="pc-on" title="On" />
          <ul className="space-y-3">{box.toPlay.map((c) => {
            const mine = c.side1.includes(me.id) ? c.side1 : c.side2, theirs = c.side1.includes(me.id) ? c.side2 : c.side1, partner = mine.find((x) => x !== me.id);
            const q = new URLSearchParams({ challenge: c.id, opponents: theirs.join(","), ...(partner ? { partner } : {}) });
            return <li key={c.id} className="card flex flex-wrap items-center gap-3 px-4 py-3.5"><p className="min-w-0 flex-1 text-sm">vs <span className="font-bold">{sideName(theirs, b.byId)}</span><span className="block text-caption text-text-3">{what(c)}</span></p><ButtonLink href={`/pickleball/record?${q}`} size="sm">Record result</ButtonLink>{c.challenger === me.id ? <CancelPbChallenge id={c.id} /> : null}</li>;
          })}</ul>
        </section>) : null}
      {box.sent.length ? (
        <section aria-labelledby="pc-out"><SectionHeader id="pc-out" title="Sent" />
          <ul className="space-y-3">{box.sent.map((c) => (
            <li key={c.id} className="card flex flex-wrap items-center gap-3 px-4 py-3.5"><p className="min-w-0 flex-1 text-sm">vs <span className="font-bold">{sideName(c.side2, b.byId)}</span><span className="block text-caption text-text-3">{what(c)} · waiting</span></p>{c.challenger === me.id ? <CancelPbChallenge id={c.id} /> : null}</li>
          ))}</ul>
        </section>) : null}
      <section aria-labelledby="pc-new"><SectionHeader id="pc-new" title="New challenge" />
        <PbChallengeForm me={me} others={others} recent={recent} today={b.today} />
      </section>
      {history.length ? (
        <section aria-labelledby="pc-past"><SectionHeader id="pc-past" title="Past challenges" />
          <ul className="card divide-y divide-line">{history.map((c) => <li key={c.id} className="flex justify-between gap-3 px-4 py-3 text-sm"><span className="min-w-0 truncate">{sideName(c.side1, b.byId)} vs {sideName(c.side2, b.byId)}</span><span className="shrink-0 capitalize text-text-3">{c.status}</span></li>)}</ul>
        </section>) : null}
    </div>
  );
}
