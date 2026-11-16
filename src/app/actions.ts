"use server";
// Every write in the app. Each action: identify the player (Clerk, then RLS) → validate → one database function call.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession, requirePlayer } from "@/lib/server/session";
import { friendlyError } from "@/lib/errors";
import * as V from "@/lib/validation";

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string; duplicate?: boolean };
const fail = (error: string): ActionResult => ({ ok: false, error });
const refresh = () => revalidatePath("/", "layout");

export async function recordMatch(input: unknown): Promise<ActionResult> {
  const s = await requirePlayer();
  const v = V.recordMatch.safeParse(input);
  if (!v.success) return fail("Check the score and try again.");
  const d = v.data;
  const { data, error } = await s.sb.rpc("record_match", {
    p_client_key: d.clientKey, p_opponent: d.opponent, p_format: d.format, p_deciding: d.deciding, p_played_on: d.playedOn,
    p_sets: d.sets.map((x) => ({ p1: x.p1, p2: x.p2, tb1: x.tb1 ?? null, tb2: x.tb2 ?? null })),
    ...(d.challenge ? { p_challenge: d.challenge } : {}), ...(d.note ? { p_note: d.note } : {}),
    ...(d.allowDuplicate ? { p_allow_duplicate: true } : {}),
  });
  if (error?.message.startsWith("possible_duplicate")) return { ok: false, error: friendlyError(error.message), duplicate: true };
  if (error) return fail(friendlyError(error.message));
  refresh();
  return { ok: true, id: data };
}

export async function respondMatch(matchId: string, accept: boolean): Promise<ActionResult> {
  const s = await requirePlayer();
  if (!V.uuid.safeParse(matchId).success) return fail("That match doesn't exist.");
  const { error } = await s.sb.rpc("respond_match", { p_match: matchId, p_accept: accept === true });
  if (error) return fail(friendlyError(error.message));
  refresh();
  return { ok: true };
}

export async function cancelMatch(matchId: string): Promise<ActionResult> {
  const s = await requirePlayer();
  if (!V.uuid.safeParse(matchId).success) return fail("That match doesn't exist.");
  const { error } = await s.sb.rpc("cancel_match", { p_match: matchId });
  if (error) return fail(friendlyError(error.message));
  refresh();
  return { ok: true };
}

export async function voidMatch(matchId: string, reason: string): Promise<ActionResult> {
  const s = await requirePlayer();
  if (!V.uuid.safeParse(matchId).success || typeof reason !== "string") return fail("That match doesn't exist.");
  const { error } = await s.sb.rpc("void_match", { p_match: matchId, p_reason: reason.trim() });
  if (error) return fail(friendlyError(error.message));
  refresh();
  return { ok: true };
}

export async function createChallenge(input: unknown): Promise<ActionResult> {
  const s = await requirePlayer();
  const v = V.challenge.safeParse(input);
  if (!v.success) return fail("Pick an opponent and a format.");
  const d = v.data;
  const { data, error } = await s.sb.rpc("create_challenge", {
    p_opponent: d.opponent, p_format: d.format, ...(d.message ? { p_message: d.message } : {}), ...(d.proposedFor ? { p_proposed_for: d.proposedFor } : {}),
  });
  if (error) return fail(friendlyError(error.message));
  refresh();
  return { ok: true, id: data };
}

export async function respondChallenge(id: string, accept: boolean): Promise<ActionResult> {
  const s = await requirePlayer();
  if (!V.uuid.safeParse(id).success) return fail("That challenge doesn't exist.");
  const { data, error } = await s.sb.rpc("respond_challenge", { p_challenge: id, p_accept: accept === true });
  if (error) return fail(friendlyError(error.message));
  if (data === "expired") { refresh(); return fail(friendlyError("challenge_expired")); }
  refresh();
  return { ok: true };
}

export async function cancelChallenge(id: string): Promise<ActionResult> {
  const s = await requirePlayer();
  if (!V.uuid.safeParse(id).success) return fail("That challenge doesn't exist.");
  const { error } = await s.sb.rpc("cancel_challenge", { p_challenge: id });
  if (error) return fail(friendlyError(error.message));
  refresh();
  return { ok: true };
}

export async function updateProfile(input: unknown): Promise<ActionResult> {
  const s = await requirePlayer();
  const v = V.profile.safeParse(input);
  if (!v.success) return fail(v.error.issues[0]?.message ?? "Check your details.");
  const { error } = await s.sb.rpc("update_profile", { p_username: v.data.username, p_first_name: v.data.firstName, p_last_name: v.data.lastName });
  if (error) return fail(friendlyError(error.message));
  refresh();
  return { ok: true };
}

/** First sign-in without a username in Clerk: the player picks one here. */
export async function chooseUsername(input: unknown): Promise<ActionResult> {
  const s = await getSession();
  if (!s) redirect("/sign-in");
  if (s.me) redirect("/home");
  const v = V.welcome.safeParse(input);
  if (!v.success) return fail(v.error.issues[0]?.message ?? "Check your details.");
  const p = await s.id.profile();
  const { error } = await s.sb.rpc("ensure_player", {
    p_username: v.data.username, p_first_name: v.data.firstName || p.firstName, p_last_name: v.data.lastName || p.lastName,
    p_avatar_url: p.avatarUrl ?? "", p_email: p.email ?? "", p_invite: v.data.invite,
  });
  if (error) return fail(friendlyError(error.message));
  redirect("/home");
}

/** A one-time invite code for a friend (shown once; stored hashed). */
export async function createInvite(): Promise<ActionResult & { code?: string }> {
  const s = await requirePlayer();
  const { data, error } = await s.sb.rpc("create_invite");
  if (error || !data) return fail(friendlyError(error?.message));
  return { ok: true, code: data };
}
