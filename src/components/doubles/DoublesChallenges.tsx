import { SectionHeader } from "@/components/ui/bits";
import { ButtonLink } from "@/components/ui/Button";
import { sideName } from "@/components/pickleball/PbScoreboard";
import { AnswerDoublesChallenge, CancelDoublesChallenge } from "@/components/doubles/DoublesActions";
import { DoublesChallengeForm } from "@/components/doubles/DoublesChallengeForm";
import { sidesInbox } from "@/lib/pickleball/inbox";
import { D_FORMATS } from "@/lib/tennis/doubles";
import type { DChallengeRow, DMatch } from "@/lib/server/doubles";
import type { Player } from "@/lib/tennis/types";

/** The doubles half of the tennis Challenges page. */
export function DoublesChallenges({ me, players, byId, matches, challenges, today }: { me: Player; players: Player[]; byId: ReadonlyMap<string, Player>; matches: DMatch[]; challenges: DChallengeRow[]; today: string }) {
  const box = sidesInbox({ matches, challenges }, me.id);
  const others = players.filter((p) => p.id !== me.id);
  const recent = [...new Set(matches.flatMap((m) => [...m.side1, ...m.side2]).filter((id) => id !== me.id))];
  const what = (c: DChallengeRow) => `Doubles · ${D_FORMATS[c.format].label}${c.noAd ? " · No-ad" : ""}${c.proposedFor ? ` · ${c.proposedFor}` : ""}`;
  return (
    <div className="space-y-8">
      {box.toAnswer.length ? (
        <section aria-labelledby="dc-in"><SectionHeader id="dc-in" title="Doubles: for you" />
          <ul className="space-y-3">{box.toAnswer.map((c) => (
            <li key={c.id} className="card space-y-3 px-4 py-3.5"><p className="text-sm"><span className="font-bold">{sideName(c.side1, byId)}</span> vs <span className="font-bold">{sideName(c.side2, byId)}</span><span className="block text-caption text-text-3">{what(c)}</span>{c.message ? <span className="block text-text-2">“{c.message}”</span> : null}</p><AnswerDoublesChallenge id={c.id} /></li>
          ))}</ul>
        </section>) : null}
      {box.toPlay.length ? (
        <section aria-labelledby="dc-on"><SectionHeader id="dc-on" title="Doubles: on" />
          <ul className="space-y-3">{box.toPlay.map((c) => {
            const theirs = c.side1.includes(me.id) ? c.side2 : c.side1;
            const pending = matches.find((m) => m.challengeId === c.id && m.status === "pending");
            return <li key={c.id} className="card flex flex-wrap items-center gap-3 px-4 py-3.5"><p className="min-w-0 flex-1 text-sm">vs <span className="font-bold">{sideName(theirs, byId)}</span><span className="block text-caption text-text-3">{what(c)}</span></p>{pending ? <ButtonLink href={`/matches/doubles/${pending.id}`} size="sm" variant="secondary">Result waiting</ButtonLink> : <ButtonLink href={`/record?type=doubles&challenge=${c.id}`} size="sm">Record result</ButtonLink>}<CancelDoublesChallenge id={c.id} /></li>;
          })}</ul>
        </section>) : null}
      {box.sent.length ? (
        <section aria-labelledby="dc-out"><SectionHeader id="dc-out" title="Doubles: sent" />
          <ul className="space-y-3">{box.sent.map((c) => (
            <li key={c.id} className="card flex flex-wrap items-center gap-3 px-4 py-3.5"><p className="min-w-0 flex-1 text-sm">vs <span className="font-bold">{sideName(c.side2, byId)}</span><span className="block text-caption text-text-3">{what(c)} · waiting</span></p>{c.challenger === me.id ? <CancelDoublesChallenge id={c.id} /> : null}</li>
          ))}</ul>
        </section>) : null}
      <section aria-labelledby="dc-new"><SectionHeader id="dc-new" title="New doubles challenge" />
        <DoublesChallengeForm me={me} others={others} recent={recent} today={today} />
      </section>
    </div>
  );
}
