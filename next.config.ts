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
  // Google profile photos; img.clerk.com for V1 photos until each player's first Google sign-in replaces them
  images: { remotePatterns: [{ protocol: "https", hostname: "lh3.googleusercontent.com" }, { protocol: "https", hostname: "img.clerk.com" }] },
  async headers() { return [{ source: "/:path*", headers }]; },
};
export default config;
