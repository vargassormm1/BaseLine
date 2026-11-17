import type { NextConfig } from "next";

// Security headers for every response (the Content-Security-Policy, with a per-request nonce, is set in src/proxy.ts).
const headers = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const config: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Going back to a screen you just saw is instant for 30 seconds. Anything you change clears it at once; other
  // players' new results appear within 30 seconds (or on pull-to-refresh). In-memory per browser tab, never shared.
  experimental: { staleTimes: { dynamic: 30 } },
  async headers() { return [{ source: "/:path*", headers }]; },
};
export default config;
