-- Second independent review (2026-11-17), finding 1: linking a V1 player trusted JWT claims. The `email` claim is
-- auth.users.email (a user can request to change it) and user_metadata.email_verified is user-editable. The link now
-- reads the Google identity row itself (written only by Supabase Auth from Google's response).
-- Also: attempts to join with an invite are limited per signed-in account (they aren't players yet, so the player
-- rate limiter can't count them). Over the limit or a bad code returns null (no exception, so the count persists).
create table public.auth_rate_limits (
  user_id uuid not null references auth.users (id) on delete cascade,
  bucket text not null,
  window_start timestamptz not null,
  hits integer not null,
  primary key (user_id, bucket)
);
alter table public.auth_rate_limits enable row level security;
alter table public.auth_rate_limits force row level security;
revoke all on public.auth_rate_limits from anon, authenticated;

drop function public.ensure_player(text, text, text, text, text);
create or replace function public.ensure_player(p_username text, p_first_name text, p_last_name text, p_invite text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text;
  v_id uuid;
  v_hash text;
  v_hits int;
begin
  if v_uid is null or coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;

  select id into v_id from public.players where auth_user_id = v_uid;
  if v_id is not null then return v_id; end if;

  -- the email Google itself verified for this account (never a JWT claim)
  select lower(i.identity_data ->> 'email') into v_email
  from auth.identities i
  where i.user_id = v_uid and i.provider = 'google' and i.identity_data -> 'email_verified' = 'true'::jsonb
  order by i.last_sign_in_at desc nulls last limit 1;

  -- an existing (V1) player with that email, not yet linked to anyone
  if v_email is not null then
    select p.id into v_id from public.players p join public.player_private pp on pp.player_id = p.id
    where lower(pp.email) = v_email and p.auth_user_id is null
    for update of p;
    if v_id is not null then
      update public.players set auth_user_id = v_uid, updated_at = now() where id = v_id;
      return v_id;
    end if;
  end if;

  -- a new player: needs a valid, unused invite (10 tries an hour per account)
  if p_invite is null or length(p_invite) > 40 then raise exception 'invite_required'; end if;
  if p_username is null or p_username !~ '^[A-Za-z0-9_.-]{3,24}$' then raise exception 'invalid_username'; end if;
  insert into public.auth_rate_limits as r (user_id, bucket, window_start, hits) values (v_uid, 'join', now(), 1)
  on conflict (user_id, bucket) do update
    set hits = case when r.window_start < now() - interval '1 hour' then 1 else r.hits + 1 end,
        window_start = case when r.window_start < now() - interval '1 hour' then now() else r.window_start end
  returning hits into v_hits;
  if v_hits > 10 then return null; end if;
  v_hash := encode(extensions.digest(upper(regexp_replace(p_invite, '[^A-Za-z0-9]', '', 'g')), 'sha256'), 'hex');
  perform 1 from public.invites where code_hash = v_hash and used_by is null and expires_at > now() for update;
  if not found then return null; end if;
  begin
    insert into public.players (auth_user_id, username, first_name, last_name)
    values (v_uid, p_username, left(coalesce(trim(p_first_name), ''), 40), left(coalesce(trim(p_last_name), ''), 40))
    returning id into v_id;
  exception when unique_violation then
    raise exception 'username_taken';
  end;
  update public.invites set used_by = v_id, used_at = now() where code_hash = v_hash;
  if v_email is not null then
    insert into public.player_private (player_id, email) values (v_id, v_email) on conflict do nothing;
  end if;
  return v_id;
end $$;
revoke all on function public.ensure_player(text, text, text, text) from public, anon;
grant execute on function public.ensure_player(text, text, text, text) to authenticated;
