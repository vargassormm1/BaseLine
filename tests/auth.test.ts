import { describe, expect, it } from "vitest";
import * as V from "@/lib/validation";
import { sameHost } from "@/lib/server/redirects";
import { accountEmail, accountUsername } from "@/lib/server/accounts";

describe("email + password rules", () => {
  it("passwords: 10+ characters with a letter and a number, at most 72", () => {
    expect(V.password.safeParse("rally-point-2026").success).toBe(true);
    for (const bad of ["short1", "onlyletterslong", "1234567890123", "a1".repeat(37)]) expect(V.password.safeParse(bad).success).toBe(false);
  });
  it("usernames are trimmed and lower-cased, with the same rules as player usernames", () => {
    expect(V.login.parse("  Pat_99 ")).toBe("pat_99");
    for (const bad of ["ab", "has space", "a@b", "x".repeat(25)]) expect(V.login.safeParse(bad).success).toBe(false);
  });
  it("the new password must be typed the same twice", () => {
    expect(V.changePassword.safeParse({ current: "x", password: "second-serve-77", confirm: "second-serve-78" }).success).toBe(false);
    expect(V.changePassword.safeParse({ current: "x", password: "second-serve-77", confirm: "second-serve-77" }).success).toBe(true);
  });
});

describe("sameHost", () => {
  const req = (h: Record<string, string>) => ({ headers: new Headers(h), nextUrl: { protocol: "http:", origin: "http://localhost:3190" } });
  it("redirects on the host the request came in on", () => {
    expect(sameHost(req({ host: "127.0.0.1:3190" }), "/home").href).toBe("http://127.0.0.1:3190/home");
    expect(sameHost(req({ "x-forwarded-host": "base-line.vercel.app", "x-forwarded-proto": "https" }), "/home").href).toBe("https://base-line.vercel.app/home");
  });
  it("ignores a malformed host header", () => {
    expect(sameHost(req({ host: "evil.com/@x" }), "/home").href).toBe("http://localhost:3190/home");
  });
});

describe("username accounts", () => {
  it("map to the reserved never-deliverable domain and back", () => {
    expect(accountEmail(" Pat ")).toBe("pat@players.baseline.invalid");
    expect(accountUsername("pat@players.baseline.invalid")).toBe("pat");
    expect(accountUsername("pat@gmail.com")).toBeNull();
    expect(accountUsername(null)).toBeNull();
  });
});
