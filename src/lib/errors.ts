// Database error codes → messages a player understands. Unknown errors get a generic message (details never leak).
const MESSAGES: Record<string, string> = {
  not_signed_in: "Please sign in again.",
  not_allowed: "You can't do that.",
  invalid_opponent: "Pick an opponent.",
  invalid_date: "Pick a date from the last year (not in the future).",
  invalid_note: "Keep the note under 140 characters.",
  invalid_input: "Something in the form isn't right.",
  invalid_challenge: "That challenge isn't open for this match (check the opponent and format).",
  challenge_already_open: "You already have an open challenge with this player.",
  challenge_expired: "This challenge expired.",
  challenge_has_pending_result: "A result for this challenge is waiting for confirmation.",
  already_answered: "This was already answered.",
  duplicate_match: "This match was already recorded.",
  rate_limited: "That's a lot at once. Try again in a few minutes.",
  username_taken: "That username is taken.",
  invalid_username: "Use 3–24 letters, numbers, dots, dashes or underscores.",
  invalid_name: "Names can be up to 40 characters.",
  invalid_reason: "Add a short reason (3–200 characters).",
  not_confirmed: "Only confirmed matches can be voided.",
  not_found: "That doesn't exist anymore.",
  invite_required: "Baseline is invite-only. Ask a player for an invite link.",
  invalid_invite: "That invite code isn't valid (or was already used, or expired).",
  possible_duplicate: "Looks like this match is already recorded (same opponent, day and score).",
  invalid_players: "Check the players: 1 vs 1 for singles, 2 vs 2 for doubles, everyone different, and you're playing.",
  challenge_open: "There's already an open challenge between these players.",
  too_old_to_confirm: "This result is more than a year old, so it can't be confirmed anymore. It can still be withdrawn.",
};
export function friendlyError(raw: string | undefined | null): string {
  const msg = raw ?? "";
  if (msg.startsWith("invalid_score")) {
    const detail = msg.split(":").slice(1).join(":").trim();
    return detail ? `That score doesn't add up: ${detail}.` : "That score doesn't add up.";
  }
  const code = msg.split(/[\s:]/)[0] ?? "";
  return MESSAGES[code] ?? "Something went wrong. Please try again.";
}
