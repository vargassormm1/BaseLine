import { describe, expect, it } from "vitest";
import cases from "./fixtures/pickleball-scores.json";
import { gameState, pbPointsFor, validateMatch, type PbFormat } from "@/lib/pickleball/rules";

describe("pickleball match validation (shared cases with the database)", () => {
  for (const c of cases as unknown as { name: string; format: string; games: [number, number][]; winner?: 1 | 2; error?: boolean }[]) {
    it(c.name, () => {
      const r = validateMatch(c.format as PbFormat, c.games);
      if (c.error) expect(r.ok).toBe(false);
      else expect(r).toMatchObject({ ok: true, winner: c.winner });
    });
  }
});

describe("live game feedback", () => {
  it("in progress, won, or impossible", () => {
    expect(gameState(8, 5, 11)).toEqual({ kind: "in_progress" });
    expect(gameState(10, 10, 11)).toEqual({ kind: "in_progress" });
    expect(gameState(11, 10, 11)).toMatchObject({ kind: "invalid" });
    expect(gameState(11, 11, 11)).toMatchObject({ kind: "invalid" });
    expect(gameState(14, 12, 11)).toEqual({ kind: "done", winner: 1 });
    expect(gameState(1.5, 3, 11)).toMatchObject({ kind: "invalid" });
    expect(gameState(null, 3, 11)).toEqual({ kind: "empty" });
  });
});

describe("Baseline points (to each winner)", () => {
  it("5 / 10 / 10 / 10 / 20, and 0 after 3 point-earning matches between the same sides that day", () => {
    expect([pbPointsFor("g11", 0), pbPointsFor("g15", 0), pbPointsFor("g21", 0), pbPointsFor("bo3", 0), pbPointsFor("bo5", 0)]).toEqual([5, 10, 10, 10, 20]);
    expect(pbPointsFor("g11", 2)).toBe(5);
    expect(pbPointsFor("g11", 3)).toBe(0);
  });
});
