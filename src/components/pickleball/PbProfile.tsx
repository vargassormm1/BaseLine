import Link from "next/link";
import { Swords } from "lucide-react";
import type { DB } from "@/lib/server/session";
import { loadPickleball } from "@/lib/server/pickleball";
import { pbPlayerStats, pbStandings } from "@/lib/pickleball/standings";
import type { PlayerRow } from "@/lib/server/data";
import { Avatar, displayName, shortName } from "@/components/ui/Avatar";
import { ButtonLink } from "@/components/ui/Button";
import { Empty, SectionHeader } from "@/components/ui/bits";
import { PbMatchCard } from "./PbScoreboard";

/** A player's pickleball page: the two boards, singles and doubles records kept apart, partners, recent results. */
export async function PbProfile({ sb, p, me }: { sb: DB; p: PlayerRow; me: string }) {
  const b = await loadPickleball(sb);
  const singles = pbStandings(b.players, b.matches, "singles", { today: b.today }).find((r) => r.player.id === p.id)!;
  const doubles = pbStandings(b.players, b.matches, "doubles", { today: b.today }).find((r) => r.player.id === p.id)!;
  const st = pbPlayerStats(b.matches, p.id);
  const isMe = p.id === me;
  const stat = (label: string, value: string, sub?: string) => (
    <div className="card px-4 py-3"><p className="text-caption font-semibold text-text-3">{label}</p><p className="score num mt-1 text-[30px] leading-none">{value}</p>{sub ? <p className="mt-1 text-caption text-text-2">{sub}</p> : null}</div>
  );
  return (
    <div className="space-y-9">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stat("Singles rank", singles.rank ? `#${singles.rank}` : "–", `${singles.points} pts`)}
        {stat("Singles record", `${st.singles.wins}–${st.singles.losses}`, st.singles.winPct !== null ? `${Math.round(st.singles.winPct)}% wins` : "No matches")}
        {stat("Doubles rank", doubles.rank ? `#${doubles.rank}` : "–", `${doubles.points} pts`)}
        {stat("Doubles record", `${st.doubles.wins}–${st.doubles.losses}`, st.doubles.winPct !== null ? `${Math.round(st.doubles.winPct)}% wins` : "No matches")}
      </div>
      {!isMe ? <div className="flex flex-wrap gap-2"><ButtonLink href={`/pickleball/h2h?a=${b.byId.get(me)?.username ?? ""}&b=${p.username}`} variant="secondary"><Swords size={16} aria-hidden="true" />Pickleball head to head</ButtonLink></div> : null}
      {st.partners.length ? (
        <section aria-labelledby="pb-partners"><SectionHeader id="pb-partners" title="Frequent partners" />
          <ul className="card divide-y divide-line">{st.partners.map((x) => { const mate = b.byId.get(x.playerId); return (
            <li key={x.playerId}><Link href={`/players/${mate?.username ?? ""}?sport=pickleball`} className="press flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
              <Avatar player={mate} size="sm" /><span className="min-w-0 flex-1 truncate font-semibold">{displayName(mate)}</span><span className="num text-sm text-text-2">{x.wins}–{x.played - x.wins} together</span>
            </Link></li>); })}</ul>
        </section>) : null}
      <section aria-labelledby="pb-recent"><SectionHeader id="pb-recent" title="Recent pickleball" {...(isMe ? { href: "/pickleball/matches", linkLabel: "All matches" } : {})} />
        {st.recent.length ? <ul className="space-y-3">{st.recent.slice(0, 6).map((m) => <li key={m.id}><PbMatchCard m={m} byId={b.byId} today={b.today} /></li>)}</ul>
          : <Empty title={isMe ? "No pickleball yet" : `${shortName(p)} hasn't played pickleball yet`}>Stats show up after the first confirmed match.</Empty>}
      </section>
    </div>
  );
}
