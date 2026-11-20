import { describe, expect, it } from "vitest";
import cases from "./fixtures/tennis-doubles-scores.json";
import { checkSet, D_FORMATS, doublesScoreLine, validateDoubles, type DFormat, type DSet } from "@/lib/tennis/doubles";

describe("tennis doubles validation (shared cases with the database)", () => {
  for (const c of cases as unknown as { name: string; format: string; tbAt?: 3 | 4; sets: DSet[]; winner?: 1 | 2; error?: boolean }[]) {
    it(c.name, () => {
      const r = validateDoubles(c.format as DFormat, c.sets, c.tbAt ?? 4);
      if (c.error) expect(r.ok).toBe(false);
      else expect(r).toMatchObject({ ok: true, winner: c.winner });
    });
  }
});

describe("set feedback while typing", () => {
  it("in progress vs impossible", () => {
    expect(checkSet([5, 4], { games: 6, tieAt: 6 })).toEqual({ kind: "in_progress" });
    expect(checkSet([6, 5], { games: 6, tieAt: 6 })).toEqual({ kind: "in_progress" });
    expect(checkSet([7, 4], { games: 6, tieAt: 6 }).kind).toBe("invalid");
    expect(checkSet([10, 9], { matchTiebreak: true })).toEqual({ kind: "in_progress" });
  });
});

describe("points and score lines", () => {
  it("points mirror singles (per winning player)", () => {
    expect(Object.fromEntries(Object.entries(D_FORMATS).map(([k, v]) => [k, v.points]))).toEqual({ one_set: 5, std: 10, bo3: 10, bo3_adv: 10, bo5: 20, short1: 3, short3: 5, pro8: 5 });
  });
  it("6–4, 4–6, [10–7] and 7–6(5) from either side", () => {
    expect(doublesScoreLine("std", [[6, 4], [4, 6], [10, 7]])).toBe("6–4, 4–6, [10–7]");
    expect(doublesScoreLine("std", [[6, 4], [4, 6], [10, 7]], 2)).toBe("4–6, 6–4, [7–10]");
    expect(doublesScoreLine("one_set", [[7, 6, 7, 5]])).toBe("7–6(5)");
  });
});
