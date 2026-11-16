import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import { env } from "./env";
import { identity, type Identity } from "./identity";

export type DB = SupabaseClient<Database>;
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
  // first visit: create the player from the Clerk profile (V1 players are already linked by their Clerk id)
  const p = await id.profile();
  if (!p.username) return { id, sb, me: null };
  const { data: created, error: e2 } = await sb.rpc("ensure_player", {
    p_username: p.username, p_first_name: p.firstName, p_last_name: p.lastName, p_avatar_url: p.avatarUrl ?? "", p_email: p.email ?? "",
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
