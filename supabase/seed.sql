-- Local development / browser-test data. FICTIONAL players only (never real data; real data arrives only through
-- scripts/migrate-from-v1.mjs). Deterministic: same seed, same matches. Applied by `supabase db reset`.
-- e2e_* Clerk ids match the local test sign-in (/e2e/sign-in?u=ana → player "ana_e2e").
select setseed(0.42);

-- local auth users for the test sign-in (fictional, Google-style); e2e user N → auth id 10000000-…-00000000000N
insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', ('10000000-0000-4000-8000-0000000000' || k)::uuid, 'authenticated', 'authenticated',
       name || '@e2e.test', now(), '{"provider":"google","providers":["google"]}', jsonb_build_object('email_verified', true, 'full_name', initcap(name) || ' Tester'), now(), now()
from (values ('0a', 'ana'), ('0b', 'ben'), ('0c', 'cy'), ('0d', 'dee'), ('ff', 'newbie'), ('fe', 'claimer')) as t(k, name);

insert into public.players (id, auth_user_id, username, first_name, last_name, is_admin) values
  ('00000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-00000000000a', 'ana_e2e',  'Ana', 'Reyes',     true),
  ('00000000-0000-4000-8000-00000000000b', '10000000-0000-4000-8000-00000000000b', 'ben_e2e',  'Ben', 'Okafor',    false),
  ('00000000-0000-4000-8000-00000000000c', '10000000-0000-4000-8000-00000000000c', 'cy_e2e',   'Cy',  'Lindqvist', false),
  ('00000000-0000-4000-8000-00000000000d', '10000000-0000-4000-8000-00000000000d', 'dee_e2e',  'Dee', 'Marsh',     false),
  ('00000000-0000-4000-8000-00000000000e', null, 'eli.court', 'Eli', 'Navarro',  false),
  ('00000000-0000-4000-8000-00000000000f', null, 'fayserves', 'Fay', 'Whitlock', false);
-- Fay is a "V1-style" player not yet linked: the claimer test user (claimer@e2e.test) links to her on first sign-in
insert into public.player_private (player_id, email) values ('00000000-0000-4000-8000-00000000000f', 'claimer@e2e.test');

-- ~70 confirmed matches over the last ~14 months, weighted so there's a real table (Ana and Ben lead, a rivalry with Cy)
do $$
declare
  ids uuid[] := array['00000000-0000-4000-8000-00000000000a','00000000-0000-4000-8000-00000000000b','00000000-0000-4000-8000-00000000000c',
                      '00000000-0000-4000-8000-00000000000d','00000000-0000-4000-8000-00000000000e','00000000-0000-4000-8000-00000000000f']::uuid[];
  strength int[] := array[70, 66, 55, 45, 40, 35];
  scores int[][] := array[[6,0],[6,1],[6,2],[6,3],[6,4],[6,4],[7,5],[6,3]];
  i int; a int; b int; fmt smallint; won_a boolean; mid uuid; day date; sets int; wa int; wb int; s int; sc int; w int; l int; tb boolean;
begin
  for i in 1..72 loop
    a := 1 + floor(random() * 6)::int;
    b := 1 + floor(random() * 5)::int; if b >= a then b := b + 1; end if;
    fmt := case when random() < 0.75 then 1 when random() < 0.9 then 3 else 5 end;
    day := (now() at time zone 'America/New_York')::date - (430 - i * 6) + floor(random() * 3)::int;
    if day > (now() at time zone 'America/New_York')::date then day := (now() at time zone 'America/New_York')::date; end if;
    won_a := random() * (strength[a] + strength[b]) < strength[a];
    mid := gen_random_uuid();
    insert into public.matches (id, format, player_one, player_two, winner_id, status, played_on, points_awarded, created_at, responded_at, confirmed_at)
    values (mid, fmt, ids[a], ids[b], case when won_a then ids[a] else ids[b] end, 'confirmed', day, public.points_for(fmt),
            day + time '18:00', day + time '20:00', day + time '20:00');
    -- sets: the winner takes (fmt+1)/2, the loser may take some before that
    sets := (fmt + 1) / 2; wa := 0; wb := 0; s := 0;
    while wa < sets and wb < sets loop
      s := s + 1;
      sc := 1 + floor(random() * 8)::int; w := scores[sc][1]; l := scores[sc][2]; tb := random() < 0.12;
      if tb then w := 7; l := 6; end if;
      -- the eventual winner wins the deciding sets; the loser can steal earlier ones
      if (won_a and (wb = sets - 1 or random() < 0.7)) or (not won_a and not (wa = sets - 1 or random() < 0.7)) then
        wa := wa + 1;
        insert into public.match_sets values (mid, s, w, l, case when tb then 7 end, case when tb then 3 + floor(random() * 3)::int end, false);
      else
        wb := wb + 1;
        insert into public.match_sets values (mid, s, l, w, case when tb then 3 + floor(random() * 3)::int end, case when tb then 7 end, false);
      end if;
    end loop;
    -- keep the stored winner consistent with the sets
    update public.matches set winner_id = case when wa > wb then ids[a] else ids[b] end where id = mid;
  end loop;
end $$;

-- something to act on: Ben recorded a match against Ana (waiting for Ana), and Cy challenged Ana
insert into public.matches (id, format, player_one, player_two, winner_id, status, played_on, points_awarded)
values ('00000000-0000-4000-8000-0000000000f1', 1, '00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-00000000000a',
        '00000000-0000-4000-8000-00000000000b', 'pending', (now() at time zone 'America/New_York')::date, 5);
insert into public.match_sets values ('00000000-0000-4000-8000-0000000000f1', 1, 6, 4, null, null, false);
insert into public.challenges (challenger, opponent, format, message)
values ('00000000-0000-4000-8000-00000000000c', '00000000-0000-4000-8000-00000000000a', 3, 'Rematch. Saturday morning?');

-- a known invite for the new-player browser test (code TESTINVITE23, from Ana)
insert into public.invites (code_hash, created_by)
values (encode(extensions.digest('TESTINVITE23', 'sha256'), 'hex'), '00000000-0000-4000-8000-00000000000a');
