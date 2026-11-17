import { describe, expect, it } from "vitest";
import * as V from "@/lib/validation";
import { sameHost } from "@/lib/server/redirects";

describe("email + password rules", () => {
  it("passwords: 10+ characters with a letter and a number, at most 72", () => {
    expect(V.password.safeParse("rally-point-2026").success).toBe(true);
    for (const bad of ["short1", "onlyletterslong", "1234567890123", "a1".repeat(37)]) expect(V.password.safeParse(bad).success).toBe(false);
  });
  it("emails are trimmed and lower-cased", () => {
    expect(V.email.parse("  Pat@Example.COM ")).toBe("pat@example.com");
    expect(V.email.safeParse("not-an-email").success).toBe(false);
  });
  it("the new password must be typed the same twice", () => {
    expect(V.newPassword.safeParse({ password: "second-serve-77", confirm: "second-serve-78" }).success).toBe(false);
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
