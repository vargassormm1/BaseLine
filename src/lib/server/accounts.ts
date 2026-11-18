// Username accounts sign in to Supabase Auth with a reserved address that can never receive mail (RFC 2606 ".invalid").
// The Before User Created hook (migration 0900) only allows password accounts on this domain.
export const ACCOUNT_DOMAIN = "players.baseline.invalid";
export const accountEmail = (username: string) => `${username.trim().toLowerCase()}@${ACCOUNT_DOMAIN}`;
/** The username a password account signed up with, or null for Google accounts. */
export const accountUsername = (email: string | null | undefined) =>
  email && email.toLowerCase().endsWith(`@${ACCOUNT_DOMAIN}`) ? email.slice(0, -(ACCOUNT_DOMAIN.length + 1)) : null;
