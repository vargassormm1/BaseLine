import type { Match, Player, SetRow } from "@/lib/tennis/types";
export const P = (id: string): Player => ({ id, username: id, firstName: id.toUpperCase(), lastName: "", avatarUrl: null });
let n = 0;
/** A confirmed match; sets as [p1, p2] games. */
export function M(p1: string, p2: string, sets: [number, number][], o: Partial<Match> = {}): Match {
  const rows: SetRow[] = sets.map(([a, b]) => ({ p1: a, p2: b, isMatchTiebreak: false }));
  let w1 = 0, w2 = 0;
  for (const s of rows) { if (s.p1 > s.p2) w1++; else w2++; }
  const format = (o.format ?? (sets.length === 1 ? 1 : 3)) as Match["format"];
  const playedOn = o.playedOn ?? "2026-11-01";
  return {
    id: `m${++n}`, format, deciding: "set", p1, p2, winner: w1 > w2 ? p1 : p2, status: "confirmed", playedOn,
    createdAt: `${playedOn}T12:00:00Z`, confirmedAt: `${playedOn}T13:00:00Z`, points: { 1: 5, 3: 10, 5: 20 }[format], sets: rows,
    challengeId: null, legacy: false, ...o,
  };
}
