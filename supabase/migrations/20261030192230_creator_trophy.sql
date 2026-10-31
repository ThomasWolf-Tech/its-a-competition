-- One personal creator award, separate from selectable/earnable bracket trophies.
create table public.creator_award (
 singleton boolean primary key default true check(singleton),
 user_id uuid not null unique references auth.users(id) on delete cascade,
 earned_at timestamptz not null default clock_timestamp()
);
alter table public.creator_award enable row level security;
revoke all on public.creator_award from public,anon,authenticated;
grant select on public.creator_award to authenticated;
create policy creator_award_own_read on public.creator_award for select to authenticated
 using(user_id=(select auth.uid()) and (select app_private.active_account()));

create or replace function public.get_trophy_room() returns table(trophy_id text,quantity bigint,first_earned_at timestamptz,last_earned_at timestamptz)
language sql stable security invoker set search_path='' as $$
 select collection.* from (
  select a.trophy_id,count(*) as quantity,min(a.earned_at) as first_earned_at,max(a.earned_at) as last_earned_at
  from public.trophy_awards a where a.user_id=(select auth.uid()) group by a.trophy_id
  union all
  select 'the-creator'::text,1::bigint,c.earned_at,c.earned_at from public.creator_award c where c.user_id=(select auth.uid())
 ) collection order by collection.last_earned_at desc,collection.trophy_id;
$$;
