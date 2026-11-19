// Pickleball in the database: the same score cases as the app, singles and doubles, who may do what, the daily points
// cap, and isolation from tennis. Local Supabase only (fictional players).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import cases from "../fixtures/pickleball-scores.json";
import { anon, cleanup, db, player, record, today, type TestPlayer } from "./harness";

let a: TestPlayer, b: TestPlayer, c: TestPlayer, d: TestPlayer, admin: TestPlayer;
beforeAll(async () => { [a, b, c, d, admin] = await Promise.all([player("pa"), player("pb"), player("pc"), player("pd"), player("padm", true)]); });
afterAll(async () => { await cleanup(); await db.end(); });

const rec = (p: TestPlayer, side1: string[], side2: string[], games: number[][], o: Record<string, unknown> = {}) => p.sb.rpc("record_pickleball_match", {
  p_client_key: randomUUID(), p_discipline: side1.length === 2 ? "doubles" : "singles", p_format: "g11", p_scoring: "side_out",
  p_side1: side1, p_side2: side2, p_played_on: today(), p_games: games, ...o,
});
const respond = (p: TestPlayer, id: string, accept = true) => p.sb.rpc("respond_pickleball_match", { p_match: id, p_accept: accept });
const reset = async () => { await db`delete from public.pickleball_matches where id in (select match_id from public.pickleball_match_players where player_id in ${db([a.id, b.id, c.id, d.id])})`; await db`delete from public.rate_limits where player_id in ${db([a.id, b.id, c.id, d.id])}`; };

describe("score validation in the database matches the app (shared cases)", () => {
  for (const k of cases as { name: string; format: string; games: number[][]; winner?: number; error?: boolean }[]) {
    it(k.name, async () => {
      const r = db`select public.pickleball_validate(${k.format}, ${db.json(k.games)}) as w`;
      if (k.error) await expect(r).rejects.toThrow(/invalid_score/);
      else expect((await r)[0]!.w).toBe(k.winner);
    });
  }
});

describe("singles", () => {
  it("record → the opponent confirms → 5 points fixed for the winner; the winner is computed, not sent", async () => {
    await reset();
    const r = await rec(a, [a.id], [b.id], [[11, 8]]);
    expect(r.error).toBeNull();
    const id = r.data as string;
    expect((await respond(a, id)).error?.code).toBe("42501"); // I can't confirm my own result
    expect((await respond(b, id)).error).toBeNull();
    const [m] = await db`select status, winner_side, points_awarded from public.pickleball_matches where id = ${id}`;
    expect(m).toMatchObject({ status: "confirmed", winner_side: 1, points_awarded: 5 });
    expect((await respond(b, id)).error).toBeNull(); // answering again the same way is a no-op
  });
  it("rejects impossible scores, players not in the match, and me not playing", async () => {
    await reset();
    expect((await rec(a, [a.id], [b.id], [[11, 10]])).error?.message).toMatch(/invalid_score/);
    expect((await rec(a, [b.id], [c.id], [[11, 5]])).error?.message).toMatch(/invalid_players/);
    expect((await rec(a, [a.id], [a.id], [[11, 5]])).error?.message).toMatch(/invalid_players/);
    expect((await rec(a, [a.id], [b.id], [[11, 5]], { p_discipline: "doubles" })).error?.message).toMatch(/invalid_players/);
    const id = (await rec(a, [a.id], [b.id], [[11, 5]])).data as string;
    expect((await respond(c, id)).error?.code).toBe("42501"); // not in the match
  });
  it("the same submission twice creates one match", async () => {
    await reset();
    const key = randomUUID();
    const [x, y] = await Promise.all([rec(a, [a.id], [b.id], [[11, 5]], { p_client_key: key }), rec(a, [a.id], [b.id], [[11, 5]], { p_client_key: key })]);
    expect(x.data).toBe(y.data);
  });
});

