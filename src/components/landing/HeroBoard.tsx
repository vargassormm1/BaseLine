"use client";
// The landing page's one animated moment, shaped like a broadcast graphic: a result lands, the winners are marked,
// "+10 each" stamps in, and the standings below reorder because of it. Pure CSS (transforms + opacity); switching sport
// replays it. Reduced motion: the finished state, no movement. All players and numbers are illustrative.
import { useState, type CSSProperties } from "react";

type Row = { name: string; before: number };
type Demo = {
  tab: string; label: string; boardLabel: string; points: number;
  sides: { names: string[]; games: number[]; won: boolean }[];
  board: Row[]; // in the order before the match
  summary: string;
};
const DEMOS: Record<"tennis" | "pickleball", Demo> = {
  tennis: {
    tab: "Tennis", label: "Tennis singles", boardLabel: "Tennis singles rankings", points: 10,
    sides: [{ names: ["Alex"], games: [6, 7], won: true }, { names: ["Jordan"], games: [4, 5], won: false }],
    board: [{ name: "Jordan", before: 140 }, { name: "Alex", before: 135 }, { name: "Chris", before: 115 }, { name: "Sam", before: 95 }],
    summary: "Tennis singles example: Alex beats Jordan 6–4, 7–5, earns 10 points and moves past Jordan into first in the tennis singles rankings.",
  },
  pickleball: {
    tab: "Pickleball", label: "Pickleball singles", boardLabel: "Pickleball singles rankings", points: 10,
    sides: [{ names: ["Jordan"], games: [11, 11], won: true }, { names: ["Chris"], games: [8, 6], won: false }],
    board: [{ name: "Chris", before: 80 }, { name: "Jordan", before: 75 }, { name: "Alex", before: 60 }, { name: "Sam", before: 45 }],
    summary: "Pickleball singles example: Jordan beats Chris 11–8, 11–6 and earns 10 points, moving past Chris into first in the pickleball singles rankings.",
  },
};
const ROW = 52; // px, one standings row (the reorder slides by whole rows)
const at = (ms: number, extra: Record<string, string | number> = {}) => ({ "--d": `${ms}ms`, ...extra }) as CSSProperties;

export function HeroBoard() {
  const [sport, setSport] = useState<"tennis" | "pickleball">("tennis");
  const d = DEMOS[sport];
  const winners = d.sides.find((s) => s.won)!.names;
  const after = d.board.map((r) => ({ ...r, pts: r.before + (winners.includes(r.name) ? d.points : 0) }))
    .sort((a, b) => b.pts - a.pts);
  const was = (name: string) => d.board.findIndex((r) => r.name === name);

  return (
    <div className="lp-board">
      <div role="tablist" aria-label="Example sport" className="flex gap-1">
        {(Object.keys(DEMOS) as (keyof typeof DEMOS)[]).map((k) => (
          <button key={k} id={`lp-tab-${k}`} role="tab" type="button" aria-selected={sport === k} aria-controls="lp-panel" onClick={() => setSport(k)}
            className={`press min-h-11 rounded-t-2xl px-5 text-sm font-bold transition-colors ${sport === k ? "bg-panel text-[#fafaf6]" : "text-text-2 hover:text-text"}`}>
            {DEMOS[k].tab}
          </button>
        ))}
      </div>
      <div id="lp-panel" role="tabpanel" aria-labelledby={`lp-tab-${sport}`} className="overflow-hidden rounded-b-[24px] rounded-tr-[24px] shadow-[var(--shadow)]">
        <p className="sr-only" aria-live="polite">{d.summary}</p>
        {/* key: switching sport remounts and replays the sequence */}
        <div key={sport} aria-hidden="true">
          {/* the result */}
          <div className="bg-panel px-5 pt-5 pb-4 text-[#fafaf6] sm:px-6">
            <div className="flex items-center justify-between text-caption font-semibold text-[#a9c4b9]">
              <span>{d.label}</span><span>Final</span>
            </div>
            {d.sides.map((s, i) => (
              <div key={i} className={`mt-3 flex items-center gap-3 ${s.won ? "" : "text-[#a9c4b9]"}`}>
                <span className="flex shrink-0 -space-x-2">{s.names.map((n) => <span key={n} className={`grid size-9 place-items-center rounded-full text-sm font-bold ring-2 ring-[#123f35] ${s.won ? "bg-[#b8f2d4] text-[#123f35]" : "bg-white/10"}`}>{n[0]}</span>)}</span>
                <span className="min-w-0 flex-1 text-[17px] leading-tight font-bold sm:text-xl">{s.names.map((n, k) => <span key={n}>{k ? " " : ""}<span className="whitespace-nowrap">{k ? "/ " : ""}{n}</span></span>)}</span>
                {s.won ? <span className="lp-pop grid h-6 min-w-6 shrink-0 place-items-center rounded-full bg-[#19b779] px-1.5 text-micro font-bold text-[#0c1f17]" style={at(900)}><span className="sm:hidden">W</span><span className="hidden sm:inline">Won</span></span> : null}
                {s.games.map((g, j) => (
                  <span key={j} className="lp-in score num w-8 text-center text-[34px] sm:w-10 sm:text-[42px]" style={at(150 + j * 180 + i * 60)}>{g}</span>
                ))}
              </div>
            ))}
            <div className="mt-4 flex items-baseline justify-between border-t border-white/10 pt-3">
              <span className="lp-in text-sm font-semibold text-[#a9c4b9]" style={at(900)}>{winners.length > 1 ? "Both winners earn" : "Winner earns"}</span>
              <span className="lp-pop score num text-[34px] text-[#7be5b3]" style={at(1150)}>+{d.points}<span className="ml-1 text-base font-semibold">{winners.length > 1 ? "pts each" : "pts"}</span></span>
            </div>
          </div>
          {/* the standings it changes: rank numbers stay put, players slide to their new places */}
          <div className="relative bg-surface">
            <p className="flex h-9 items-center justify-between border-b border-line px-5 text-caption font-semibold text-text-3 sm:px-6"><span>{d.boardLabel}</span><span>pts</span></p>
            <ol className="relative">
              {after.map((r, i) => {
                const moved = was(r.name) - i; // + = climbed
                const gained = winners.includes(r.name);
                return (
                  <li key={r.name} className={`lp-row flex items-center gap-3 border-b border-line px-5 last:border-b-0 sm:px-6 ${gained ? "lp-gain" : ""}`}
                    style={at(1600, { "--from": `${-moved * ROW}px`, height: `${ROW}px` })}>
                    <span className="score w-6 text-[24px] text-text-2">{i + 1}</span>
                    <span className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold ${gained ? "bg-mint text-on-mint" : "bg-surface-3 text-text-2"}`}>{r.name[0]}</span>
                    <span className="min-w-0 flex-1 truncate font-bold">{r.name}</span>
                    {moved > 0 ? <span className="lp-pop text-micro font-bold text-accent-ink" style={at(2100)}>▲ {moved}</span> : moved < 0 ? <span className="lp-pop text-micro font-bold text-coral-ink" style={at(2100)}>▼ {-moved}</span> : null}
                    <span className="score num w-12 text-right text-[24px]">{r.pts}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>
      <p className="mt-3 px-1 text-sm text-text-2"><span className="font-semibold text-text">Doubles count too.</span> Tennis and pickleball doubles have their own rankings, and both partners earn the points.</p>
    </div>
  );
}
