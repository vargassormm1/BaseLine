// Pickleball leaderboards, records and head-to-head. Pure, derived from confirmed matches only (pending, rejected,
// canceled and voided never count). Singles and doubles are separate boards; tennis is never involved.
// Same row shape as tennis (StandingRow) so the leaderboard UI is shared.
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

import * as S from "@/lib/sides/standings";
export const pbByRecent = S.byRecent;
export const sideOf = S.sideOf;
export const won = S.won;
export const playersOf = S.playersOf;
export const counts = S.counts;

/** One board (singles or doubles), with places moved in the last 7 days. */
export function pbStandings(players: readonly Player[], matches: readonly PbMatch[], discipline: PbDiscipline, opts: { season?: number | undefined; today: ISODate }): StandingRow[] {
  return S.sideStandings(players, matches.filter((m) => m.discipline === discipline), opts);
}

export type PbRecord = S.SideRecord;

/** A player's pickleball profile numbers: singles and doubles kept apart; frequent partners from doubles. */
export function pbPlayerStats(matches: readonly PbMatch[], id: string) {
  const mine = matches.filter((m) => counts(m) && sideOf(m, id) !== null).sort(pbByRecent);
  const singles = mine.filter((m) => m.discipline === "singles"), doubles = mine.filter((m) => m.discipline === "doubles");
  const d = S.playerSideStats(doubles, id);
  return {
    singles: S.recordOf(singles, id), doubles: d.record, overall: S.recordOf(mine, id), recent: mine.slice(0, 10),
    partners: d.partners.slice(0, 5).map((p) => ({ playerId: p.playerId, played: p.played, wins: p.wins })),
  };
}

/** Singles head-to-head between two players (doubles never counts here). */
export const pbSinglesH2H = (matches: readonly PbMatch[], a: string, b: string) => S.singlesH2H(matches.filter((m) => m.discipline === "singles"), a, b) as { matches: PbMatch[]; aWins: number; bWins: number };
/** Doubles: one partnership against another (exactly these four players, either side). */
export const pbTeamH2H = (matches: readonly PbMatch[], teamA: readonly [string, string], teamB: readonly [string, string]) => S.teamH2H(matches.filter((m) => m.discipline === "doubles"), teamA, teamB) as { matches: PbMatch[]; aWins: number; bWins: number };
/** Doubles-opponent history between two players across any partnerships (labelled as such in the UI). */
export const pbDoublesOpponents = (matches: readonly PbMatch[], a: string, b: string) => S.doublesOpponents(matches.filter((m) => m.discipline === "doubles"), a, b) as { matches: PbMatch[]; aWins: number; bWins: number };

/** "11–8, 9–11, 11–6" from a side's point of view. */
export const pbScoreLine = (m: PbMatch, from: PbSide = 1) => m.games.map(([x, y]) => (from === 1 ? `${x}–${y}` : `${y}–${x}`)).join(", ");
