import Link from "next/link";
import { Flag, Plus } from "lucide-react";
import { requirePlayer } from "@/lib/server/session";
import { loadPickleball } from "@/lib/server/pickleball";
import { pbPlayerStats, pbSinglesH2H, pbStandings, sideOf } from "@/lib/pickleball/standings";
import { pbInbox } from "@/lib/pickleball/inbox";
import { PB_FORMATS } from "@/lib/pickleball/rules";
import { Avatar, shortName } from "@/components/ui/Avatar";
import { ButtonLink } from "@/components/ui/Button";
import { Empty, SectionHeader } from "@/components/ui/bits";
import { LeaderboardRow } from "@/components/tennis/LeaderboardRow";
import { PbMatchCard, PbScoreRows, sideName } from "@/components/pickleball/PbScoreboard";
import { AnswerPbChallenge, ConfirmPb } from "@/components/pickleball/PbActions";
import { SportIcon } from "@/components/shell/SportSwitcher";

export const metadata = { title: "Pickleball" };

export default async function PickleballHome() {
  const s = await requirePlayer();
  const b = await loadPickleball(s.sb);
  const me = b.byId.get(s.me)!;
  const singles = pbStandings(b.players, b.matches, "singles", { today: b.today });
  const doubles = pbStandings(b.players, b.matches, "doubles", { today: b.today });
  const mySingles = singles.find((r) => r.player.id === me.id)!, myDoubles = doubles.find((r) => r.player.id === me.id)!;
  const stats = pbPlayerStats(b.matches, me.id);
  const box = pbInbox(b, me.id);
  const last = stats.recent[0];
  // the board I play most, and the table around me on it
  const mainBoard = stats.doubles.played > stats.singles.played ? "doubles" : "singles";
  const board = mainBoard === "doubles" ? doubles : singles;
  const ranked = board.filter((r) => r.rank !== null);
  const at = ranked.findIndex((r) => r.player.id === me.id);
  const start = at === -1 ? 0 : Math.max(0, Math.min(at - 1, ranked.length - 3));
  const around = ranked.slice(start, start + 3);
  // rivalry spotlight: my most-played singles opponent
  const opp = new Map<string, number>();
  for (const m of b.matches) if (m.status === "confirmed" && m.discipline === "singles" && sideOf(m, me.id)) { const o = [...m.side1, ...m.side2].find((x) => x !== me.id)!; opp.set(o, (opp.get(o) ?? 0) + 1); }
  const rival = [...opp.entries()].sort((x, y) => y[1] - x[1])[0]?.[0];
  const rivalry = rival ? pbSinglesH2H(b.matches, me.id, rival) : null;

  const tile = (label: string, r: typeof mySingles) => (
    <div className="rounded-2xl bg-white/[0.06] px-4 py-3">
      <p className="text-caption font-semibold text-[#a9c4b9]">{label}</p>
      <p className="score mt-1 text-[44px] leading-none">{r.rank ? `#${r.rank}` : "–"}</p>
      <p className="mt-2 text-caption text-[#cfe0d8]"><span className="num">{r.wins}–{r.losses}</span> · <span className="num">{r.points}</span> pts{r.winPct !== null ? <> · <span className="num">{Math.round(r.winPct)}%</span></> : null}</p>
    </div>
  );

  return (
    <div className="animate-rise space-y-9">
      <h1 className="sr-only">Pickleball</h1>
      <header className="flex items-center gap-3 pt-2">
        <Avatar player={me} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-text-2">Hi {shortName(me)}</p>
          <p className="text-lg leading-tight font-bold tracking-[-0.02em]">Pickleball, anyone?</p>
        </div>
        <Link href="/pickleball/challenges" aria-label="Pickleball challenges" className="press relative grid size-11 shrink-0 place-items-center rounded-full bg-surface-3 lg:hidden">
          <Flag size={19} aria-hidden="true" />
          {box.toAnswer.length ? <span className="absolute top-1.5 right-1.5 size-2.5 rounded-full bg-coral ring-2 ring-bg" aria-hidden="true" /> : null}
        </Link>
      </header>

      <section aria-label="Your pickleball standing" className="rounded-[28px] border border-white/10 bg-[#123f35] px-5 pt-5 pb-6 text-[#fafaf6] sm:px-7">
        <p className="flex items-center gap-2 text-sm font-semibold text-[#a9c4b9]"><SportIcon sport="pickleball" size={16} />Pickleball rankings</p>
        <div className="mt-3 grid grid-cols-2 gap-3">{tile("Singles", mySingles)}{tile("Doubles", myDoubles)}</div>
        <ButtonLink href="/pickleball/record" size="lg" full className="mt-5"><Plus size={20} strokeWidth={3} aria-hidden="true" />Record pickleball</ButtonLink>
      </section>

      {box.toConfirm.length + box.toAnswer.length + box.toPlay.length > 0 ? (
        <section aria-labelledby="pb-move">
          <SectionHeader id="pb-move" title="Your move" />
          <ul className="space-y-3">
            {box.toConfirm.map((m) => (
              <li key={m.id} className="card px-4 pt-3 pb-4">
                <p className="mb-1 text-sm"><span className="font-bold">{shortName(b.byId.get(m.recordedBy))}</span> recorded a {m.discipline} result. Is it right?</p>
                <Link href={`/pickleball/matches/${m.id}`} className="block"><PbScoreRows m={m} byId={b.byId} /></Link>
                <div className="mt-3"><ConfirmPb id={m.id} size="sm" /></div>
              </li>
            ))}
            {box.toAnswer.map((c) => (
              <li key={c.id} className="card flex flex-wrap items-center gap-3 px-4 py-3.5">
                <p className="min-w-0 flex-1 text-sm"><span className="font-bold">{sideName(c.side1, b.byId)}</span> challenged {c.discipline === "doubles" ? `you and ${sideName(c.side2.filter((x) => x !== me.id), b.byId)}` : "you"} to {PB_FORMATS[c.format].label.toLowerCase()}{c.message ? <span className="block text-text-2">“{c.message}”</span> : null}</p>
                <AnswerPbChallenge id={c.id} />
              </li>
            ))}
            {box.toPlay.map((c) => {
              const mine = c.side1.includes(me.id) ? c.side1 : c.side2, theirs = c.side1.includes(me.id) ? c.side2 : c.side1;
              const partner = mine.find((x) => x !== me.id);
              const q = new URLSearchParams({ discipline: c.discipline, format: c.format, scoring: c.scoring, challenge: c.id, opponents: theirs.join(","), ...(partner ? { partner } : {}) });
              return (
                <li key={c.id} className="card flex items-center gap-3 px-4 py-3.5">
                  <p className="min-w-0 flex-1 text-sm">Challenge on vs <span className="font-bold">{sideName(theirs, b.byId)}</span>. Played it?</p>
                  <ButtonLink href={`/pickleball/record?${q}`} size="sm" variant="secondary">Record result</ButtonLink>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-9 lg:grid-cols-2">
        <section aria-labelledby="pb-last">
          <SectionHeader id="pb-last" title="Last match" href="/pickleball/matches" linkLabel="All matches" />
          {last ? <PbMatchCard m={last} byId={b.byId} today={b.today} /> : (
            <Empty title="No pickleball yet" action={<ButtonLink href="/pickleball/record" variant="secondary">Record a match</ButtonLink>}>
              Play a game, record the score, and once the other side confirms it you&apos;re on the board.
            </Empty>
          )}
        </section>
        <section aria-labelledby="pb-table">
          <SectionHeader id="pb-table" title={`${mainBoard === "doubles" ? "Doubles" : "Singles"}: ${at === -1 ? "top of the table" : "around you"}`} href={`/pickleball/rankings?board=${mainBoard}`} linkLabel="Rankings" />
          {around.length ? <ol className="card divide-y divide-line overflow-hidden">{around.map((r) => <LeaderboardRow key={r.player.id} r={r} me={me.id} compact href={`/players/${r.player.username}?sport=pickleball`} />)}</ol>
            : <p className="card px-5 py-6 text-sm text-text-2">The table fills in after the first confirmed match.</p>}
        </section>
      </div>

      {rivalry && rival ? (
        <section aria-labelledby="pb-rival">
          <SectionHeader id="pb-rival" title="Rivalry" href={`/pickleball/h2h?a=${me.username}&b=${b.byId.get(rival)?.username ?? ""}`} linkLabel="Head to head" />
          <div className="card flex items-center gap-4 px-5 py-4">
            <Avatar player={me} size="md" />
            <p className="score num flex-1 text-center text-[40px]">{rivalry.aWins}<span className="mx-2 text-text-3">–</span>{rivalry.bWins}</p>
            <Avatar player={b.byId.get(rival)} size="md" />
          </div>
          <p className="mt-2 text-center text-caption text-text-3">Singles vs {shortName(b.byId.get(rival))}, {rivalry.matches.length} match{rivalry.matches.length === 1 ? "" : "es"}</p>
        </section>
      ) : null}
    </div>
  );
}
