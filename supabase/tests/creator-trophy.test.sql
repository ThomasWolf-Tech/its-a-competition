begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions,pg_catalog;
select no_plan();
insert into auth.users(id,email,raw_user_meta_data) values
 ('00000000-0000-0000-0000-000000000221','creator-test@example.invalid','{"requested_username":"CreatorTest"}'),
 ('00000000-0000-0000-0000-000000000222','other-test@example.invalid','{"requested_username":"OtherTest"}');
insert into public.creator_award(user_id) values('00000000-0000-0000-0000-000000000221');
select throws_ok($$insert into public.creator_award(user_id) values('00000000-0000-0000-0000-000000000222')$$,'23505',null,'only one creator award can exist');
select throws_ok($$insert into public.creator_award(singleton,user_id) values(false,'00000000-0000-0000-0000-000000000222')$$,'23514',null,'false singleton cannot bypass uniqueness');
select is((select count(*) from public.trophy_catalog where id='the-creator'),0::bigint,'exclusive trophy is absent from bracket catalog');
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000221","role":"authenticated"}',true);
set local role authenticated;
select is((select quantity from public.get_trophy_room() where trophy_id='the-creator'),1::bigint,'recipient sees one creator trophy');
select throws_ok($$update public.creator_award set user_id='00000000-0000-0000-0000-000000000222'$$,'42501',null,'recipient cannot transfer award');
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000222","role":"authenticated"}',true);
set local role authenticated;
select is((select count(*) from public.get_trophy_room()),0::bigint,'other users do not receive or see award');
select throws_ok($$insert into public.creator_award(user_id) values('00000000-0000-0000-0000-000000000222')$$,'42501',null,'users cannot claim creator award');
reset role;
select set_config('request.jwt.claims','{}',true);
delete from auth.users where id='00000000-0000-0000-0000-000000000221';
select is((select count(*) from public.creator_award),0::bigint,'account deletion removes personal award');
select * from finish();
rollback;
