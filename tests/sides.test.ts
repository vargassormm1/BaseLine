import { describe, expect, it } from "vitest";
import { doublesOpponents, pairKey, partnerships, playerSideStats, sideStandings, singlesH2H, streaks, teamH2H, topPartnerships, type SideMatch } from "@/lib/sides/standings";
import type { Player } from "@/lib/tennis/types";

const P = (id: string): Player => ({ id, username: id, firstName: id, lastName: "", avatarUrl: null });
const players = ["alex", "chris", "jordan", "sam"].map(P);
let n = 0;
const m = (side1: string[], side2: string[], winnerSide: 1 | 2, o: Partial<SideMatch> = {}): SideMatch => {
  n++;
  const day = `2026-10-${String(n).padStart(2, "0")}`;
  return { id: `m${n}`, status: "confirmed", playedOn: day, createdAt: `${day}T12:00:00Z`, confirmedAt: `${day}T13:00:00Z`, winnerSide, points: 10, side1, side2, ...o };
};

describe("tennis doubles from the example: Alex + Chris beat Jordan + Sam", () => {
  // the same pairs, entered in different orders and on different sides
  const ms = [
    m(["alex", "chris"], ["jordan", "sam"], 1),
    m(["sam", "jordan"], ["chris", "alex"], 2),
    m(["chris", "alex"], ["sam", "jordan"], 2),
    m(["alex", "chris"], ["jordan", "sam"], 1),
    m(["alex", "jordan"], ["chris", "sam"], 1, { points: 5 }),
    m(["alex", "chris"], ["jordan", "sam"], 1, { status: "pending", points: null }), // never counts
  ];
  it("individual board: every winner earns the points, partners switch freely", () => {
    const b = sideStandings(players, ms, { today: "2026-11-30" });
    expect(b.map((r) => [r.player.id, r.points, r.wins, r.losses])).toEqual([["alex", 35, 4, 1], ["chris", 30, 3, 2], ["jordan", 15, 2, 3], ["sam", 10, 1, 4]]);
  });
  it("a partnership is the same pair in any order; records and streaks", () => {
    expect(pairKey(["chris", "alex"])).toBe(pairKey(["alex", "chris"]));
    const ac = partnerships(ms).find((p) => p.pair.join() === "alex,chris")!;
    expect(ac).toMatchObject({ played: 4, wins: 3, losses: 1, winPct: 75, streak: { current: 1, longest: 2 } }); // W W L W
    expect(topPartnerships(ms, 3).map((p) => p.pair.join())).toEqual(["alex,chris", "jordan,sam"]); // 1-match pairs need more matches
  });
  it("partner records and best partner (3+ matches together)", () => {
    const s = playerSideStats(ms, "alex");
    expect(s.record).toMatchObject({ wins: 4, losses: 1 });
    expect(s.partners.map((p) => [p.playerId, p.wins, p.losses])).toEqual([["chris", 3, 1], ["jordan", 1, 0]]);
    expect(s.bestPartner?.playerId).toBe("chris");
  });
  it("team vs team in any order; doubles opponents count each match once; never a singles rivalry", () => {
    expect(teamH2H(ms, ["chris", "alex"], ["sam", "jordan"])).toMatchObject({ aWins: 3, bWins: 1 });
    expect(doublesOpponents(ms, "alex", "jordan")).toMatchObject({ aWins: 3, bWins: 1 }); // the 5th match they were partners
    expect(doublesOpponents(ms, "alex", "jordan").matches).toHaveLength(4);
    expect(singlesH2H(ms, "alex", "jordan").matches).toHaveLength(0);
  });
  it("streaks", () => {
    expect(streaks([true, true, false, true, true, true])).toEqual({ current: 3, longest: 3 });
    expect(streaks([true, false])).toEqual({ current: 0, longest: 1 });
  });
});
