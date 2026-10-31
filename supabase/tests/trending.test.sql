begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;
select no_plan();

select ok(not has_table_privilege('anon', 'app_private.bracket_vote_activity', 'select'), 'anonymous callers cannot read ranking counters');
select ok(not has_table_privilege('authenticated', 'app_private.bracket_vote_activity', 'insert'), 'signed-in callers cannot manufacture activity');
select ok(not has_function_privilege('anon', 'app_private.record_bracket_vote_activity()', 'execute'), 'the capture trigger is not a callable API');
select ok(not (select prosecdef from pg_proc where oid = 'public.get_trending_brackets()'::regprocedure), 'the exposed discovery wrapper uses caller privileges');
select is(jsonb_array_length(public.get_trending_brackets()->'categories'), 10, 'empty discovery still includes every category');

insert into auth.users(id, email) values ('00000000-0000-0000-0000-000000000091', 'trending-owner@example.invalid');
create temp table trending_fixtures as
select category, n, gen_random_uuid() as id
from unnest(array['food-drink','movies-tv','sports','video-games','music']) category cross join generate_series(1, 10) n
union all select 'books-stories', n, gen_random_uuid() from generate_series(1, 3) n;
insert into public.brackets(id, owner_id, title, category_id, visibility, timing_mode)
select id, '00000000-0000-0000-0000-000000000091', category || ' bracket ' || n, category, 'public', 'end-date' from trending_fixtures;
insert into public.bracket_entries(bracket_id, seed, name)
select f.id, seed, 'Contender ' || seed from trending_fixtures f cross join generate_series(1, 2) seed;
update public.brackets set status = 'active', started_at = now() - interval '90 days', current_round = 0, total_rounds = 1 where id in (select id from trending_fixtures);
insert into app_private.bracket_vote_activity(bracket_id, bucket_start, vote_count, last_vote_at)
select id, date_trunc('minute', now() - case when n < 10 then interval '1 hour' else
  case category when 'movies-tv' then interval '2 days' when 'sports' then interval '5 days'
    when 'video-games' then interval '20 days' when 'music' then interval '60 days' else interval '1 hour' end end),
  101 - n, now() - interval '1 hour'
from trending_fixtures;

-- A huge historical bracket, private activity, a draft, and a zero-vote public
-- bracket must not displace a recent public competitor.
insert into public.brackets(id, owner_id, title, category_id, visibility, timing_mode)
select ('10000000-0000-0000-0000-00000000009' || n)::uuid, '00000000-0000-0000-0000-000000000091',
  'Excluded bracket ' || n, 'food-drink', case when n = 2 then 'private' else 'public' end, 'end-date'
from generate_series(1, 4) n;
update public.brackets set status = 'active', started_at = now() - interval '90 days', current_round = 0, total_rounds = 1
where id in ('10000000-0000-0000-0000-000000000091', '10000000-0000-0000-0000-000000000092', '10000000-0000-0000-0000-000000000094');
insert into app_private.bracket_vote_activity values
 ('10000000-0000-0000-0000-000000000091', now() - interval '60 days', 999999, now() - interval '60 days'),
 ('10000000-0000-0000-0000-000000000092', now() - interval '1 hour', 999999, now() - interval '1 hour'),
 ('10000000-0000-0000-0000-000000000093', now() - interval '1 hour', 999999, now() - interval '1 hour');

create temp table trending_snapshot as select c->>'id' as category, c->>'window' as window_label, c->'brackets' as brackets
from jsonb_array_elements(public.get_trending_brackets()->'categories') c;
select is((select window_label from trending_snapshot where category = 'food-drink'), 'Past 24 hours', 'ten recent brackets keep the shortest window');
select is((select window_label from trending_snapshot where category = 'movies-tv'), 'Past 3 days', 'nine recent brackets widen once to fill ten');
select is((select window_label from trending_snapshot where category = 'sports'), 'Past 7 days', 'the second expansion reaches seven days');
select is((select window_label from trending_snapshot where category = 'video-games'), 'Past 30 days', 'the third expansion reaches thirty days');
select is((select window_label from trending_snapshot where category = 'music'), 'All time', 'sparse activity after all three expansions uses all time');
select is((select jsonb_array_length(brackets) from trending_snapshot where category = 'food-drink'), 10, 'output is capped at ten per category');
select is((select jsonb_array_length(brackets) from trending_snapshot where category = 'books-stories'), 3, 'fewer than ten are shown without padding');
select is((select jsonb_array_length(brackets) from trending_snapshot where category = 'tabletop-party'), 0, 'categories choose windows independently');
select is((select brackets->0->>'title' from trending_snapshot where category = 'food-drink'), 'food-drink bracket 1', 'first place uses votes inside the chosen window');
select is((select brackets->9->>'title' from trending_snapshot where category = 'food-drink'), 'food-drink bracket 10', 'old popularity, private brackets, drafts and zero votes stay out');
select ok(not exists (select 1 from trending_snapshot, jsonb_array_elements(brackets) b where b ?| array['votes','vote_count','owner_id','voter_id','left_votes','right_votes']), 'discovery never exposes counts, voter identities or matchup results');
select is((select brackets->0->'entries'->>0 from trending_snapshot where category = 'food-drink'), 'Contender 1', 'ranked cards include seeded contenders');
-- Equal scores and timestamps use bracket IDs as the final deterministic tie-break.
update app_private.bracket_vote_activity set vote_count=100,last_vote_at=now()-interval '1 hour'
where bracket_id in (select id from trending_fixtures where category='books-stories');
select is((select c->'brackets'->0->>'id' from jsonb_array_elements(public.get_trending_brackets()->'categories') c where c->>'id'='books-stories'),
 (select id::text from trending_fixtures where category='books-stories' order by id limit 1), 'equal scores and activity times use a stable final tie-break');
