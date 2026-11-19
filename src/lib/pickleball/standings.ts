// Pickleball leaderboards, records and head-to-head. Pure, derived from confirmed matches only (pending, rejected,
// canceled and voided never count). Singles and doubles are separate boards; tennis is never involved.
// Same row shape as tennis (StandingRow) so the leaderboard UI is shared.
import { addDays, yearOf } from "@/lib/tennis/dates";
import type { ISODate, Player } from "@/lib/tennis/types";
import type { StandingRow } from "@/lib/tennis/standings";
import type { PbDiscipline, PbFormat, PbScoring, PbSide } from "./rules";

export type PbStatus = "pending" | "confirmed" | "rejected" | "canceled" | "voided";
export interface PbMatch {
  id: string;
  discipline: PbDiscipline;
  format: PbFormat;
  scoring: PbScoring;
  status: PbStatus;
  playedOn: ISODate;
  createdAt: string;
  confirmedAt: string | null;
  recordedBy: string;
  recorderSide: PbSide;
  winnerSide: PbSide;
  /** points each winner earned (null until confirmed) */
  points: number | null;
  side1: string[];
  side2: string[];
  games: [number, number][];
  sidesKey: string;
  note: string | null;
  challengeId: string | null;
}

export const pbByRecent = (a: PbMatch, b: PbMatch) => (a.playedOn === b.playedOn ? (a.createdAt < b.createdAt ? 1 : -1) : a.playedOn < b.playedOn ? 1 : -1);
export const sideOf = (m: PbMatch, playerId: string): PbSide | null => (m.side1.includes(playerId) ? 1 : m.side2.includes(playerId) ? 2 : null);
export const won = (m: PbMatch, playerId: string) => sideOf(m, playerId) === m.winnerSide;
export const playersOf = (m: PbMatch, side: PbSide) => (side === 1 ? m.side1 : m.side2);
export const counts = (m: PbMatch) => m.status === "confirmed";

function table(players: readonly Player[], matches: readonly PbMatch[], discipline: PbDiscipline, season: number | undefined): StandingRow[] {
  const counted = matches.filter((m) => counts(m) && m.discipline === discipline && (season === undefined || yearOf(m.playedOn) === season)).sort(pbByRecent);
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

/** One board (singles or doubles), with places moved in the last 7 days. */
export function pbStandings(players: readonly Player[], matches: readonly PbMatch[], discipline: PbDiscipline, opts: { season?: number | undefined; today: ISODate }): StandingRow[] {
  const now = table(players, matches, discipline, opts.season);
  const cutoff = addDays(opts.today, -7);
  const before = table(players, matches.filter((m) => m.confirmedAt !== null && m.confirmedAt.slice(0, 10) < cutoff), discipline, opts.season);
  const prev = new Map(before.map((r) => [r.player.id, r.rank]));
  for (const r of now) { const p = prev.get(r.player.id) ?? null; r.movement = r.rank !== null && p !== null ? p - r.rank : null; }
  return now;
}

export interface PbRecord { wins: number; losses: number; played: number; winPct: number | null; points: number }
const record = (ms: readonly PbMatch[], id: string): PbRecord => {
  const wins = ms.filter((m) => won(m, id)).length, played = ms.length;
  return { wins, losses: played - wins, played, winPct: played ? Math.round((wins / played) * 1000) / 10 : null, points: ms.filter((m) => won(m, id)).reduce((s, m) => s + (m.points ?? 0), 0) };
};

/** A player's pickleball profile numbers: singles and doubles kept apart; frequent partners from doubles. */
export function pbPlayerStats(matches: readonly PbMatch[], id: string) {
  const mine = matches.filter((m) => counts(m) && sideOf(m, id) !== null).sort(pbByRecent);
  const singles = mine.filter((m) => m.discipline === "singles"), doubles = mine.filter((m) => m.discipline === "doubles");
  const partners = new Map<string, { played: number; wins: number }>();
  for (const m of doubles) {
    const mate = playersOf(m, sideOf(m, id)!).find((p) => p !== id)!;
    const e = partners.get(mate) ?? { played: 0, wins: 0 };
    e.played++; if (won(m, id)) e.wins++;
    partners.set(mate, e);
  }
  return {
    singles: record(singles, id), doubles: record(doubles, id), overall: record(mine, id), recent: mine.slice(0, 10),
    partners: [...partners.entries()].map(([playerId, v]) => ({ playerId, ...v })).sort((a, b) => b.played - a.played || b.wins - a.wins).slice(0, 5),
  };
}

/** Singles head-to-head between two players (doubles never counts here). */
export function pbSinglesH2H(matches: readonly PbMatch[], a: string, b: string) {
  const ms = matches.filter((m) => counts(m) && m.discipline === "singles" && sideOf(m, a) !== null && sideOf(m, b) !== null).sort(pbByRecent);
  return { matches: ms, aWins: ms.filter((m) => won(m, a)).length, bWins: ms.filter((m) => won(m, b)).length };
}

/** Doubles: one partnership against another (exactly these four players, either side). */
export function pbTeamH2H(matches: readonly PbMatch[], teamA: readonly [string, string], teamB: readonly [string, string]) {
  const key = (t: readonly string[]) => [...t].sort().join(",");
  const ka = key(teamA), kb = key(teamB);
  const ms = matches.filter((m) => counts(m) && m.discipline === "doubles"
    && ((key(m.side1) === ka && key(m.side2) === kb) || (key(m.side1) === kb && key(m.side2) === ka))).sort(pbByRecent);
  const aWon = (m: PbMatch) => key(playersOf(m, m.winnerSide)) === ka;
  return { matches: ms, aWins: ms.filter(aWon).length, bWins: ms.filter((m) => !aWon(m)).length };
}

/** Doubles-opponent history between two players across any partnerships (labelled as such in the UI). */
export function pbDoublesOpponents(matches: readonly PbMatch[], a: string, b: string) {
  const ms = matches.filter((m) => counts(m) && m.discipline === "doubles" && sideOf(m, a) !== null && sideOf(m, b) !== null && sideOf(m, a) !== sideOf(m, b)).sort(pbByRecent);
  return { matches: ms, aWins: ms.filter((m) => won(m, a)).length, bWins: ms.filter((m) => won(m, b)).length };
}

/** "11–8, 9–11, 11–6" from a side's point of view. */
export const pbScoreLine = (m: PbMatch, from: PbSide = 1) => m.games.map(([x, y]) => (from === 1 ? `${x}–${y}` : `${y}–${x}`)).join(", ");
