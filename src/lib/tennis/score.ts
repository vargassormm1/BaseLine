// Tennis score rules. Mirrors public.validate_sets() in supabase/migrations (tests/fixtures/scores.json is run against
// both, so they can't drift). A set is finished at 6–0…6–4, 7–5, or 7–6 with a tiebreak (first to 7, win by 2).
// A deciding match tiebreak (if chosen) is first to 10, win by 2, entered in points.
import { setsToWin, type DecidingSet, type Format, type SetScore, type Side } from "./types";

export type SetState =
  | { kind: "empty" }
  | { kind: "in_progress" }
  | { kind: "needs_tiebreak" }
  | { kind: "done"; winner: Side }
  | { kind: "invalid"; message: string };

const int = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 99;

/** Is a race-to-N finished? (A tiebreak to 7 or a match tiebreak to 10: reach N with a 2-point lead; past N the
 *  game ends the moment the lead is 2.) */
function race(hi: number, lo: number, to: number): "done" | "in_progress" | "invalid" {
  const lead = hi - lo;
  if (hi < to || lead < 2) return "in_progress"; // 8–5, 10–9, 11–11: still being played
  return hi === to || lead === 2 ? "done" : "invalid"; // 10–8, 12–10 finish; 12–8 can't happen
}

/** State of one set as typed so far, for live feedback in the score entry. */
export function setState(s: Partial<SetScore>, matchTiebreak: boolean): SetState {
  const { p1, p2 } = s;
  if (p1 === undefined || p2 === undefined || p1 === null || p2 === null) return { kind: "empty" };
  if (!int(p1) || !int(p2)) return { kind: "invalid", message: "Use whole numbers." };
  const hi = Math.max(p1, p2), lo = Math.min(p1, p2), winner: Side = p1 > p2 ? 1 : 2;
  const t1 = s.tb1 ?? null, t2 = s.tb2 ?? null, hasTb = t1 !== null || t2 !== null;
  if (matchTiebreak) {
    if (hasTb) return { kind: "invalid", message: "A match tiebreak has no separate tiebreak." };
    const r = race(hi, lo, 10);
    return r === "done" ? { kind: "done", winner } : r === "invalid" ? { kind: "invalid", message: "A match tiebreak ends as soon as someone leads by 2 (from 10)." } : { kind: "in_progress" };
  }
  if ((hi === 6 && lo <= 4) || (hi === 7 && lo === 5)) {
    return hasTb ? { kind: "invalid", message: "Only a 7–6 set has a tiebreak." } : { kind: "done", winner };
  }
  if (hi === 7 && lo === 6) {
    if (t1 === null || t2 === null) return { kind: "needs_tiebreak" };
    if (!int(t1) || !int(t2)) return { kind: "invalid", message: "Use whole numbers." };
    const thi = winner === 1 ? t1 : t2, tlo = winner === 1 ? t2 : t1;
    if (thi < 7 || thi - tlo < 2 || (thi > 7 && thi - tlo !== 2)) {
      return { kind: "invalid", message: "Tiebreak: the set winner needs 7+ points and a 2-point lead." };
    }
    return { kind: "done", winner };
  }
  if (hasTb) return { kind: "invalid", message: "Only a 7–6 set has a tiebreak." };
  if (hi <= 6) return { kind: "in_progress" }; // e.g. 5–3, 6–5, 6–6
  return { kind: "invalid", message: `${p1}–${p2} isn't a possible set score.` };
}

export type MatchCheck = { ok: true; winner: Side; setsWon: [number, number] } | { ok: false; message: string; set?: number };

/** Full validation of a submitted match. */
export function checkMatch(format: Format, deciding: DecidingSet, sets: SetScore[]): MatchCheck {
  const need = setsToWin(format);
  if (sets.length < need) return { ok: false, message: `Enter at least ${need} set${need > 1 ? "s" : ""}.` };
  if (sets.length > format) return { ok: false, message: `${format === 1 ? "A one-set match" : `Best of ${format}`} has at most ${format} set${format > 1 ? "s" : ""}.` };
  let w1 = 0, w2 = 0;
  for (let i = 0; i < sets.length; i++) {
    if (w1 === need || w2 === need) return { ok: false, message: "The match was already won before this set.", set: i + 1 };
    const mtb = deciding === "match_tiebreak" && format > 1 && i === format - 1;
    const st = setState(sets[i]!, mtb);
    if (st.kind === "invalid") return { ok: false, message: st.message, set: i + 1 };
    if (st.kind === "needs_tiebreak") return { ok: false, message: "Enter the tiebreak score.", set: i + 1 };
    if (st.kind !== "done") return { ok: false, message: mtb ? "Finish the match tiebreak (first to 10, win by 2)." : "This set isn't finished.", set: i + 1 };
    if (st.winner === 1) w1++; else w2++;
  }
  if (w1 !== need && w2 !== need) return { ok: false, message: "The match isn't finished yet." };
  return { ok: true, winner: w1 === need ? 1 : 2, setsWon: [w1, w2] };
}

/** How many sets the entry form should show right now: enough to finish the match, never more. */
export function setsToShow(format: Format, deciding: DecidingSet, sets: Partial<SetScore>[]): number {
  const need = setsToWin(format);
  let w1 = 0, w2 = 0, done = 0;
  for (let i = 0; i < format; i++) {
    const st = setState(sets[i] ?? {}, deciding === "match_tiebreak" && format > 1 && i === format - 1);
    if (st.kind !== "done") break;
    done++;
    if (st.winner === 1) w1++; else w2++;
    if (w1 === need || w2 === need) return done;
  }
  return Math.min(format, Math.max(need, done + 1));
}

/** "6–4 3–6 10–8" style scoreline from a side's point of view (winner first when `from` is the winner). */
export function scoreline(sets: SetScore[], from: Side = 1): string {
  return sets.map((s) => {
    const a = from === 1 ? s.p1 : s.p2, b = from === 1 ? s.p2 : s.p1;
    const ta = from === 1 ? s.tb1 : s.tb2, tb = from === 1 ? s.tb2 : s.tb1;
    const loserTb = ta != null && tb != null ? (a < b ? ta : tb) : null;
    return `${a}–${b}${loserTb !== null ? `(${loserTb})` : ""}`;
  }).join(" ");
}
