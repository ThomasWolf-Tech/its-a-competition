-- Keep only an active competition relationship, never past selections.
create table app_private.bracket_participation (
 bracket_id uuid not null references public.brackets(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 primary key(bracket_id,user_id)
);
create index bracket_participation_user_idx on app_private.bracket_participation(user_id,bracket_id);
alter table app_private.bracket_participation enable row level security;
revoke all on app_private.bracket_participation from public,anon,authenticated;

create function app_private.record_bracket_participation() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.voter_id is null then return new; end if;
 insert into app_private.bracket_participation(bracket_id,user_id)
 values(new.bracket_id,new.voter_id) on conflict do nothing;
 return new;
end $$;
revoke all on function app_private.record_bracket_participation() from public,anon,authenticated;
create trigger bracket_ballots_record_participation after insert on app_private.bracket_ballots
 for each row execute function app_private.record_bracket_participation();

-- Recover only relationships for which existing transient data provides evidence.
insert into app_private.bracket_participation(bracket_id,user_id)
 select v.bracket_id,v.voter_id from app_private.bracket_ballots v
 join public.brackets b on b.id=v.bracket_id where b.status='active' and v.voter_id is not null
 union
 select c.bracket_id,c.user_id from app_private.trophy_candidates c
 join public.brackets b on b.id=c.bracket_id where b.status='active'
 on conflict do nothing;

create function app_private.clear_completed_participation() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 delete from app_private.bracket_participation where bracket_id=new.id;
 return new;
end $$;
revoke all on function app_private.clear_completed_participation() from public,anon,authenticated;
create trigger brackets_clear_completed_participation after update of status on public.brackets
 for each row when (old.status='active' and new.status='completed')
 execute function app_private.clear_completed_participation();

create function app_private.get_voting_brackets() returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=app_private.require_active_user();
begin
 return jsonb_build_object('serverNow',statement_timestamp(),'brackets',coalesce((
  select jsonb_agg(jsonb_build_object(
   'id',b.id,'title',b.title,'visibility',b.visibility,'timingMode',b.timing_mode,
   'currentRound',b.current_round,'totalRounds',b.total_rounds,'roundEndsAt',r.ends_at,
   'nextRoundStartsAt',case when b.current_round<b.total_rounds-1 then r.ends_at end
  ) order by r.ends_at asc nulls last,b.title,b.id)
  from app_private.bracket_participation p
  join public.brackets b on b.id=p.bracket_id
  join public.bracket_rounds r on r.bracket_id=b.id and r.round_index=b.current_round
  where p.user_id=u and b.status='active' and app_private.can_read_bracket(b.id)
 ),'[]'::jsonb));
end $$;
revoke all on function app_private.get_voting_brackets() from public,anon,authenticated;
grant execute on function app_private.get_voting_brackets() to authenticated;
create function public.get_voting_brackets() returns jsonb
language sql security invoker set search_path='' as $$
 select app_private.get_voting_brackets();
$$;
revoke all on function public.get_voting_brackets() from public,anon,authenticated;
grant execute on function public.get_voting_brackets() to authenticated;
