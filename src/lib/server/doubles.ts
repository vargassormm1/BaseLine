import "server-only";
import { cache } from "react";
import type { SideMatch } from "@/lib/sides/standings";
import type { DFormat, DSet } from "@/lib/tennis/doubles";
import type { DB } from "./session";

export interface DMatch extends SideMatch {
  format: DFormat; shortTieAt: 3 | 4 | null; noAd: boolean; sets: DSet[];
  recordedBy: string; recorderSide: 1 | 2; sidesKey: string; note: string | null; challengeId: string | null; voidReason: string | null;
}
export interface DChallengeRow {
  id: string; format: DFormat; shortTieAt: 3 | 4 | null; noAd: boolean; challenger: string; side1: string[]; side2: string[];
  message: string | null; proposedFor: string | null; status: "pending" | "accepted" | "declined" | "canceled" | "expired" | "completed"; createdAt: string;
}

/** Tennis doubles matches and challenges, once per request; RLS decides visibility. */
export const loadTennisDoubles = cache(async (sb: DB): Promise<{ matches: DMatch[]; challenges: DChallengeRow[] }> => {
  const [matches, challenges] = await Promise.all([
    sb.from("tennis_doubles_matches").select("id, format, short_tie_at, no_ad, status, played_on, created_at, confirmed_at, recorded_by, recorder_side, winner_side, points_awarded, sides_key, note, challenge_id, void_reason, tennis_doubles_players(player_id, side), tennis_doubles_sets(set_number, side1_games, side2_games, side1_tiebreak, side2_tiebreak)")
      .order("played_on", { ascending: false }).order("created_at", { ascending: false }),
    sb.from("tennis_doubles_challenges").select("id, format, short_tie_at, no_ad, challenger, message, proposed_for, status, created_at, expires_at, responded_at, tennis_doubles_challenge_players(player_id, side)").order("created_at", { ascending: false }),
  ]);
  if (matches.error || challenges.error) throw new Error("Couldn't load data.");
  const now = Date.now();
  return {
    matches: (matches.data ?? []).map((m) => {
      const ps = m.tennis_doubles_players ?? [];
      return {
        id: m.id, format: m.format as DFormat, shortTieAt: m.short_tie_at as 3 | 4 | null, noAd: m.no_ad, status: m.status, playedOn: m.played_on, createdAt: m.created_at,
        confirmedAt: m.confirmed_at, recordedBy: m.recorded_by, recorderSide: m.recorder_side as 1 | 2, winnerSide: m.winner_side as 1 | 2, points: m.points_awarded,
        sidesKey: m.sides_key, note: m.note, challengeId: m.challenge_id, voidReason: m.void_reason,
        side1: ps.filter((p) => p.side === 1).map((p) => p.player_id).sort(), side2: ps.filter((p) => p.side === 2).map((p) => p.player_id).sort(),
        sets: [...(m.tennis_doubles_sets ?? [])].sort((a, b) => a.set_number - b.set_number).map((s) =>
          (s.side1_tiebreak !== null || s.side2_tiebreak !== null ? [s.side1_games, s.side2_games, s.side1_tiebreak, s.side2_tiebreak] : [s.side1_games, s.side2_games]) as DSet),
      };
    }),
    challenges: (challenges.data ?? []).map((c) => {
      const ps = c.tennis_doubles_challenge_players ?? [];
      const lapsed = (c.status === "pending" && Date.parse(c.expires_at) < now) || (c.status === "accepted" && c.responded_at !== null && Date.parse(c.responded_at) < now - 30 * 864e5);
      return {
        id: c.id, format: c.format as DFormat, shortTieAt: c.short_tie_at as 3 | 4 | null, noAd: c.no_ad, challenger: c.challenger,
        side1: ps.filter((p) => p.side === 1).map((p) => p.player_id), side2: ps.filter((p) => p.side === 2).map((p) => p.player_id),
        message: c.message, proposedFor: c.proposed_for, createdAt: c.created_at, status: lapsed ? "expired" : c.status,
      };
    }),
  };
});
