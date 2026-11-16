// Leaderboard. Derived from confirmed matches only (pending, rejected, canceled and voided never count), plus the
// one-time V1 carry-over adjustments in all-time view. Order: points, then wins, then win %, then fewer losses.
import { addDays, yearOf } from "./dates";
import type { Adjustment, ISODate, Match, Player } from "./types";

export type Result = "W" | "L";
export interface StandingRow {
  player: Player;
  rank: number | null; // null = no matches in this period
  points: number;
  wins: number;
  losses: number;
  played: number;
  winPct: number | null; // 0–100
  form: Result[]; // most recent first, up to 5
  movement: number | null; // places gained (+) or lost (−) in the last 7 days; null = new or unranked
}
export interface StandingsOptions { season?: number | undefined; today: ISODate }

export const byRecent = (a: Match, b: Match) => (a.playedOn === b.playedOn ? (a.createdAt < b.createdAt ? 1 : -1) : a.playedOn < b.playedOn ? 1 : -1);

function table(players: readonly Player[], matches: readonly Match[], adjustments: readonly Adjustment[], season: number | undefined) {
  const counted = matches.filter((m) => m.status === "confirmed" && (season === undefined || yearOf(m.playedOn) === season)).sort(byRecent);
  const rows = new Map<string, StandingRow>(players.map((p) => [p.id, { player: p, rank: null, points: 0, wins: 0, losses: 0, played: 0, winPct: null, form: [], movement: null }]));
  for (const m of counted) {
    for (const id of [m.p1, m.p2]) {
      const r = rows.get(id);
      if (!r) continue;
      const won = m.winner === id;
      r.played++;
      if (won) { r.wins++; r.points += m.points; } else r.losses++;
      if (r.form.length < 5) r.form.push(won ? "W" : "L");
    }
  }
  if (season === undefined) {
    for (const a of adjustments) {
      const r = rows.get(a.playerId);
      if (r) { r.points += a.points; r.wins += a.wins; r.losses += a.losses; }
    }
  }
  const all = [...rows.values()];
  for (const r of all) r.winPct = r.wins + r.losses > 0 ? Math.round((r.wins / (r.wins + r.losses)) * 1000) / 10 : null;
  const active = all.filter((r) => r.played > 0 || r.points !== 0 || r.wins + r.losses > 0);
  active.sort((a, b) => b.points - a.points || b.wins - a.wins || (b.winPct ?? 0) - (a.winPct ?? 0) || a.losses - b.losses
    || a.player.username.localeCompare(b.player.username));
  // equal points, wins and losses share a rank (1, 2, 2, 4)
  active.forEach((r, i) => {
    const prev = active[i - 1];
    r.rank = prev && prev.points === r.points && prev.wins === r.wins && prev.losses === r.losses ? prev.rank : i + 1;
  });
  const inactive = all.filter((r) => !active.includes(r)).sort((a, b) => a.player.username.localeCompare(b.player.username));
  return [...active, ...inactive];
}

export function standings(players: readonly Player[], matches: readonly Match[], adjustments: readonly Adjustment[], opts: StandingsOptions): StandingRow[] {
  const now = table(players, matches, adjustments, opts.season);
  // a week ago: only results confirmed before then
  const cutoff = addDays(opts.today, -7);
  const before = table(players, matches.filter((m) => m.confirmedAt !== null && m.confirmedAt.slice(0, 10) < cutoff), adjustments, opts.season);
  const prevRank = new Map(before.map((r) => [r.player.id, r.rank]));
  for (const r of now) {
    const p = prevRank.get(r.player.id) ?? null;
    r.movement = r.rank !== null && p !== null ? p - r.rank : null;
  }
  return now;
}
