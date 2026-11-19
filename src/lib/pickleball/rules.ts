// Pickleball formats, scoring rules and Baseline points (docs/PICKLEBALL.md). Mirrors public.pickleball_validate()
// in supabase/migrations: tests/fixtures/pickleball-scores.json runs against both, so they can't drift.
// Sources: 2026 USA Pickleball Official Rulebook, rules 4.A, 4.B, 14.A (provisional rally scoring), 15.C.

export type PbSide = 1 | 2;
export type PbDiscipline = "singles" | "doubles";
export type PbScoring = "side_out" | "rally";
export type PbFormat = "g11" | "g15" | "g21" | "bo3" | "bo5";

export const PB_FORMATS: Record<PbFormat, { label: string; short: string; gamesToWin: number; maxGames: number; to: number; points: number }> = {
  g11: { label: "One game to 11", short: "1 game · 11", gamesToWin: 1, maxGames: 1, to: 11, points: 5 },
  g15: { label: "One game to 15", short: "1 game · 15", gamesToWin: 1, maxGames: 1, to: 15, points: 10 },
  g21: { label: "One game to 21", short: "1 game · 21", gamesToWin: 1, maxGames: 1, to: 21, points: 10 },
  bo3: { label: "Best of 3 to 11", short: "Best of 3", gamesToWin: 2, maxGames: 3, to: 11, points: 10 },
  bo5: { label: "Best of 5 to 11", short: "Best of 5", gamesToWin: 3, maxGames: 5, to: 11, points: 20 },
};
export const PB_DEFAULT_FORMAT: PbFormat = "g11";
export const isPbFormat = (f: unknown): f is PbFormat => typeof f === "string" && f in PB_FORMATS;
export const PB_SCORING_LABEL: Record<PbScoring, string> = { side_out: "Standard (side-out)", rally: "Rally scoring" };
/** Only the first N confirmed matches per day between the same sides earn points (Matt, 2026-11-19). */
export const PB_DAILY_POINT_MATCHES = 3;

export type GameState = { kind: "empty" } | { kind: "in_progress" } | { kind: "done"; winner: PbSide } | { kind: "invalid"; message: string };

const whole = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 99;

/** One game to `to`, win by 2 (rule 15.C). Ends the moment it's won: past the target the margin is exactly 2. */
export function gameState(a: number | null | undefined, b: number | null | undefined, to: number): GameState {
  if (a === null || a === undefined || b === null || b === undefined) return { kind: "empty" };
  if (!whole(a) || !whole(b)) return { kind: "invalid", message: "Use whole numbers." };
  const hi = Math.max(a, b), lo = Math.min(a, b);
  if (hi < to || hi - lo < 2) {
    if (hi - lo === 0 && hi >= to) return { kind: "invalid", message: "A game can't end tied." };
    return hi >= to && hi - lo === 1 ? { kind: "invalid", message: "A game is won by 2 points." } : { kind: "in_progress" };
  }
  if (hi > to && hi - lo !== 2) return { kind: "invalid", message: `Past ${to}, a game ends as soon as someone leads by 2 (e.g. ${to + 1}–${to - 1}).` };
  return { kind: "done", winner: a > b ? 1 : 2 };
}

export type MatchResult = { ok: true; winner: PbSide; gamesWon: [number, number] } | { ok: false; message: string };

/** A complete match: every game finished, no game after the match was decided, a winner. */
export function validateMatch(format: PbFormat, games: readonly (readonly [number, number])[]): MatchResult {
  if (!isPbFormat(format)) return { ok: false, message: "Choose a format." };
  const f = PB_FORMATS[format];
  if (games.length === 0) return { ok: false, message: "Enter the score." };
  if (games.length > f.maxGames) return { ok: false, message: `${f.label} has at most ${f.maxGames} game${f.maxGames === 1 ? "" : "s"}.` };
  const won: [number, number] = [0, 0];
  for (let i = 0; i < games.length; i++) {
    if (won[0] === f.gamesToWin || won[1] === f.gamesToWin) return { ok: false, message: "The match was already won before this game." };
    const [a, b] = games[i]!;
    const s = gameState(a, b, f.to);
    if (s.kind === "invalid") return { ok: false, message: `Game ${i + 1}: ${s.message}` };
    if (s.kind !== "done") return { ok: false, message: `Game ${i + 1} isn't finished (to ${f.to}, win by 2).` };
    won[s.winner - 1]!++;
  }
  if (won[0] < f.gamesToWin && won[1] < f.gamesToWin) return { ok: false, message: `Not finished: first to ${f.gamesToWin} game${f.gamesToWin === 1 ? "" : "s"} wins.` };
  return { ok: true, winner: won[0] > won[1] ? 1 : 2, gamesWon: won };
}

/** Points for each winner of a confirmed match, given how many point-earning matches these sides already had that day. */
export const pbPointsFor = (format: PbFormat, earlierPointMatchesToday: number) =>
  earlierPointMatchesToday >= PB_DAILY_POINT_MATCHES ? 0 : PB_FORMATS[format].points;
