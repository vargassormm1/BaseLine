import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import { env } from "./env";
import { identity, type Identity } from "./identity";

export type DB = SupabaseClient<Database>;
export const INVITE_COOKIE = "baseline_invite";
export interface Session { id: Identity; sb: DB; me: string | null }

/** Supabase client acting as the signed-in player (RLS applies to every query). */
const clientFor = (id: Identity): DB => createClient<Database>(env.supabaseUrl(), env.supabaseKey(), {
  accessToken: id.getToken, auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
});

/** The signed-in player for this request (cached per request). `me` is null until they've picked a username. */
export const getSession = cache(async (): Promise<Session | null> => {
  const id = await identity();
  if (!id) return null;
  const sb = clientFor(id);
  const { data: me, error } = await sb.rpc("me");
  if (error) throw new Error("Couldn't reach the database.");
  if (me) return { id, sb, me };
  // First visit. V1 players are already linked by their Clerk id (ensure_player just returns them). New players need
  // an invite: with a username from Clerk and an invite link cookie, they're created here; otherwise /welcome asks.
  const p = await id.profile();
  const invite = (await cookies()).get(INVITE_COOKIE)?.value;
  const { data: created, error: e2 } = await sb.rpc("ensure_player", {
    p_username: p.username ?? "", p_first_name: p.firstName, p_last_name: p.lastName, p_avatar_url: p.avatarUrl ?? "", p_email: p.email ?? "",
    ...(invite ? { p_invite: invite } : {}),
  });
  return { id, sb, me: e2 ? null : created };
});

/** For pages and actions that need a player: signed out → sign-in; no username yet → welcome. */
export async function requirePlayer(): Promise<Session & { me: string }> {
  const s = await getSession();
  if (!s) redirect("/sign-in");
  if (!s.me) redirect("/welcome");
  return s as Session & { me: string };
}
