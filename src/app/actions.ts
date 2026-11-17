"use server";
// Every write in the app. Each action: identify the player (Clerk, then RLS) → validate → one database function call.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSession, INVITE_COOKIE, requirePlayer } from "@/lib/server/session";
import { E2E_COOKIE, supabaseForRequest } from "@/lib/server/identity";
import { e2eAuthEnabled } from "@/lib/server/env";
import { friendlyError } from "@/lib/errors";
import * as V from "@/lib/validation";
import { randomUUID } from "node:crypto";

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
  const p = s.id.profile;
  const { data, error } = await s.sb.rpc("ensure_player", {
    p_username: v.data.username, p_first_name: v.data.firstName || p.firstName, p_last_name: v.data.lastName || p.lastName, p_invite: v.data.invite,
  });
  if (error) return fail(friendlyError(error.message));
  if (!data) return fail(friendlyError("invalid_invite")); // wrong, used or expired code, or too many tries
  (await cookies()).delete(INVITE_COOKIE);
  redirect("/home");
}

/** A one-time invite code for a friend (shown once; stored hashed). */
export async function createInvite(): Promise<ActionResult & { code?: string }> {
  const s = await requirePlayer();
  const { data, error } = await s.sb.rpc("create_invite");
  if (error || !data) return fail(friendlyError(error?.message));
  return { ok: true, code: data };
}

export async function signOut(): Promise<void> {
  const jar = await cookies();
  jar.delete(INVITE_COOKIE);
  if (e2eAuthEnabled()) jar.delete(E2E_COOKIE);
  else await (await supabaseForRequest()).auth.signOut();
  redirect("/");
}

/** Profile photo: a 256px WebP made in the browser. The server re-checks type, size and file signature; storage
 *  policies only allow writing inside the player's own folder; set_avatar() only accepts the player's own path. */
/** Exactly a still 256×256 WebP? (Checks the container and the frame header, not just the declared type.) */
function isSquareWebp(b: Uint8Array): boolean {
  const tag = (o: number) => String.fromCharCode(...b.slice(o, o + 4));
  if (b.length < 30 || tag(0) !== "RIFF" || tag(8) !== "WEBP") return false;
  const u24 = (o: number) => b[o]! | (b[o + 1]! << 8) | (b[o + 2]! << 16);
  let w = 0, h = 0;
  if (tag(12) === "VP8X") { if (b[20]! & 0x02) return false; w = u24(24) + 1; h = u24(27) + 1; }               // 0x02 = animation
  else if (tag(12) === "VP8 ") { w = (b[26]! | (b[27]! << 8)) & 0x3fff; h = (b[28]! | (b[29]! << 8)) & 0x3fff; }
  else if (tag(12) === "VP8L") { const v = b[21]! | (b[22]! << 8) | (b[23]! << 16) | (b[24]! << 24); w = (v & 0x3fff) + 1; h = ((v >>> 14) & 0x3fff) + 1; }
  return w === 256 && h === 256;
}

/** Profile photo: a 256px WebP made in the browser. The server re-checks type, size and the image header; storage
 *  policies only allow a few files inside the player's own folder; set_avatar() only accepts the player's own file. */
export async function uploadPhoto(form: FormData): Promise<ActionResult> {
  const s = await requirePlayer();
  const file = form.get("photo");
  if (!(file instanceof Blob) || file.type !== "image/webp" || file.size < 100 || file.size > 300_000) return fail("That photo couldn't be used.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isSquareWebp(bytes)) return fail("That photo couldn't be used.");
  const ticket = await s.sb.rpc("avatar_upload_ticket");
  if (ticket.error) return fail(friendlyError(ticket.error.message));
  const bucket = s.sb.storage.from("avatars");
  const path = `${s.me}/${randomUUID()}.webp`;
  const up = await bucket.upload(path, bytes, { contentType: "image/webp", cacheControl: "86400" });
  if (up.error) {
    // usually leftovers from interrupted uploads filling the 3-file allowance: clear all but the current photo, retry once
    const { data: cur } = await s.sb.from("players").select("avatar_path").eq("id", s.me).single();
    const { data: mine } = await bucket.list(s.me);
    const stale = (mine ?? []).map((f) => `${s.me}/${f.name}`).filter((p) => p !== cur?.avatar_path);
    if (stale.length) await bucket.remove(stale);
    const again = await bucket.upload(path, bytes, { contentType: "image/webp", cacheControl: "86400" });
    if (again.error) return fail("Couldn't save the photo. Please try again.");
  }
  const { data: old, error } = await s.sb.rpc("set_avatar", { p_path: path });
  if (error) { await bucket.remove([path]); return fail(friendlyError(error.message)); }
  if (old) await bucket.remove([old]);
  refresh();
  return { ok: true };
}

export async function removePhoto(): Promise<ActionResult> {
  const s = await requirePlayer();
  const { data: old, error } = await s.sb.rpc("set_avatar", {});
  if (error) return fail(friendlyError(error.message));
  if (old) await s.sb.storage.from("avatars").remove([old]);
  refresh();
  return { ok: true };
}
