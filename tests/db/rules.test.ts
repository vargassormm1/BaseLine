import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import vectors from "../fixtures/scores.json";
import { anon, as, cleanup, db, invite, player, record, today, type TestPlayer } from "./harness";

let a: TestPlayer, b: TestPlayer, c: TestPlayer, admin: TestPlayer;
beforeAll(async () => { [a, b, c, admin] = await Promise.all([player("ana"), player("ben"), player("cy"), player("adm", true)]); });
afterAll(async () => { await cleanup(); await db.end(); });
// every test starts with fresh rate limits (the rate-limit test sets its own)
beforeEach(async () => { await db`delete from public.rate_limits where player_id in ${db([a, b, c, admin].filter(Boolean).map((p) => p.id))}`; });

describe("score validation in the database matches the app (shared vectors)", () => {
  for (const v of vectors) {
    it(v.name, async () => {
      const r = await a.sb.rpc("validate_sets", { p_format: v.format, p_deciding: v.deciding, p_sets: v.sets });
      if (v.winner === null) expect(r.error?.message ?? "").toMatch(/invalid_score/);
      else expect(r.data).toBe(v.winner);
    });
  }
});

describe("visibility (row level security)", () => {
  it("anonymous visitors see nothing", async () => {
    const s = anon();
    for (const t of ["players", "matches", "match_sets", "challenges", "standing_adjustments", "player_private"]) {
      const { data, error } = await s.from(t).select("*").limit(1);
      expect(error !== null || (data ?? []).length === 0, t).toBe(true);
    }
    expect((await s.rpc("record_match", {})).error).not.toBeNull();
  });
  it("players see public profiles but never Clerk ids, V1 ids or other players' emails", async () => {
    expect((await a.sb.from("players").select("id,username").eq("id", b.id)).data).toHaveLength(1);
    expect((await a.sb.from("players").select("clerk_user_id")).error).not.toBeNull();
    expect((await a.sb.from("players").select("legacy_user_id")).error).not.toBeNull();
    const priv = (await a.sb.from("player_private").select("player_id,email")).data ?? [];
    expect(priv.map((r) => r.player_id)).toEqual([a.id]);
  });
  it("a pending match is visible to its two players only; confirmed matches to everyone", async () => {
    const { data: id } = await record(a, b.id, [{ p1: 6, p2: 3 }]);
    expect((await b.sb.from("matches").select("id").eq("id", id)).data).toHaveLength(1);
    expect((await c.sb.from("matches").select("id").eq("id", id)).data).toHaveLength(0);
    expect((await c.sb.from("match_sets").select("match_id").eq("match_id", id)).data).toHaveLength(0);
    await b.sb.rpc("respond_match", { p_match: id, p_accept: true });
    expect((await c.sb.from("matches").select("id,status").eq("id", id)).data).toEqual([{ id, status: "confirmed" }]);
    expect((await c.sb.from("match_sets").select("p1_games").eq("match_id", id)).data).toEqual([{ p1_games: 6 }]);
  });
  it("nobody can write to tables directly", async () => {
    expect((await a.sb.from("matches").insert({ format: 1, player_one: a.id, player_two: b.id, winner_id: a.id, played_on: today(), points_awarded: 99 })).error).not.toBeNull();
    expect((await a.sb.from("players").update({ username: "hacked" }).eq("id", b.id)).error).not.toBeNull();
    expect((await a.sb.from("standing_adjustments").insert({ player_id: a.id, points: 1000, source: "admin", reason: "x" })).error).not.toBeNull();
    const before = await db`select count(*)::int n from public.matches`;
    await a.sb.from("matches").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    expect((await db`select count(*)::int n from public.matches`)[0]!.n).toBe(before[0]!.n);
  });
  it("the V1 copy is not reachable through the API", async () => {
    expect((await a.sb.schema("legacy" as never).from("User").select("*")).error).not.toBeNull();
  });
});

