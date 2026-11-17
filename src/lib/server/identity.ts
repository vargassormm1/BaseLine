import "server-only";
import { createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import { e2eAuthEnabled, env } from "./env";
import type { DB } from "./session";

export interface Profile { firstName: string; lastName: string; avatarUrl: string | null; email: string | null }
export interface Identity { userId: string; sb: DB; profile: Profile }

export const E2E_COOKIE = "baseline_e2e_user";
/** Auth cookies: httpOnly, lax (the Google redirect back is a top-level GET), secure on https. */
export const AUTH_COOKIE_OPTIONS = { httpOnly: true, sameSite: "lax" as const, path: "/", secure: process.env.NODE_ENV === "production" };

/** Supabase client for this request, signed in as the cookie's user (RLS applies). Never a service key. */
export async function supabaseForRequest(): Promise<DB> {
  const store = await cookies();
  return createServerClient<Database>(env.supabaseUrl(), env.supabaseKey(), {
    cookieOptions: AUTH_COOKIE_OPTIONS,
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try { for (const { name, value, options } of list) store.set(name, value, { ...options, ...AUTH_COOKIE_OPTIONS }); }
        catch { /* in a Server Component: src/proxy.ts refreshes the cookies instead */ }
      },
    },
  });
}

const split = (full: string) => { const [first = "", ...rest] = full.trim().split(/\s+/); return { first, last: rest.join(" ") }; };

/** Who is signed in (Supabase Auth, Google). The session token is verified cryptographically (signature and expiry)
 *  with the project's public keys, so a normal navigation needs no round trip to the Auth server; the database
 *  verifies the same token again on every query. A revoked session stops working when its token expires (≤ 1 hour). */
export async function identity(): Promise<Identity | null> {
  if (e2eAuthEnabled()) { const t = await e2eIdentity(); if (t) return t; }
  const sb = await supabaseForRequest();
  const { data, error } = await sb.auth.getClaims();
  const c = data?.claims;
  if (error || !c?.sub || c.is_anonymous === true) return null;
  const m = (c.user_metadata ?? {}) as Record<string, unknown>;
  const name = split(String(m.full_name ?? m.name ?? ""));
  return {
    userId: c.sub, sb,
    profile: { firstName: String(m.given_name ?? name.first), lastName: String(m.family_name ?? name.last), avatarUrl: null, email: typeof c.email === "string" ? c.email : null },
  };
}

// ---- local browser tests only (see e2eAuthEnabled) -----------------------------------------------------------------
// The seed has fictional auth users 10000000-…-0000000000NN; the token looks like a Google sign-in's.
const E2E_USERS: Record<string, string> = { ana: "0a", ben: "0b", cy: "0c", dee: "0d", newbie: "ff", claimer: "fe" };
async function e2eIdentity(): Promise<Identity | null> {
  const key = (await cookies()).get(E2E_COOKIE)?.value;
  const suffix = key ? E2E_USERS[key] : undefined;
  const secret = process.env.E2E_JWT_SECRET;
  if (!key || !suffix || !secret) return null;
  const sub = `10000000-0000-4000-8000-0000000000${suffix}`;
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const claims = { sub, role: "authenticated", aud: "authenticated", iat: now, exp: now + 300, email: `${key}@e2e.test`, is_anonymous: false,
    app_metadata: { provider: "google", providers: ["google"] }, user_metadata: { email_verified: true, full_name: `${key[0]!.toUpperCase()}${key.slice(1)} Tester` } };
  const body = `${b64({ alg: "HS256", typ: "JWT" })}.${b64(claims)}`;
  const jwt = `${body}.${createHmac("sha256", secret).update(body).digest("base64url")}`;
  const sb = createClient<Database>(env.supabaseUrl(), env.supabaseKey(), { accessToken: async () => jwt, auth: { persistSession: false, autoRefreshToken: false } });
  return { userId: sub, sb, profile: { firstName: claims.user_metadata.full_name.split(" ")[0]!, lastName: "Tester", avatarUrl: null, email: claims.email } };
}
