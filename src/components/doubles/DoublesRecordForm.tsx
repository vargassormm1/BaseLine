"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight } from "lucide-react";
import { recordDoubles } from "@/app/doubles-actions";
import { checkSet, D_FORMATS, isTiebreakScore, doublesScoreLine, isShort, setKind, validateDoubles, type DFormat, type DSet } from "@/lib/tennis/doubles";
import { addDays } from "@/lib/tennis/dates";
import type { Player } from "@/lib/tennis/types";
import { Avatar, displayName, shortName } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { PlayerPick } from "@/components/pickleball/PbRecordForm";

export interface DoublesRecordProps {
  me: Player; others: Player[]; recent: string[]; today: string;
  initial: { format: DFormat; shortTieAt: 3 | 4; noAd: boolean; partner: string | null; opponents: string[]; challenge: string | null };
}

const chip = (on: boolean) => `press inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold ${on ? "bg-text text-bg" : "bg-surface-3 text-text hover:bg-line-strong"}`;
const toNum = (s: string) => (s.trim() === "" ? null : /^\d{1,2}$/.test(s.trim()) ? Number(s.trim()) : NaN);
type Row = { a: string; b: string; ta: string; tb: string };
const empty = (): Row => ({ a: "", b: "", ta: "", tb: "" });
const MAIN: DFormat[] = ["std", "one_set", "bo3"];
const MORE: DFormat[] = ["bo3_adv", "bo5", "short1", "short3", "pro8"];

