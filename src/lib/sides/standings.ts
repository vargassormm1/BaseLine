// Standings, records, partnerships and head-to-head for any "two sides" match (pickleball singles/doubles, tennis
// doubles). Pure; derived from confirmed matches only (pending, rejected, canceled and voided never count).
// Partnerships are derived from matches (no team accounts): a pair is the sorted pair of player ids, so A+B = B+A.
import { addDays, yearOf } from "@/lib/tennis/dates";
import type { ISODate, Player } from "@/lib/tennis/types";
import type { StandingRow } from "@/lib/tennis/standings";

export type Side = 1 | 2;
export interface SideMatch {
  id: string;
  status: "pending" | "confirmed" | "rejected" | "canceled" | "voided";
  playedOn: ISODate;
  createdAt: string;
  confirmedAt: string | null;
  winnerSide: Side;
  points: number | null;
  side1: string[];
  side2: string[];
}

export const byRecent = (a: SideMatch, b: SideMatch) => (a.playedOn === b.playedOn ? (a.createdAt < b.createdAt ? 1 : -1) : a.playedOn < b.playedOn ? 1 : -1);
export const sideOf = (m: SideMatch, playerId: string): Side | null => (m.side1.includes(playerId) ? 1 : m.side2.includes(playerId) ? 2 : null);
export const won = (m: SideMatch, playerId: string) => sideOf(m, playerId) === m.winnerSide;
export const playersOf = (m: SideMatch, side: Side) => (side === 1 ? m.side1 : m.side2);
export const counts = (m: SideMatch) => m.status === "confirmed";
/** A partnership's identity: sorted player ids (never names, never selection order). */
export const pairKey = (ids: readonly string[]) => [...ids].sort().join(",");

function table(players: readonly Player[], matches: readonly SideMatch[], season: number | undefined): StandingRow[] {
  const counted = matches.filter((m) => counts(m) && (season === undefined || yearOf(m.playedOn) === season)).sort(byRecent);
  const rows = new Map<string, StandingRow>(players.map((p) => [p.id, { player: p, rank: null, points: 0, wins: 0, losses: 0, played: 0, winPct: null, form: [], movement: null }]));
  for (const m of counted) {
    for (const id of [...m.side1, ...m.side2]) {
      const r = rows.get(id);
      if (!r) continue;
      const w = won(m, id);
      r.played++;
      if (w) { r.wins++; r.points += m.points ?? 0; } else r.losses++;
      if (r.form.length < 5) r.form.push(w ? "W" : "L");
    }
  }
  const all = [...rows.values()];
  for (const r of all) r.winPct = r.played > 0 ? Math.round((r.wins / r.played) * 1000) / 10 : null;
  const active = all.filter((r) => r.played > 0);
  active.sort((a, b) => b.points - a.points || b.wins - a.wins || (b.winPct ?? 0) - (a.winPct ?? 0) || a.losses - b.losses || a.player.username.localeCompare(b.player.username));
  active.forEach((r, i) => {
    const prev = active[i - 1];
    r.rank = prev && prev.points === r.points && prev.wins === r.wins && prev.losses === r.losses ? prev.rank : i + 1;
  });
  const inactive = all.filter((r) => r.played === 0).sort((a, b) => a.player.username.localeCompare(b.player.username));
  return [...active, ...inactive];
}

/** An individual board: every winner earns the match's points; places moved in the last 7 days. */
export function sideStandings(players: readonly Player[], matches: readonly SideMatch[], opts: { season?: number | undefined; today: ISODate }): StandingRow[] {
  const now = table(players, matches, opts.season);
  const cutoff = addDays(opts.today, -7);
  const before = table(players, matches.filter((m) => m.confirmedAt !== null && m.confirmedAt.slice(0, 10) < cutoff), opts.season);
  const prev = new Map(before.map((r) => [r.player.id, r.rank]));
  for (const r of now) { const p = prev.get(r.player.id) ?? null; r.movement = r.rank !== null && p !== null ? p - r.rank : null; }
  return now;
}

export interface SideRecord { wins: number; losses: number; played: number; winPct: number | null; points: number }
export const recordOf = (ms: readonly SideMatch[], id: string): SideRecord => {
  const w = ms.filter((m) => won(m, id)), played = ms.length;
  return { wins: w.length, losses: played - w.length, played, winPct: played ? Math.round((w.length / played) * 1000) / 10 : null, points: w.reduce((s, m) => s + (m.points ?? 0), 0) };
};

/** Results in order (oldest → newest) as W/L for a player or a pair: current and longest winning streaks. */
export function streaks(results: readonly boolean[]) {
  let longest = 0, run = 0;
  for (const w of results) { run = w ? run + 1 : 0; longest = Math.max(longest, run); }
  let current = 0;
  for (let i = results.length - 1; i >= 0 && results[i]; i--) current++;
  return { current, longest };
}

