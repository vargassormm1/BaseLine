import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Avatar, displayName, shortName } from "@/components/ui/Avatar";
import { Empty, SectionHeader, Stat } from "@/components/ui/bits";
import { DMatchCard } from "@/components/doubles/DoublesScoreboard";
import { playerSideStats, sideStandings } from "@/lib/sides/standings";
import type { DMatch } from "@/lib/server/doubles";
import type { Player } from "@/lib/tennis/types";

/** Tennis doubles on a profile: individual doubles rank, record, partners, recent doubles. */
export function DoublesProfile({ p, players, byId, matches, today, isMe }: { p: Player; players: Player[]; byId: ReadonlyMap<string, Player>; matches: DMatch[]; today: string; isMe: boolean }) {
  const row = sideStandings(players, matches, { today }).find((r) => r.player.id === p.id);
  const st = playerSideStats(matches, p.id);
  const visible = matches.filter((m) => [...m.side1, ...m.side2].includes(p.id) && m.status !== "canceled");
  if (st.record.played === 0 && visible.length === 0) return <Empty title={isMe ? "No doubles yet" : `${shortName(p)} hasn't played doubles yet`}>Record a doubles match to start a doubles ranking.</Empty>;
  return (
    <div className="space-y-9">
      <section aria-label="Doubles statistics">
        <div className="grid grid-cols-2 gap-4 border-y border-line-strong py-6 sm:grid-cols-4">
          <Stat label="Doubles rank" value={row?.rank ? `#${row.rank}` : "–"} />
          <Stat label="Doubles points" value={row?.points ?? 0} />
          <Stat label="Record" value={<span className="num">{st.record.wins}–{st.record.losses}</span>} />
          <Stat label="Win rate" value={st.record.winPct === null ? "–" : `${Math.round(st.record.winPct)}%`} />
        </div>
        <p className="mt-3 text-sm text-text-2">
          {st.streak.current > 1 ? `Won the last ${st.streak.current}. ` : ""}Longest win streak {st.streak.longest}.
          {st.bestPartner ? <> Best partner: <span className="font-semibold text-text">{shortName(byId.get(st.bestPartner.playerId))}</span> ({st.bestPartner.wins}–{st.bestPartner.losses}).</> : null}
        </p>
      </section>
      {st.partners.length ? (
        <section aria-labelledby="partners">
          <SectionHeader id="partners" title="Partners" />
          <ul className="divide-y divide-line border-y border-line">
            {st.partners.slice(0, 6).map((x) => {
              const o = byId.get(x.playerId);
              return (
                <li key={x.playerId}><Link href={`/h2h?mode=partner&a=${p.username}&b=${o?.username ?? ""}`} className="press flex min-h-14 items-center gap-3 py-2 hover:bg-surface-2">
                  <Avatar player={o} size="sm" /><span className="min-w-0 flex-1 truncate font-semibold">{displayName(o)}</span>
                  <span className="num text-caption text-text-3">{x.played} {x.played === 1 ? "match" : "matches"}</span>
                  <span className="score num text-[24px]">{x.wins}–{x.losses}</span><ChevronRight size={16} className="text-text-3" aria-hidden="true" />
                </Link></li>
              );
            })}
          </ul>
        </section>
      ) : null}
      {visible.length ? (
        <section aria-labelledby="dhistory">
          <SectionHeader id="dhistory" title="Recent doubles" {...(isMe ? { href: "/matches?type=doubles", linkLabel: "All doubles" } : {})} />
          <div className="grid gap-3 lg:grid-cols-2">{visible.slice(0, 6).map((m) => <DMatchCard key={m.id} m={m} byId={byId} today={today} />)}</div>
        </section>
      ) : null}
    </div>
  );
}