insert into app_private.bracket_vote_activity select id,now()+interval '1 day',999999,now()+interval '1 day' from trending_fixtures where category='food-drink' and n=10;
select is((select c->'brackets'->0->>'title' from jsonb_array_elements(public.get_trending_brackets()->'categories') c where c->>'id'='food-drink'),'food-drink bracket 1','future buckets do not affect ranking');
update public.brackets set visibility='private' where id='10000000-0000-0000-0000-000000000093';
-- A category with only old votes must still choose all time, not mislabel those
-- votes as recent. Book fixtures have just three eligible candidates.
select is((select window_label from trending_snapshot where category='books-stories'),'All time','an underfilled category honestly labels its all-time fallback');

-- First-ballot inserts count once; retries and changed selections do not count.
insert into public.brackets(id, owner_id, title, category_id, visibility, timing_mode)
values ('10000000-0000-0000-0000-000000000095', '00000000-0000-0000-0000-000000000091', 'Public vote capture', 'everything-else', 'public', 'end-date');
insert into public.bracket_entries(id, bracket_id, seed, name) values
 ('20000000-0000-0000-0000-000000000091','10000000-0000-0000-0000-000000000095',1,'Alpha'),
 ('20000000-0000-0000-0000-000000000092','10000000-0000-0000-0000-000000000095',2,'Beta');
insert into public.bracket_rounds(bracket_id, round_index, status, starts_at, ends_at)
values ('10000000-0000-0000-0000-000000000095',0,'open',now()-interval '1 hour',clock_timestamp()+interval '2 seconds');
insert into public.bracket_matchups(id, bracket_id, round_index, position, left_entry_id, right_entry_id)
values ('30000000-0000-0000-0000-000000000091','10000000-0000-0000-0000-000000000095',0,0,'20000000-0000-0000-0000-000000000091','20000000-0000-0000-0000-000000000092');
update public.brackets set status='active',started_at=now()-interval '1 hour',current_round=0,total_rounds=1 where id='10000000-0000-0000-0000-000000000095';
savepoint before_ballot;
insert into app_private.bracket_ballots(matchup_id,voter_id,bracket_id,round_index,selected_entry_id,last_request_id)
values ('30000000-0000-0000-0000-000000000091','00000000-0000-0000-0000-000000000091','10000000-0000-0000-0000-000000000095',0,'20000000-0000-0000-0000-000000000091',gen_random_uuid());
select is((select sum(vote_count)::bigint from app_private.bracket_vote_activity where bracket_id='10000000-0000-0000-0000-000000000095'),1::bigint,'first vote records anonymous participation');
rollback to savepoint before_ballot;
select is((select count(*) from app_private.bracket_vote_activity where bracket_id='10000000-0000-0000-0000-000000000095'),0::bigint,'a failed vote transaction rolls back its activity too');
insert into app_private.bracket_ballots(matchup_id,voter_id,bracket_id,round_index,selected_entry_id,last_request_id)
values ('30000000-0000-0000-0000-000000000091','00000000-0000-0000-0000-000000000091','10000000-0000-0000-0000-000000000095',0,'20000000-0000-0000-0000-000000000091',gen_random_uuid());

insert into app_private.bracket_ballots(matchup_id,voter_id,bracket_id,round_index,selected_entry_id,last_request_id)
values ('30000000-0000-0000-0000-000000000091','00000000-0000-0000-0000-000000000091','10000000-0000-0000-0000-000000000095',0,'20000000-0000-0000-0000-000000000092',gen_random_uuid())
on conflict(matchup_id,voter_id) do update set selected_entry_id=excluded.selected_entry_id,updated_at=clock_timestamp();
select is((select sum(vote_count)::bigint from app_private.bracket_vote_activity where bracket_id='10000000-0000-0000-0000-000000000095'),1::bigint,'vote changes and upsert retries do not inflate activity');
select pg_sleep(2.1);
insert into public.bracket_match_results(matchup_id,bracket_id,round_index,left_votes,right_votes,winner_entry_id,resolution)
values ('30000000-0000-0000-0000-000000000091','10000000-0000-0000-0000-000000000095',0,0,1,'20000000-0000-0000-0000-000000000092','votes');
update public.bracket_rounds set status='closed',closed_at=clock_timestamp() where bracket_id='10000000-0000-0000-0000-000000000095';
select is((select count(*) from app_private.bracket_ballots where bracket_id='10000000-0000-0000-0000-000000000095'),0::bigint,'round closure still purges personal ballots');
select is((select sum(vote_count)::bigint from app_private.bracket_vote_activity where bracket_id='10000000-0000-0000-0000-000000000095'),1::bigint,'anonymous trending activity survives closure');
update public.brackets set status='completed',current_round=1,completed_at=clock_timestamp(),champion_entry_id='20000000-0000-0000-0000-000000000092' where id='10000000-0000-0000-0000-000000000095';
select is((select c->'brackets'->0->>'status' from jsonb_array_elements(public.get_trending_brackets()->'categories') c where c->>'id'='everything-else'),'completed','completed public brackets remain eligible');

set local role anon;
select is(jsonb_array_length(public.get_trending_brackets()->'categories'),10,'anonymous discovery works without authentication or ballot permissions');
reset role;
set local role authenticated;
select is(jsonb_array_length(public.get_trending_brackets()->'categories'),10,'signed-in discovery uses the same public feed');
reset role;
select * from finish();
rollback;
