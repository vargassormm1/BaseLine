// Local Supabase only (supabase start). Tokens are minted with the local JWT secret, standing in for Clerk session
// tokens (same claims Supabase reads: sub = Clerk user id, role = authenticated).
import { createHmac, randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import postgres from "postgres";

export const API = "http://127.0.0.1:55321";
export const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SECRET = "super-secret-jwt-token-with-at-least-32-characters-long";
export const db = postgres("postgresql://postgres:postgres@127.0.0.1:55322/postgres", { max: 2, onnotice: () => {} });

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
export function token(sub: string) {
  const now = Math.floor(Date.now() / 1000);
  const body = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub, role: "authenticated", aud: "authenticated", iat: now, exp: now + 600 })}`;
  return `${body}.${createHmac("sha256", SECRET).update(body).digest("base64url")}`;
}
export const anon = () => createClient(API, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
export const as = (sub: string): SupabaseClient => createClient(API, ANON, { accessToken: async () => token(sub), auth: { persistSession: false, autoRefreshToken: false } });

export interface TestPlayer { sub: string; id: string; sb: SupabaseClient; username: string }
const run = randomUUID().slice(0, 6);
export async function player(name: string, admin = false): Promise<TestPlayer> {
  const sub = `user_test_${run}_${name}`;
  const sb = as(sub);
  const username = `t${run}${name}`.slice(0, 24);
  const { data, error } = await sb.rpc("ensure_player", { p_username: username, p_first_name: name, p_last_name: "Test", p_avatar_url: null, p_email: `${username}@example.test` });
  if (error) throw new Error(error.message);
  if (admin) await db`update public.players set is_admin = true where id = ${data}`;
  return { sub, id: data as string, sb, username };
}
export async function cleanup() {
  const ids = (await db`select id from public.players where clerk_user_id like ${`user_test_${run}_%`}`).map((r) => r.id as string);
  if (ids.length) {
    await db`delete from public.matches where player_one in ${db(ids)} or player_two in ${db(ids)}`;
    await db`delete from public.challenges where challenger in ${db(ids)} or opponent in ${db(ids)}`;
    await db`delete from public.standing_adjustments where player_id in ${db(ids)}`;
    await db`delete from public.players where id in ${db(ids)}`;
  }
}
export const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
export const record = (p: TestPlayer, opponent: string, sets: object[], o: Record<string, unknown> = {}) => p.sb.rpc("record_match", {
  p_client_key: randomUUID(), p_opponent: opponent, p_format: sets.length === 1 ? 1 : 3, p_deciding: "set", p_played_on: today(), p_sets: sets, ...o,
});