describe("recording and confirming matches", () => {
  it("rejects bad input: yourself, unknown opponent, future or very old dates, invalid scores, long notes", async () => {
    expect((await record(a, a.id, [{ p1: 6, p2: 3 }])).error?.message).toMatch(/invalid_opponent/);
    expect((await record(a, randomUUID(), [{ p1: 6, p2: 3 }])).error?.message).toMatch(/invalid_opponent/);
    expect((await record(a, b.id, [{ p1: 6, p2: 3 }], { p_played_on: "2099-01-01" })).error?.message).toMatch(/invalid_date/);
    expect((await record(a, b.id, [{ p1: 6, p2: 3 }], { p_played_on: "2020-01-01" })).error?.message).toMatch(/invalid_date/);
    expect((await record(a, b.id, [{ p1: 6, p2: 5 }])).error?.message).toMatch(/invalid_score/);
    expect((await record(a, b.id, [{ p1: 6, p2: 3 }], { p_note: "x".repeat(141) })).error?.message).toMatch(/invalid_note/);
  });
  it("the server decides the winner and the points (5 / 10 / 20)", async () => {
    const { data: id } = await record(a, b.id, [{ p1: 3, p2: 6 }, { p1: 4, p2: 6 }]);
    const [m] = await db`select winner_id, points_awarded, status from public.matches where id = ${id}`;
    expect(m).toEqual({ winner_id: b.id, points_awarded: 10, status: "pending" });
  });
  it("a retried submission (same client key) creates one match", async () => {
    const key = randomUUID();
    const [r1, r2] = await Promise.all([record(a, b.id, [{ p1: 6, p2: 1 }], { p_client_key: key }), record(a, b.id, [{ p1: 6, p2: 1 }], { p_client_key: key })]);
    expect((await db`select count(*)::int n from public.matches where client_key = ${key}`)[0]!.n).toBe(1);
    expect([r1.error, r2.error]).toEqual([null, null]);
    expect(r1.data).toBe(r2.data);
  });
  it("only the opponent can confirm; confirming twice, or concurrently, counts once", async () => {
    const { data: id } = await record(a, b.id, [{ p1: 6, p2: 2 }]);
    expect((await a.sb.rpc("respond_match", { p_match: id, p_accept: true })).error?.code).toBe("42501");
    expect((await c.sb.rpc("respond_match", { p_match: id, p_accept: true })).error?.code).toBe("42501");
    const rs = await Promise.all([1, 2, 3].map(() => b.sb.rpc("respond_match", { p_match: id, p_accept: true })));
    expect(rs.every((r) => r.error === null)).toBe(true);
    const [m] = await db`select status, confirmed_at is not null as c from public.matches where id = ${id}`;
    expect(m).toEqual({ status: "confirmed", c: true });
    expect((await b.sb.rpc("respond_match", { p_match: id, p_accept: false })).error?.message).toMatch(/already_answered/);
  });
  it("the recorder can withdraw a pending match, not a confirmed one", async () => {
    const { data: id } = await record(a, b.id, [{ p1: 6, p2: 2 }]);
    expect((await b.sb.rpc("cancel_match", { p_match: id })).error?.code).toBe("42501");
    expect((await a.sb.rpc("cancel_match", { p_match: id })).error).toBeNull();
    expect((await b.sb.rpc("respond_match", { p_match: id, p_accept: true })).error?.message).toMatch(/already_answered/);
  });
  it("only an admin can void a confirmed match, with a reason; it is kept, marked void", async () => {
    const { data: id } = await record(a, b.id, [{ p1: 6, p2: 2 }]);
    await b.sb.rpc("respond_match", { p_match: id, p_accept: true });
    expect((await a.sb.rpc("void_match", { p_match: id, p_reason: "wrong score" })).error?.code).toBe("42501");
    expect((await admin.sb.rpc("void_match", { p_match: id, p_reason: "x" })).error?.message).toMatch(/invalid_reason/);
    expect((await admin.sb.rpc("void_match", { p_match: id, p_reason: "Entered twice" })).error).toBeNull();
    const [m] = await db`select status, void_reason from public.matches where id = ${id}`;
    expect(m).toEqual({ status: "voided", void_reason: "Entered twice" });
  });
});

