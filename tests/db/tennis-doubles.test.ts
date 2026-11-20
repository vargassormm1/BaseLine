// Tennis doubles in the database: shared score cases, recording/confirming, points to each winner, isolation from
// singles and pickleball, permissions, challenges. Local Supabase only (fictional players).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import cases from "../fixtures/tennis-doubles-scores.json";
import { anon, cleanup, db, player, record, today, type TestPlayer } from "./harness";

let a: TestPlayer, b: TestPlayer, c: TestPlayer, d: TestPlayer, admin: TestPlayer;
beforeAll(async () => { [a, b, c, d, admin] = await Promise.all([player("da"), player("db"), player("dc"), player("dd"), player("dadm", true)]); });
afterAll(async () => { await cleanup(); await db.end(); });

const rec = (p: TestPlayer, side1: string[], side2: string[], sets: (number | null)[][], o: Record<string, unknown> = {}) => p.sb.rpc("record_tennis_doubles", {
  p_client_key: randomUUID(), p_format: "std", p_short_tie_at: null, p_no_ad: false, p_side1: side1, p_side2: side2, p_played_on: today(), p_sets: sets, ...o,
} as never);
const respond = (p: TestPlayer, id: string, accept = true) => p.sb.rpc("respond_tennis_doubles", { p_match: id, p_accept: accept });
const reset = async () => {
  await db`delete from public.tennis_doubles_matches where id in (select match_id from public.tennis_doubles_players where player_id in ${db([a.id, b.id, c.id, d.id])})`;
  await db`delete from public.rate_limits where player_id in ${db([a.id, b.id, c.id, d.id])}`;
};

describe("score validation in the database matches the app (shared cases)", () => {
  for (const k of cases as unknown as { name: string; format: string; tbAt?: number; sets: number[][]; winner?: number; error?: boolean }[]) {
    it(k.name, async () => {
      const tie = k.format === "short1" || k.format === "short3" ? (k.tbAt ?? 4) : null;
      const r = db`select public.tennis_doubles_validate(${k.format}, ${tie}::smallint, ${db.json(k.sets)}) as w`;
      if (k.error) await expect(r).rejects.toThrow(/invalid_score/);
      else expect((await r)[0]!.w).toBe(k.winner);
    });
  }
});

describe("recording and confirming", () => {
  it("one match, four players; either opponent confirms; each winner gets 10 for standard doubles", async () => {
    await reset();
    const r = await rec(a, [a.id, c.id], [b.id, d.id], [[6, 4], [4, 6], [10, 7]]);
    expect(r.error).toBeNull();
    const id = r.data as string;
    expect((await respond(c, id)).error?.code).toBe("42501"); // my partner can't confirm for us
    expect((await respond(a, id)).error?.code).toBe("42501");
    expect((await respond(d, id)).error).toBeNull();
    expect((await respond(b, id)).error).toBeNull(); // already confirmed: a no-op, not a second award
    const [m] = await db`select status, winner_side, points_awarded from public.tennis_doubles_matches where id = ${id}`;
    expect(m).toMatchObject({ status: "confirmed", winner_side: 1, points_awarded: 10 });
    expect((await db`select count(*)::int as n from public.tennis_doubles_players where match_id = ${id}`)[0]!.n).toBe(4);
    const sets = await db`select set_number, side1_games, side2_games, is_match_tiebreak from public.tennis_doubles_sets where match_id = ${id} order by set_number`;
    expect(sets.map((s) => [s.side1_games, s.side2_games, s.is_match_tiebreak])).toEqual([[6, 4, false], [4, 6, false], [10, 7, true]]);
  });
  it("rejects bad teams and impossible scores; the winner is computed, never sent", async () => {
    await reset();
    expect((await rec(a, [a.id, c.id], [c.id, d.id], [[6, 4], [6, 4]])).error?.message).toMatch(/invalid_players/);
    expect((await rec(a, [a.id], [b.id], [[6, 4], [6, 4]])).error?.message).toMatch(/invalid_players/);
    expect((await rec(a, [b.id, c.id], [a.id, d.id], [[6, 4], [6, 4]])).error?.message).toMatch(/invalid_players/); // I must be on side 1
    expect((await rec(a, [a.id, c.id], [b.id, d.id], [[6, 5], [6, 4]])).error?.message).toMatch(/invalid_score/);
    expect((await rec(a, [a.id, c.id], [b.id, d.id], [[4, 2]], { p_format: "short1", p_short_tie_at: null })).error?.message).toMatch(/invalid_score/);
    expect((await rec(a, [a.id, c.id], [b.id, d.id], [[4, 3]], { p_format: "short1", p_short_tie_at: 3 })).error).toBeNull();
  });
  it("the same submission twice is one match; only the recorder withdraws; only admins void", async () => {
    await reset();
    const key = randomUUID();
    const [x, y] = await Promise.all([rec(a, [a.id, c.id], [b.id, d.id], [[6, 1]], { p_client_key: key, p_format: "one_set" }), rec(a, [a.id, c.id], [b.id, d.id], [[6, 1]], { p_client_key: key, p_format: "one_set" })]);
    expect(x.data).toBe(y.data);
    expect((await c.sb.rpc("cancel_tennis_doubles", { p_match: x.data as string })).error?.code).toBe("42501");
    await respond(b, x.data as string);
    expect((await a.sb.rpc("void_tennis_doubles", { p_match: x.data as string, p_reason: "test" })).error?.code).toBe("42501");
    expect((await admin.sb.rpc("void_tennis_doubles", { p_match: x.data as string, p_reason: "wrong team" })).error).toBeNull();
  });
});