describe("doubles", () => {
  it("four distinct players; any one opponent confirms; each winner gets the reward", async () => {
    await reset();
    expect((await rec(a, [a.id, b.id], [a.id, c.id], [[11, 9]])).error?.message).toMatch(/invalid_players/);
    expect((await rec(a, [a.id, b.id], [c.id], [[11, 9]])).error?.message).toMatch(/invalid_players/);
    const id = (await rec(a, [a.id, b.id], [c.id, d.id], [[11, 9], [8, 11], [11, 7]], { p_format: "bo3" })).data as string;
    expect((await respond(b, id)).error?.code).toBe("42501"); // my partner can't confirm for us
    expect((await respond(d, id)).error).toBeNull();
    const [m] = await db`select status, winner_side, points_awarded, sides_key from public.pickleball_matches where id = ${id}`;
    expect(m).toMatchObject({ status: "confirmed", winner_side: 1, points_awarded: 10 });
    const sides = await db`select player_id, side from public.pickleball_match_players where match_id = ${id} order by side, player_id`;
    expect(sides.map((s) => s.side)).toEqual([1, 1, 2, 2]);
  });
});

describe("points integrity", () => {
  it("only the first 3 point-earning matches per day between the same sides earn points", async () => {
    await reset();
    const pts: number[] = [];
    for (let i = 0; i < 4; i++) {
      const id = (await rec(a, [a.id], [b.id], [[11, i]])).data as string;
      await respond(b, id);
      pts.push((await db`select points_awarded from public.pickleball_matches where id = ${id}`)[0]!.points_awarded);
    }
    expect(pts).toEqual([5, 5, 5, 0]);
    // different opponent: its own allowance
    const other = (await rec(a, [a.id], [c.id], [[11, 3]])).data as string;
    await respond(c, other);
    expect((await db`select points_awarded from public.pickleball_matches where id = ${other}`)[0]!.points_awarded).toBe(5);
  });
  it("confirming two at once can't both take the last slot", async () => {
    await reset();
    for (let i = 0; i < 2; i++) { const id = (await rec(a, [a.id], [b.id], [[11, i]])).data as string; await respond(b, id); }
    const x = (await rec(a, [a.id], [b.id], [[11, 5]])).data as string, y = (await rec(a, [a.id], [b.id], [[11, 6]])).data as string;
    await Promise.all([respond(b, x), respond(b, y)]);
    const p = (await db`select points_awarded from public.pickleball_matches where id in ${db([x, y])}`).map((r) => r.points_awarded).sort();
    expect(p).toEqual([0, 5]);
  });
  it("clients can't write matches, players, games or points directly; anonymous can't read", async () => {
    expect((await a.sb.from("pickleball_matches").insert({ discipline: "singles", format: "g11", recorded_by: a.id, recorder_side: 1, winner_side: 1, sides_key: "x", played_on: today() })).error).not.toBeNull();
    expect((await a.sb.from("pickleball_matches").update({ points_awarded: 100 }).eq("recorded_by", a.id).select()).data ?? []).toEqual([]);
    expect((await a.sb.from("pickleball_games").insert({ match_id: randomUUID(), game_number: 1, side1_points: 11, side2_points: 0 })).error).not.toBeNull();
    expect((await anon().from("pickleball_matches").select("id")).data ?? []).toEqual([]);
  });
  it("only an admin can void; a voided match stays visible", async () => {
    await reset();
    const id = (await rec(a, [a.id], [b.id], [[11, 2]])).data as string;
    await respond(b, id);
    expect((await a.sb.rpc("void_pickleball_match", { p_match: id, p_reason: "test" })).error?.code).toBe("42501");
    expect((await admin.sb.rpc("void_pickleball_match", { p_match: id, p_reason: "wrong players" })).error).toBeNull();
    expect((await c.sb.from("pickleball_matches").select("status").eq("id", id).single()).data?.status).toBe("voided");
  });
});

