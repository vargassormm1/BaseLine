import "server-only";
import { createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { auth, currentUser } from "@clerk/nextjs/server";
import { e2eAuthEnabled } from "./env";

export interface Profile { username: string | null; firstName: string; lastName: string; avatarUrl: string | null; email: string | null }
export interface Identity { userId: string; getToken: () => Promise<string | null>; profile: () => Promise<Profile> }

export const E2E_COOKIE = "baseline_e2e_user";

/** Who is signed in. Clerk verifies the session; Supabase verifies the Clerk token again on every query. */
export async function identity(): Promise<Identity | null> {
  if (e2eAuthEnabled()) return e2eIdentity();
  const a = await auth();
  if (!a.userId) return null;
  return {
    userId: a.userId,
    getToken: () => a.getToken(),
    profile: async () => {
      const u = await currentUser();
      return {
        username: u?.username ?? null, firstName: u?.firstName ?? "", lastName: u?.lastName ?? "",
        avatarUrl: u?.imageUrl ?? null, email: u?.primaryEmailAddress?.emailAddress ?? null,
      };
    },
  };
}

// ---- local browser tests only (see e2eAuthEnabled) -----------------------------------------------------------------
async function e2eIdentity(): Promise<Identity | null> {
  const key = (await cookies()).get(E2E_COOKIE)?.value;
  if (!key || !/^[a-z]{2,12}$/.test(key)) return null;
  const sub = `e2e_${key}`;
  const secret = process.env.E2E_JWT_SECRET;
  if (!secret) return null;
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const body = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ iss: "baseline-local-test", sub, role: "authenticated", aud: "authenticated", iat: now, exp: now + 300 })}`;
  const jwt = `${body}.${createHmac("sha256", secret).update(body).digest("base64url")}`;
  return {
    userId: sub,
    getToken: async () => jwt,
    profile: async () => ({ username: key === "newbie" ? null : `${key}_e2e`, firstName: key[0]!.toUpperCase() + key.slice(1), lastName: "Tester", avatarUrl: null, email: `${key}@e2e.test` }),
  };
}
