-- Private, disposable eligibility; no permanent ballot history.
create table app_private.trophy_candidates (
 bracket_id uuid not null references public.brackets(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 entry_id uuid not null,
 primary key(bracket_id,user_id,entry_id),
 foreign key(bracket_id,entry_id) references public.bracket_entries(bracket_id,id) on delete cascade
);
create index trophy_candidates_user_idx on app_private.trophy_candidates(user_id);
alter table app_private.trophy_candidates enable row level security;
revoke all on app_private.trophy_candidates from public,anon,authenticated;

-- Awards belong to the voter. Deleting a source bracket removes only its link.
create table public.trophy_awards (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 bracket_id uuid references public.brackets(id) on delete set null,
 trophy_id text not null references public.trophy_catalog(id),
 earned_at timestamptz not null default clock_timestamp(),
 rule_version smallint not null default 1 check(rule_version=1),
 unique(user_id,bracket_id)
);
create index trophy_awards_user_trophy_date_idx on public.trophy_awards(user_id,trophy_id,earned_at desc);
create index trophy_awards_bracket_idx on public.trophy_awards(bracket_id) where bracket_id is not null;
create index trophy_awards_trophy_idx on public.trophy_awards(trophy_id);
alter table public.trophy_awards enable row level security;
revoke all on public.trophy_awards from public,anon,authenticated;
grant select on public.trophy_awards to authenticated;
create policy trophy_awards_own_read on public.trophy_awards for select to authenticated
 using(user_id=(select auth.uid()) and (select app_private.active_account()));

create function app_private.record_trophy_round(p_bracket uuid,p_round smallint) returns void
language plpgsql security definer set search_path='' as $$
declare b public.brackets%rowtype; champion uuid;
begin
 select * into b from public.brackets where id=p_bracket;
 if b.visibility<>'public' or b.status<>'active' or (select count(*) from public.bracket_entries where bracket_id=p_bracket)<16 then return; end if;
 -- A candidate must still be winning and must have backed this round's winner.
 -- Automatic byes require no ballot. Keep only eligibility, never past picks.
 delete from app_private.trophy_candidates c where c.bracket_id=p_bracket and (
  c.user_id is not distinct from b.owner_id or not exists(
   select 1 from public.bracket_match_results r where r.bracket_id=p_bracket and r.round_index=p_round
    and r.winner_entry_id=c.entry_id and (r.resolution='bye' or exists(
     select 1 from app_private.bracket_ballots v where v.matchup_id=r.matchup_id and v.voter_id=c.user_id and v.selected_entry_id=c.entry_id))));
 -- Begin eligibility only at an entrant's first actual matchup. Late joiners
 -- cannot re-enter a run once they missed a non-bye round.
 insert into app_private.trophy_candidates(bracket_id,user_id,entry_id)
 select p_bracket,v.voter_id,r.winner_entry_id
 from public.bracket_match_results r
 join app_private.bracket_ballots v on v.matchup_id=r.matchup_id and v.selected_entry_id=r.winner_entry_id
 join public.profiles p on p.id=v.voter_id and p.deactivated_at is null
 where r.bracket_id=p_bracket and r.round_index=p_round and r.resolution<>'bye'
 and v.voter_id is distinct from b.owner_id
 and not exists(select 1 from public.bracket_match_results earlier where earlier.bracket_id=p_bracket
  and earlier.round_index<p_round and earlier.winner_entry_id=r.winner_entry_id and earlier.resolution<>'bye')
 on conflict do nothing;
 if p_round=b.total_rounds-1 then
  select winner_entry_id into champion from public.bracket_match_results where bracket_id=p_bracket and round_index=p_round;
  insert into public.trophy_awards(user_id,bracket_id,trophy_id,earned_at)
   select c.user_id,p_bracket,b.trophy_id,clock_timestamp() from app_private.trophy_candidates c
   join public.profiles p on p.id=c.user_id and p.deactivated_at is null
   where c.bracket_id=p_bracket and c.entry_id=champion and c.user_id is distinct from b.owner_id
   on conflict(user_id,bracket_id) do nothing;
  delete from app_private.trophy_candidates where bracket_id=p_bracket;
 end if;
end $$;
revoke all on function app_private.record_trophy_round(uuid,smallint) from public,anon,authenticated;

-- Award processing and ballot cleanup are part of the same finalization transaction.
create or replace function app_private.purge_finalized_round_ballots() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.status='closed' and old.status<>'closed' then
  if not exists(select 1 from public.bracket_matchups where bracket_id=new.bracket_id and round_index=new.round_index)
   or exists(select 1 from public.bracket_matchups m left join public.bracket_match_results r on r.matchup_id=m.id
    where m.bracket_id=new.bracket_id and m.round_index=new.round_index and (r.matchup_id is null
     or (r.winner_entry_id is distinct from m.left_entry_id and r.winner_entry_id is distinct from m.right_entry_id))) then
   raise exception using errcode='55000',message='Save a valid result for every matchup before closing the round.';
  end if;
  perform app_private.record_trophy_round(new.bracket_id,new.round_index);
  delete from app_private.bracket_ballots where bracket_id=new.bracket_id and round_index=new.round_index;
 end if;
 return new;
end $$;

create function public.get_trophy_room() returns table(trophy_id text,quantity bigint,first_earned_at timestamptz,last_earned_at timestamptz)
language sql stable security invoker set search_path='' as $$
 select a.trophy_id,count(*),min(a.earned_at),max(a.earned_at) from public.trophy_awards a
 where a.user_id=(select auth.uid()) group by a.trophy_id order by max(a.earned_at) desc,a.trophy_id;
$$;
revoke all on function public.get_trophy_room() from public,anon,authenticated;
grant execute on function public.get_trophy_room() to authenticated;
