begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;
select no_plan();

select ok(not (select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'save_bracket_draft'), 'the exposed draft RPC uses caller privileges');
select ok((select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'app_private' and p.proname = 'save_bracket_draft'), 'privileged draft implementation stays in the unexposed schema');
select ok(not has_function_privilege('anon', 'app_private.save_bracket_draft(uuid,bigint,text,text,text,text,text,jsonb,text[])', 'execute'), 'anonymous users cannot execute the private implementation');

insert into auth.users(id, email) values ('00000000-0000-0000-0000-000000000011', 'policy-owner@example.invalid');
insert into public.brackets(id, owner_id, title, visibility, timing_mode) values
  ('10000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000011', 'Private manual policies', 'private', 'manual'),
  ('10000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000011', 'Public timed policies', 'public', 'end-date');
insert into public.bracket_entries(id, bracket_id, seed, name) values
  ('20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000011', 1, 'Alpha'),
  ('20000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000011', 2, 'Beta'),
  ('20000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000011', 3, 'Gamma'),
  ('20000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000011', 4, 'Delta'),
  ('20000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000012', 1, 'Pizza'),
  ('20000000-0000-0000-0000-000000000022', '10000000-0000-0000-0000-000000000012', 2, 'Donuts');
insert into public.bracket_rounds(bracket_id, round_index, status, starts_at, ends_at) values
  ('10000000-0000-0000-0000-000000000011', 0, 'open', now(), null),
  ('10000000-0000-0000-0000-000000000011', 1, 'upcoming', null, null),
  ('10000000-0000-0000-0000-000000000012', 0, 'open', now(), now() + interval '1 hour');
insert into public.bracket_matchups(id, bracket_id, round_index, position, left_entry_id, right_entry_id) values
  ('30000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000011', 0, 0, '20000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000014'),
  ('30000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000011', 0, 1, '20000000-0000-0000-0000-000000000012', '20000000-0000-0000-0000-000000000013'),
  ('30000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000011', 1, 0, null, null),
  ('30000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000012', 0, 0, '20000000-0000-0000-0000-000000000021', '20000000-0000-0000-0000-000000000022');
update public.brackets set status = 'active', started_at = now(), total_rounds = 2, current_round = 0 where id = '10000000-0000-0000-0000-000000000011';
update public.brackets set status = 'active', started_at = now(), total_rounds = 1, current_round = 0 where id = '10000000-0000-0000-0000-000000000012';

select throws_ok($$update public.brackets set visibility = 'public' where id = '10000000-0000-0000-0000-000000000011'$$, '55000', null, 'private visibility is frozen after start');
select throws_ok($$update public.brackets set timing_mode = 'end-date' where id = '10000000-0000-0000-0000-000000000011'$$, '55000', null, 'private timing mode is frozen after start');
select throws_ok($$update public.brackets set schedule_preferences = '{"changed":true}' where id = '10000000-0000-0000-0000-000000000011'$$, '55000', null, 'private schedule preferences are frozen after start');
select throws_ok($$update public.bracket_entries set name = 'Replacement' where id = '20000000-0000-0000-0000-000000000011'$$, '55000', null, 'started competitors cannot be replaced');
select throws_ok($$update public.bracket_entries set seed = 5 where id = '20000000-0000-0000-0000-000000000011'$$, '55000', null, 'started competitors cannot be reseeded');
select throws_ok($$delete from public.bracket_entries where id = '20000000-0000-0000-0000-000000000011'$$, '55000', null, 'started competitors cannot be removed');
select throws_ok($$insert into public.bracket_entries(bracket_id, seed, name) values ('10000000-0000-0000-0000-000000000011', 5, 'Extra')$$, '55000', null, 'started competitors cannot be added');
select throws_ok($$update public.bracket_rounds set ends_at = ends_at + interval '1 hour' where bracket_id = '10000000-0000-0000-0000-000000000012'$$, '55000', null, 'published deadlines cannot be extended');
select throws_ok($$update public.brackets set status = 'draft', started_at = null, total_rounds = null, current_round = null where id = '10000000-0000-0000-0000-000000000011'$$, '55000', null, 'started brackets cannot return to draft');

insert into app_private.bracket_invitations(id, bracket_id, token_hash, issued_by, expires_at) values
  ('40000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000011', repeat('b', 64), '00000000-0000-0000-0000-000000000011', now() + interval '1 year');
