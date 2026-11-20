// Tennis doubles formats and score validation (docs/TENNIS_DOUBLES.md). Mirrors public.tennis_doubles_validate() in
// supabase/migrations: tests/fixtures/tennis-doubles-scores.json runs against both, so they can't drift.
// Sources: 2026 ITF Rules of Tennis (Rules 5–7, 14–15, Appendix VI) as reprinted in USTA Friend at Court 2026, and USTA
// Regulation I.E.4 (pro sets). Baseline records final scores only; no-ad is a label.

export type DSide = 1 | 2;
export type DFormat = "one_set" | "std" | "bo3" | "bo3_adv" | "bo5" | "short1" | "short3" | "pro8";
/** one entry per set: [side 1 games, side 2 games] with optional tiebreak points [.., side 1 tb, side 2 tb]; a match
 *  tiebreak (to 10) is entered as its points in the deciding slot */
export type DSet = [number, number] | [number, number, number | null, number | null];

type SetKind = { games: number; tieAt: number | null } | { matchTiebreak: true };
export interface DFormatDef {
  label: string; short: string; group: "main" | "more"; setsToWin: number; maxSets: number;
  /** regular sets: games to win and where the tiebreak is played (null = advantage set) */
  set: { games: number; tieAt: number | null };
  /** the deciding set when it differs (match tiebreak to 10, or an advantage final set) */
  decider: "same" | "match_tiebreak" | "advantage";
  points: number; help: string;
}
export const D_FORMATS: Record<DFormat, DFormatDef> = {
  one_set: { label: "One set", short: "1 set", group: "main", setsToWin: 1, maxSets: 1, set: { games: 6, tieAt: 6 }, decider: "same", points: 5, help: "First to 6 games, tiebreak at 6–6." },
  std: { label: "Standard doubles", short: "2 sets + match TB", group: "main", setsToWin: 2, maxSets: 3, set: { games: 6, tieAt: 6 }, decider: "match_tiebreak", points: 10, help: "Two sets; at one set all, a match tiebreak to 10." },
  bo3: { label: "Best of 3 sets", short: "Best of 3", group: "main", setsToWin: 2, maxSets: 3, set: { games: 6, tieAt: 6 }, decider: "same", points: 10, help: "Three full sets, tiebreak at 6–6." },
  bo3_adv: { label: "Best of 3, advantage final set", short: "Best of 3 (adv. final)", group: "more", setsToWin: 2, maxSets: 3, set: { games: 6, tieAt: 6 }, decider: "advantage", points: 10, help: "Final set has no tiebreak: win by 2 games (8–6, 10–8…)." },
  bo5: { label: "Best of 5 sets", short: "Best of 5", group: "more", setsToWin: 3, maxSets: 5, set: { games: 6, tieAt: 6 }, decider: "same", points: 20, help: "First to three sets." },
  short1: { label: "One short set", short: "Short set", group: "more", setsToWin: 1, maxSets: 1, set: { games: 4, tieAt: 4 }, decider: "same", points: 3, help: "First to 4 games, tiebreak at 4–4 (or 3–3)." },
  short3: { label: "Short sets, best of 3", short: "Short sets", group: "more", setsToWin: 2, maxSets: 3, set: { games: 4, tieAt: 4 }, decider: "match_tiebreak", points: 5, help: "Two short sets; at one set all, a match tiebreak to 10." },
  pro8: { label: "Pro set (8 games)", short: "Pro set", group: "more", setsToWin: 1, maxSets: 1, set: { games: 8, tieAt: 8 }, decider: "same", points: 5, help: "First to 8 games, tiebreak at 8–8 (9–8)." },
};
export const D_DEFAULT: DFormat = "std";
export const isDFormat = (f: unknown): f is DFormat => typeof f === "string" && f in D_FORMATS;
export const isShort = (f: DFormat) => f === "short1" || f === "short3";

const whole = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 99;

/** A race to `to` won by 2, ending the moment it's won (tiebreaks, match tiebreaks). */
export function race(a: number, b: number, to: number): "done" | "in_progress" | "invalid" {
  const hi = Math.max(a, b), lo = Math.min(a, b);
  if (hi < to || hi - lo < 2) return hi > to + 30 ? "invalid" : "in_progress";
  return hi === to || hi - lo === 2 ? "done" : "invalid";
}

export type SetCheck = { kind: "done"; winner: DSide } | { kind: "in_progress" } | { kind: "invalid"; message: string };

