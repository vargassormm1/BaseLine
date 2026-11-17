# Email + password sign-in

Players can sign in with Google **or** an email and password. The email form only appears when
`BASELINE_EMAIL_AUTH=1` is set in Vercel, so the code can ship before email sending is set up.

## How it works
- **Create account** (`/sign-in`, opened automatically from an invite link): email + password (10+ characters,
  letters and numbers). Supabase sends a confirmation email; the account can't sign in until it's confirmed.
- The email link goes to `/auth/confirm?token_hash=…`, which verifies it and signs the person in. It works in any
  browser or device, and only once. Then the normal flow: `/welcome` (invite code + username + name) → Home.
- **Forgot password** sends a reset link → `/reset-password` → new password → Home.
- Answers never reveal whether an email has an account (sign-up and reset always say "check your email").
- **V1 history links only through Google.** An email account can't claim a V1 player (the link reads Google's own
  verified identity), so someone can't register a friend's email to take their history. A V1 player who wants to use
  email: sign in with Google once (links the history), or ask the admin to link it.
- Confirmation is required. If Supabase ever returns a session at sign-up (confirmations off), the app signs it out
  and refuses, so a misconfigured project can't create unverified accounts.
- Bot check: Cloudflare Turnstile, optional (free). When `TURNSTILE_SITE_KEY` is set, the forms show it and the CSP
  allows Cloudflare's frame; Supabase verifies the token.

## One-time setup (production), then flip the flag
1. **A sender with no domain: Gmail.** On the Google account that will send the emails: turn on 2-Step Verification,
   then create an App Password (Google Account → Security → App passwords). Keep it private.
2. **Supabase → Authentication → Emails → SMTP Settings:** enable custom SMTP.
   Host `smtp.gmail.com`, port `465`, username = that Gmail address, password = the app password,
   sender email = that Gmail address, sender name `Baseline`.
3. **Supabase → Authentication → Emails → Templates:** paste `supabase/templates/confirmation.html` into
   "Confirm signup" (subject: Confirm your email for Baseline) and `supabase/templates/recovery.html` into
   "Reset password" (subject: Reset your Baseline password).
4. **Supabase → Authentication → Sign In / Providers → Email:** enabled, **Confirm email ON**, Secure email change ON,
   minimum password length **10**, password requirements **letters and digits**.
5. **Supabase → Authentication → URL Configuration:** Site URL `https://base-line.vercel.app`; redirect URLs include
   `https://base-line.vercel.app/**`.
6. **Supabase → Authentication → Rate Limits:** emails per hour ~30 (Gmail allows ~500 a day).
7. *(Optional, recommended)* **Turnstile:** Cloudflare dashboard → Turnstile → add a widget for `base-line.vercel.app`
   (managed). Put the **secret** in Supabase → Authentication → Attack Protection → CAPTCHA (Turnstile), and the
   **site key** in Vercel as `TURNSTILE_SITE_KEY`. Do both together: with CAPTCHA on in Supabase and no site key in
   Vercel, email sign-in fails (Google is unaffected).
8. **Vercel → base-line → Settings → Environment Variables (Production):** `BASELINE_EMAIL_AUTH=1`, then redeploy.

Check: create an account with a second email address, confirm it, join with an invite, sign out, sign back in, and
try "Forgot password?".

## Local
`supabase/config.toml` has confirmations on, the same templates and password rules; emails land in Mailpit
(http://127.0.0.1:55324). The browser tests sign up, confirm, join, reset the password and sign back in.
