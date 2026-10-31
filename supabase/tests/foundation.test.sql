begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;
select no_plan();

-- Disposable identities and data; this entire test transaction is rolled back.
insert into auth.users(id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000001', 'owner@example.invalid', '{"display_name":"Do not publish provider metadata"}'),
  ('00000000-0000-0000-0000-000000000002', 'member@example.invalid', '{}'),
  ('00000000-0000-0000-0000-000000000003', 'outsider@example.invalid', '{}');
insert into public.brackets(id, owner_id, title, visibility, timing_mode, status, started_at, total_rounds, current_round) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Owner draft', 'public', 'end-date', 'draft', null, null, null),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Public active', 'public', 'end-date', 'draft', null, null, null),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Private results', 'private', 'manual', 'draft', null, null, null),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003', 'Other draft', 'private', 'manual', 'draft', null, null, null);
insert into public.bracket_entries(id, bracket_id, seed, name) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 1, 'Pizza'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 2, 'Donuts'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 1, 'Red'),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000003', 2, 'Blue');
insert into public.bracket_rounds(bracket_id, round_index, status, starts_at, ends_at, closed_at) values
  ('10000000-0000-0000-0000-000000000002', 0, 'open', now() - interval '1 hour', now() + interval '1 hour', null),
  ('10000000-0000-0000-0000-000000000003', 0, 'open', now() - interval '1 hour', null, null);
insert into public.bracket_matchups(id, bracket_id, round_index, position, left_entry_id, right_entry_id) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 0, 0, '20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', 0, 0, '20000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000004');
-- Even an operator's pending result must not leak while its round is open.
insert into public.bracket_match_results(matchup_id, bracket_id, round_index, left_votes, right_votes, winner_entry_id, resolution) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 0, 10, 5, '20000000-0000-0000-0000-000000000001', 'votes'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', 0, 8, 8, '20000000-0000-0000-0000-000000000003', 'random_tie');
update public.brackets set status = 'active', started_at = now() - interval '1 hour', total_rounds = 1, current_round = 0
  where id in ('10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003');
update public.bracket_rounds set status = 'closed', closed_at = now() where bracket_id = '10000000-0000-0000-0000-000000000003';
update public.brackets set status = 'completed', current_round = 1, completed_at = now(), champion_entry_id = '20000000-0000-0000-0000-000000000003'
  where id = '10000000-0000-0000-0000-000000000003';
insert into app_private.bracket_invitations(id, bracket_id, token_hash, issued_by, revoked_at) values
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', repeat('a', 64), '00000000-0000-0000-0000-000000000001', now());
insert into public.bracket_memberships(bracket_id, user_id, invitation_id) values
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001');
insert into app_private.bracket_ballots(matchup_id, voter_id, bracket_id, round_index, selected_entry_id, last_request_id) values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 0, '20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001');

