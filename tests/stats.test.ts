import { describe, expect, it } from "vitest";
import { headToHead, playerStats } from "@/lib/tennis/stats";
import { achievements } from "@/lib/tennis/achievements";
import { M } from "./helpers";

// ana vs ben, newest last in this list (dates ascending):
const ms = [
  M("ana", "ben", [[6, 0]], { playedOn: "2026-10-01" }), // ana W 6-0
  M("ben", "ana", [[6, 4]], { playedOn: "2026-10-02" }), // ben W
  M("ana", "ben", [[3, 6], [6, 4], [7, 6]], { playedOn: "2026-10-03", sets: [{ p1: 3, p2: 6, isMatchTiebreak: false }, { p1: 6, p2: 4, isMatchTiebreak: false }, { p1: 7, p2: 6, tb1: 7, tb2: 3, isMatchTiebreak: false }] }), // ana W comeback
  M("ana", "cy", [[6, 2]], { playedOn: "2026-10-04" }), // ana W
];

describe("player stats", () => {
  const s = playerStats("ana", ms);
  it("counts the record, sets, games and tiebreaks", () => {
    expect([s.played, s.wins, s.losses]).toEqual([4, 3, 1]);
    // sets: 6-0 W, 4-6 L, 3-6 L 6-4 W 7-6 W, 6-2 W → won 4, lost 2
    expect([s.setsWon, s.setsLost]).toEqual([4, 2]);
    // games: 6+4+3+6+7+6 = 32 won; 0+6+6+4+6+2 = 24 lost
    expect([s.gamesWon, s.gamesLost]).toEqual([32, 24]);
    expect([s.tiebreaksWon, s.tiebreaksLost]).toEqual([1, 0]);
    expect(s.winPct).toBe(75);
  });
  it("tracks streaks and form, newest first", () => {
    expect(s.form).toEqual(["W", "W", "L", "W"]);
    expect(s.currentStreak).toEqual({ result: "W", length: 2 });
    expect(s.longestWinStreak).toBe(2);
  });
  it("ranks rivals by matches played", () => {
    expect(s.rivals.map((r) => [r.opponentId, r.played, r.wins, r.losses])).toEqual([["ben", 3, 2, 1], ["cy", 1, 1, 0]]);
  });
  it("earns achievements from the matches", () => {
    const a = Object.fromEntries(achievements("ana", s, ms).map((x) => [x.key, x.earned]));
    expect(a).toMatchObject({ first_win: true, double_digits: false, bagel: true, comeback: true, hot_streak: false });
  });
});

describe("head to head", () => {
  const h = headToHead("ana", "ben", ms);
  it("compares the two players on their meetings only", () => {
    expect([h.played, h.a.wins, h.b.wins]).toEqual([3, 2, 1]);
    expect(h.streak).toEqual({ playerId: "ana", length: 1 });
    expect(h.lastMeeting?.playedOn).toBe("2026-10-03");
    expect(h.firstMeeting?.playedOn).toBe("2026-10-01");
    expect(h.biggestWin.a?.playedOn).toBe("2026-10-01"); // 6-0 (+6) beats the comeback (+0)
    expect(h.byFormat).toEqual([{ format: 1, a: 1, b: 1 }, { format: 3, a: 1, b: 0 }]);
  });
});
