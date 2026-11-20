import { Swords } from "lucide-react";
import { requirePlayer } from "@/lib/server/session";
import { loadBoard } from "@/lib/server/data";
import { headToHead, playerStats } from "@/lib/tennis/stats";
import { standings } from "@/lib/tennis/standings";
import { shortDate } from "@/lib/tennis/dates";
import { Avatar, displayName, shortName } from "@/components/ui/Avatar";
import { ButtonLink } from "@/components/ui/Button";
import { Empty } from "@/components/ui/bits";
import { MatchCard } from "@/components/tennis/Scoreboard";
import { NewChallenge } from "@/components/actions/NewChallenge";
import { SplitBar } from "@/components/tennis/SplitBar";
import { Segmented } from "@/components/ui/Segmented";
import { DoublesH2H, type DMode } from "@/components/doubles/DoublesH2H";
import { loadTennisDoubles } from "@/lib/server/doubles";

export const metadata = { title: "Head to head" };

export default async function H2H({ searchParams }: { searchParams: Promise<{ a?: string; b?: string; mode?: string; a1?: string; a2?: string; b1?: string; b2?: string }> }) {
  const s = await requirePlayer();
  const b = await loadBoard(s.sb);
  const q = await searchParams;
  const find = (u?: string) => (u ? b.players.find((p) => p.username.toLowerCase() === u.toLowerCase()) : undefined);
  const mode = q.mode === "teams" || q.mode === "opponents" || q.mode === "partner" ? (q.mode as DMode) : "singles";
  const modes = <Segmented label="Head-to-head type" items={[{ href: "/h2h", label: "Singles", on: mode === "singles" }, { href: "/h2h?mode=teams", label: "Teams", on: mode === "teams" }, { href: "/h2h?mode=opponents", label: "Doubles opponents", on: mode === "opponents" }, { href: "/h2h?mode=partner", label: "Partners", on: mode === "partner" }]} />;
  if (mode !== "singles") {
    const d = await loadTennisDoubles(s.sb);
    const ids = (...us: (string | undefined)[]) => us.flatMap((x) => (typeof x === "string" ? x.split(",") : [])).map((x) => find(x)?.id).filter((x): x is string => !!x);
    const A = mode === "teams" ? ids(q.a1, q.a2).length ? ids(q.a1, q.a2) : ids(q.a) : ids(q.a).slice(0, 1);
    const B = mode === "teams" ? ids(q.b1, q.b2).length ? ids(q.b1, q.b2) : ids(q.b) : ids(q.b).slice(0, 1);
    return (
      <div className="animate-rise space-y-6">
        <div className="space-y-4 pt-2"><h1 className="display text-[34px] sm:text-[40px]">Head to head</h1><div className="no-scrollbar -mx-4 overflow-x-auto px-4">{modes}</div></div>
        <DoublesH2H mode={mode} players={b.players} byId={b.byId} matches={d.matches} today={b.today} a={A} b={B} />
      </div>
    );
  }
  const me = b.byId.get(s.me)!;
  const pa = find(q.a) ?? me;
  const topRival = playerStats(pa.id, b.matches).rivals[0]?.opponentId;
  const pb = find(q.b) ?? (topRival ? b.byId.get(topRival) : undefined) ?? b.players.find((p) => p.id !== pa.id);
  const table = standings(b.players, b.matches, b.adjustments, { today: b.today });
  const rankOf = (id: string) => table.find((r) => r.player.id === id)?.rank;

  const select = (name: "a" | "b", label: string, value: string | undefined) => (
    <label>
      <span className="eyebrow">{label}</span>
      <select name={name} defaultValue={value} className="mt-1 h-11 w-full rounded-xl border border-line-strong bg-surface px-3 text-sm font-semibold outline-none focus:border-accent-ink">
        {b.players.map((p) => <option key={p.id} value={p.username}>{displayName(p)}</option>)}
      </select>
    </label>
  );
  const picker = (
    <form action="/h2h" className="grid grid-cols-[1fr_auto_1fr] items-end gap-2 sm:grid-cols-[1fr_auto_1fr_auto] sm:max-w-2xl">
      {select("a", "Player", pa.username)}
      <span className="pb-3 text-sm font-bold text-text-3">vs</span>
      {select("b", "Opponent", pb?.username)}
      <button type="submit" className="press col-span-3 h-11 rounded-full bg-surface-3 px-5 text-sm font-semibold hover:bg-line-strong sm:col-span-1">Compare</button>
    </form>
  );

  if (!pb || pb.id === pa.id) {
    return <div className="animate-rise space-y-6"><h1 className="display pt-2 text-[34px]">Head to head</h1>{modes}{picker}<Empty title="Pick two different players" /></div>;
  }
  const h = headToHead(pa.id, pb.id, b.matches);
  const rows: [string, string | number, string | number][] = [
    ["Matches won", h.a.wins, h.b.wins],
    ["Sets won", h.a.setsWon, h.b.setsWon],
    ["Games won", h.a.gamesWon, h.b.gamesWon],
    ["Tiebreaks won", h.a.tiebreaksWon, h.b.tiebreaksWon],
  ];
  const side = (p: typeof pa, leading: boolean) => (
    <div className="flex min-w-0 flex-col items-center text-center">
      <Avatar player={p} size={"lg"} ring={leading} />
      <p className="display mt-3 w-full truncate text-[20px] sm:text-[28px]">{shortName(p)}</p>
      <p className="w-full truncate text-caption text-[#a9c4b9]">{rankOf(p.id) ? `#${rankOf(p.id)}` : "Unranked"} · @{p.username}</p>
    </div>
  );
  const lead = h.a.wins === h.b.wins ? "All square" : `${shortName(h.a.wins > h.b.wins ? pa : pb)} leads`;

  return (
    <div className="animate-rise space-y-8">
      <div className="space-y-4 pt-2"><h1 className="display text-[34px] sm:text-[40px]">Head to head</h1><div className="no-scrollbar -mx-4 overflow-x-auto px-4">{modes}</div>{picker}</div>

      {/* the matchup */}
      <section aria-label={`${displayName(pa)} versus ${displayName(pb)}: ${h.a.wins} to ${h.b.wins}`} className="overflow-hidden rounded-[28px] border border-white/10 bg-[#123f35] px-3 pt-6 pb-7 text-[#fafaf6] sm:px-8">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          {side(pa, h.a.wins >= h.b.wins && h.played > 0)}
          <div className="text-center">
            <p className="text-caption font-bold text-[#a9c4b9]" aria-hidden="true">VS</p>
            <p className="score num mt-1 text-[clamp(52px,17vw,72px)] sm:text-[104px]"><span className={h.a.wins >= h.b.wins ? "text-[#7be5b3]" : ""}>{h.a.wins}</span><span className="px-2 font-light text-[#a9c4b9]">-</span><span className={h.b.wins > h.a.wins ? "text-[#7be5b3]" : ""}>{h.b.wins}</span></p>
            <p className="text-caption font-semibold text-[#a9c4b9]">{h.played ? lead : "Never played"}</p>
          </div>
          {side(pb, h.b.wins > h.a.wins)}
        </div>
        {h.played ? <div className="mt-6"><SplitBar a={h.a.wins} b={h.b.wins} /></div> : null}
        {h.streak && h.streak.length > 1 ? <p className="mt-4 text-center text-sm text-[#a9c4b9]">{shortName(b.byId.get(h.streak.playerId))} has won the last {h.streak.length}</p> : null}
      </section>

      {h.played === 0 ? (
        <Empty icon={<Swords size={22} aria-hidden="true" />} title={`${shortName(pa)} and ${shortName(pb)} haven't played`}
          action={pa.id === s.me ? <NewChallenge players={[pb]} today={b.today} preset={pb.id} label={`Challenge ${shortName(pb)}`} /> : undefined}>
          The rivalry starts with one match.
        </Empty>
      ) : (
        <>
          <section aria-labelledby="compare">
            <h2 id="compare" className="sr-only">Comparison</h2>
            <ul className="divide-y divide-line border-y border-line-strong">
              {rows.slice(1, 3).map(([label, x, y]) => (
                <li key={label} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-3.5">
                  <span className={`score num text-[30px] ${Number(x) > Number(y) ? "text-accent-ink" : ""}`}>{x}</span>
                  <span className="text-center text-sm font-semibold text-text-2">{label}</span>
                  <span className={`score num text-right text-[30px] ${Number(y) > Number(x) ? "text-accent-ink" : ""}`}>{y}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-caption text-text-3">First met {h.firstMeeting ? shortDate(h.firstMeeting.playedOn, b.today) : "–"} · last met {h.lastMeeting ? shortDate(h.lastMeeting.playedOn, b.today) : "–"}</p>
          </section>
          <div className="flex flex-wrap gap-2">
            {pa.id === s.me || pb.id === s.me ? <NewChallenge players={[pa.id === s.me ? pb : pa]} today={b.today} preset={(pa.id === s.me ? pb : pa).id} label="Rematch" /> : null}
            {pa.id === s.me ? <ButtonLink href={`/record?opponent=${pb.id}`} variant="secondary">Record a match</ButtonLink> : null}
          </div>
          <section aria-labelledby="meetings">
            <h2 id="meetings" className="mb-3 text-lg font-bold">Every meeting <span className="font-normal text-text-3">({h.played})</span></h2>
            <div className="grid gap-3 lg:grid-cols-2">{h.meetings.map((m) => <MatchCard key={m.id} m={m} byId={b.byId} today={b.today} />)}</div>
          </section>
        </>
      )}
    </div>
  );
}
