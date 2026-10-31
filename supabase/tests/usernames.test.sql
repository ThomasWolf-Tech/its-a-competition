begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;
select no_plan();

insert into auth.users(id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-000000000031', 'username-one@example.invalid', '{"name":"Google Real Name", "picture":"https://example.invalid/photo"}'),
 ('00000000-0000-0000-0000-000000000032', 'username-two@example.invalid', '{}'),
 ('00000000-0000-0000-0000-000000000033', 'username-email@example.invalid', '{"requested_username":"Email_Player"}');
select is((select handle from public.profiles where id = '00000000-0000-0000-0000-000000000031'), null, 'Google metadata does not create a public username');
select is((select display_name from public.profiles where id = '00000000-0000-0000-0000-000000000031'), 'Competitor', 'real names are not imported');
select is((select handle from public.profiles where id = '00000000-0000-0000-0000-000000000033'), 'email_player', 'email signup claims the explicit username');
select is((select display_name from public.profiles where id = '00000000-0000-0000-0000-000000000033'), 'Email_Player', 'chosen capitalization is preserved');
select ok((select username_change_available_at = ((username_changed_at at time zone 'UTC') + interval '3 months') at time zone 'UTC' from public.profiles where id = '00000000-0000-0000-0000-000000000033'), 'signup starts a three-calendar-month waiting period');
select throws_ok($$insert into auth.users(id, raw_user_meta_data) values ('00000000-0000-0000-0000-000000000034', '{"requested_username":"EMAIL_player"}')$$, '23505', null, 'duplicate email-signup usernames fail atomically');
select throws_ok($$insert into auth.users(id, raw_user_meta_data) values ('00000000-0000-0000-0000-000000000034', '{"requested_username":"s_up_port"}')$$, '22023', null, 'signup cannot bypass reserved names');
select throws_ok($$insert into auth.users(id, raw_user_meta_data) values ('00000000-0000-0000-0000-000000000034', '{"requested_username":"bad name"}')$$, '22023', null, 'signup cannot bypass username format');
select ok(not exists(select 1 from auth.users where id = '00000000-0000-0000-0000-000000000034'), 'failed claims leave no partial account');
select ok(not (select prosecdef from pg_proc where oid = 'public.set_username(text)'::regprocedure), 'the exposed RPC uses invoker privileges');
select ok(not has_function_privilege('anon', 'app_private.set_username(text)', 'execute'), 'guests cannot execute the private setter');
select ok(not has_table_privilege('authenticated', 'public.profiles', 'update'), 'clients cannot set usernames or cooldown timestamps directly');

set local role anon;
select throws_ok($$select public.set_username('GuestName')$$, '42501', null, 'guest claims are denied');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000031","role":"authenticated"}', true);
select throws_ok($$select public.save_bracket_draft('10000000-0000-0000-0000-000000000031', 0, 'No username yet', '', 'food-drink', 'donut', 'private', '{"mode":"manual"}', array['Chips','Cookies'])$$, '42501', null, 'direct draft API requires a username');
select throws_ok($$select public.set_username('ab')$$, '22023', null, 'too-short names are rejected');
select throws_ok($$select public.set_username(repeat('a', 25))$$, '22023', null, 'too-long names are rejected');
select throws_ok($$select public.set_username('Name-Here')$$, '22023', null, 'punctuation is rejected');
select throws_ok($$select public.set_username('AdmIn')$$, '22023', null, 'reserved names ignore capitalization');
select throws_ok($$select public.set_username('its_a_competition')$$, '22023', null, 'brand impersonation with underscores is blocked');
select lives_ok($$select public.set_username('  MovieFan_1  ')$$, 'first username choice succeeds');
select is((select handle from public.profiles), 'moviefan_1', 'canonical username is lowercased and trimmed');
select is((select display_name from public.profiles), 'MovieFan_1', 'display username retains casing');
select lives_ok($$select public.set_username('MovieFan_1')$$, 'an identical retry is idempotent');
select throws_ok($$select public.set_username('NewMovieFan')$$, '55000', null, 'immediate renames are blocked');
select throws_ok($$select public.set_username('MOVIEFAN_1')$$, '55000', null, 'case-only edits also count as changes');
select throws_ok($$update public.profiles set username_change_available_at = now() - interval '1 day'$$, '42501', null, 'clients cannot bypass the waiting period');
select lives_ok($$select public.save_bracket_draft('10000000-0000-0000-0000-000000000031', 0, 'Username chosen', '', 'food-drink', 'donut', 'private', '{"mode":"manual"}', array['Chips','Cookies'])$$, 'onboarded users can save drafts');
reset role;
update auth.users set raw_user_meta_data = '{"requested_username":"MetadataOverride"}' where id = '00000000-0000-0000-0000-000000000031';
select is((select display_name from public.profiles where id = '00000000-0000-0000-0000-000000000031'), 'MovieFan_1', 'editing auth metadata does not rename a profile');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000032","role":"authenticated"}', true);
select throws_ok($$select public.set_username('mOvIeFaN_1')$$, '23505', null, 'another user cannot take the name with different casing');
select is((select handle from public.profiles), null, 'failed claims leave onboarding retryable');
select lives_ok($$select public.set_username('123_Player')$$, 'numbers may start a username');
select is((select count(*) from public.profiles), 1::bigint, 'profile reads remain owner-only');
reset role;
update public.profiles set username_changed_at = now() - interval '4 months', username_change_available_at = now() - interval '1 month' where id = '00000000-0000-0000-0000-000000000031';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000031","role":"authenticated"}', true);
select lives_ok($$select public.set_username('NewMovieFan')$$, 'a rename succeeds after the waiting period');
select ok((select username_change_available_at = ((username_changed_at at time zone 'UTC') + interval '3 months') at time zone 'UTC' from public.profiles), 'a rename restarts the full waiting period');
select throws_ok($$select public.set_username('AnotherName')$$, '55000', null, 'a second rename is denied');
select is((select owner_id from public.brackets where id = '10000000-0000-0000-0000-000000000031'), '00000000-0000-0000-0000-000000000031'::uuid, 'renames preserve bracket ownership by user ID');
reset role;
select is((select display_name from public.profiles where id = '00000000-0000-0000-0000-000000000032'), '123_Player', 'renames do not affect other profiles');
select * from finish();
rollback;
