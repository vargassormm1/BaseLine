import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import { identity, type Identity } from "./identity";
import { loadBoard } from "./data";

export type DB = SupabaseClient<Database>;
export const INVITE_COOKIE = "baseline_invite";
export interface Session { id: Identity; sb: DB; me: string | null }

/** The signed-in player for this request (cached per request). `me` is null until they've joined (invite + username). */
export const getSession = cache(async (): Promise<Session | null> => {
  const id = await identity();
  if (!id) return null;
  // start loading the board now, in parallel with "who am I" (pages await the same cached promise right after)
  void loadBoard(id.sb).catch(() => {});
  const { data: me, error } = await id.sb.rpc("me");
  if (error) throw new Error("Couldn't reach the database.");
  if (me) return { id, sb: id.sb, me };
  // First visit: link an existing player by verified Google email (V1 players), or join with an invite link cookie.
  const p = id.profile;
  const invite = (await cookies()).get(INVITE_COOKIE)?.value;
  const { data: linked, error: e2 } = await id.sb.rpc("ensure_player", {
    p_username: "", p_first_name: p.firstName, p_last_name: p.lastName, ...(invite ? { p_invite: invite } : {}),
  });
  // Just linked or joined (a player's first visit only): start over with a clean request, because the board that
  // began loading above was read before this account was a player.
  if (!e2 && linked) redirect("/start");
  return { id, sb: id.sb, me: null };
});

/** For pages and actions that need a player: signed out → sign-in; not joined yet → welcome. */
export async function requirePlayer(): Promise<Session & { me: string }> {
  const s = await getSession();
  if (!s) redirect("/sign-in");
  if (!s.me) redirect("/welcome");
  return s as Session & { me: string };
}
