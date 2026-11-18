# Username + password sign-in (no email)

Players can sign in with **Google** or with a **username and password**. No email is involved, so there's nothing to
set up for sending mail. The username form shows only when `BASELINE_PASSWORD_AUTH=1` is set in Vercel.

## How it works
- An invite link opens **Create account**: username (3–24 letters, numbers, `.` `-` `_`) + password (10+ characters,
  letters and numbers). They're signed in immediately and land on Welcome with that username filled in.
- Behind the scenes Supabase Auth needs an email, so the account is `<username>@players.baseline.invalid`, a reserved
  name that can't receive mail or belong to anyone. It is never shown.
- **Guard:** the Supabase "Before User Created" hook (`public.hook_before_user_created`, migration 0900) only lets
  password accounts use that reserved domain. With email confirmation off, this is what stops someone from calling
  the Auth API directly to create an instant account under a real email (e.g. a friend's Gmail), which Supabase could
  later merge with that friend's Google sign-in. Google sign-ups are unaffected. **Turn the hook on before the flag.**
- Becoming a player still needs a one-time invite. V1 history links only through Google.
- Settings → Account: password accounts can change their password (the current one is checked).
- **Forgot password:** there's no email to send a link to, so the admin resets it (below).
- Optional bot check: Cloudflare Turnstile (`TURNSTILE_SITE_KEY` in Vercel + the secret in Supabase Attack Protection).

## One-time setup (production)
1. `supabase db push --remote` (adds migration 0900, the hook function; nothing else changes).
2. **Supabase → Authentication → Hooks → Add hook → Before User Created:** type Postgres, schema `public`, function
   `hook_before_user_created`. Enable it.
3. **Supabase → Authentication → Sign In / Providers → Email:** enable the email provider, **Confirm email OFF**,
   minimum password length **10**, password requirements **letters and digits**. (Leave "Allow new users to sign up" on.)
4. **Vercel → base-line → Settings → Environment Variables (Production):** `BASELINE_PASSWORD_AUTH=1`, then redeploy.

Check: open an invite link, create an account with a username, finish Welcome, sign out, sign back in.

## Resetting a forgotten password (admin)
Supabase → SQL Editor, with their username and a temporary password you tell them (they change it in Settings):
```sql
update auth.users set encrypted_password = extensions.crypt('a-temporary-password-123', extensions.gen_salt('bf'))
where email = '<username>@players.baseline.invalid';
```
