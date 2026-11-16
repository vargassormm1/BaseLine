// Player and head-to-head statistics, from confirmed matches only.
import { byRecent, type Result } from "./standings";
import type { Format, Match } from "./types";

interface Pov { mine: number; theirs: number; tbMine: number | null; tbTheirs: number | null; isMatchTiebreak: boolean }
/** A match's sets from one player's point of view. */
export const setsFor = (m: Match, id: string): Pov[] => m.sets.map((s) => {
  const one = m.p1 === id;
  return { mine: one ? s.p1 : s.p2, theirs: one ? s.p2 : s.p1, tbMine: (one ? s.tb1 : s.tb2) ?? null, tbTheirs: (one ? s.tb2 : s.tb1) ?? null, isMatchTiebreak: s.isMatchTiebreak };
});
export const opponentOf = (m: Match, id: string) => (m.p1 === id ? m.p2 : m.p1);
const confirmed = (ms: readonly Match[]) => ms.filter((m) => m.status === "confirmed").sort(byRecent);

export interface Tally { wins: number; losses: number; setsWon: number; setsLost: number; gamesWon: number; gamesLost: number; tiebreaksWon: number; tiebreaksLost: number }
function tally(ms: readonly Match[], id: string): Tally {
  const t: Tally = { wins: 0, losses: 0, setsWon: 0, setsLost: 0, gamesWon: 0, gamesLost: 0, tiebreaksWon: 0, tiebreaksLost: 0 };
  for (const m of ms) {
    if (m.winner === id) t.wins++; else t.losses++;
    for (const s of setsFor(m, id)) {
      if (s.mine > s.theirs) t.setsWon++; else if (s.theirs > s.mine) t.setsLost++;
      if (!s.isMatchTiebreak) { t.gamesWon += s.mine; t.gamesLost += s.theirs; }
      if (s.tbMine !== null && s.tbTheirs !== null) { if (s.tbMine > s.tbTheirs) t.tiebreaksWon++; else t.tiebreaksLost++; }
    }
  }
  return t;
}
const pct = (a: number, b: number) => (a + b > 0 ? Math.round((a / (a + b)) * 1000) / 10 : null);

function streaks(results: Result[]) { // most recent first
  const current = results.length ? { result: results[0]!, length: results.findIndex((r) => r !== results[0]) === -1 ? results.length : results.findIndex((r) => r !== results[0]) } : null;
  let longest = 0, run = 0;
  for (const r of [...results].reverse()) { run = r === "W" ? run + 1 : 0; longest = Math.max(longest, run); }
  return { current, longestWin: longest };
}

export interface Rival { opponentId: string; played: number; wins: number; losses: number; lastPlayed: string }
export interface PlayerStats extends Tally {
  played: number; winPct: number | null; setPct: number | null; gamePct: number | null;
  form: Result[]; currentStreak: { result: Result; length: number } | null; longestWinStreak: number;
  byFormat: Record<Format, { wins: number; losses: number }>; rivals: Rival[]; recent: Match[];
}

export function playerStats(id: string, matches: readonly Match[]): PlayerStats {
  const mine = confirmed(matches).filter((m) => m.p1 === id || m.p2 === id);
  const t = tally(mine, id);
  const results: Result[] = mine.map((m) => (m.winner === id ? "W" : "L"));
  const { current, longestWin } = streaks(results);
  const byFormat = { 1: { wins: 0, losses: 0 }, 3: { wins: 0, losses: 0 }, 5: { wins: 0, losses: 0 } } as PlayerStats["byFormat"];
  const rivals = new Map<string, Rival>();
  for (const m of mine) {
    const won = m.winner === id;
    if (won) byFormat[m.format].wins++; else byFormat[m.format].losses++;
    const o = opponentOf(m, id);
    const r = rivals.get(o) ?? { opponentId: o, played: 0, wins: 0, losses: 0, lastPlayed: m.playedOn };
    r.played++; if (won) r.wins++; else r.losses++;
    rivals.set(o, r);
  }
  return {
    ...t, played: mine.length, winPct: pct(t.wins, t.losses), setPct: pct(t.setsWon, t.setsLost), gamePct: pct(t.gamesWon, t.gamesLost),
    form: results.slice(0, 10), currentStreak: current, longestWinStreak: longestWin, byFormat,
    rivals: [...rivals.values()].sort((a, b) => b.played - a.played || (a.lastPlayed < b.lastPlayed ? 1 : -1)),
    recent: mine.slice(0, 20),
  };
}

export interface HeadToHead {
  a: Tally; b: Tally; played: number;
  /** who has won the most recent meetings in a row */
  streak: { playerId: string; length: number } | null;
  lastMeeting: Match | null; firstMeeting: Match | null;
  biggestWin: { a: Match | null; b: Match | null };
  byFormat: { format: Format; a: number; b: number }[];
  meetings: Match[];
}

export function headToHead(aId: string, bId: string, matches: readonly Match[]): HeadToHead {
  const meetings = confirmed(matches).filter((m) => (m.p1 === aId && m.p2 === bId) || (m.p1 === bId && m.p2 === aId));
  const margin = (m: Match, id: string) => setsFor(m, id).reduce((s, x) => s + (x.isMatchTiebreak ? 0 : x.mine - x.theirs), 0);
  const biggest = (id: string) => meetings.filter((m) => m.winner === id).reduce<Match | null>((best, m) => (!best || margin(m, id) > margin(best, id) ? m : best), null);
  let streak: HeadToHead["streak"] = null;
  if (meetings.length) {
    const w = meetings[0]!.winner;
    const n = meetings.findIndex((m) => m.winner !== w);
    streak = { playerId: w, length: n === -1 ? meetings.length : n };
  }
  const formats = ([1, 3, 5] as Format[]).map((f) => ({
    format: f, a: meetings.filter((m) => m.format === f && m.winner === aId).length, b: meetings.filter((m) => m.format === f && m.winner === bId).length,
  })).filter((x) => x.a + x.b > 0);
  return {
    a: tally(meetings, aId), b: tally(meetings, bId), played: meetings.length, streak,
    lastMeeting: meetings[0] ?? null, firstMeeting: meetings.at(-1) ?? null,
    biggestWin: { a: biggest(aId), b: biggest(bId) }, byFormat: formats, meetings,
  };
}
