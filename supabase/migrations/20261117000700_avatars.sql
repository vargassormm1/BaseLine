-- Profile photos are chosen by the player (uploaded in Settings), never taken from the sign-in account.
-- players.avatar_url (V1 / sign-in photos) is kept for history and no longer shown.
alter table public.players add column avatar_path text
  check (avatar_path is null or avatar_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$');
grant select (avatar_path) on public.players to authenticated;

-- a public-read bucket for small, already-resized images (256px WebP, 300 KB max)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 307200, array['image/webp'])
on conflict (id) do update set public = true, file_size_limit = 307200, allowed_mime_types = array['image/webp'];

-- how many photo files a player currently has (definer: counts regardless of the caller's own visibility)
create or replace function public.my_avatar_count() returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int from storage.objects o where o.bucket_id = 'avatars' and (storage.foldername(o.name))[1] = (select public.me())::text
$$;
revoke all on function public.my_avatar_count() from public, anon;
grant execute on function public.my_avatar_count() to authenticated;

-- A player may see, add and remove files only inside their own folder; names must be <player id>/<uuid>.webp;
-- at most 3 files at a time (the current photo plus replacements in flight). No update policy: files are never overwritten.
create policy avatars_select_own on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select public.me())::text);
create policy avatars_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select public.me())::text
              and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$' and (select public.my_avatar_count()) < 3);
create policy avatars_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select public.me())::text);

-- called before every upload: rate limit (20 an hour)
create or replace function public.avatar_upload_ticket() returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.take_rate_limit(public.require_me(), 'avatar', 20, interval '1 hour');
end $$;
revoke all on function public.avatar_upload_ticket() from public, anon;
grant execute on function public.avatar_upload_ticket() to authenticated;

-- point my profile at one of my uploaded files (or null to go back to initials); returns the previous path
create or replace function public.set_avatar(p_path text default null) returns text
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public.require_me(); v_old text;
begin
  if p_path is not null and (p_path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$' or split_part(p_path, '/', 1) <> v_me::text
     or not exists (select 1 from storage.objects o where o.bucket_id = 'avatars' and o.name = p_path)) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select avatar_path into v_old from public.players where id = v_me;
  update public.players set avatar_path = p_path, updated_at = now() where id = v_me;
  return v_old;
end $$;
revoke all on function public.set_avatar(text) from public, anon;
grant execute on function public.set_avatar(text) to authenticated;
