-- Username + password accounts (no email), alongside Google. Supabase Auth needs an email for password accounts, so
-- the app signs people up as <username>@players.baseline.invalid: a reserved name that can never receive mail or
-- belong to anyone (RFC 2606). Email confirmation is off for that reason.
--
-- Guard (Supabase "Before User Created" hook): a password account may only use that reserved address. Without it,
-- anyone could call the Auth API directly to make an instantly-confirmed account under a real email (e.g. a friend's
-- Gmail), which Supabase would later merge with that friend's Google sign-in. Google sign-ups are unaffected.
-- Enable it in the dashboard: Authentication → Hooks → Before User Created → Postgres → public.hook_before_user_created.
create or replace function public.hook_before_user_created(event jsonb) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  v_provider text := coalesce(event -> 'user' -> 'app_metadata' ->> 'provider', '');
  v_email text := lower(coalesce(event -> 'user' ->> 'email', ''));
  v_ours boolean := v_email ~ '^[a-z0-9_.-]{3,24}@players\.baseline\.invalid$';
begin
  if v_provider = 'email' and not v_ours then
    return jsonb_build_object('error', jsonb_build_object('http_code', 400, 'message', 'Create an account with a username.'));
  end if;
  if v_provider <> 'email' and v_email like '%@players.baseline.invalid' then
    return jsonb_build_object('error', jsonb_build_object('http_code', 400, 'message', 'Not allowed.'));
  end if;
  if (event -> 'user' ->> 'phone') <> '' then
    return jsonb_build_object('error', jsonb_build_object('http_code', 400, 'message', 'Not allowed.'));
  end if;
  return '{}'::jsonb;
end $$;
revoke all on function public.hook_before_user_created(jsonb) from public, anon, authenticated;
grant execute on function public.hook_before_user_created(jsonb) to supabase_auth_admin;
