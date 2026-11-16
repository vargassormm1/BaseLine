import { describe, expect, it } from "vitest";
import { standings } from "@/lib/tennis/standings";
import { M, P } from "./helpers";

const players = ["ana", "ben", "cy", "dee"].map(P);
// Hand-worked: ana beats ben (Bo3, 10), ana beats cy (Bo1, 5), ben beats cy (Bo1, 5), cy beats ben (Bo1, 5).
// ana 15 pts 2-0 · ben 5 pts 1-2 · cy 5 pts 1-2 · dee no matches.
const matches = [
  M("ana", "ben", [[6, 4], [6, 4]], { playedOn: "2026-11-02" }),
  M("ana", "cy", [[6, 1]], { playedOn: "2026-11-03" }),
  M("ben", "cy", [[6, 3]], { playedOn: "2026-11-04" }),
  M("cy", "ben", [[6, 2]], { playedOn: "2026-11-05" }),
];

describe("standings", () => {
  const rows = standings(players, matches, [], { today: "2026-11-16" });
  it("orders by points, then wins, then win %; equal records share a rank", () => {
    expect(rows.map((r) => [r.player.id, r.rank, r.points, r.wins, r.losses])).toEqual([
      ["ana", 1, 15, 2, 0], ["ben", 2, 5, 1, 2], ["cy", 2, 5, 1, 2], ["dee", null, 0, 0, 0],
    ]);
    expect(rows[1]!.winPct).toBe(33.3);
  });
  it("shows recent form, newest first", () => {
    expect(rows.find((r) => r.player.id === "ben")!.form).toEqual(["L", "W", "L"]);
  });
  it("ignores pending, rejected, canceled and voided results", () => {
    const extra = ["pending", "rejected", "canceled", "voided"].map((status) => M("dee", "ana", [[6, 0]], { status: status as never, confirmedAt: status === "voided" ? "2026-11-06T00:00:00Z" : null }));
    expect(standings(players, [...matches, ...extra], [], { today: "2026-11-16" }).find((r) => r.player.id === "dee")!.points).toBe(0);
  });
  it("season view counts only that year's matches and no carry-over", () => {
    const old = M("dee", "ana", [[6, 0]], { playedOn: "2025-06-01" });
    const adj = [{ playerId: "dee", points: 15, wins: 1, losses: 0, reason: "V1" }];
    const season = standings(players, [...matches, old], adj, { today: "2026-11-16", season: 2026 });
    expect(season.find((r) => r.player.id === "dee")!.rank).toBeNull();
    const all = standings(players, [...matches, old], adj, { today: "2026-11-16" });
    expect(all.find((r) => r.player.id === "dee")).toMatchObject({ points: 20, wins: 2, losses: 0 });
  });
  it("movement compares with the table as it was 7 days ago", () => {
    // a week ago only ana–ben counted (confirmed Nov 2): ana 1st, ben 2nd. Since then cy has played; ben stays 2nd (tied).
    const recent = matches.map((m, i) => ({ ...m, confirmedAt: i === 0 ? "2026-11-02T13:00:00Z" : "2026-11-12T13:00:00Z" }));
    const r = standings(players, recent, [], { today: "2026-11-16" });
    expect(r.find((x) => x.player.id === "ana")!.movement).toBe(0);
    expect(r.find((x) => x.player.id === "ben")!.movement).toBe(0);
    expect(r.find((x) => x.player.id === "cy")!.movement).toBeNull(); // new to the table
  });
});
