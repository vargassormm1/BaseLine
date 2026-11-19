"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { recordPickleball } from "@/app/pickleball-actions";
import { gameState, PB_FORMATS, PB_SCORING_LABEL, PB_DAILY_POINT_MATCHES, validateMatch, type PbDiscipline, type PbFormat, type PbScoring } from "@/lib/pickleball/rules";
import { addDays } from "@/lib/tennis/dates";
import type { Player } from "@/lib/tennis/types";
import { Avatar, displayName, shortName } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";

export interface PbRecordProps {
  me: Player; others: Player[]; recent: string[]; today: string;
  initial: { discipline: PbDiscipline; format: PbFormat; scoring: PbScoring; partner: string | null; opponents: string[]; challenge: string | null };
}

const chip = (on: boolean) => `press inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold ${on ? "bg-text text-bg" : "bg-surface-3 text-text hover:bg-line-strong"}`;
const num = (s: string) => (s.trim() === "" ? null : /^\d{1,2}$/.test(s.trim()) ? Number(s.trim()) : NaN);

/** Pick one player: recent players as one-tap chips, or search. */
export function PlayerPick({ label, value, onChange, pool, recent, locked }: { label: string; value: string | null; onChange: (id: string | null) => void; pool: Player[]; recent: string[]; locked: boolean }) {
  const [q, setQ] = useState("");
  const chosen = pool.find((p) => p.id === value);
  if (chosen) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-2.5">
        <Avatar player={chosen} size="md" />
        <span className="min-w-0 flex-1"><span className="block text-caption font-semibold text-text-3">{label}</span><span className="block truncate font-bold">{displayName(chosen)}</span></span>
        {!locked ? <button type="button" onClick={() => onChange(null)} className="press grid size-11 place-items-center rounded-full text-text-2 hover:bg-surface-3" aria-label={`Change ${label.toLowerCase()}`}><X size={18} aria-hidden="true" /></button> : null}
      </div>
    );
  }
  const quick = recent.map((id) => pool.find((p) => p.id === id)).filter((p): p is Player => !!p).slice(0, 5);
  const found = q.trim() ? pool.filter((p) => `${p.username} ${p.firstName} ${p.lastName}`.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 6) : [];
  return (
    <div className="rounded-2xl border border-dashed border-line-strong p-3">
      <span className="block text-caption font-semibold text-text-3">{label}</span>
      {quick.length ? <div className="mt-2 flex flex-wrap gap-2">{quick.map((p) => (
        <button key={p.id} type="button" onClick={() => onChange(p.id)} className="press inline-flex min-h-11 items-center gap-2 rounded-full bg-surface-3 py-1 pr-4 pl-1 text-sm font-semibold hover:bg-line-strong">
          <Avatar player={p} size="sm" />{shortName(p)}
        </button>
      ))}</div> : null}
      <label className="mt-2 flex h-11 items-center gap-2 rounded-xl border border-line bg-surface-2 px-3">
        <Search size={16} className="text-text-3" aria-hidden="true" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search players" aria-label={`Search for ${label.toLowerCase()}`} autoCapitalize="none" autoCorrect="off" className="min-w-0 flex-1 bg-transparent text-base outline-none" />
      </label>
      {found.length ? <ul className="mt-1">{found.map((p) => (
        <li key={p.id}><button type="button" onClick={() => { onChange(p.id); setQ(""); }} className="press flex min-h-11 w-full items-center gap-3 rounded-xl px-2 text-left hover:bg-surface-3">
          <Avatar player={p} size="sm" /><span className="truncate font-semibold">{displayName(p)}</span><span className="text-caption text-text-3">@{p.username}</span>
        </button></li>
      ))}</ul> : null}
    </div>
  );
}

