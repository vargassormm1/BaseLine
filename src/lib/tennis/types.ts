// Domain types for Baseline. Pure data: no UI, no database code.
export type Format = 1 | 3 | 5;
export type DecidingSet = "set" | "match_tiebreak";
export type Side = 1 | 2;
export type ISODate = string; // YYYY-MM-DD

/** One set as entered: games (or points, for a match tiebreak) and the 7–6 tiebreak points when there was one. */
export interface SetScore { p1: number; p2: number; tb1?: number | null | undefined; tb2?: number | null | undefined }
export interface SetRow extends SetScore { isMatchTiebreak: boolean }

export type MatchStatus = "pending" | "confirmed" | "rejected" | "canceled" | "voided";

/** A match as stored. player one recorded it; player two confirms it. */
export interface Match {
  id: string;
  format: Format;
  deciding: DecidingSet;
  p1: string;
  p2: string;
  winner: string;
  status: MatchStatus;
  playedOn: ISODate;
  createdAt: string;
  confirmedAt: string | null;
  points: number;
  sets: SetRow[];
  challengeId: string | null;
  legacy: boolean;
  note?: string | null;
  voidReason?: string | null;
}

export interface Player { id: string; username: string; firstName: string; lastName: string; avatarUrl: string | null }
export interface Adjustment { playerId: string; points: number; wins: number; losses: number; reason: string }

export const FORMAT_LABEL: Record<Format, string> = { 1: "1 set", 3: "Best of 3", 5: "Best of 5" };
export const setsToWin = (f: Format) => (f + 1) / 2;