describe("tennis is untouched", () => {
  it("a pickleball match changes no tennis rows; a tennis match changes no pickleball rows", async () => {
    await reset();
    const before = (await db`select count(*)::int as n from public.matches`)[0]!.n;
    const id = (await rec(a, [a.id], [b.id], [[11, 4]])).data as string;
    await respond(b, id);
    expect((await db`select count(*)::int as n from public.matches`)[0]!.n).toBe(before);
    const pb = (await db`select count(*)::int as n from public.pickleball_matches`)[0]!.n;
    expect((await record(a, b.id, [{ p1: 6, p2: 3 }])).error).toBeNull();
    expect((await db`select count(*)::int as n from public.pickleball_matches`)[0]!.n).toBe(pb);
  });
});

describe("challenges", () => {
  it("doubles challenge: an opponent accepts, the result must match it, and confirming completes it; my partner can't accept", async () => {
    await reset();
    await db`delete from public.pickleball_challenges where id in (select challenge_id from public.pickleball_challenge_players where player_id in ${db([a.id, b.id, c.id, d.id])})`;
    const ch = await a.sb.rpc("create_pickleball_challenge", { p_discipline: "doubles", p_format: "bo3", p_scoring: "rally", p_side1: [a.id, b.id], p_side2: [c.id, d.id] });
    expect(ch.error).toBeNull();
    expect((await a.sb.rpc("create_pickleball_challenge", { p_discipline: "doubles", p_format: "bo3", p_scoring: "rally", p_side1: [a.id, b.id], p_side2: [d.id, c.id] })).error?.message).toMatch(/challenge_open/);
    expect((await b.sb.rpc("respond_pickleball_challenge", { p_challenge: ch.data, p_action: "accept" })).error?.code).toBe("42501");
    expect((await c.sb.rpc("respond_pickleball_challenge", { p_challenge: ch.data, p_action: "accept" })).data).toBe("accepted");
    expect((await rec(a, [a.id, b.id], [c.id, d.id], [[11, 5]], { p_challenge: ch.data })).error?.message).toMatch(/invalid_challenge/); // wrong format
    const id = (await rec(a, [a.id, b.id], [c.id, d.id], [[11, 5], [11, 7]], { p_format: "bo3", p_scoring: "rally", p_challenge: ch.data })).data as string;
    await respond(c, id);
    expect((await db`select status from public.pickleball_challenges where id = ${ch.data}`)[0]!.status).toBe("completed");
  });
});

