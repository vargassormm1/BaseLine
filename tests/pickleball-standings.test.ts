import { describe, expect, it } from "vitest";
import { pbDoublesOpponents, pbPlayerStats, pbScoreLine, pbSinglesH2H, pbStandings, pbTeamH2H, type PbMatch } from "@/lib/pickleball/standings";
import type { Player } from "@/lib/tennis/types";

const P = (id: string): Player => ({ id, username: id, firstName: id, lastName: "", avatarUrl: null });
const players = ["alex", "jordan", "chris", "sam"].map(P);
let n = 0;
const m = (o: Partial<PbMatch> & Pick<PbMatch, "side1" | "side2" | "winnerSide">): PbMatch => ({
  id: `m${++n}`, discipline: o.side1.length === 2 ? "doubles" : "singles", format: "g11", scoring: "side_out", status: "confirmed",
  playedOn: `2026-11-${String(10 + n).padStart(2, "0")}`, createdAt: `2026-11-${String(10 + n).padStart(2, "0")}T12:00:00Z`, confirmedAt: `2026-11-${String(10 + n).padStart(2, "0")}T13:00:00Z`,
  recordedBy: o.side1[0]!, recorderSide: 1, points: 5, games: [[11, 8]], sidesKey: "k", note: null, challengeId: null, ...o,
});
const TODAY = "2026-11-30";

describe("pickleball boards", () => {
  const ms = [
    m({ side1: ["alex"], side2: ["jordan"], winnerSide: 1 }),                                    // alex +5
    m({ side1: ["alex"], side2: ["jordan"], winnerSide: 2, format: "bo3", points: 10, games: [[11, 8], [9, 11], [6, 11]] }), // jordan +10
    m({ side1: ["alex", "chris"], side2: ["jordan", "sam"], winnerSide: 1, points: 10 }),        // alex, chris +10 (doubles)
    m({ side1: ["alex"], side2: ["sam"], winnerSide: 1, status: "pending", points: null }),     // pending: never counts
    m({ side1: ["sam"], side2: ["chris"], winnerSide: 1, status: "voided" }),                   // voided: never counts
  ];
  it("singles board counts only singles", () => {
    const b = pbStandings(players, ms, "singles", { today: TODAY });
    expect(b.filter((r) => r.rank !== null).map((r) => [r.player.id, r.rank, r.points, r.wins, r.losses])).toEqual([["jordan", 1, 10, 1, 1], ["alex", 2, 5, 1, 1]]);
  });
  it("doubles board counts only doubles; every winner gets the reward", () => {
    const b = pbStandings(players, ms, "doubles", { today: TODAY });
    expect(b.filter((r) => r.rank !== null).map((r) => [r.player.id, r.points, r.wins, r.losses])).toEqual([["alex", 10, 1, 0], ["chris", 10, 1, 0], ["jordan", 0, 0, 1], ["sam", 0, 0, 1]]);
  });
  it("profile keeps singles and doubles apart; partners from doubles", () => {
    const s = pbPlayerStats(ms, "alex");
    expect(s.singles).toMatchObject({ wins: 1, losses: 1, points: 5 });
    expect(s.doubles).toMatchObject({ wins: 1, losses: 0, points: 10 });
    expect(s.partners).toEqual([{ playerId: "chris", played: 1, wins: 1 }]);
  });
  it("head-to-head: singles never includes doubles; team vs team; doubles-opponent history labelled separately", () => {
    expect(pbSinglesH2H(ms, "alex", "jordan")).toMatchObject({ aWins: 1, bWins: 1 });
    expect(pbTeamH2H(ms, ["chris", "alex"], ["sam", "jordan"])).toMatchObject({ aWins: 1, bWins: 0 });
    expect(pbDoublesOpponents(ms, "alex", "jordan")).toMatchObject({ aWins: 1, bWins: 0 });
    expect(pbDoublesOpponents(ms, "alex", "chris").matches).toHaveLength(0); // partners, not opponents
  });
  it("score line from either side", () => {
    expect(pbScoreLine(ms[1]!)).toBe("11–8, 9–11, 6–11");
    expect(pbScoreLine(ms[1]!, 2)).toBe("8–11, 11–9, 11–6");
  });
});
