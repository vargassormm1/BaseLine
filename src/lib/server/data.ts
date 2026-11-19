import "server-only";
import { cache } from "react";
import type { Adjustment, Format, Match, Player } from "@/lib/tennis/types";
import { todayET } from "@/lib/tennis/dates";
import type { DB } from "./session";
import { env } from "./env";

export interface PlayerRow extends Player { isAdmin: boolean }
/** Public URL of a player's uploaded photo (null = show initials). */
export const avatarUrl = (path: string | null) => (path ? `${env.supabaseUrl()}/storage/v1/object/public/avatars/${path}` : null);
export interface ChallengeRow {
  id: string; challenger: string; opponent: string; format: Format; message: string | null; proposedFor: string | null;
  status: "pending" | "accepted" | "declined" | "canceled" | "expired" | "completed"; createdAt: string; expiresAt: string;
}
export interface Board { players: PlayerRow[]; byId: Map<string, PlayerRow>; matches: Match[]; adjustments: Adjustment[]; challenges: ChallengeRow[]; today: string }

const MATCH_COLUMNS = "id, format, deciding_set, player_one, player_two, winner_id, status, played_on, created_at, confirmed_at, points_awarded, challenge_id, legacy_match_id, note, void_reason, match_sets(set_number, p1_games, p2_games, p1_tiebreak, p2_tiebreak, is_match_tiebreak)";

/** Players (shared by every sport), once per request. */
export const loadPlayers = cache(async (sb: DB): Promise<{ players: PlayerRow[]; byId: Map<string, PlayerRow> }> => {
  const { data, error } = await sb.from("players").select("id, username, first_name, last_name, avatar_path, is_admin").order("username");
  if (error) throw new Error("Couldn't load data.");
  const ps: PlayerRow[] = (data ?? []).map((p) => ({ id: p.id, username: p.username, firstName: p.first_name, lastName: p.last_name, avatarUrl: avatarUrl(p.avatar_path), isAdmin: p.is_admin }));
  return { players: ps, byId: new Map(ps.map((p) => [p.id, p])) };
});

/** Everything the screens need, loaded once per request. At this group's scale (hundreds of matches) one read is
 *  faster and simpler than many small queries; RLS decides what the player can see. */
export const loadBoard = cache(async (sb: DB): Promise<Board> => {
  const [pl, matches, adjustments, challenges] = await Promise.all([
    loadPlayers(sb),
    sb.from("matches").select(MATCH_COLUMNS).order("played_on", { ascending: false }).order("created_at", { ascending: false }),
    sb.from("standing_adjustments").select("player_id, points, wins, losses, reason"),
    sb.from("challenges").select("id, challenger, opponent, format, message, proposed_for, status, created_at, expires_at").order("created_at", { ascending: false }),
  ]);
  for (const r of [matches, adjustments, challenges]) if (r.error) throw new Error("Couldn't load data.");
  const ps = pl.players;
  const ms: Match[] = (matches.data ?? []).map((m) => ({
    id: m.id, format: m.format as Format, deciding: m.deciding_set as Match["deciding"], p1: m.player_one, p2: m.player_two,
    winner: m.winner_id, status: m.status, playedOn: m.played_on, createdAt: m.created_at, confirmedAt: m.confirmed_at,
    points: m.points_awarded, challengeId: m.challenge_id, legacy: m.legacy_match_id !== null,
    note: m.note, voidReason: m.void_reason,
    sets: [...(m.match_sets ?? [])].sort((a, b) => a.set_number - b.set_number).map((s) => ({
      p1: s.p1_games, p2: s.p2_games, tb1: s.p1_tiebreak, tb2: s.p2_tiebreak, isMatchTiebreak: s.is_match_tiebreak,
    })),
  }));
  const today = todayET();
  return {
    players: ps, byId: pl.byId, matches: ms,
    adjustments: (adjustments.data ?? []).map((a) => ({ playerId: a.player_id, points: a.points, wins: a.wins, losses: a.losses, reason: a.reason })),
    challenges: (challenges.data ?? []).map((c) => ({
      id: c.id, challenger: c.challenger, opponent: c.opponent, format: c.format as Format, message: c.message, proposedFor: c.proposed_for,
      // a pending challenge past its expiry shows as expired (the database closes it on the next action)
      status: c.status === "pending" && c.expires_at < new Date().toISOString() ? "expired" : c.status,
      createdAt: c.created_at, expiresAt: c.expires_at,
    })),
    today,
  };
});
