"use server";
// Pickleball writes. Each action: identify the player (session, then RLS) → validate → one database function. The
// database computes winners and points; the browser never sends either.
import { revalidatePath } from "next/cache";
import { requirePlayer } from "@/lib/server/session";
import { friendlyError } from "@/lib/errors";
import * as V from "@/lib/validation";
import type { ActionResult } from "./actions";

const fail = (error: string): ActionResult => ({ ok: false, error });
const refresh = () => revalidatePath("/", "layout");

export async function recordPickleball(input: unknown): Promise<ActionResult> {
  const s = await requirePlayer();
  const v = V.pbRecord.safeParse(input);
  if (!v.success) return fail("Check the players and the score, then try again.");
  const d = v.data;
  const { data, error } = await s.sb.rpc("record_pickleball_match", {
    p_client_key: d.clientKey, p_discipline: d.discipline, p_format: d.format, p_scoring: d.scoring, p_side1: d.side1, p_side2: d.side2,
    p_played_on: d.playedOn, p_games: d.games, ...(d.challenge ? { p_challenge: d.challenge } : {}), ...(d.note ? { p_note: d.note } : {}),
  });
  if (error) return fail(friendlyError(error.message));
  refresh();
  return { ok: true, id: data };
}

export async function respondPickleball(matchId: string, accept: boolean): Promise<ActionResult> {
  const s = await requirePlayer();
  if (!V.uuid.safeParse(matchId).success) return fail("That match doesn't exist.");
  const { error } = await s.sb.rpc("respond_pickleball_match", { p_match: matchId, p_accept: accept === true });
  if (error) return fail(friendlyError(error.message));
  refresh();
  return { ok: true };
}

export async function cancelPickleball(matchId: string): Promise<ActionResult> {
  const s = await requirePlayer();
  if (!V.uuid.safeParse(matchId).success) return fail("That match doesn't exist.");
  const { error } = await s.sb.rpc("cancel_pickleball_match", { p_match: matchId });
  if (error) return fail(friendlyError(error.message));
  refresh();
  return { ok: true };
}

export async function voidPickleball(matchId: string, reason: string): Promise<ActionResult> {
  const s = await requirePlayer();
  if (!V.uuid.safeParse(matchId).success || typeof reason !== "string") return fail("That match doesn't exist.");
  const { error } = await s.sb.rpc("void_pickleball_match", { p_match: matchId, p_reason: reason });
  if (error) return fail(friendlyError(error.message));
  refresh();
  return { ok: true };
}

export async function createPickleballChallenge(input: unknown): Promise<ActionResult> {
  const s = await requirePlayer();
  const v = V.pbChallenge.safeParse(input);
  if (!v.success) return fail("Check the players and format.");
  const d = v.data;
  const { data, error } = await s.sb.rpc("create_pickleball_challenge", {
    p_discipline: d.discipline, p_format: d.format, p_scoring: d.scoring, p_side1: d.side1, p_side2: d.side2,
    ...(d.message ? { p_message: d.message } : {}), ...(d.proposedFor ? { p_proposed_for: d.proposedFor } : {}),
  });
  if (error) return fail(friendlyError(error.message));
  refresh();
  return { ok: true, id: data };
}

export async function respondPickleballChallenge(challengeId: string, action: "accept" | "decline" | "cancel"): Promise<ActionResult> {
  const s = await requirePlayer();
  if (!V.uuid.safeParse(challengeId).success || !["accept", "decline", "cancel"].includes(action)) return fail("That challenge doesn't exist.");
  const { data, error } = await s.sb.rpc("respond_pickleball_challenge", { p_challenge: challengeId, p_action: action });
  if (error) return fail(friendlyError(error.message));
  refresh();
  if (data === "expired") return fail("This challenge expired.");
  return { ok: true };
}
