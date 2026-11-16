import { defineConfig, devices } from "@playwright/test";

// Browser tests run against a production build in local test mode: the local Supabase (fictional seed data) and the
// local-only test sign-in (src/lib/server/env.ts → e2eAuthEnabled). Never against real data or real accounts.
const PORT = 3190;
export const E2E_ENV = {
  BASELINE_E2E: "1",
  SUPABASE_URL: "http://127.0.0.1:55321",
  SUPABASE_PUBLISHABLE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0",
  E2E_JWT_SECRET: "super-secret-jwt-token-with-at-least-32-characters-long",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_ZTJlLmV4YW1wbGUuY29tJA",
  CLERK_SECRET_KEY: "sk_test_e2e_not_used",
};

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["line"]],
  use: { baseURL: `http://127.0.0.1:${PORT}`, trace: "retain-on-failure" },
  projects: [
    { name: "phone", use: { ...devices["iPhone 15"], browserName: "chromium" } },
    { name: "desktop", use: { viewport: { width: 1360, height: 900 }, colorScheme: "dark" } },
  ],
  webServer: {
    command: `npx --no-install next build && npx --no-install next start -p ${PORT} -H 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 300_000,
    env: E2E_ENV,
  },
});
