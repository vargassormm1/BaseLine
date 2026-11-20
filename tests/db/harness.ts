// Local Supabase only (supabase start). Tokens are minted with the local JWT secret and look like Supabase Auth
// sessions from a Google sign-in (sub = auth user id, email, provider google, email_verified).
import { createHmac, randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import postgres from "postgres";

export const API = "http://127.0.0.1:55321";
export const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SECRET = "super-secret-jwt-token-with-at-least-32-characters-long";
export const db = postgres("postgresql://postgres:postgres@127.0.0.1:55322/postgres", { max: 2, onnotice: () => {} });

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
export interface Claims { email?: string; provider?: string; verified?: boolean; anonymous?: boolean }
export function token(sub: string, c: Claims = {}) {
  const now = Math.floor(Date.now() / 1000);
  const claims = { sub, role: "authenticated", aud: "authenticated", iat: now, exp: now + 600, email: c.email, is_anonymous: c.anonymous ?? false,
    app_metadata: { provider: c.provider ?? "google", providers: [c.provider ?? "google"] }, user_metadata: { email_verified: c.verified ?? true } };
  const body = `${b64({ alg: "HS256", typ: "JWT" })}.${b64(claims)}`;
  return `${body}.${createHmac("sha256", SECRET).update(body).digest("base64url")}`;
}
/** A fresh auth user, as Supabase Auth creates on a first sign-in. By default it has a Google identity with a
 *  verified email; pass google: false (no Google identity) or verified: false to model other cases. */
export async function authUser(email: string | null = null, o: { google?: boolean; verified?: boolean; identityEmail?: string } = {}): Promise<string> {
  const id = randomUUID();
  await db`insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
           values ('00000000-0000-0000-0000-000000000000', ${id}, 'authenticated', 'authenticated', ${email}, now(), '{"provider":"google"}', '{}', now(), now())`;
  if (o.google !== false) {
    const data = { sub: `g-${id}`, email: o.identityEmail ?? email, email_verified: o.verified ?? true };
    await db`insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
             values (gen_random_uuid(), ${id}, ${`g-${id}`}, 'google', ${db.json(data)}, now(), now(), now())`;
  }
  createdAuth.push(id);
  return id;
}
const createdAuth: string[] = [];
export const anon = () => createClient(API, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
export const as = (sub: string, c: Claims = {}): SupabaseClient => createClient(API, ANON, { accessToken: async () => token(sub, c), auth: { persistSession: false, autoRefreshToken: false } });

export interface TestPlayer { sub: string; id: string; sb: SupabaseClient; username: string; email: string }
const run = randomUUID().slice(0, 6);
/** A fresh one-time invite (created directly in the database, as an existing player would). */
export async function invite(): Promise<string> {
  const code = randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
  const [row] = await db`select id from public.players order by created_at limit 1`;
  await db`insert into public.invites (code_hash, created_by) values (encode(extensions.digest(${code}, 'sha256'), 'hex'), ${row!.id})`;
  return code;
}
export async function player(name: string, admin = false): Promise<TestPlayer> {
  const username = `t${run}${name}`.slice(0, 24);
  const email = `${username}@example.test`;
  const sub = await authUser(email);
  const sb = as(sub, { email });
  const { data, error } = await sb.rpc("ensure_player", { p_username: username, p_first_name: name, p_last_name: "Test", p_invite: await invite() });
  if (error || !data) throw new Error(error?.message ?? "player not created");
  if (admin) await db`update public.players set is_admin = true where id = ${data}`;
  return { sub, id: data as string, sb, username, email };
}
export async function cleanup() {
  const ids = (await db`select id from public.players where username like ${`t${run}%`} or auth_user_id in ${db(createdAuth.length ? createdAuth : ["00000000-0000-0000-0000-000000000000"])}`).map((r) => r.id as string);
  if (ids.length) {
    await db`delete from public.matches where player_one in ${db(ids)} or player_two in ${db(ids)}`;
    await db`delete from public.pickleball_matches where id in (select match_id from public.pickleball_match_players where player_id in ${db(ids)})`;
    await db`delete from public.pickleball_challenges where id in (select challenge_id from public.pickleball_challenge_players where player_id in ${db(ids)})`;
    await db`delete from public.tennis_doubles_matches where id in (select match_id from public.tennis_doubles_players where player_id in ${db(ids)})`;
    await db`delete from public.tennis_doubles_challenges where id in (select challenge_id from public.tennis_doubles_challenge_players where player_id in ${db(ids)})`;
    await db`delete from public.challenges where challenger in ${db(ids)} or opponent in ${db(ids)}`;
    await db`delete from public.standing_adjustments where player_id in ${db(ids)}`;
    await db`delete from public.invites where used_by in ${db(ids)} or created_by in ${db(ids)}`;
    await db`delete from public.players where id in ${db(ids)}`;
  }
  if (createdAuth.length) await db`delete from auth.users where id in ${db(createdAuth)}`;
}
export const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
export const record = (p: TestPlayer, opponent: string, sets: object[], o: Record<string, unknown> = {}) => p.sb.rpc("record_match", {
  p_client_key: randomUUID(), p_opponent: opponent, p_format: sets.length === 1 ? 1 : 3, p_deciding: "set", p_played_on: today(), p_sets: sets,
  p_allow_duplicate: true, ...o, // tests reuse scores on purpose; the duplicate rule has its own test
});
