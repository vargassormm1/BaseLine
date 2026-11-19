import { describe, expect, it } from "vitest";
import { equivalentPath, sportOfPath } from "@/lib/sports";

describe("sport routing", () => {
  it("knows which sport a screen belongs to", () => {
    expect(sportOfPath("/rankings")).toBe("tennis");
    expect(sportOfPath("/home")).toBe("tennis");
    expect(sportOfPath("/pickleball")).toBe("pickleball");
    expect(sportOfPath("/pickleball/rankings")).toBe("pickleball");
    expect(sportOfPath("/players/ana")).toBeNull();
    expect(sportOfPath("/settings")).toBeNull();
  });
  it("switching keeps you on the same screen", () => {
    expect(equivalentPath("/rankings", "pickleball")).toBe("/pickleball/rankings");
    expect(equivalentPath("/pickleball/matches", "tennis")).toBe("/matches");
    expect(equivalentPath("/pickleball", "tennis")).toBe("/home");
    expect(equivalentPath("/home", "pickleball")).toBe("/pickleball");
    expect(equivalentPath("/players/ana", "pickleball")).toBe("/players/ana?sport=pickleball");
  });
});
