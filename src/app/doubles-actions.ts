"use server";
// Tennis doubles writes: identify the player → validate → one database function. The database computes the winner and
// the points; the browser never sends either.
import { revalidatePath } from "next/cache";
import { requirePlayer } from "@/lib/server/session";
import { friendlyError } from "@/lib/errors";
import * as V from "@/lib/validation";
import type { ActionResult } from "./actions";

const fail = (error: string): ActionResult => ({ ok: false, error });
const refresh = () => revalidatePath("/", "layout");

export async function recordDoubles(input: unknown): Promise<ActionResult> {
  const s = await requirePlayer();
  const v = V.dRecord.safeParse(input);
  if (!v.success) return fail("Check the teams and the score, then try again.");
  const d = v.data;
  const { data, error } = await s.sb.rpc("record_tennis_doubles", {
    p_client_key: d.clientKey, p_format: d.format, p_short_tie_at: d.shortTieAt as number, p_no_ad: d.noAd, p_side1: d.side1, p_side2: d.side2,
    p_played_on: d.playedOn, p_sets: d.sets, ...(d.challenge ? { p_challenge: d.challenge } : {}), ...(d.note ? { p_note: d.note } : {}),
  });
  if (error) return fail(friendlyError(error.message));
  refresh();
  return { ok: true, id: data };
}

export async function respondDoubles(matchId: string, accept: boolean): Promise<ActionResult> {
  const s = await requirePlayer();
  if (!V.uuid.safeParse(matchId).success) return fail("That match doesn't exist.");
  const { error } = await s.sb.rpc("respond_tennis_doubles", { p_match: matchId, p_accept: accept === true });
  if (error) return fail(friendlyError(error.message));
  refresh();
  return { ok: true };
}

export async function cancelDoubles(matchId: string): Promise<ActionResult> {
  const s = await requirePlayer();
  if (!V.uuid.safeParse(matchId).success) return fail("That match doesn't exist.");
  const { error } = await s.sb.rpc("cancel_tennis_doubles", { p_match: matchId });
  if (error) return fail(friendlyError(error.message));
  refresh();
  return { ok: true };
}

export async function voidDoubles(matchId: string, reason: string): Promise<ActionResult> {
  const s = await requirePlayer();
  if (!V.uuid.safeParse(matchId).success || typeof reason !== "string") return fail("That match doesn't exist.");
  const { error } = await s.sb.rpc("void_tennis_doubles", { p_match: matchId, p_reason: reason });
  if (error) return fail(friendlyError(error.message));
  refresh();
  return { ok: true };
}

export async function createDoublesChallenge(input: unknown): Promise<ActionResult> {
  const s = await requirePlayer();
  const v = V.dChallenge.safeParse(input);
  if (!v.success) return fail("Check the teams and format.");
  const d = v.data;
  const { data, error } = await s.sb.rpc("create_tennis_doubles_challenge", {
    p_format: d.format, p_short_tie_at: d.shortTieAt as number, p_no_ad: d.noAd, p_side1: d.side1, p_side2: d.side2,
    ...(d.message ? { p_message: d.message } : {}), ...(d.proposedFor ? { p_proposed_for: d.proposedFor } : {}),
  });
  if (error) return fail(friendlyError(error.message));
  refresh();
  return { ok: true, id: data };
}

export async function respondDoublesChallenge(challengeId: string, action: "accept" | "decline" | "cancel"): Promise<ActionResult> {
  const s = await requirePlayer();
  if (!V.uuid.safeParse(challengeId).success || !["accept", "decline", "cancel"].includes(action)) return fail("That challenge doesn't exist.");
  const { data, error } = await s.sb.rpc("respond_tennis_doubles_challenge", { p_challenge: challengeId, p_action: action });
  if (error) return fail(friendlyError(error.message));
  refresh();
  if (data === "expired") return fail("This challenge expired.");
  return { ok: true };
}