export interface Partnership { pair: [string, string]; played: number; wins: number; losses: number; winPct: number; streak: { current: number; longest: number }; last: ISODate }

/** Every partnership that has played (confirmed), with records and streaks. */
export function partnerships(matches: readonly SideMatch[]): Partnership[] {
  const by = new Map<string, { pair: [string, string]; results: { won: boolean; on: ISODate; at: string }[] }>();
  for (const m of matches) {
    if (!counts(m) || m.side1.length !== 2) continue;
    for (const side of [1, 2] as const) {
      const ids = playersOf(m, side), k = pairKey(ids);
      const e = by.get(k) ?? { pair: [...ids].sort() as [string, string], results: [] };
      e.results.push({ won: m.winnerSide === side, on: m.playedOn, at: m.createdAt });
      by.set(k, e);
    }
  }
  return [...by.values()].map((e) => {
    const ordered = e.results.sort((x, y) => (x.on === y.on ? (x.at < y.at ? -1 : 1) : x.on < y.on ? -1 : 1));
    const wins = ordered.filter((r) => r.won).length, played = ordered.length;
    return { pair: e.pair, played, wins, losses: played - wins, winPct: Math.round((wins / played) * 1000) / 10, streak: streaks(ordered.map((r) => r.won)), last: ordered[ordered.length - 1]!.on };
  });
}

/** Top partnerships by win %, only with at least `min` matches together (sample size shown with every row). */
export const topPartnerships = (matches: readonly SideMatch[], min = 3) =>
  partnerships(matches).filter((p) => p.played >= min).sort((a, b) => b.winPct - a.winPct || b.played - a.played || a.pair.join().localeCompare(b.pair.join()));

/** A player's numbers: record, partners (with records), recent results. */
export function playerSideStats(matches: readonly SideMatch[], id: string) {
  const mine = matches.filter((m) => counts(m) && sideOf(m, id) !== null).sort(byRecent);
  const partners = new Map<string, { played: number; wins: number }>();
  for (const m of mine) {
    if (m.side1.length !== 2) continue;
    const mate = playersOf(m, sideOf(m, id)!).find((p) => p !== id)!;
    const e = partners.get(mate) ?? { played: 0, wins: 0 };
    e.played++; if (won(m, id)) e.wins++;
    partners.set(mate, e);
  }
  const list = [...partners.entries()].map(([playerId, v]) => ({ playerId, ...v, losses: v.played - v.wins, winPct: Math.round((v.wins / v.played) * 1000) / 10 }));
  return {
    record: recordOf(mine, id), recent: mine.slice(0, 10), streak: streaks([...mine].reverse().map((m) => won(m, id))),
    partners: list.sort((a, b) => b.played - a.played || b.wins - a.wins),
    // best partner: highest win % with at least 3 matches together
    bestPartner: list.filter((p) => p.played >= 3).sort((a, b) => b.winPct - a.winPct || b.played - a.played)[0] ?? null,
  };
}

/** One-vs-one between two players, only in matches where each played alone (singles). */
export function singlesH2H(matches: readonly SideMatch[], a: string, b: string) {
  const ms = matches.filter((m) => counts(m) && m.side1.length === 1 && sideOf(m, a) !== null && sideOf(m, b) !== null).sort(byRecent);
  return { matches: ms, aWins: ms.filter((m) => won(m, a)).length, bWins: ms.filter((m) => won(m, b)).length };
}

/** One partnership against another (exactly these four, either side, either order). */
export function teamH2H(matches: readonly SideMatch[], teamA: readonly string[], teamB: readonly string[]) {
  const ka = pairKey(teamA), kb = pairKey(teamB);
  const ms = matches.filter((m) => counts(m) && m.side1.length === 2
    && ((pairKey(m.side1) === ka && pairKey(m.side2) === kb) || (pairKey(m.side1) === kb && pairKey(m.side2) === ka))).sort(byRecent);
  const aWon = (m: SideMatch) => pairKey(playersOf(m, m.winnerSide)) === ka;
  return { matches: ms, aWins: ms.filter(aWon).length, bWins: ms.filter((m) => !aWon(m)).length };
}

/** Two players on opposite sides of doubles matches, whatever their partners. Each match counts once. */
export function doublesOpponents(matches: readonly SideMatch[], a: string, b: string) {
  const ms = matches.filter((m) => counts(m) && m.side1.length === 2 && sideOf(m, a) !== null && sideOf(m, b) !== null && sideOf(m, a) !== sideOf(m, b)).sort(byRecent);
  return { matches: ms, aWins: ms.filter((m) => won(m, a)).length, bWins: ms.filter((m) => won(m, b)).length };
}