describe("isolation and access", () => {
  it("doubles never touches singles or pickleball rows; singles never touches doubles", async () => {
    await reset();
    const [s0] = await db`select count(*)::int as n, coalesce(sum(points_awarded), 0)::int as p from public.matches`;
    const [p0] = await db`select count(*)::int as n from public.pickleball_matches`;
    const id = (await rec(a, [a.id, c.id], [b.id, d.id], [[6, 2], [6, 3]], { p_format: "bo3" })).data as string;
    await respond(b, id);
    expect(await db`select count(*)::int as n, coalesce(sum(points_awarded), 0)::int as p from public.matches`).toEqual([s0]);
    expect(await db`select count(*)::int as n from public.pickleball_matches`).toEqual([p0]);
    const [d0] = await db`select count(*)::int as n from public.tennis_doubles_matches`;
    expect((await record(a, b.id, [{ p1: 6, p2: 3 }])).error).toBeNull();
    expect(await db`select count(*)::int as n from public.tennis_doubles_matches`).toEqual([d0]);
  });
  it("no direct writes; internal columns hidden; pending results private to the four; anonymous sees nothing", async () => {
    await reset();
    const id = (await rec(a, [a.id, c.id], [b.id, d.id], [[6, 2], [6, 3]], { p_format: "bo3" })).data as string;
    expect((await a.sb.from("tennis_doubles_matches").update({ points_awarded: 100 }).eq("id", id).select()).data ?? []).toEqual([]);
    expect((await a.sb.from("tennis_doubles_sets").insert({ match_id: id, set_number: 3, side1_games: 6, side2_games: 0 })).error).not.toBeNull();
    expect((await a.sb.from("tennis_doubles_matches").select("client_key").limit(1)).error).not.toBeNull();
    expect((await admin.sb.from("tennis_doubles_matches").select("id").eq("id", id)).data).toEqual([]); // not in it, still pending
    expect((await d.sb.from("tennis_doubles_matches").select("id").eq("id", id)).data).toHaveLength(1);
    expect((await anon().from("tennis_doubles_matches").select("id")).data ?? []).toEqual([]);
  });
});

describe("challenges", () => {
  it("one open per pair of teams; the challenged team accepts; the result must match; confirming completes it", async () => {
    await reset();
    await db`delete from public.tennis_doubles_challenges where id in (select challenge_id from public.tennis_doubles_challenge_players where player_id in ${db([a.id, b.id, c.id, d.id])})`;
    const make = (p: TestPlayer, s1: string[], s2: string[]) => p.sb.rpc("create_tennis_doubles_challenge", { p_format: "std", p_short_tie_at: null, p_no_ad: true, p_side1: s1, p_side2: s2 } as never);
    const ch = await make(a, [a.id, c.id], [b.id, d.id]);
    expect(ch.error).toBeNull();
    expect((await make(b, [b.id, d.id], [c.id, a.id])).error?.message).toMatch(/challenge_open/); // same teams, either order
    expect((await c.sb.rpc("respond_tennis_doubles_challenge", { p_challenge: ch.data as string, p_action: "accept" })).error?.code).toBe("42501");
    expect((await b.sb.rpc("respond_tennis_doubles_challenge", { p_challenge: ch.data as string, p_action: "accept" })).data).toBe("accepted");
    expect((await rec(a, [a.id, c.id], [b.id, d.id], [[6, 2]], { p_format: "one_set", p_challenge: ch.data })).error?.message).toMatch(/invalid_challenge/);
    const id = (await rec(a, [a.id, c.id], [b.id, d.id], [[6, 2], [6, 3]], { p_challenge: ch.data })).data as string;
    await respond(d, id);
    expect((await db`select status from public.tennis_doubles_challenges where id = ${ch.data as string}`)[0]!.status).toBe("completed");
  });
});
