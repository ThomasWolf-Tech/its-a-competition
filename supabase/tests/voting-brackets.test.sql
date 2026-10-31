begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions,pg_catalog;
select no_plan();
insert into auth.users(id,email,raw_user_meta_data)
 select ('00000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,'voting-list'||i||'@example.invalid',jsonb_build_object('requested_username','VotingList'||i) from generate_series(501,503)i;

create function pg_temp.voting_fixture(p_id uuid,n integer,vis text) returns void language plpgsql as $$
begin
 perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000501","role":"authenticated"}',true);
 perform public.save_bracket_draft(p_id,0,'Voting list test bracket','','food-drink','donut',vis,
  case when vis='public' then '{"mode":"per-round","roundMinutes":[60,60,60]}'::jsonb else '{"mode":"manual"}'::jsonb end,
  array(select 'Team '||i from generate_series(1,n)i));
 perform public.submit_bracket(p_id,1);
 update app_private.bracket_review_queue set not_before=clock_timestamp()-interval '1 second' where bracket_id=p_id;
 perform app_private.process_competitions();
end $$;
select pg_temp.voting_fixture('10000000-0000-0000-0000-000000000501',8,'public');
select pg_temp.voting_fixture('10000000-0000-0000-0000-000000000502',4,'private');
select pg_temp.voting_fixture('10000000-0000-0000-0000-000000000503',2,'public');
select pg_temp.voting_fixture('10000000-0000-0000-0000-000000000504',4,'public');
select is(jsonb_array_length(public.get_voting_brackets()->'brackets'),0,'owning an active bracket does not imply voting');
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000502","role":"authenticated"}',true);
select public.save_competition('10000000-0000-0000-0000-000000000504',true);
select is(jsonb_array_length(public.get_voting_brackets()->'brackets'),0,'saved-only brackets are not voting participation');

create function pg_temp.list_vote(p_id uuid) returns void language plpgsql as $$
declare m record;
begin
 select * into m from public.bracket_matchups where bracket_id=p_id and round_index=0 and left_entry_id is not null and right_entry_id is not null order by position limit 1;
 perform public.cast_bracket_vote(m.id,m.left_entry_id,0,gen_random_uuid());
 perform public.cast_bracket_vote(m.id,m.right_entry_id,1,gen_random_uuid());
end $$;
select pg_temp.list_vote('10000000-0000-0000-0000-000000000501');
select is((select count(*) from app_private.bracket_participation),1::bigint,'changed votes create one participation relationship');
set local role authenticated;
select is(jsonb_array_length(public.get_voting_brackets()->'brackets'),1,'voter sees their active competition');
select is(public.get_voting_brackets()->'brackets'->0->>'id','10000000-0000-0000-0000-000000000501','read returns only the voted bracket');
select is(public.get_voting_brackets()->'brackets'->0->>'currentRound','0','current round remains zero-based in the API');
select is(public.get_voting_brackets()->'brackets'->0->>'totalRounds','3','total rounds included');
select is(public.get_voting_brackets()->'brackets'->0->>'nextRoundStartsAt',public.get_voting_brackets()->'brackets'->0->>'roundEndsAt','next start follows the current deadline');
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000503","role":"authenticated"}',true);
select is(jsonb_array_length(public.get_voting_brackets()->'brackets'),0,'another user cannot read someone else’s voting list');
reset role;
select ok(not has_table_privilege('authenticated','app_private.bracket_participation','select'),'no client access to participation records');
select ok(not has_table_privilege('authenticated','app_private.bracket_participation','insert'),'clients cannot invent participation');
select ok(not has_function_privilege('anon','public.get_voting_brackets()','execute'),'guests cannot call the list RPC');
select ok(not has_function_privilege('authenticated','app_private.record_bracket_participation()','execute'),'tracking trigger is not a client RPC');

insert into public.bracket_memberships(bracket_id,user_id) values('10000000-0000-0000-0000-000000000502','00000000-0000-0000-0000-000000000502');
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000502","role":"authenticated"}',true);
select pg_temp.list_vote('10000000-0000-0000-0000-000000000502');
select is(jsonb_array_length(public.get_voting_brackets()->'brackets'),2,'private competitions are included for authorized voters');
select is(public.get_voting_brackets()->'brackets'->1->>'nextRoundStartsAt',null,'manual rounds have no invented next start');
delete from public.bracket_memberships where bracket_id='10000000-0000-0000-0000-000000000502';
select is(jsonb_array_length(public.get_voting_brackets()->'brackets'),1,'revoked private access hides participation immediately');
insert into public.bracket_memberships(bracket_id,user_id) values('10000000-0000-0000-0000-000000000502','00000000-0000-0000-0000-000000000502');
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000501","role":"authenticated"}',true);
select public.close_manual_round('10000000-0000-0000-0000-000000000502',0);
select is((select count(*) from app_private.bracket_ballots where bracket_id='10000000-0000-0000-0000-000000000502'),0::bigint,'normal round ballot purge remains intact');
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000502","role":"authenticated"}',true);
select is(jsonb_array_length(public.get_voting_brackets()->'brackets'),2,'participation survives between rounds with no new vote');
select is(public.get_voting_brackets()->'brackets'->1->>'currentRound','1','new round is returned after the previous ballots are purged');
select pg_temp.list_vote('10000000-0000-0000-0000-000000000503');
select is((select e->>'nextRoundStartsAt' from jsonb_array_elements(public.get_voting_brackets()->'brackets') e where e->>'id'='10000000-0000-0000-0000-000000000503'),null,'finals have no next round');
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000501","role":"authenticated"}',true);
select public.close_manual_round('10000000-0000-0000-0000-000000000502',1);
select is((select count(*) from app_private.bracket_participation where bracket_id='10000000-0000-0000-0000-000000000502'),0::bigint,'completion deletes the temporary voter relationship');
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000502","role":"authenticated"}',true);
select is(jsonb_array_length(public.get_voting_brackets()->'brackets'),2,'completed competitions disappear');
insert into auth.sessions(id,user_id) values('50000000-0000-0000-0000-000000000502','00000000-0000-0000-0000-000000000502');
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000502","role":"authenticated","session_id":"50000000-0000-0000-0000-000000000502"}',true);
select public.delete_account();
select is((select count(*) from app_private.bracket_participation),0::bigint,'account deletion cascades participation');
select throws_ok($$select public.get_voting_brackets()$$,'42501',null,'a deleted identity cannot read a list using an old token');
select * from finish();
rollback;
