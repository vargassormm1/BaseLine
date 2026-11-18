import { z } from "zod";
// Shapes of everything the browser sends. The database re-checks every rule (it's the source of truth).
export const uuid = z.uuid();
export const format = z.coerce.number().pipe(z.union([z.literal(1), z.literal(3), z.literal(5)]));
const games = z.number().int().min(0).max(99);
export const setScore = z.object({ p1: games, p2: games, tb1: games.nullable().optional(), tb2: games.nullable().optional() });
export const recordMatch = z.object({
  clientKey: uuid,
  opponent: uuid,
  format,
  deciding: z.enum(["set", "match_tiebreak"]),
  playedOn: z.iso.date(),
  sets: z.array(setScore).min(1).max(5),
  challenge: uuid.nullable(),
  note: z.string().trim().max(140).optional(),
  allowDuplicate: z.boolean().optional(),
});
export const username = z.string().trim().regex(/^[A-Za-z0-9_.-]{3,24}$/, "Use 3–24 letters, numbers, dots, dashes or underscores.");
export const profile = z.object({ username, firstName: z.string().trim().max(40), lastName: z.string().trim().max(40) });
export const welcome = profile.extend({ invite: z.string().trim().min(6, "Enter the invite code from your friend.").max(40) });
export const challenge = z.object({
  opponent: uuid, format, message: z.string().trim().max(140).optional(), proposedFor: z.union([z.iso.date(), z.literal("")]).optional(),
});

// username + password accounts (Supabase Auth enforces the same password rules server-side)
export const login = z.string().trim().toLowerCase().regex(/^[a-z0-9_.-]{3,24}$/, "Usernames are 3–24 letters, numbers, dots, dashes or underscores.");
export const password = z.string().min(10, "Use at least 10 characters.").max(72, "Use 72 characters or fewer.")
  .regex(/[A-Za-z]/, "Include at least one letter.").regex(/[0-9]/, "Include at least one number.");
export const passwordSignIn = z.object({ username: login, password: z.string().min(1, "Enter your password.").max(72) });
export const passwordSignUp = z.object({ username: login, password });
export const changePassword = z.object({ current: z.string().min(1, "Enter your current password.").max(72), password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "The new passwords don't match.", path: ["confirm"] });
