import "server-only";
// Server-only configuration. Nothing here is ever sent to the browser.
const need = (k: string) => { const v = process.env[k]; if (!v) throw new Error(`Missing environment variable ${k}`); return v; };
export const env = {
  supabaseUrl: () => need("SUPABASE_URL"),
  supabaseKey: () => need("SUPABASE_PUBLISHABLE_KEY"),
};
/** Local browser tests sign in without Clerk. Triple-guarded: explicit flag, a local database, and never on Vercel. */
export const e2eAuthEnabled = () =>
  process.env.BASELINE_E2E === "1" && !process.env.VERCEL && /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(process.env.SUPABASE_URL ?? "");
/** Username + password sign-in is shown once the production Auth settings are in place (docs/PASSWORD_AUTH.md). */
export const passwordAuthEnabled = () => process.env.BASELINE_PASSWORD_AUTH === "1" || e2eAuthEnabled();
/** Cloudflare Turnstile site key (public). When set, the email forms show the bot check and Supabase verifies it. */
export const turnstileSiteKey = () => process.env.TURNSTILE_SITE_KEY || null;
