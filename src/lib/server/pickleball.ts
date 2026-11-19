import "server-only";
import { cache } from "react";
import type { PbMatch } from "@/lib/pickleball/standings";
import type { PbDiscipline, PbFormat, PbScoring, PbSide } from "@/lib/pickleball/rules";
import { todayET } from "@/lib/tennis/dates";
import type { DB } from "./session";
import { loadPlayers, type PlayerRow } from "./data";

export interface PbChallengeRow {
  id: string; discipline: PbDiscipline; format: PbFormat; scoring: PbScoring; challenger: string; side1: string[]; side2: string[];
  message: string | null; proposedFor: string | null; status: "pending" | "accepted" | "declined" | "canceled" | "expired" | "completed"; createdAt: string;
}
export interface PbBoard { players: PlayerRow[]; byId: Map<string, PlayerRow>; matches: PbMatch[]; challenges: PbChallengeRow[]; today: string }

/** Pickleball matches and challenges (pickleball pages never read tennis matches; the app layout loads both once, only
 *  for the "waiting for you" badge). One read per request; RLS decides visibility. */
export const loadPickleball = cache(async (sb: DB): Promise<PbBoard> => {
  const [players, matches, challenges] = await Promise.all([
    loadPlayers(sb),
    sb.from("pickleball_matches").select("id, discipline, format, scoring, status, played_on, created_at, confirmed_at, recorded_by, recorder_side, winner_side, points_awarded, sides_key, note, challenge_id, pickleball_match_players(player_id, side), pickleball_games(game_number, side1_points, side2_points)")
      .order("played_on", { ascending: false }).order("created_at", { ascending: false }),
    sb.from("pickleball_challenges").select("id, discipline, format, scoring, challenger, message, proposed_for, status, created_at, expires_at, pickleball_challenge_players(player_id, side)").order("created_at", { ascending: false }),
  ]);
  if (matches.error || challenges.error) throw new Error("Couldn't load data.");
  const ms: PbMatch[] = (matches.data ?? []).map((m) => {
    const ps = m.pickleball_match_players ?? [];
    return {
      id: m.id, discipline: m.discipline as PbDiscipline, format: m.format as PbFormat, scoring: m.scoring as PbScoring, status: m.status,
      playedOn: m.played_on, createdAt: m.created_at, confirmedAt: m.confirmed_at, recordedBy: m.recorded_by, recorderSide: m.recorder_side as PbSide,
      winnerSide: m.winner_side as PbSide, points: m.points_awarded, sidesKey: m.sides_key, note: m.note, challengeId: m.challenge_id,
      side1: ps.filter((p) => p.side === 1).map((p) => p.player_id).sort(), side2: ps.filter((p) => p.side === 2).map((p) => p.player_id).sort(),
      games: [...(m.pickleball_games ?? [])].sort((a, b) => a.game_number - b.game_number).map((g) => [g.side1_points, g.side2_points] as [number, number]),
    };
  });
  const now = new Date().toISOString();
  return {
    ...players, matches: ms, today: todayET(),
    challenges: (challenges.data ?? []).map((c) => {
      const ps = c.pickleball_challenge_players ?? [];
      return {
        id: c.id, discipline: c.discipline as PbDiscipline, format: c.format as PbFormat, scoring: c.scoring as PbScoring, challenger: c.challenger,
        side1: ps.filter((p) => p.side === 1).map((p) => p.player_id), side2: ps.filter((p) => p.side === 2).map((p) => p.player_id),
        message: c.message, proposedFor: c.proposed_for, createdAt: c.created_at,
        status: c.status === "pending" && c.expires_at < now ? "expired" : c.status,
      };
    }),
  };
});
