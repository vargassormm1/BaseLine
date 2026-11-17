"use server";
// Email + password sign-in, sign-up and password reset (Supabase Auth). Messages never reveal whether an email has an
// account: sign-up and "forgot password" always answer the same way.
import { redirect } from "next/navigation";
import { supabaseForRequest } from "@/lib/server/identity";
import { emailAuthEnabled } from "@/lib/server/env";
import { safeNext } from "@/lib/server/redirects";
import * as V from "@/lib/validation";

export type AuthState = { error?: string; sent?: "confirm" | "reset"; unconfirmed?: boolean; email?: string } | null;

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

export async function emailSignIn(_: AuthState, f: FormData): Promise<AuthState> {
  if (!emailAuthEnabled()) return { error: "Email sign-in isn't available yet." };
  const v = V.emailSignIn.safeParse({ email: field(f, "email"), password: field(f, "password") });
  if (!v.success) return { error: first(v.error), email: field(f, "email") };
  const sb = await supabaseForRequest();
  const { error } = await sb.auth.signInWithPassword({ ...v.data, options: captcha(f) });
  if (error) {
    if (error.code === "email_not_confirmed") return { error: "Confirm your email first. Check your inbox for the link.", unconfirmed: true, email: v.data.email };
    if (error.code === "invalid_credentials") return { error: "That email and password don't match.", email: v.data.email };
    return { error: problem(error.message), email: v.data.email };
  }
  redirect(safeNext(field(f, "next")));
}

export async function emailSignUp(_: AuthState, f: FormData): Promise<AuthState> {
  if (!emailAuthEnabled()) return { error: "Email sign-up isn't available yet." };
  const v = V.emailSignUp.safeParse({ email: field(f, "email"), password: field(f, "password") });
  if (!v.success) return { error: first(v.error), email: field(f, "email") };
  const sb = await supabaseForRequest();
  const { data, error } = await sb.auth.signUp({ ...v.data, options: captcha(f) });
  if (error && error.code !== "user_already_exists") return { error: problem(error.message), email: v.data.email };
  // confirmations are required, so no session yet; if one came back, the project is misconfigured: don't keep it
  if (data?.session) { await sb.auth.signOut(); return { error: "Email sign-up isn't set up correctly yet." }; }
  return { sent: "confirm", email: v.data.email };
}

export async function resendConfirmation(_: AuthState, f: FormData): Promise<AuthState> {
  if (!emailAuthEnabled()) return null;
  const v = V.email.safeParse(field(f, "email"));
  if (!v.success) return { error: first(v.error) };
  const sb = await supabaseForRequest();
  const { error } = await sb.auth.resend({ type: "signup", email: v.data, options: captcha(f) });
  if (error && /captcha|rate|security purposes/i.test(error.message)) return { error: problem(error.message), email: v.data };
  return { sent: "confirm", email: v.data };
}

export async function sendPasswordReset(_: AuthState, f: FormData): Promise<AuthState> {
  if (!emailAuthEnabled()) return { error: "Email sign-in isn't available yet." };
  const v = V.email.safeParse(field(f, "email"));
  if (!v.success) return { error: first(v.error), email: field(f, "email") };
  const sb = await supabaseForRequest();
  const { error } = await sb.auth.resetPasswordForEmail(v.data, captcha(f));
  if (error && /captcha|rate|security purposes/i.test(error.message)) return { error: problem(error.message), email: v.data };
  return { sent: "reset", email: v.data };
}

export async function setNewPassword(_: AuthState, f: FormData): Promise<AuthState> {
  const v = V.newPassword.safeParse({ password: field(f, "password"), confirm: field(f, "confirm") });
  if (!v.success) return { error: first(v.error) };
  const sb = await supabaseForRequest();
  const { data: u } = await sb.auth.getUser();
  if (!u.user) redirect("/sign-in?error=link");
  const { error } = await sb.auth.updateUser({ password: v.data.password });
  if (error) return { error: error.code === "same_password" ? "Pick a password you haven't used here before." : problem(error.message) };
  redirect("/home");
}