describe("challenges", () => {
  it("challenge → accept → record → confirm completes the challenge", async () => {
    const { data: ch, error } = await a.sb.rpc("create_challenge", { p_opponent: c.id, p_format: 3, p_message: "Saturday?", p_proposed_for: null });
    expect(error).toBeNull();
    expect((await a.sb.rpc("create_challenge", { p_opponent: c.id, p_format: 1 })).error?.message).toMatch(/challenge_already_open/);
    expect((await c.sb.rpc("create_challenge", { p_opponent: a.id, p_format: 1 })).error?.message).toMatch(/challenge_already_open/);
    expect((await b.sb.from("challenges").select("id").eq("id", ch)).data).toHaveLength(0); // not theirs
    expect((await a.sb.rpc("respond_challenge", { p_challenge: ch, p_accept: true })).error?.code).toBe("42501");
    expect((await c.sb.rpc("respond_challenge", { p_challenge: ch, p_accept: true })).error).toBeNull();
    expect((await record(c, a.id, [{ p1: 6, p2: 4 }], { p_challenge: ch })).error?.message).toMatch(/invalid_challenge/); // wrong format
    const { data: m } = await record(c, a.id, [{ p1: 6, p2: 4 }, { p1: 6, p2: 4 }], { p_challenge: ch });
    expect((await c.sb.rpc("cancel_challenge", { p_challenge: ch })).error?.message).toMatch(/challenge_has_pending_result/);
    await a.sb.rpc("respond_match", { p_match: m, p_accept: true });
    expect((await db`select status from public.challenges where id = ${ch}`)[0]!.status).toBe("completed");
  });
  it("an expired challenge can't be accepted and doesn't block a new one", async () => {
    const { data: ch } = await b.sb.rpc("create_challenge", { p_opponent: c.id, p_format: 1 });
    await db`update public.challenges set expires_at = now() - interval '1 minute' where id = ${ch}`;
    const r = await c.sb.rpc("respond_challenge", { p_challenge: ch, p_accept: true });
    expect([r.error, r.data]).toEqual([null, "expired"]);
    expect((await db`select status from public.challenges where id = ${ch}`)[0]!.status).toBe("expired"); // stays expired
    expect((await b.sb.rpc("create_challenge", { p_opponent: c.id, p_format: 1 })).error).toBeNull();
  });
});

describe("profiles and limits", () => {
  it("usernames are unique (case-insensitive) and validated", async () => {
    expect((await a.sb.rpc("update_profile", { p_username: b.username.toUpperCase(), p_first_name: "A", p_last_name: "B" })).error?.message).toMatch(/username_taken/);
    expect((await a.sb.rpc("update_profile", { p_username: "a b<script>", p_first_name: "A", p_last_name: "B" })).error?.message).toMatch(/invalid_username/);
  });
  it("signing in again keeps the same player (identity is the Clerk user id)", async () => {
    const { data } = await a.sb.rpc("ensure_player", { p_username: "different", p_first_name: "x", p_last_name: "y", p_avatar_url: "https://evil.example/x.png", p_email: null });
    expect(data).toBe(a.id);
    const [p] = await db`select username, avatar_url from public.players where id = ${a.id}`;
    expect(p!.username).toBe(a.username);
    expect(p!.avatar_url).toBeNull(); // only Clerk image hosts are accepted
  });
  it("recording is rate limited", async () => {
    await db`insert into public.rate_limits (player_id, bucket, window_start, hits) values (${c.id}, 'record_match', now(), 20)
             on conflict (player_id, bucket) do update set hits = 20, window_start = now()`;
    expect((await record(c, b.id, [{ p1: 6, p2: 2 }])).error?.message).toMatch(/rate_limited/);
  });
});

