-- Sign-in moves from Clerk to Supabase Auth (Google only). Matches, sets, points and history are untouched; only
-- how a player is identified changes.
--   * players.auth_user_id links a player to their Supabase Auth user.
--   * V1 players (Clerk ids kept for history) link themselves on their first Google sign-in, by their verified email
--     (the same Google email they used with Clerk). Only unlinked players can be claimed, only by a Google-verified email.
--   * New players still need an invite.
alter table public.players add column auth_user_id uuid unique references auth.users (id) on delete set null;
alter table public.players alter column clerk_user_id drop not null;
comment on column public.players.clerk_user_id is 'V1/Clerk user id, kept for history only (no longer used to sign in).';

-- identity: the Supabase Auth user (anonymous sessions are never players)
create or replace function public.me() returns uuid
language sql stable security definer set search_path = '' as $$
  select p.id from public.players p
  where p.auth_user_id = (select auth.uid()) and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
$$;

drop function public.ensure_player(text, text, text, text, text, text);
drop function public.jwt_sub();
drop table public.app_settings;

-- Called by the server after every sign-in with the profile from Google. Returns the player:
-- linked already → that player · unlinked player with this verified Google email → link it · else invite → new player.
create or replace function public.ensure_player(p_username text, p_first_name text, p_last_name text, p_avatar_url text, p_invite text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_claims jsonb := (select auth.jwt());
  v_email text := lower(nullif(trim(v_claims ->> 'email'), ''));
  v_google boolean := coalesce(v_claims -> 'app_metadata' ->> 'provider', '') = 'google'
                      or coalesce(v_claims -> 'app_metadata' -> 'providers', '[]'::jsonb) ? 'google';
  v_verified boolean := coalesce((v_claims -> 'user_metadata' ->> 'email_verified')::boolean, false);
  v_avatar text := case when p_avatar_url ~ '^https://(lh[0-9]\.googleusercontent\.com|img\.clerk\.com|images\.clerk\.dev)/' then p_avatar_url end;
  v_id uuid;
  v_hash text;
begin
  if v_uid is null or coalesce((v_claims ->> 'is_anonymous')::boolean, false) then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;

  select id into v_id from public.players where auth_user_id = v_uid;
  if v_id is not null then
    update public.players set avatar_url = coalesce(v_avatar, avatar_url), updated_at = now()
      where id = v_id and avatar_url is distinct from coalesce(v_avatar, avatar_url);
    return v_id;
  end if;

  -- an existing (e.g. V1) player with this verified Google email, not yet linked to anyone
  if v_google and v_verified and v_email is not null then
    select p.id into v_id from public.players p join public.player_private pp on pp.player_id = p.id
    where lower(pp.email) = v_email and p.auth_user_id is null
    for update of p;
    if v_id is not null then
      update public.players set auth_user_id = v_uid, avatar_url = coalesce(v_avatar, avatar_url), updated_at = now() where id = v_id;
      return v_id;
    end if;
  end if;

  -- a new player: needs a valid, unused invite
  if p_username is null or p_username !~ '^[A-Za-z0-9_.-]{3,24}$' then raise exception 'invalid_username'; end if;
  if p_invite is null or length(p_invite) > 40 then raise exception 'invite_required'; end if;
  v_hash := encode(extensions.digest(upper(regexp_replace(p_invite, '[^A-Za-z0-9]', '', 'g')), 'sha256'), 'hex');
  perform 1 from public.invites where code_hash = v_hash and used_by is null and expires_at > now() for update;
  if not found then raise exception 'invalid_invite'; end if;
  begin
    insert into public.players (auth_user_id, username, first_name, last_name, avatar_url)
    values (v_uid, p_username, left(coalesce(trim(p_first_name), ''), 40), left(coalesce(trim(p_last_name), ''), 40), v_avatar)
    returning id into v_id;
  exception when unique_violation then
    raise exception 'username_taken';
  end;
  update public.invites set used_by = v_id, used_at = now() where code_hash = v_hash;
  if v_email is not null and length(v_email) <= 254 then
    insert into public.player_private (player_id, email) values (v_id, v_email) on conflict do nothing;
  end if;
  return v_id;
end $$;
revoke all on function public.ensure_player(text, text, text, text, text) from public, anon;
grant execute on function public.ensure_player(text, text, text, text, text) to authenticated;

-- Admin escape hatch: link a player whose Google email differs from the one on file (run in the SQL editor).
--   update public.players set auth_user_id = (select id from auth.users where email = '<their google email>')
--   where username = '<their username>' and auth_user_id is null;