describe("review follow-ups", () => {
  const ch = (p: TestPlayer, s1: string[], s2: string[], o: Record<string, unknown> = {}) => p.sb.rpc("create_pickleball_challenge", {
    p_discipline: s1.length === 2 ? "doubles" : "singles", p_format: "g11", p_scoring: "side_out", p_side1: s1, p_side2: s2, ...o });
  const clearCh = () => db`delete from public.pickleball_challenges where id in (select challenge_id from public.pickleball_challenge_players where player_id in ${db([a.id, b.id, c.id, d.id])})`;

  it("players outside a pending match or challenge can't see it (or its players and games)", async () => {
    await reset(); await clearCh();
    const id = (await rec(a, [a.id], [b.id], [[11, 4]])).data as string;
    expect((await c.sb.from("pickleball_matches").select("id").eq("id", id)).data).toEqual([]);
    expect((await c.sb.from("pickleball_match_players").select("player_id").eq("match_id", id)).data).toEqual([]);
    expect((await c.sb.from("pickleball_games").select("game_number").eq("match_id", id)).data).toEqual([]);
    const x = await ch(a, [a.id], [b.id]);
    expect((await c.sb.from("pickleball_challenges").select("id").eq("id", x.data)).data).toEqual([]);
    expect((await b.sb.from("pickleball_challenges").select("id").eq("id", x.data)).data).toHaveLength(1);
  });
  it("internal columns aren't readable (client_key, who responded, who voided)", async () => {
    expect((await a.sb.from("pickleball_matches").select("client_key").limit(1)).error).not.toBeNull();
    expect((await a.sb.from("pickleball_matches").select("responded_by").limit(1)).error).not.toBeNull();
  });
  it("internal helpers can't be called by players; anonymous can call nothing", async () => {
    expect((await a.sb.rpc("pickleball_sides_key" as never, { p_side1: [a.id], p_side2: [b.id] } as never)).error).not.toBeNull();
    expect((await a.sb.rpc("pickleball_check_sides" as never, { p_me: a.id, p_discipline: "singles", p_side1: [a.id], p_side2: [b.id] } as never)).error).not.toBeNull();
    expect((await anon().rpc("record_pickleball_match", { p_client_key: randomUUID(), p_discipline: "singles", p_format: "g11", p_scoring: "side_out", p_side1: [a.id], p_side2: [b.id], p_played_on: today(), p_games: [[11, 0]] })).error).not.toBeNull();
  });
  it("only the recorder withdraws, only while pending; a final answer can't change", async () => {
    await reset();
    const id = (await rec(a, [a.id], [b.id], [[11, 4]])).data as string;
    expect((await b.sb.rpc("cancel_pickleball_match", { p_match: id })).error?.code).toBe("42501");
    await respond(b, id, false);
    expect((await respond(b, id, true)).error?.message).toMatch(/already_answered/);
    expect((await a.sb.rpc("cancel_pickleball_match", { p_match: id })).error?.message).toMatch(/already_answered/);
  });
  it("the daily cap: by the day results are confirmed (backdating doesn't help), separate for singles and doubles", async () => {
    await reset();
    const days = [today(), "2026-01-03", "2026-01-04"];
    for (const day of days) { const id = (await rec(a, [a.id], [b.id], [[11, 1]], { p_played_on: day })).data as string; await respond(b, id); }
    const back = (await rec(a, [a.id], [b.id], [[11, 2]], { p_played_on: "2026-01-05" })).data as string;
    await respond(b, back);
    expect((await db`select points_awarded from public.pickleball_matches where id = ${back}`)[0]!.points_awarded).toBe(0);
    const dbl = (await rec(a, [a.id, c.id], [b.id, d.id], [[11, 2]])).data as string;
    await respond(d, dbl);
    expect((await db`select points_awarded from public.pickleball_matches where id = ${dbl}`)[0]!.points_awarded).toBe(5);
  });
  it("results over a year old can't be confirmed", async () => {
    await reset();
    const [row] = await db`insert into public.pickleball_matches (discipline, format, recorded_by, recorder_side, winner_side, sides_key, played_on)
      values ('singles', 'g11', ${a.id}, 1, 1, 'old', current_date - 400) returning id`;
    const id = row!.id as string;
    await db`insert into public.pickleball_match_players values (${id}, ${a.id}, 1), (${id}, ${b.id}, 2)`;
    expect((await respond(b, id)).error?.message).toMatch(/too_old_to_confirm/);
  });
  it("challenges: a rally challenge needs a rally result; either side can call off an accepted one; my partner can't withdraw a pending one", async () => {
    await reset(); await clearCh();
    const x = (await ch(a, [a.id, b.id], [c.id, d.id], { p_scoring: "rally" })).data as string;
    expect((await b.sb.rpc("respond_pickleball_challenge", { p_challenge: x, p_action: "cancel" })).error?.code).toBe("42501");
    await d.sb.rpc("respond_pickleball_challenge", { p_challenge: x, p_action: "accept" });
    expect((await rec(a, [a.id, b.id], [c.id, d.id], [[11, 5]], { p_challenge: x })).error?.message).toMatch(/invalid_challenge/); // side-out ≠ rally
    expect((await c.sb.rpc("respond_pickleball_challenge", { p_challenge: x, p_action: "cancel" })).data).toBe("canceled");
  });
});