export function PbRecordForm({ me, others, recent, today, initial }: PbRecordProps) {
  const router = useRouter();
  const [clientKey] = useState(() => crypto.randomUUID());
  const locked = initial.challenge !== null;
  const [discipline, setDiscipline] = useState<PbDiscipline>(initial.discipline);
  const [partner, setPartner] = useState<string | null>(initial.partner);
  const [opp1, setOpp1] = useState<string | null>(initial.opponents[0] ?? null);
  const [opp2, setOpp2] = useState<string | null>(initial.opponents[1] ?? null);
  const [format, setFormat] = useState<PbFormat>(initial.format);
  const [scoring, setScoring] = useState<PbScoring>(initial.scoring);
  const [playedOn, setPlayedOn] = useState(today);
  const [games, setGames] = useState<[string, string][]>([["", ""], ["", ""], ["", ""], ["", ""], ["", ""]]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const f = PB_FORMATS[format];
  const doubles = discipline === "doubles";
  const taken = new Set([me.id, partner, opp1, opp2].filter(Boolean) as string[]);
  const poolFor = (current: string | null) => others.filter((p) => p.id === current || !taken.has(p.id));
  const side1 = doubles ? [me.id, partner] : [me.id];
  const side2 = doubles ? [opp1, opp2] : [opp1];
  const playersReady = side1.every(Boolean) && side2.every(Boolean);

  // show games as they're needed: up to the format's minimum, then one more while the match is undecided
  const parsed = games.map(([a, b]) => [num(a), num(b)] as [number | null, number | null]);
  const shown = useMemo(() => {
    let won1 = 0, won2 = 0, n = 0;
    for (let i = 0; i < f.maxGames; i++) {
      n = i + 1;
      const s = gameState(parsed[i]![0], parsed[i]![1], f.to);
      if (s.kind === "done") { if (s.winner === 1) won1++; else won2++; } else break;
      if (won1 === f.gamesToWin || won2 === f.gamesToWin) break;
    }
    return Math.max(n, Math.min(f.gamesToWin, f.maxGames));
  }, [parsed, f]);
  const entered = parsed.slice(0, shown).filter(([a, b]) => a !== null || b !== null) as [number, number][];
  const check = validateMatch(format, entered);
  const setGame = (i: number, side: 0 | 1, v: string) => { setError(null); setGames((gs) => gs.map((g, j) => (j === i ? (side === 0 ? [v, g[1]] : [g[0], v]) : g))); };
  const ready = playersReady && check.ok;

  const submit = () => {
    if (!ready || pending) return;
    start(async () => {
      const r = await recordPickleball({ clientKey, discipline, format, scoring, side1, side2, playedOn, games: entered, challenge: initial.challenge, note: note.trim() || undefined });
      if (!r.ok) { setError(r.error); return; }
      router.push(`/pickleball/matches/${r.id}?recorded=1`);
    });
  };
  const byId = new Map([me, ...others].map((p) => [p.id, p]));
  const names = (ids: (string | null)[]) => ids.map((id) => (id ? shortName(byId.get(id)) : "?")).join(" & ");

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <div className="space-y-7">
        <section aria-labelledby="pb-kind">
          <h2 id="pb-kind" className="eyebrow">Singles or doubles</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(["singles", "doubles"] as const).map((d) => (
              <button key={d} type="button" disabled={locked} aria-pressed={discipline === d} onClick={() => { setDiscipline(d); if (d === "singles") { setPartner(null); setOpp2(null); } }}
                className={`press rounded-2xl border px-4 py-3 text-left ${discipline === d ? "border-accent bg-mint text-on-mint" : "border-line bg-surface hover:border-line-strong"}`}>
                <span className="block text-lg font-bold">{d === "singles" ? "Singles" : "Doubles"}</span>
                <span className="block text-caption font-semibold opacity-80">{d === "singles" ? "1 vs 1" : "2 vs 2"}</span>
              </button>
            ))}
          </div>
        </section>

        <section aria-labelledby="pb-players" className="space-y-3">
          <h2 id="pb-players" className="eyebrow">Players</h2>
          <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-2.5">
            <Avatar player={me} size="md" /><span><span className="block text-caption font-semibold text-text-3">{doubles ? "Your team" : "You"}</span><span className="font-bold">{displayName(me)}</span></span>
          </div>
          {doubles ? <PlayerPick label="Your partner" value={partner} onChange={setPartner} pool={poolFor(partner)} recent={recent} locked={locked} /> : null}
          <p className="pt-1 text-center text-caption font-bold tracking-wide text-text-3">VS</p>
          <PlayerPick label={doubles ? "Opponent 1" : "Opponent"} value={opp1} onChange={setOpp1} pool={poolFor(opp1)} recent={recent} locked={locked} />
          {doubles ? <PlayerPick label="Opponent 2" value={opp2} onChange={setOpp2} pool={poolFor(opp2)} recent={recent} locked={locked} /> : null}
        </section>

        <section aria-labelledby="pb-format">
          <h2 id="pb-format" className="eyebrow">Format</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {(Object.keys(PB_FORMATS) as PbFormat[]).map((k) => <button key={k} type="button" disabled={locked} aria-pressed={format === k} onClick={() => { setFormat(k); setError(null); }} className={chip(format === k)}>{PB_FORMATS[k].label}</button>)}
          </div>
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Scoring method">
            {(["side_out", "rally"] as const).map((s) => <button key={s} type="button" disabled={locked} aria-pressed={scoring === s} onClick={() => setScoring(s)} className={chip(scoring === s)}>{PB_SCORING_LABEL[s]}</button>)}
          </div>
        </section>

        <section aria-labelledby="pb-score">
          <h2 id="pb-score" className="eyebrow">Score</h2>
          <p className="mt-1 text-caption text-text-3">Games to {f.to}, win by 2. {doubles ? "Your team" : "You"} on the left.</p>
          <div className="mt-3 space-y-2">
            {Array.from({ length: shown }, (_, i) => {
              const st = gameState(parsed[i]![0], parsed[i]![1], f.to);
              return (
                <div key={i}>
                  <div className="flex items-center gap-3">
                    <span className="w-16 shrink-0 text-sm font-semibold text-text-2">Game {i + 1}</span>
                    {[0, 1].map((side) => (
                      <input key={side} inputMode="numeric" pattern="[0-9]*" maxLength={2} value={games[i]![side]} onChange={(e) => setGame(i, side as 0 | 1, e.target.value.replace(/\D/g, ""))}
                        aria-label={`Game ${i + 1}, ${side === 0 ? (doubles ? "your team" : "you") : "opponents"}`}
                        className={`score num h-14 w-20 rounded-2xl border bg-surface-2 text-center text-[28px] outline-none focus:border-accent-ink ${st.kind === "invalid" ? "border-loss" : "border-line-strong"}`} />
                    ))}
                    {st.kind === "done" ? <span className="text-caption font-semibold text-accent-ink">{st.winner === 1 ? "Won" : "Lost"}</span> : null}
                  </div>
                  {st.kind === "invalid" ? <p role="alert" className="mt-1 text-sm font-medium text-loss-ink">{st.message}</p> : null}
                </div>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="pb-when" className="grid gap-3 sm:grid-cols-2">
          <label><span id="pb-when" className="eyebrow">Played on</span>
            <input type="date" value={playedOn} max={today} min={addDays(today, -365)} onChange={(e) => setPlayedOn(e.target.value)} className="mt-1.5 h-12 w-full rounded-2xl border border-line-strong bg-surface-2 px-4 text-base outline-none focus:border-accent-ink" />
          </label>
          <label><span className="eyebrow">Note (optional)</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={140} placeholder="Windy at Hyatt Hills" className="mt-1.5 h-12 w-full rounded-2xl border border-line-strong bg-surface-2 px-4 text-base outline-none focus:border-accent-ink" />
          </label>
        </section>
      </div>

      <aside className="card space-y-4 p-5 lg:sticky lg:top-6" aria-label="Review">
        <h2 className="text-lg font-bold">Review</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-3"><dt className="text-text-3">Match</dt><dd className="text-right font-semibold">{doubles ? "Doubles" : "Singles"} · {f.label}{scoring === "rally" ? " · Rally" : ""}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-text-3">{doubles ? "Your team" : "You"}</dt><dd className="text-right font-semibold">{names(side1)}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-text-3">Opponents</dt><dd className="text-right font-semibold">{names(side2)}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-text-3">Score</dt><dd className="num text-right font-semibold">{entered.length ? entered.map(([a, b]) => `${a}–${b}`).join(", ") : "–"}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-text-3">Winner</dt><dd className="text-right font-bold">{check.ok ? (check.winner === 1 ? names(side1) : names(side2)) : "–"}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-text-3">Points</dt><dd className="text-right font-semibold">{f.points}{doubles ? " to each winner" : " to the winner"}</dd></div>
        </dl>
        <p className="text-caption text-text-3">Counts once {doubles ? "a player on the other team confirms" : "your opponent confirms"}. Only the first {PB_DAILY_POINT_MATCHES} matches a day between the same players earn points.</p>
        {!check.ok && entered.length ? <p className="text-sm font-medium text-text-2">{check.message}</p> : null}
        {error ? <p role="alert" className="text-sm font-semibold text-loss-ink">{error}</p> : null}
        <Button size="lg" full loading={pending} disabled={!ready} onClick={submit}>Send for confirmation</Button>
      </aside>
    </div>
  );
}