select is((select expires_at - created_at from app_private.bracket_invitations where id = '40000000-0000-0000-0000-000000000011'), interval '168 hours', 'an invitation always lasts exactly seven days from issuance');
select throws_ok($$update app_private.bracket_invitations set expires_at = expires_at + interval '1 hour' where id = '40000000-0000-0000-0000-000000000011'$$, '55000', null, 'an existing link cannot be extended instead of issuing a replacement');
select lives_ok($$update app_private.bracket_invitations set revoked_at = clock_timestamp() where id = '40000000-0000-0000-0000-000000000011'$$, 'an invitation may still be revoked early');
select throws_ok($$update app_private.bracket_invitations set revoked_at = null where id = '40000000-0000-0000-0000-000000000011'$$, '55000', null, 'a revoked invitation cannot be restored');

insert into app_private.bracket_ballots(matchup_id, voter_id, bracket_id, round_index, selected_entry_id, last_request_id) values
  ('30000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000011', 0, '20000000-0000-0000-0000-000000000011', gen_random_uuid()),
  ('30000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000011', 0, '20000000-0000-0000-0000-000000000012', gen_random_uuid());
select throws_ok($$update public.bracket_rounds set status = 'closed', closed_at = clock_timestamp() where bracket_id = '10000000-0000-0000-0000-000000000011' and round_index = 0$$, '55000', null, 'closure without results is rejected');
select is((select count(*) from app_private.bracket_ballots), 2::bigint, 'failed finalization preserves individual votes');
insert into public.bracket_match_results(matchup_id, bracket_id, round_index, left_votes, right_votes, winner_entry_id, resolution) values
  ('30000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000011', 0, 1, 0, '20000000-0000-0000-0000-000000000011', 'votes');
select throws_ok($$update public.bracket_rounds set status = 'closed', closed_at = clock_timestamp() where bracket_id = '10000000-0000-0000-0000-000000000011' and round_index = 0$$, '55000', null, 'one missing matchup result prevents deletion');
insert into public.bracket_match_results(matchup_id, bracket_id, round_index, left_votes, right_votes, winner_entry_id, resolution) values
  ('30000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000011', 0, 1, 0, '20000000-0000-0000-0000-000000000012', 'votes');
select throws_ok($$do $body$ begin update public.bracket_rounds set status = 'closed', closed_at = clock_timestamp() where bracket_id = '10000000-0000-0000-0000-000000000011' and round_index = 0; raise exception 'Simulated later failure'; end $body$;$$, 'P0001', 'Simulated later failure', 'a later failure rolls back the whole finalization');
select is((select count(*) from app_private.bracket_ballots), 2::bigint, 'rollback also restores deleted ballots');
select lives_ok($$update public.bracket_rounds set status = 'closed', closed_at = clock_timestamp() where bracket_id = '10000000-0000-0000-0000-000000000011' and round_index = 0$$, 'a manual round with all results can finalize');
select is((select count(*) from app_private.bracket_ballots), 0::bigint, 'successful finalization deletes that round individual votes');
select is((select count(*) from public.bracket_match_results where bracket_id = '10000000-0000-0000-0000-000000000011'), 2::bigint, 'final matchup totals and winners remain');
select throws_ok($$update public.bracket_match_results set left_votes = 9 where matchup_id = '30000000-0000-0000-0000-000000000011'$$, '55000', null, 'closed matchup totals cannot change');
select throws_ok($$delete from public.bracket_match_results where matchup_id = '30000000-0000-0000-0000-000000000011'$$, '55000', null, 'closed matchup history cannot be removed');
select throws_ok($$update public.bracket_rounds set status = 'open', closed_at = null where bracket_id = '10000000-0000-0000-0000-000000000011' and round_index = 0$$, '55000', null, 'closed rounds cannot be reopened');
select lives_ok($$update public.bracket_rounds set status = 'open', starts_at = clock_timestamp() where bracket_id = '10000000-0000-0000-0000-000000000011' and round_index = 1$$, 'manual private rounds can establish their start time when opened');

insert into public.bracket_match_results(matchup_id, bracket_id, round_index, left_votes, right_votes, winner_entry_id, resolution) values
  ('30000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000012', 0, 0, 0, '20000000-0000-0000-0000-000000000021', 'seed');
select throws_ok($$update public.bracket_rounds set status = 'closed', closed_at = clock_timestamp() where bracket_id = '10000000-0000-0000-0000-000000000012'$$, '55000', null, 'a scheduled round cannot close early even when results exist');
select * from finish();
rollback;
