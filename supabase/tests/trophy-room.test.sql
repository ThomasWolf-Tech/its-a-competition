begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions,pg_catalog;
select no_plan();
insert into auth.users(id,email,raw_user_meta_data)
 select ('00000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,'trophy'||i||'@example.invalid',jsonb_build_object('requested_username','TrophyUser'||i) from generate_series(201,206)i;
create function pg_temp.run_trophy_fixture(p_id uuid,n integer,vis text) returns void language plpgsql as $$
declare r integer; m record; uid uuid; voter integer; seed_one uuid; rev bigint;
begin
 perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000201","role":"authenticated"}',true);
 perform public.save_bracket_draft(p_id,0,'Trophy test rivalry','','food-drink','donut',vis,
  case when vis='public' then '{"mode":"per-round","roundMinutes":[1,1,1,1,1]}'::jsonb else '{"mode":"manual"}'::jsonb end,
  array(select 'Team '||i from generate_series(1,n)i));
 perform public.submit_bracket(p_id,1);
 update app_private.bracket_review_queue set not_before=clock_timestamp()-interval '1 second' where bracket_id=p_id;
 perform app_private.process_competitions();
 select id into seed_one from public.bracket_entries where bracket_id=p_id and seed=1;
 for r in 0..ceil(log(2,n))::integer-1 loop
  select * into m from public.bracket_matchups where bracket_id=p_id and round_index=r and (left_entry_id=seed_one or right_entry_id=seed_one);
  if m.left_entry_id is not null and m.right_entry_id is not null then
   for voter in 201..206 loop
    uid:=('00000000-0000-0000-0000-'||lpad(voter::text,12,'0'))::uuid;
    -- 202 is perfect, 203 misses one, 204 changes to the winner,
    -- 205 changes away on the final, 206 joins only at the final.
    if (voter=203 and r=1) or (voter=206 and r<>ceil(log(2,n))::integer-1) then continue; end if;
    if vis='private' and voter<>201 then
     insert into public.bracket_memberships(bracket_id,user_id) values(p_id,uid) on conflict do nothing;
    end if;
    perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated')::text,true);
    if voter=204 then
     rev:=public.cast_bracket_vote(m.id,case when m.left_entry_id=seed_one then m.right_entry_id else m.left_entry_id end,0,gen_random_uuid());
     perform public.cast_bracket_vote(m.id,seed_one,rev,gen_random_uuid());
    else
     rev:=public.cast_bracket_vote(m.id,seed_one,0,gen_random_uuid());
     if voter=205 and r=ceil(log(2,n))::integer-1 then
      perform public.cast_bracket_vote(m.id,case when m.left_entry_id=seed_one then m.right_entry_id else m.left_entry_id end,rev,gen_random_uuid());
     end if;
    end if;
   end loop;
  end if;
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000201","role":"authenticated"}',true);
  if vis='private' then perform public.close_manual_round(p_id,r);
  else
   alter table public.bracket_rounds disable trigger guard_round_structure;
   update public.bracket_rounds set starts_at=starts_at-interval '1 day',ends_at=ends_at-interval '1 day' where bracket_id=p_id and round_index=r;
   alter table public.bracket_rounds enable trigger guard_round_structure;
   perform app_private.process_competitions();
  end if;
 end loop;
end $$;
select pg_temp.run_trophy_fixture('10000000-0000-0000-0000-000000000201',16,'public');
select is((select count(*) from public.trophy_awards),2::bigint,'only perfect final-vote runs earn awards');
select is((select count(*) from public.trophy_awards where user_id='00000000-0000-0000-0000-000000000201'),0::bigint,'creator excluded');
select is((select count(*) from public.trophy_awards where user_id='00000000-0000-0000-0000-000000000202'),1::bigint,'perfect voter earns trophy');
select is((select count(*) from public.trophy_awards where user_id='00000000-0000-0000-0000-000000000203'),0::bigint,'missed round loses eligibility');
select is((select count(*) from public.trophy_awards where user_id='00000000-0000-0000-0000-000000000204'),1::bigint,'vote changes before cutoff use final selection');
select is((select count(*) from public.trophy_awards where user_id='00000000-0000-0000-0000-000000000205'),0::bigint,'changing away before final cutoff loses eligibility');
select is((select count(*) from public.trophy_awards where user_id='00000000-0000-0000-0000-000000000206'),0::bigint,'late joining cannot earn trophy');
select is((select count(*) from app_private.trophy_candidates),0::bigint,'eligibility cleared after completion');
select is((select count(*) from app_private.bracket_ballots),0::bigint,'ballots still purged after closure');
select app_private.process_competitions();
select is((select count(*) from public.trophy_awards),2::bigint,'worker retries cannot duplicate awards');
select pg_temp.run_trophy_fixture('10000000-0000-0000-0000-000000000202',17,'public');
select is((select count(*) from public.trophy_awards where bracket_id='10000000-0000-0000-0000-000000000202'),2::bigint,'bye counts without requiring an impossible vote');
select pg_temp.run_trophy_fixture('10000000-0000-0000-0000-000000000203',15,'public');
select is((select count(*) from public.trophy_awards where bracket_id='10000000-0000-0000-0000-000000000203'),0::bigint,'15 actual entrants do not qualify despite 16 slots');
select pg_temp.run_trophy_fixture('10000000-0000-0000-0000-000000000204',16,'private');
select is((select count(*) from public.trophy_awards where bracket_id='10000000-0000-0000-0000-000000000204'),0::bigint,'private brackets never award trophies');
select ok((select bool_and(earned_at>=transaction_timestamp() and trophy_id='donut' and rule_version=1) from public.trophy_awards),'individual awards retain earned timestamps and exact trophy');
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000202","role":"authenticated"}',true);
set local role authenticated;
select is((select quantity from public.get_trophy_room() where trophy_id='donut'),2::bigint,'room groups two copies as quantity two');
select is((select count(*) from public.trophy_awards),2::bigint,'RLS returns only own award records');
select throws_ok($$insert into public.trophy_awards(user_id,trophy_id) values('00000000-0000-0000-0000-000000000202','donut')$$,'42501',null,'users cannot manufacture awards');
select throws_ok($$select * from app_private.trophy_candidates$$,'42501',null,'eligibility remains private');
select throws_ok($$select app_private.record_trophy_round('10000000-0000-0000-0000-000000000201',0::smallint)$$,'42501',null,'award worker cannot be invoked by users');
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000203","role":"authenticated"}',true);
set local role authenticated;
select is((select count(*) from public.get_trophy_room()),0::bigint,'outsiders cannot see another room');
reset role;
select ok(not has_function_privilege('anon','public.get_trophy_room()','execute'),'guests cannot read rooms');
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000201","role":"authenticated"}',true);
select public.delete_competition('10000000-0000-0000-0000-000000000201');
select is((select count(*) from public.trophy_awards where bracket_id is null),2::bigint,'source deletion preserves earned trophies without content');
select is((select count(*) from public.trophy_awards),4::bigint,'deleting source does not reduce earned count');
select set_config('request.jwt.claims','{}',true);
delete from auth.users where id='00000000-0000-0000-0000-000000000202';
select is((select count(*) from public.trophy_awards where user_id='00000000-0000-0000-0000-000000000202'),0::bigint,'account deletion removes trophy room');
select is((select count(*) from public.trophy_awards),2::bigint,'account deletion leaves other users awards intact');
select * from finish();
rollback;
