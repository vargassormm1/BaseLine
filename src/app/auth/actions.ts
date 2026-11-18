"use server";
// Username + password accounts (Supabase Auth, no email). Google sign-in is separate (/auth/google).
import { redirect } from "next/navigation";
import { identity, supabaseForRequest } from "@/lib/server/identity";
import { passwordAuthEnabled } from "@/lib/server/env";
import { safeNext } from "@/lib/server/redirects";
import { accountEmail, accountUsername } from "@/lib/server/accounts";
import * as V from "@/lib/validation";

export type AuthState = { error?: string; ok?: boolean; username?: string } | null;

const field = (f: FormData, k: string) => { const v = f.get(k); return typeof v === "string" ? v : ""; };
const captcha = (f: FormData): { captchaToken?: string } => { const t = field(f, "cf-turnstile-response"); return t ? { captchaToken: t } : {}; };
const first = (e: { issues: { message: string }[] }) => e.issues[0]?.message ?? "Check what you entered.";
const problem = (msg: string | undefined) => {
  const m = (msg ?? "").toLowerCase();
  if (m.includes("captcha")) return "The bot check didn't pass. Try again.";
  if (m.includes("rate limit") || m.includes("too many") || m.includes("security purposes")) return "That's a lot of tries. Wait a few minutes and try again.";
  if (m.includes("weak") || m.includes("password should")) return "Pick a stronger password: at least 10 characters with letters and numbers.";
  return "Something went wrong. Try again in a moment.";
};

export async function passwordSignIn(_: AuthState, f: FormData): Promise<AuthState> {
  if (!passwordAuthEnabled()) return { error: "Username sign-in isn't available yet." };
  const v = V.passwordSignIn.safeParse({ username: field(f, "username"), password: field(f, "password") });
  if (!v.success) return { error: first(v.error), username: field(f, "username") };
  const sb = await supabaseForRequest();
  const { error } = await sb.auth.signInWithPassword({ email: accountEmail(v.data.username), password: v.data.password, options: captcha(f) });
  if (error) return { error: error.code === "invalid_credentials" ? "That username and password don't match." : problem(error.message), username: v.data.username };
  redirect(safeNext(field(f, "next")));
}

export async function passwordSignUp(_: AuthState, f: FormData): Promise<AuthState> {
  if (!passwordAuthEnabled()) return { error: "Username sign-up isn't available yet." };
  const v = V.passwordSignUp.safeParse({ username: field(f, "username"), password: field(f, "password") });
  if (!v.success) return { error: first(v.error), username: field(f, "username") };
  const sb = await supabaseForRequest();
  const { data, error } = await sb.auth.signUp({ email: accountEmail(v.data.username), password: v.data.password, options: captcha(f) });
  if (error) return { error: error.code === "user_already_exists" ? "That username is taken. Try another." : problem(error.message), username: v.data.username };
  if (!data.session) return { error: "Account sign-up isn't set up correctly yet (email confirmation must be off)." };
  redirect(safeNext(field(f, "next")));
}

/** Settings: a password account changes its password (the current one is checked first). */
export async function changePassword(_: AuthState, f: FormData): Promise<AuthState> {
  const me = await identity();
  const username = accountUsername(me?.profile.email);
  if (!me || !username) return { error: "This account signs in with Google." };
  const v = V.changePassword.safeParse({ current: field(f, "current"), password: field(f, "password"), confirm: field(f, "confirm") });
  if (!v.success) return { error: first(v.error) };
  const sb = await supabaseForRequest();
  const check = await sb.auth.signInWithPassword({ email: accountEmail(username), password: v.data.current });
  if (check.error) return { error: check.error.code === "invalid_credentials" ? "Your current password isn't right." : problem(check.error.message) };
  const { error } = await sb.auth.updateUser({ password: v.data.password });
  if (error) return { error: error.code === "same_password" ? "Pick a different password from your current one." : problem(error.message) };
  return { ok: true };
}
