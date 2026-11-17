"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Minus, Plus, Search } from "lucide-react";
import { recordMatch } from "@/app/actions";
import { checkMatch, setsToShow } from "@/lib/tennis/score";
import { addDays } from "@/lib/tennis/dates";
import { pointsFor } from "@/lib/tennis/points";
import { FORMAT_LABEL, type DecidingSet, type Format, type Player, type SetScore } from "@/lib/tennis/types";
import { Avatar, displayName, shortName } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";

type Side = "me" | "them";
/** One set as picked in the form: who won it, the score from the winner's side, and the tiebreak loser's points. */
interface Pick { winner: Side | null; score: [number, number] | null; tbLoser: number }
const SET_SCORES: [number, number][] = [[6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [7, 5], [7, 6]];
const emptyPick = (): Pick => ({ winner: null, score: null, tbLoser: 5 });

/** Turn a pick into an entered set (p1 = me, p2 = them). Tiebreak winner points follow from the loser's. */
function toSet(p: Pick, mtb: boolean): Partial<SetScore> {
  if (!p.winner) return {};
  if (mtb) {
    const w = Math.max(10, p.tbLoser + 2), l = p.tbLoser;
    return p.winner === "me" ? { p1: w, p2: l } : { p1: l, p2: w };
  }
  if (!p.score) return {};
  const [w, l] = p.score;
  const tb = w === 7 && l === 6 ? { w: Math.max(7, p.tbLoser + 2), l: p.tbLoser } : null;
  return p.winner === "me"
    ? { p1: w, p2: l, tb1: tb?.w ?? null, tb2: tb?.l ?? null }
    : { p1: l, p2: w, tb1: tb?.l ?? null, tb2: tb?.w ?? null };
}

export interface RecordFormProps {
  me: Player; opponents: Player[]; recent: string[]; today: string;
  initial: { opponent: string | null; format: Format; challenge: string | null };
}

export function RecordMatchForm({ me, opponents, recent, today, initial }: RecordFormProps) {
  const router = useRouter();
  const [clientKey] = useState(() => crypto.randomUUID());
  const [opponent, setOpponent] = useState<string | null>(initial.opponent);
  const [query, setQuery] = useState("");
  const [format, setFormat] = useState<Format>(initial.format);
  const [deciding, setDeciding] = useState<DecidingSet>("set");
  const [playedOn, setPlayedOn] = useState(today);
  const [picks, setPicks] = useState<Pick[]>([emptyPick(), emptyPick(), emptyPick(), emptyPick(), emptyPick()]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState(false);
  const [pending, start] = useTransition();
  const opp = opponents.find((o) => o.id === opponent);
  const locked = initial.challenge !== null;

  const isMtb = (i: number) => deciding === "match_tiebreak" && format > 1 && i === format - 1;
  const entered = useMemo(() => picks.map((p, i) => toSet(p, isMtb(i))), [picks, format, deciding]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = setsToShow(format, deciding, entered);
  const sets = entered.slice(0, shown);
  const check = checkMatch(format, deciding, sets as SetScore[]);
  const setPick = (i: number, p: Partial<Pick>) => { setError(null); setDuplicate(false); setPicks((ps) => ps.map((x, j) => (j === i ? { ...x, ...p } : x))); };

  const quick = recent.map((id) => opponents.find((o) => o.id === id)).filter((o): o is Player => !!o).slice(0, 6);
  const filtered = query.trim() ? opponents.filter((o) => `${o.username} ${o.firstName} ${o.lastName}`.toLowerCase().includes(query.trim().toLowerCase())) : [];

  const submit = (allowDuplicate = false) => {
    if (!opponent || !check.ok) return;
    start(async () => {
      const r = await recordMatch({ clientKey, opponent, format, deciding, playedOn, sets, challenge: initial.challenge, note: note.trim() || undefined, allowDuplicate });
      if (!r.ok) { setError(r.error); setDuplicate(r.duplicate === true); return; }
      router.push(`/matches/${r.id}?recorded=1`);
    });
  };

  const chip = (on: boolean) => `press inline-flex h-11 items-center justify-center rounded-full px-4 text-sm font-semibold ${on ? "bg-text text-bg" : "bg-surface-3 text-text hover:bg-line-strong"}`;

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="space-y-7">
          {/* opponent */}
          <fieldset>
            <legend className="mb-3 text-lg font-bold">Who did you play?</legend>
            {opp ? (
              <div className="card flex items-center gap-3 p-3">
                <Avatar player={opp} size="lg" />
                <div className="min-w-0 flex-1"><p className="truncate font-bold">{displayName(opp)}</p><p className="text-sm text-text-2">@{opp.username}</p></div>
                {!locked ? <Button variant="ghost" size="sm" onClick={() => setOpponent(null)}>Change</Button> : null}
              </div>
            ) : (
              <div className="space-y-3">
                {quick.length ? (
                  <div role="radiogroup" aria-label="Recent opponents" className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4">
                    {quick.map((o) => (
                      <button key={o.id} type="button" role="radio" aria-checked={false} onClick={() => setOpponent(o.id)} className="press flex w-[72px] shrink-0 flex-col items-center gap-1.5">
                        <Avatar player={o} size="lg" /><span className="w-full truncate text-center text-caption font-semibold">{shortName(o)}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
                <label className="flex h-12 items-center gap-2 rounded-2xl border border-line-strong bg-surface px-4 focus-within:border-accent-ink">
                  <Search size={18} className="text-text-3" aria-hidden="true" />
                  <span className="sr-only">Search players</span>
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search players" className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-text-3" />
                </label>
                {filtered.length ? (
                  <ul className="card divide-y divide-line overflow-hidden">
                    {filtered.slice(0, 8).map((o) => (
                      <li key={o.id}><button type="button" onClick={() => { setOpponent(o.id); setQuery(""); }} className="press flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-2">
                        <Avatar player={o} size="sm" /><span className="font-semibold">{displayName(o)}</span><span className="text-sm text-text-3">@{o.username}</span>
                      </button></li>
                    ))}
                  </ul>
                ) : query.trim() ? <p className="text-sm text-text-2">No player matches “{query.trim()}”.</p> : null}
              </div>
            )}
          </fieldset>

          {/* format + date */}
          <fieldset>
            <legend className="mb-3 text-lg font-bold">Format</legend>
            <div role="radiogroup" aria-label="Format" className="flex flex-wrap gap-2">
              {([1, 3, 5] as Format[]).map((f) => (
                <button key={f} type="button" role="radio" aria-checked={format === f} disabled={locked && format !== f}
                  onClick={() => { setFormat(f); setError(null); }} className={chip(format === f)}>{FORMAT_LABEL[f]}<span className="ml-1.5 font-normal">{pointsFor(f)} pts</span></button>
              ))}
            </div>
            {format > 1 ? (
              <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                <input type="checkbox" checked={deciding === "match_tiebreak"} onChange={(e) => setDeciding(e.target.checked ? "match_tiebreak" : "set")} className="size-5 accent-[var(--accent)]" />
                Deciding set played as a match tiebreak (first to 10)
              </label>
            ) : null}
          </fieldset>

          <fieldset>
            <legend className="mb-3 text-lg font-bold">When</legend>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className={chip(playedOn === today)} aria-pressed={playedOn === today} onClick={() => setPlayedOn(today)}>Today</button>
              <button type="button" className={chip(playedOn === addDays(today, -1))} aria-pressed={playedOn === addDays(today, -1)} onClick={() => setPlayedOn(addDays(today, -1))}>Yesterday</button>
              <label className={`${chip(playedOn < addDays(today, -1))} relative`}>
                <span className="sr-only">Pick a date</span>
                <input type="date" value={playedOn} min={addDays(today, -365)} max={today} onChange={(e) => e.target.value && setPlayedOn(e.target.value)} className="h-11 bg-transparent outline-none" />
              </label>
            </div>
          </fieldset>

          {/* score */}
          <fieldset>
            <legend className="mb-3 text-lg font-bold">Score</legend>
            <ol className="space-y-3">
                {Array.from({ length: shown }, (_, i) => {
                  const p = picks[i]!, mtb = isMtb(i);
                  const needsTb = mtb ? p.winner !== null : p.score?.[0] === 7 && p.score?.[1] === 6;
                  return (
                    <li key={i} className="animate-rise card p-4">
                      <p className="mb-3 text-sm font-bold">{mtb ? "Match tiebreak" : `Set ${i + 1}`}</p>
                      <div role="radiogroup" aria-label={`Who won ${mtb ? "the match tiebreak" : `set ${i + 1}`}?`} className="grid grid-cols-2 gap-2">
                        {(["me", "them"] as Side[]).map((sd) => (
                          <button key={sd} type="button" role="radio" aria-checked={p.winner === sd} onClick={() => setPick(i, { winner: sd })}
                            className={`press flex h-12 items-center justify-center gap-2 rounded-2xl text-sm font-bold ${p.winner === sd ? "bg-accent text-on-accent" : "bg-surface-3 text-text"}`}>
                            {p.winner === sd ? <Check size={16} strokeWidth={3} aria-hidden="true" /> : null}{sd === "me" ? "I won it" : `${opp ? shortName(opp) : "They"} won it`}
                          </button>
                        ))}
                      </div>
                      {!mtb && p.winner ? (
                        <div role="radiogroup" aria-label={`Set ${i + 1} score`} className="mt-3 flex flex-wrap gap-2">
                          {SET_SCORES.map(([w, l]) => {
                            const on = p.score?.[0] === w && p.score?.[1] === l;
                            return <button key={`${w}${l}`} type="button" role="radio" aria-checked={on} onClick={() => setPick(i, { score: [w, l] })}
                              className={`press score num h-12 min-w-[60px] rounded-2xl px-3 text-[22px] ${on ? "bg-text text-bg" : "bg-surface-3 text-text"}`}>{w}–{l}</button>;
                          })}
                        </div>
                      ) : null}
                      {needsTb ? (
                        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-surface-2 px-3 py-2">
                          <span className="text-sm">{mtb ? "Loser's points" : "Tiebreak: loser's points"} <span className="text-text-3">(winner had {Math.max(mtb ? 10 : 7, p.tbLoser + 2)})</span></span>
                          <span className="flex items-center gap-1">
                            <button type="button" aria-label="Fewer points" onClick={() => setPick(i, { tbLoser: Math.max(0, p.tbLoser - 1) })} className="press grid size-11 place-items-center rounded-full bg-surface-3"><Minus size={18} aria-hidden="true" /></button>
                            <output className="score num w-10 text-center text-[28px]" aria-live="polite">{p.tbLoser}</output>
                            <button type="button" aria-label="More points" onClick={() => setPick(i, { tbLoser: Math.min(40, p.tbLoser + 1) })} className="press grid size-11 place-items-center rounded-full bg-surface-3"><Plus size={18} aria-hidden="true" /></button>
                          </span>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
            </ol>
          </fieldset>

          <label className="block">
            <span className="mb-2 block text-lg font-bold">Note <span className="text-sm font-normal text-text-3">(optional)</span></span>
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={140} placeholder="Where, conditions, bragging rights…"
              className="h-12 w-full rounded-2xl border border-line-strong bg-surface px-4 text-base outline-none placeholder:text-text-3 focus:border-accent-ink" />
          </label>
        </div>

        {/* live result + submit (sticky on desktop) */}
        <aside className="lg:sticky lg:top-8" aria-label="Result">
          <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[#111827] p-5 text-[#f8fafc]">
            <p className="text-caption font-semibold text-[#94a3b8]">{FORMAT_LABEL[format]}{locked ? " · challenge" : ""}</p>
            {[{ who: me, side: 1 as const }, { who: opp, side: 2 as const }].map(({ who, side }) => (
              <div key={side} className="mt-3 flex items-center gap-3">
                <Avatar player={who} size="sm" />
                <span className={`min-w-0 flex-1 truncate font-bold ${check.ok && check.winner === side ? "text-[#8ea2ff]" : ""}`}>{who ? shortName(who) : "Opponent"}</span>
                <span className="flex gap-1">
                  {sets.map((x, i) => <span key={i} className="score num w-7 text-center text-[24px]">{(side === 1 ? x.p1 : x.p2) ?? "·"}</span>)}
                </span>
              </div>
            ))}
            <p className="mt-4 min-h-6 text-sm" aria-live="polite">
              {check.ok ? (check.winner === 1 ? <span className="font-semibold text-[#8ea2ff]">You win · +{pointsFor(format)} pts once {opp ? shortName(opp) : "they"} confirm{opp ? "s" : ""}</span>
                : <span className="text-[#f8fafc]">{opp ? shortName(opp) : "They"} win{opp ? "s" : ""} this one</span>)
                : <span className="text-[#94a3b8]">{opponent ? "Pick the score of each set." : "Pick your opponent."}</span>}
            </p>
          </div>
          {error ? <p role="alert" className="mt-3 text-sm font-semibold text-loss-ink">{error}</p> : null}
          {duplicate ? <Button full variant="secondary" className="mt-3" loading={pending} onClick={() => submit(true)}>It&apos;s a different match: record anyway</Button> : null}
          <Button full size="lg" className="mt-4" disabled={!opponent || !check.ok} loading={pending} onClick={() => submit()}>
            {opp ? `Send to ${shortName(opp)} to confirm` : "Record match"}
          </Button>
          <p className="mt-2 text-center text-caption text-text-3">{opp ? shortName(opp) : "Your opponent"} confirms the score, then it counts.</p>
        </aside>
      </div>
    </>
  );
}