set local role anon;
select is((select count(*) from public.bracket_categories), 10::bigint, 'anonymous viewers can read the category catalog');
select is((select count(*) from public.trophy_catalog), 20::bigint, 'anonymous viewers can read the trophy catalog');
select is((select count(*) from public.brackets), 1::bigint, 'anonymous viewers see only published public brackets');
select is((select count(*) from public.bracket_entries), 2::bigint, 'anonymous viewers cannot fetch private entrants');
select is((select count(*) from public.bracket_match_results), 0::bigint, 'open public totals and closed private results are hidden from strangers');
select throws_ok($$select * from app_private.bracket_ballots$$, '42501', null, 'anonymous callers cannot fetch ballots');
select throws_ok($$select * from app_private.bracket_invitations$$, '42501', null, 'anonymous callers cannot fetch token verifiers');
select throws_ok($$select public.save_bracket_draft('10000000-0000-0000-0000-000000000005', 0, '', '', null, null, null, '{}', '{}')$$, '42501', null, 'anonymous callers cannot execute draft writes');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select is((select count(*) from public.profiles), 1::bigint, 'a user reads only their own full profile');
select is((select display_name from public.profiles), 'Competitor', 'provider metadata is not copied into a public display name');
select public.set_username('FoundationOwner');
select is((select count(*) from public.brackets), 3::bigint, 'the owner can read their draft, public bracket, and private bracket');
select is((select count(*) from public.bracket_match_results), 1::bigint, 'even the owner sees only finalized round results');
select throws_ok($$select * from app_private.bracket_ballots$$, '42501', null, 'the creator cannot inspect voter selections');
select throws_ok($$select * from app_private.bracket_invitations$$, '42501', null, 'the creator cannot directly read token verifiers');
select throws_ok($$update public.brackets set title = 'Tampered'$$, '42501', null, 'direct table updates cannot bypass controlled functions');
select throws_ok($$insert into public.bracket_memberships(bracket_id, user_id) values ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003')$$, '42501', null, 'the owner cannot bypass invitation membership controls');

select lives_ok($$select public.save_bracket_draft('10000000-0000-0000-0000-000000000005', 0, 'Snack showdown', '', 'food-drink', 'donut', 'private', '{"mode":"manual"}', array[' Chips ', 'Cookies'])$$, 'a signed-in owner saves a draft transactionally');
select lives_ok($$select public.save_bracket_draft('10000000-0000-0000-0000-000000000005', 0, 'Snack showdown', '', 'food-drink', 'donut', 'private', '{"mode":"manual"}', array['Chips', 'Cookies'])$$, 'a retried create is idempotent');
select is((select revision from public.brackets where id = '10000000-0000-0000-0000-000000000005'), 1::bigint, 'the retry does not advance the revision');
select is((select count(*) from public.bracket_entries where bracket_id = '10000000-0000-0000-0000-000000000005'), 2::bigint, 'the retry does not duplicate entries');
select is((select name from public.bracket_entries where bracket_id = '10000000-0000-0000-0000-000000000005' and seed = 1), 'Chips', 'names are trimmed and seed order is preserved');
select lives_ok($$select public.save_bracket_draft('10000000-0000-0000-0000-000000000005', 1, 'Better snack showdown', '', 'food-drink', 'donut', 'private', '{"mode":"manual"}', array['Chips', 'Cookies'])$$, 'the expected revision permits a draft update');
select is((select revision from public.brackets where id = '10000000-0000-0000-0000-000000000005'), 2::bigint, 'a changed save advances the revision');
select throws_ok($$select public.save_bracket_draft('10000000-0000-0000-0000-000000000005', 1, 'Outdated tab', '', 'food-drink', 'donut', 'private', '{"mode":"manual"}', array['Chips', 'Cookies'])$$, '40001', null, 'a stale tab cannot overwrite newer data');
select lives_ok($$select public.save_bracket_draft('10000000-0000-0000-0000-000000000005', 1, 'Better snack showdown', '', 'food-drink', 'donut', 'private', '{"mode":"manual"}', array['Chips', 'Cookies'])$$, 'a retried update returns its existing saved revision');
select lives_ok($$select public.save_bracket_draft('10000000-0000-0000-0000-000000000006', 0, '', '', null, null, null, '{}', '{}')$$, 'an incomplete draft is allowed before publication');
select throws_ok($$select public.save_bracket_draft('10000000-0000-0000-0000-000000000007', 0, 'Invalid public', '', null, null, 'public', '{"mode":"manual"}', '{}')$$, '22023', null, 'public manual schedules are rejected');
select throws_ok($$select public.save_bracket_draft('10000000-0000-0000-0000-000000000007', 0, 'Bad catalog', '', 'unknown', 'crown', 'private', '{}', '{}')$$, '22023', null, 'unknown catalog IDs are rejected');
select throws_ok($$select public.save_bracket_draft('10000000-0000-0000-0000-000000000007', 0, 'Too many', '', null, null, 'private', '{}', array_fill('Name'::text, array[33]))$$, '22023', null, 'drafts cannot exceed the supported field size');
select throws_ok($$select public.save_bracket_draft('10000000-0000-0000-0000-000000000007', 0, 'Bad schedule', '', null, null, 'private', '[]', '{}')$$, '22023', null, 'malformed schedule data is rejected');
select throws_ok($$select public.save_bracket_draft('10000000-0000-0000-0000-000000000004', 1, 'Stolen draft', '', null, null, 'private', '{}', '{}')$$, '42501', null, 'another creator cannot overwrite a draft');
select throws_ok($$select public.save_bracket_draft('10000000-0000-0000-0000-000000000002', 1, 'Changed started bracket', '', null, null, 'public', '{"mode":"end-date"}', '{}')$$, '55000', null, 'the draft function cannot modify started brackets');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is((select count(*) from public.brackets where id = '10000000-0000-0000-0000-000000000003'), 1::bigint, 'an existing member keeps access after their invitation link is revoked');
select is((select count(*) from public.bracket_match_results), 1::bigint, 'a member can read closed private results but not open public totals');
select is((select count(*) from public.brackets where status = 'draft'), 0::bigint, 'private members cannot read creator drafts');
select throws_ok($$select * from app_private.bracket_ballots$$, '42501', null, 'a member cannot directly query the ballot table, including their own row');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
select is((select count(*) from public.brackets where id = '10000000-0000-0000-0000-000000000003'), 0::bigint, 'an unrelated signed-in user cannot read private content');
select is((select count(*) from public.bracket_match_results), 0::bigint, 'private results do not leak through a different table');
select is((select count(*) from public.bracket_memberships), 0::bigint, 'an unrelated user cannot list private memberships');
select is((select count(*) from public.brackets where status = 'draft'), 1::bigint, 'an unrelated user can still access their own draft');

reset role;
update public.bracket_memberships set revoked_at = clock_timestamp() where user_id = '00000000-0000-0000-0000-000000000002';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is((select count(*) from public.brackets where id = '10000000-0000-0000-0000-000000000003'), 0::bigint, 'removing a member removes bracket access');
select is((select count(*) from public.bracket_match_results), 0::bigint, 'removing a member also removes result access');
select is((select count(*) from public.bracket_entries where bracket_id = '10000000-0000-0000-0000-000000000003'), 0::bigint, 'removing a member also removes entrant access');
select throws_ok($$insert into public.bracket_match_results(matchup_id, bracket_id, round_index, left_votes, right_votes, winner_entry_id, resolution) values ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 0, 1, 0, '20000000-0000-0000-0000-000000000001', 'votes')$$, '42501', null, 'callers cannot forge finalized results');

reset role;
select * from finish();
rollback;