describe("hardening (independent review)", () => {
  it("tokens from an untrusted issuer (e.g. Supabase's own sign-up) are never a player", async () => {
    const evil = as(a.sub, "http://127.0.0.1:55321/auth/v1");
    expect((await evil.rpc("me")).data).toBeNull();
    expect((await evil.from("players").select("id")).data).toEqual([]);
    expect((await evil.rpc("record_match", { p_client_key: randomUUID(), p_opponent: b.id, p_format: 1, p_deciding: "set", p_played_on: today(), p_sets: [{ p1: 6, p2: 0 }] })).error?.code).toBe("42501");
    expect((await evil.rpc("ensure_player", { p_username: "intruder", p_first_name: "", p_last_name: "", p_avatar_url: "", p_email: "", p_invite: await invite() })).error?.code).toBe("42501");
  });
  it("internal helpers can't be called by anyone through the API", async () => {
    const rows = await db`select p.proname, has_function_privilege('anon', p.oid, 'execute') a, has_function_privilege('authenticated', p.oid, 'execute') u
                          from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                          where n.nspname = 'public' and p.proname in ('take_rate_limit', 'expire_challenges', 'require_me', 'jwt_sub')`;
    expect(rows.length).toBe(4);
    for (const r of rows) expect([r.proname, r.a, r.u]).toEqual([r.proname, false, false]);
    expect((await a.sb.rpc("take_rate_limit", { p_player: b.id, p_bucket: "record_match", p_max: 1, p_window: "100 years" })).error).not.toBeNull();
    // and nothing in public is executable by anon except what's explicitly granted (none)
    const anonExec = await db`select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                              where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')`;
    expect(anonExec.map((r) => r.proname)).toEqual([]);
  });
  it("new players need a valid, unused invite; existing players never do", async () => {
    const stranger = as("user_test_stranger_" + randomUUID().slice(0, 6));
    const args = { p_username: `s${randomUUID().slice(0, 8)}`, p_first_name: "S", p_last_name: "T", p_avatar_url: "", p_email: "" };
    expect((await stranger.rpc("ensure_player", args)).error?.message).toMatch(/invite_required/);
    expect((await stranger.rpc("ensure_player", { ...args, p_invite: "NOTAREALCODE" })).error?.message).toMatch(/invalid_invite/);
    const code = await invite();
    const { data: id, error } = await stranger.rpc("ensure_player", { ...args, p_invite: code.toLowerCase().replace(/(.{4})/g, "$1-") });
    expect(error).toBeNull();
    const other = as("user_test_other_" + randomUUID().slice(0, 6));
    expect((await other.rpc("ensure_player", { ...args, p_username: `o${randomUUID().slice(0, 8)}`, p_invite: code })).error?.message).toMatch(/invalid_invite/); // used
    expect((await a.sb.rpc("ensure_player", { ...args })).data).toBe(a.id); // existing: no invite needed
    await db`delete from public.invites where used_by = ${id}`; await db`delete from public.players where id = ${id}`;
  });
  it("players can create invites and see only their own, never the codes", async () => {
    const { data: code, error } = await a.sb.rpc("create_invite");
    expect(error).toBeNull();
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{12}$/);
    expect((await a.sb.from("invites").select("code_hash")).error).not.toBeNull();
    expect(((await b.sb.from("invites").select("created_at")).data ?? []).length).toBe(0);
  });
  it("the same match twice (same pair, day, score) needs an explicit override", async () => {
    const strict = { p_allow_duplicate: false };
    expect((await record(a, c.id, [{ p1: 6, p2: 1 }], strict)).error).toBeNull();
    expect((await record(c, a.id, [{ p1: 1, p2: 6 }], strict)).error?.message).toMatch(/possible_duplicate/); // same match from the other side
    expect((await record(a, c.id, [{ p1: 6, p2: 1 }], { p_allow_duplicate: true })).error).toBeNull();
    expect((await record(a, c.id, [{ p1: 7, p2: 5 }], strict)).error).toBeNull(); // a different score is a different match
  });
  it("a result more than a year old can't be confirmed (but can still be rejected)", async () => {
    const { data: id } = await record(a, b.id, [{ p1: 6, p2: 4 }], { p_note: "old" });
    await db`update public.matches set played_on = current_date - 400 where id = ${id}`;
    expect((await b.sb.rpc("respond_match", { p_match: id, p_accept: true })).error?.message).toMatch(/too_old_to_confirm/);
    expect((await b.sb.rpc("respond_match", { p_match: id, p_accept: false })).error).toBeNull();
  });
  it("players can't read idempotency keys or who voided a match", async () => {
    expect((await a.sb.from("matches").select("client_key")).error).not.toBeNull();
    expect((await a.sb.from("matches").select("voided_by")).error).not.toBeNull();
  });
});
