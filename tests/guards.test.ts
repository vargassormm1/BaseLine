// Structural safety checks: these fail the build if a future change weakens a guarantee.
import { afterEach, describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { e2eAuthEnabled } from "@/lib/server/env";

const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? files(p) : [p]; });
const src = files("src").filter((f) => /\.(ts|tsx)$/.test(f));
const read = (f: string) => readFileSync(f, "utf8");

describe("the local test sign-in can never turn on outside local tests", () => {
  const saved = { ...process.env };
  afterEach(() => { process.env = { ...saved }; });
  const set = (env: Record<string, string | undefined>) => { for (const [k, v] of Object.entries(env)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; } };
  it("is on only with the flag, a local database, and not on Vercel", () => {
    set({ BASELINE_E2E: "1", SUPABASE_URL: "http://127.0.0.1:55321", VERCEL: undefined });
    expect(e2eAuthEnabled()).toBe(true);
  });
  it("is off on Vercel, against any non-local database, or without the flag", () => {
    set({ BASELINE_E2E: "1", SUPABASE_URL: "http://127.0.0.1:55321", VERCEL: "1" }); expect(e2eAuthEnabled()).toBe(false);
    set({ BASELINE_E2E: "1", SUPABASE_URL: "https://abc.supabase.co", VERCEL: undefined }); expect(e2eAuthEnabled()).toBe(false);
    set({ BASELINE_E2E: "1", SUPABASE_URL: "http://127.0.0.1.evil.com:55321", VERCEL: undefined }); expect(e2eAuthEnabled()).toBe(false);
    set({ BASELINE_E2E: undefined, SUPABASE_URL: "http://127.0.0.1:55321", VERCEL: undefined }); expect(e2eAuthEnabled()).toBe(false);
  });
});

describe("code structure", () => {
  it("browser components never import server code or secrets", () => {
    for (const f of src.filter((f) => /^\s*["']use client["']/.test(read(f)))) {
      expect(read(f), f).not.toMatch(/from ["']@\/lib\/server\//);
      expect(read(f), f).not.toMatch(/process\.env\.(?!NODE_ENV)/);
    }
  });
  it("every server action checks who is signed in first", () => {
    const actions = read("src/app/actions.ts");
    // signOut is the one action that needs no player (it only clears the session)
    const bodies = actions.split(/\nexport async function /).slice(1).filter((b) => !b.startsWith("signOut("));
    expect(bodies.length).toBeGreaterThan(8);
    for (const b of bodies) expect(b.split("\n").slice(1, 3).join("\n"), b.split("(")[0]).toMatch(/await (requirePlayer|getSession)\(\)/);
  });
  it("no raw HTML rendering and no eval anywhere", () => {
    for (const f of src) expect(read(f), f).not.toMatch(/dangerouslySetInnerHTML|\beval\(|new Function\(/);
  });
  it("the Supabase service/secret key is never used by the app", () => {
    for (const f of src) expect(read(f), f).not.toMatch(/SERVICE_ROLE|SUPABASE_SECRET|sb_secret_/);
  });
});