/** One set of `kind`, as entered. */
export function checkSet(s: DSet, kind: SetKind): SetCheck {
  const [a, b] = s;
  const ta = s.length > 2 ? s[2] ?? null : null, tb = s.length > 2 ? s[3] ?? null : null;
  if (!whole(a) || !whole(b)) return { kind: "invalid", message: "Use whole numbers." };
  if ((ta !== null && !whole(ta)) || (tb !== null && !whole(tb))) return { kind: "invalid", message: "Use whole numbers." };
  if ("matchTiebreak" in kind) {
    if (ta !== null || tb !== null) return { kind: "invalid", message: "A match tiebreak is entered as its points only." };
    const r = race(a, b, 10);
    return r === "done" ? { kind: "done", winner: a > b ? 1 : 2 } : r === "invalid" ? { kind: "invalid", message: "A match tiebreak ends as soon as someone leads by 2 (from 10)." } : { kind: "in_progress" };
  }
  const { games: g, tieAt } = kind;
  const hi = Math.max(a, b), lo = Math.min(a, b), winner: DSide = a > b ? 1 : 2;
  let done: boolean, isTb = false;
  if (tieAt === null) {
    // advantage set: first to g, by two; past g it ends exactly at a two-game lead
    done = hi >= g && hi - lo >= 2 && (hi === g || hi - lo === 2);
    if (!done && hi >= g && hi - lo > 2) return { kind: "invalid", message: `That set would have ended earlier (at a two-game lead).` };
  } else if (tieAt === g) {
    // tiebreak at g–g: g–0…g–(g-2), (g+1)–(g-1), or (g+1)–g after the tiebreak
    isTb = hi === g + 1 && lo === g;
    done = (hi === g && lo <= g - 2) || (hi === g + 1 && lo === g - 1) || isTb;
  } else {
    // short sets with the tiebreak at (g-1)–(g-1): g–0…g–(g-2), or g–(g-1) after the tiebreak
    isTb = hi === g && lo === g - 1;
    done = (hi === g && lo <= g - 2) || isTb;
  }
  if (!done) {
    const cap = tieAt === null ? Infinity : tieAt === g ? g + 1 : g;
    return hi > cap || (tieAt !== null && hi === cap && lo < cap - 2) || (tieAt === null && hi > g && hi - lo > 2)
      ? { kind: "invalid", message: `${hi}–${lo} isn't a possible ${g}-game set score here.` } : { kind: "in_progress" };
  }
  if (ta !== null || tb !== null) {
    if (!isTb) return { kind: "invalid", message: "Only a set decided by a tiebreak has tiebreak points." };
    if (ta === null || tb === null) return { kind: "invalid", message: "Enter both tiebreak scores, or neither." };
    const r = race(ta, tb, 7);
    if (r !== "done") return { kind: "invalid", message: "A tiebreak is first to 7, by two (e.g. 7–5, 8–6)." };
    if ((ta > tb ? 1 : 2) !== winner) return { kind: "invalid", message: "The tiebreak winner must win the set." };
  }
  return { kind: "done", winner };
}

/** Which kind each set slot is, for a format. */
export function setKind(format: DFormat, index: number, shortTieAt: 3 | 4 = 4): SetKind {
  const f = D_FORMATS[format];
  // short sets: tiebreak at 4–4, or at 3–3 when that alternative was chosen (ITF Appendix VI)
  const regular = { games: f.set.games, tieAt: isShort(format) ? shortTieAt : f.set.tieAt };
  const isDecider = f.maxSets > 1 && index === f.maxSets - 1;
  if (isDecider && f.decider === "match_tiebreak") return { matchTiebreak: true };
  if (isDecider && f.decider === "advantage") return { games: f.set.games, tieAt: null };
  return regular;
}

export type DResult = { ok: true; winner: DSide; setsWon: [number, number] } | { ok: false; message: string };

/** A complete match in `format`: every set finished, no set after it was decided, a decider only at one set all. */
export function validateDoubles(format: DFormat, sets: readonly DSet[], shortTieAt: 3 | 4 = 4): DResult {
  if (!isDFormat(format)) return { ok: false, message: "Choose a format." };
  const f = D_FORMATS[format];
  if (sets.length === 0) return { ok: false, message: "Enter the score." };
  if (sets.length > f.maxSets) return { ok: false, message: `${f.label} has at most ${f.maxSets} set${f.maxSets === 1 ? "" : "s"}.` };
  const won: [number, number] = [0, 0];
  for (let i = 0; i < sets.length; i++) {
    if (won[0] === f.setsToWin || won[1] === f.setsToWin) return { ok: false, message: "The match was already won before this set." };
    const kind = setKind(format, i, shortTieAt);
    const c = checkSet(sets[i]!, kind);
    const label = "matchTiebreak" in kind ? "Match tiebreak" : `Set ${i + 1}`;
    if (c.kind === "invalid") return { ok: false, message: `${label}: ${c.message}` };
    if (c.kind !== "done") return { ok: false, message: `${label} isn't finished.` };
    won[c.winner - 1]!++;
  }
  if (won[0] < f.setsToWin && won[1] < f.setsToWin) return { ok: false, message: `Not finished: first to ${f.setsToWin} set${f.setsToWin === 1 ? "" : "s"} wins.` };
  return { ok: true, winner: won[0] > won[1] ? 1 : 2, setsWon: won };
}

/** "6–4, 4–6, [10–7]" from a side's point of view; a tiebreak shows the loser's points: 7–6(5). */
export function doublesScoreLine(format: DFormat, sets: readonly DSet[], from: DSide = 1): string {
  return sets.map((s, i) => {
    const mine = from === 1 ? s[0] : s[1], theirs = from === 1 ? s[1] : s[0];
    if ("matchTiebreak" in setKind(format, i)) return `[${mine}–${theirs}]`;
    const ta = s.length > 2 ? s[2] : null, tb = s.length > 2 ? s[3] : null;
    const loserTb = ta != null && tb != null ? Math.min(ta, tb) : null;
    return `${mine}–${theirs}${loserTb !== null ? `(${loserTb})` : ""}`;
  }).join(", ");
}