export function DoublesRecordForm({ me, others, recent, today, initial }: DoublesRecordProps) {
  const router = useRouter();
  const [clientKey] = useState(() => crypto.randomUUID());
  const locked = initial.challenge !== null;
  const [partner, setPartner] = useState<string | null>(initial.partner);
  const [o1, setO1] = useState<string | null>(initial.opponents[0] ?? null);
  const [o2, setO2] = useState<string | null>(initial.opponents[1] ?? null);
  const [format, setFormat] = useState<DFormat>(initial.format);
  const [more, setMore] = useState(MORE.includes(initial.format));
  const [shortTieAt, setShortTieAt] = useState<3 | 4>(initial.shortTieAt);
  const [noAd, setNoAd] = useState(initial.noAd);
  const [playedOn, setPlayedOn] = useState(today);
  const [rows, setRows] = useState<Row[]>([empty(), empty(), empty(), empty(), empty()]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const f = D_FORMATS[format];

  const taken = new Set([me.id, partner, o1, o2].filter(Boolean) as string[]);
  const pool = (cur: string | null) => others.filter((p) => p.id === cur || !taken.has(p.id));
  const side1 = [me.id, partner], side2 = [o1, o2];
  const playersReady = [...side1, ...side2].every(Boolean);
  // swap my partner with an opponent (I always record from my own team)
  const swap = () => { setPartner(o1); setO1(partner); };

  // hidden tiebreak boxes never count: they only apply while the games read as a tiebreak set
  const toSet = (r: Row, i: number): DSet | null => {
    const a = toNum(r.a), b = toNum(r.b);
    if (a === null && b === null) return null;
    const ta = toNum(r.ta), tb = toNum(r.tb);
    const tbShown = a !== null && b !== null && isTiebreakScore(a, b, setKind(format, i, shortTieAt));
    return tbShown && (ta !== null || tb !== null) ? [a ?? NaN, b ?? NaN, ta, tb] : [a ?? NaN, b ?? NaN];
  };
  // show sets as needed: the minimum to finish, plus the next one while the match is still undecided
  let shown = f.setsToWin;
  {
    let w1 = 0, w2 = 0;
    for (let i = 0; i < f.maxSets; i++) {
      const st = toSet(rows[i]!, i);
      const c = st ? checkSet(st, setKind(format, i, shortTieAt)) : null;
      if (c?.kind !== "done") { shown = Math.max(shown, i + 1); break; }
      if (c.winner === 1) w1++; else w2++;
      if (w1 === f.setsToWin || w2 === f.setsToWin) { shown = i + 1; break; }
      shown = Math.max(shown, i + 2);
    }
    shown = Math.min(Math.max(shown, 1), f.maxSets);
  }
  const sets = rows.slice(0, shown).map((r, i) => toSet(r, i)).filter((s): s is DSet => s !== null);
  const check = validateDoubles(format, sets, shortTieAt);
  const ready = playersReady && check.ok;
  const setRow = (i: number, k: keyof Row, v: string) => { setError(null); setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [k]: v.replace(/\D/g, "").slice(0, 2) } : r))); };

  const submit = () => {
    if (!ready || pending) return;
    start(async () => {
      const r = await recordDoubles({ clientKey, format, shortTieAt: isShort(format) ? shortTieAt : null, noAd, side1, side2, playedOn, sets, challenge: initial.challenge, note: note.trim() || undefined });
      if (!r.ok) { setError(r.error); return; }
      router.push(`/matches/doubles/${r.id}?recorded=1`);
    });
  };
  const byId = new Map([me, ...others].map((p) => [p.id, p]));
  const team = (ids: (string | null)[]) => ids.map((id) => (id ? shortName(byId.get(id)) : "?")).join(" / ");
  const input = "score num h-14 w-[4.25rem] rounded-2xl border bg-surface-2 text-center text-[28px] outline-none focus:border-accent-ink";
  const small = "num h-11 w-14 rounded-xl border border-line-strong bg-surface-2 text-center text-lg outline-none focus:border-accent-ink";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <div className="space-y-7">
        <section aria-labelledby="d-teams" className="space-y-3">
          <div className="flex items-center justify-between"><h2 id="d-teams" className="eyebrow">Teams</h2>
            {!locked && partner && o1 ? <button type="button" onClick={swap} className="press inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-accent-ink hover:bg-surface-3"><ArrowLeftRight size={16} aria-hidden="true" />Swap partner</button> : null}
          </div>
          <div className="rounded-3xl border border-line p-3">
            <p className="px-1 pb-2 text-caption font-bold text-text-3">TEAM A · YOUR TEAM</p>
            <div className="space-y-2">
              <div className="flex items-center gap-3 rounded-2xl bg-surface px-3 py-2.5"><Avatar player={me} size="md" /><span className="font-bold">{displayName(me)}</span></div>
              <PlayerPick label="Your partner" value={partner} onChange={setPartner} pool={pool(partner)} recent={recent} locked={locked} />
            </div>
          </div>
          <p className="text-center text-caption font-bold tracking-wide text-text-3">VS</p>
          <div className="rounded-3xl border border-line p-3">
            <p className="px-1 pb-2 text-caption font-bold text-text-3">TEAM B</p>
            <div className="space-y-2">
              <PlayerPick label="Opponent 1" value={o1} onChange={setO1} pool={pool(o1)} recent={recent} locked={locked} />
              <PlayerPick label="Opponent 2" value={o2} onChange={setO2} pool={pool(o2)} recent={recent} locked={locked} />
            </div>
          </div>
        </section>

        <section aria-labelledby="d-format">
          <h2 id="d-format" className="eyebrow">Format</h2>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {MAIN.map((k) => (
              <button key={k} type="button" disabled={locked} aria-pressed={format === k} onClick={() => { setFormat(k); setError(null); }}
                className={`press rounded-2xl border px-4 py-3 text-left ${format === k ? "border-accent bg-mint text-on-mint" : "border-line bg-surface hover:border-line-strong"}`}>
                <span className="block font-bold">{D_FORMATS[k].label}</span><span className="block text-caption opacity-80">{D_FORMATS[k].help}</span>
              </button>
            ))}
          </div>
          {!locked ? <button type="button" aria-expanded={more} onClick={() => setMore(!more)} className="press mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-accent-ink">{more ? "Fewer formats" : "More formats"}</button> : null}
          {more ? (
            <div className="mt-2 space-y-3">
              <div className="flex flex-wrap gap-2">{MORE.map((k) => <button key={k} type="button" disabled={locked} aria-pressed={format === k} onClick={() => { setFormat(k); setError(null); }} className={chip(format === k)}>{D_FORMATS[k].label}</button>)}</div>
              {MORE.includes(format) ? <p className="text-caption text-text-2">{f.help}</p> : null}
            </div>
          ) : null}
          {isShort(format) ? (
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Short-set tiebreak">
              {([4, 3] as const).map((t) => <button key={t} type="button" disabled={locked} aria-pressed={shortTieAt === t} onClick={() => setShortTieAt(t)} className={chip(shortTieAt === t)}>Tiebreak at {t}–{t}</button>)}
            </div>
          ) : null}
          <label className="mt-3 flex min-h-11 items-center gap-3 text-sm font-semibold">
            <input type="checkbox" checked={noAd} disabled={locked} onChange={(e) => setNoAd(e.target.checked)} className="size-5 accent-[var(--accent)]" />
            No-ad scoring <span className="font-normal text-text-3">(deciding point at deuce)</span>
          </label>
        </section>

        <section aria-labelledby="d-score">
          <h2 id="d-score" className="eyebrow">Score</h2>
          <p className="mt-1 text-caption text-text-3">Games per set, your team on the left. Tiebreak points are optional.</p>
          <div className="mt-3 space-y-3">
            {Array.from({ length: shown }, (_, i) => {
              const kind = setKind(format, i, shortTieAt);
              const mtb = "matchTiebreak" in kind;
              const s = toSet(rows[i]!, i);
              const c = s ? checkSet([s[0], s[1]], kind) : null;
              const full = s ? checkSet(s, kind) : null;
              const isTbSet = !mtb && c?.kind === "done" && isTiebreakScore(s![0], s![1], kind);
              const label = mtb ? "Match tiebreak" : `Set ${i + 1}`;
              return (
                <div key={i} className="rounded-2xl border border-line bg-surface px-3 py-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="w-28 shrink-0 text-sm font-semibold text-text-2">{label}{mtb ? <span className="block text-caption font-normal text-text-3">to 10, by 2</span> : null}</span>
                    {(["a", "b"] as const).map((k) => (
                      <input key={k} inputMode="numeric" pattern="[0-9]*" maxLength={2} value={rows[i]![k]} onChange={(e) => setRow(i, k, e.target.value)}
                        aria-label={`${label}, ${k === "a" ? "your team" : "opponents"}`} className={`${input} ${full?.kind === "invalid" ? "border-loss" : "border-line-strong"}`} />
                    ))}
                    {c?.kind === "done" ? <span className="text-caption font-semibold text-accent-ink">{c.winner === 1 ? "Won" : "Lost"}</span> : null}
                  </div>
                  {isTbSet ? (
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <span className="w-28 shrink-0 text-caption text-text-3">Tiebreak (optional)</span>
                      <input inputMode="numeric" pattern="[0-9]*" maxLength={2} value={rows[i]!.ta} onChange={(e) => setRow(i, "ta", e.target.value)} aria-label={`${label} tiebreak, your team`} className={small} />
                      <input inputMode="numeric" pattern="[0-9]*" maxLength={2} value={rows[i]!.tb} onChange={(e) => setRow(i, "tb", e.target.value)} aria-label={`${label} tiebreak, opponents`} className={small} />
                    </div>
                  ) : null}
                  {full?.kind === "invalid" ? <p role="alert" className="mt-2 text-sm font-medium text-loss-ink">{full.message}</p> : null}
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <label><span className="eyebrow">Played on</span>
            <input type="date" value={playedOn} max={today} min={addDays(today, -365)} onChange={(e) => setPlayedOn(e.target.value)} className="mt-1.5 h-12 w-full rounded-2xl border border-line-strong bg-surface-2 px-4 text-base outline-none focus:border-accent-ink" />
          </label>
          <label><span className="eyebrow">Note (optional)</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={140} placeholder="Club courts, windy" className="mt-1.5 h-12 w-full rounded-2xl border border-line-strong bg-surface-2 px-4 text-base outline-none focus:border-accent-ink" />
          </label>
        </section>
      </div>

      <aside className="card space-y-4 p-5 lg:sticky lg:top-6" aria-label="Review">
        <h2 className="text-lg font-bold">Review</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-3"><dt className="text-text-3">Format</dt><dd className="text-right font-semibold">Doubles · {f.label}{noAd ? " · No-ad" : ""}{isShort(format) ? ` · TB at ${shortTieAt}–${shortTieAt}` : ""}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-text-3">Team A</dt><dd className="text-right font-semibold">{team(side1)}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-text-3">Team B</dt><dd className="text-right font-semibold">{team(side2)}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-text-3">Score</dt><dd className="num text-right font-semibold">{sets.length && sets.every((s) => !Number.isNaN(s[0]) && !Number.isNaN(s[1])) ? doublesScoreLine(format, sets) : "–"}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-text-3">Winners</dt><dd className="text-right font-bold">{check.ok ? (check.winner === 1 ? team(side1) : team(side2)) : "–"}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-text-3">Points</dt><dd className="text-right font-semibold">{f.points} to each winner</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-text-3">Confirms</dt><dd className="text-right font-semibold">{o1 && o2 ? `${team([o1])} or ${team([o2])}` : "Either opponent"}</dd></div>
        </dl>
        <p className="text-caption text-text-3">Doubles points go to your doubles ranking only; singles and pickleball don&apos;t change.</p>
        {!check.ok && sets.length ? <p className="text-sm font-medium text-text-2">{check.message}</p> : null}
        {error ? <p role="alert" className="text-sm font-semibold text-loss-ink">{error}</p> : null}
        <Button size="lg" full loading={pending} disabled={!ready} onClick={submit}>Send for confirmation</Button>
      </aside>
    </div>
  );
}
