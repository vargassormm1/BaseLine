import { describe, expect, it } from "vitest";
import vectors from "./fixtures/scores.json";
import { checkMatch, scoreline, setState, setsToShow } from "@/lib/tennis/score";
import type { DecidingSet, Format, SetScore } from "@/lib/tennis/types";

describe("match validation (shared vectors, also run against the database)", () => {
  for (const v of vectors as { name: string; format: Format; deciding: DecidingSet; sets: SetScore[]; winner: 1 | 2 | null }[]) {
    it(v.name, () => {
      const r = checkMatch(v.format, v.deciding, v.sets);
      if (v.winner === null) expect(r.ok).toBe(false);
      else expect(r).toMatchObject({ ok: true, winner: v.winner });
    });
  }
});

describe("live set feedback", () => {
  it("knows when a set is still being played", () => {
    expect(setState({ p1: 5, p2: 3 }, false).kind).toBe("in_progress");
    expect(setState({ p1: 6, p2: 5 }, false).kind).toBe("in_progress");
    expect(setState({ p1: 7, p2: 6 }, false).kind).toBe("needs_tiebreak");
    expect(setState({ p1: 6, p2: 2 }, false)).toEqual({ kind: "done", winner: 1 });
    expect(setState({ p1: 9, p2: 7 }, true).kind).toBe("in_progress");
    expect(setState({ p1: 12, p2: 8 }, true).kind).toBe("invalid");
    expect(setState({}, false).kind).toBe("empty");
  });
  it("shows only the sets the match still needs", () => {
    expect(setsToShow(1, "set", [])).toBe(1);
    expect(setsToShow(3, "set", [])).toBe(2);
    expect(setsToShow(3, "set", [{ p1: 6, p2: 4 }, { p1: 6, p2: 3 }])).toBe(2);
    expect(setsToShow(3, "set", [{ p1: 6, p2: 4 }, { p1: 3, p2: 6 }])).toBe(3);
    expect(setsToShow(5, "set", [])).toBe(3);
    expect(setsToShow(5, "set", [{ p1: 6, p2: 4 }, { p1: 6, p2: 4 }, { p1: 4, p2: 6 }])).toBe(4);
  });
  it("writes scorelines from either side, with the tiebreak loser's points", () => {
    const sets = [{ p1: 6, p2: 4 }, { p1: 6, p2: 7, tb1: 5, tb2: 7 }, { p1: 10, p2: 8 }];
    expect(scoreline(sets, 1)).toBe("6–4 6–7(5) 10–8");
    expect(scoreline(sets, 2)).toBe("4–6 7–6(5) 8–10");
  });
});
