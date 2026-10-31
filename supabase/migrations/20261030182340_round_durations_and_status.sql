-- Duration-only new submissions; existing live/queued schedules retain their deadlines.
create or replace function app_private.submission_schedule(p_id uuid,p_start timestamptz) returns timestamptz[]
language plpgsql security definer set search_path='' as $$
declare b public.brackets%rowtype; n integer; rounds integer; i integer; prev timestamptz:=p_start;
 ends timestamptz[]:='{}'; target timestamptz; hours text; e record;
begin
 select * into b from public.brackets where id=p_id;
 select count(*) into n from public.bracket_entries where bracket_id=p_id;
 if b.id is null or char_length(b.title)<5 or n not between 2 and 32 or b.visibility is null
  or b.timing_mode is null or b.timing_mode not in ('manual','end-date','per-round') or (b.visibility='public' and b.timing_mode='manual') then
  raise exception using errcode='22023',message='Complete the bracket name, visibility, schedule, and 2–32 competitors.';
 end if;
 if exists(select 1 from public.bracket_entries where bracket_id=p_id and name='')
  or (select count(distinct lower(name)) from public.bracket_entries where bracket_id=p_id)<>n
  or (select max(seed) from public.bracket_entries where bracket_id=p_id)<>n then
  raise exception using errcode='22023',message='Use a distinct name for every competitor.';
 end if;
 perform app_private.assert_content(b.title,'title','Bracket name');
 perform app_private.assert_content(b.description,'description','Description');
 for e in select name,seed from public.bracket_entries where bracket_id=p_id loop
  perform app_private.assert_content(e.name,'competitor','Competitor '||e.seed);
 end loop;
 rounds:=ceil(log(2,n))::integer;
 if b.timing_mode='manual' then return ends; end if;
 for i in 0..rounds-1 loop
  if b.schedule_preferences ? 'roundMinutes' then
   if b.timing_mode <> 'per-round' or jsonb_typeof(b.schedule_preferences->'roundMinutes') <> 'array' then
    raise exception using errcode='22023',message='Choose a duration for every round.';
   end if;
   if jsonb_array_length(b.schedule_preferences->'roundMinutes') not between rounds and 5 or jsonb_typeof(b.schedule_preferences->'roundMinutes'->i) <> 'number' then
    raise exception using errcode='22023',message='Choose whole-minute durations for every round.';
   end if;
   hours:=b.schedule_preferences->'roundMinutes'->>i;
   if hours is null or hours !~ '^[0-9]{1,5}$' or hours::integer not between 1 and 44639 then
    raise exception using errcode='22023',message='Each round needs 1 minute to 30 days, 23 hours and 59 minutes.';
   end if;
   target:=prev+make_interval(secs=>hours::integer*60);
  elsif b.timing_mode='end-date' then
   target:=p_start+((b.schedule_preferences->>'endDate')::timestamptz-p_start)*((i+1)::double precision/rounds);
  else
   hours:=b.schedule_preferences->'roundHours'->>i;
   if hours is not null then
    if hours !~ '^[0-9]+([.][0-9]+)?$' or length(hours)>12 then raise exception using errcode='22023',message='Choose a valid round duration.'; end if;
    target:=prev+make_interval(secs=>hours::double precision*3600);
   else target:=(b.schedule_preferences->'roundEndsAt'->>i)::timestamptz;
   end if;
  end if;
  if target is null or not isfinite(target) or target-prev<interval '1 minute' then
   raise exception using errcode='22023',message='Choose later deadlines so every round has at least one minute when voting starts.';
  end if;
  ends:=array_append(ends,target); prev:=target;
 end loop;
 return ends;
end $$;
create or replace function app_private.submit_bracket(p_id uuid,p_revision bigint) returns uuid
language plpgsql security definer set search_path='' as $$
declare u uuid:=app_private.require_active_user(); b public.brackets%rowtype;
begin
 select * into b from public.brackets where id=p_id for update;
 if b.id is null or b.owner_id<>u then raise exception using errcode='42501',message='Bracket unavailable.'; end if;
 if b.status='pending_review' then return b.id; end if;
 if b.status<>'draft' then raise exception using errcode='55000',message='This bracket has already started.'; end if;
 if b.revision<>p_revision then raise exception using errcode='40001',message='Your draft changed. Reload it before submitting.'; end if;
 if b.timing_mode <> 'manual' and not (b.schedule_preferences ? 'roundMinutes') then
  raise exception using errcode='22023',message='Reopen your draft and choose round durations before submitting.';
 end if;
 perform app_private.submission_schedule(p_id,clock_timestamp()+interval '3 minutes');
 update public.brackets set status='pending_review',review_message=null,revision=revision+1,updated_at=clock_timestamp() where id=p_id;
 insert into app_private.bracket_review_queue values(p_id,clock_timestamp()+interval '3 minutes');
 return p_id;
end $$;
CREATE OR REPLACE FUNCTION app_private.guard_round_structure()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare v_status text; v_mode text; v_minutes integer;
begin
  select status, timing_mode into v_status, v_mode from public.brackets where id = new.bracket_id for share;
  select (schedule_preferences->'roundMinutes'->>new.round_index)::integer into v_minutes from public.brackets where id=new.bracket_id;
  if tg_op = 'INSERT' then
    if new.status = 'closed' then
      raise exception using errcode = '55000', message = 'Close rounds only after saving their matchup results.';
    end if;
    if v_status not in ('draft','pending_review') then
      raise exception using errcode = '55000', message = 'Started bracket rounds are locked.';
    end if;
  else
    if row(new.bracket_id, new.round_index) is distinct from row(old.bracket_id, old.round_index) then
      raise exception using errcode = '55000', message = 'Round identity is locked.';
    end if;
    if old.status = 'closed' and new is distinct from old then
      raise exception using errcode = '55000', message = 'Closed rounds are locked.';
    end if;
    if new.status = 'closed' and old.status <> 'closed' then
      if old.status <> 'open' then
        raise exception using errcode = '55000', message = 'Open the round before closing it.';
      end if;
      if v_mode is distinct from 'manual' and (new.ends_at is null or clock_timestamp() < new.ends_at) then
        raise exception using errcode = '55000', message = 'Scheduled rounds cannot close before their deadline.';
      end if;
      new.closed_at := clock_timestamp();
    end if;
    if v_status not in ('draft','pending_review') and row(new.starts_at, new.ends_at) is distinct from row(old.starts_at, old.ends_at) then
      if v_minutes is not null and old.status='upcoming' and new.status='open' and new.starts_at is not null
       and new.ends_at=new.starts_at+make_interval(secs=>v_minutes*60) then
       null; -- Only checked round-opening operations can move a duration deadline.
      elsif v_mode is distinct from 'manual' or old.status <> 'upcoming' or new.status <> 'open'
        or old.starts_at is not null or new.starts_at is null or new.ends_at is distinct from old.ends_at then
        raise exception using errcode = '55000', message = 'Started round deadlines are locked.';
      end if;
    end if;
  end if;
  return new;
end;
$function$;


create or replace function app_private.resolve_bracket_round(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare b public.brackets%rowtype; r public.bracket_rounds%rowtype; m public.bracket_matchups%rowtype;
 lv bigint; rv bigint; winner uuid; why text; finished timestamptz;
begin
 select * into b from public.brackets where id=p_id for update;
 if b.status is distinct from 'active' then return; end if;
 select * into r from public.bracket_rounds where bracket_id=p_id and round_index=b.current_round for update;
 if r.status is distinct from 'open' then return; end if;
 if b.timing_mode<>'manual' and (r.ends_at is null or clock_timestamp()<r.ends_at) then
  raise exception using errcode='55000',message='Voting is still open.';
 end if;
 for m in select * from public.bracket_matchups where bracket_id=p_id and round_index=b.current_round order by position loop
  if m.left_entry_id is null and m.right_entry_id is null then raise exception 'Matchup has no competitors'; end if;
  select count(*) filter(where selected_entry_id=m.left_entry_id),count(*) filter(where selected_entry_id=m.right_entry_id)
   into lv,rv from app_private.bracket_ballots where matchup_id=m.id;
  if m.left_entry_id is null or m.right_entry_id is null then winner:=coalesce(m.left_entry_id,m.right_entry_id);why:='bye';lv:=0;rv:=0;
  elsif lv=0 and rv=0 then
   select id into winner from public.bracket_entries where id in (m.left_entry_id,m.right_entry_id) order by seed limit 1;why:='seed';
  elsif lv=rv then winner:=case when random()<0.5 then m.left_entry_id else m.right_entry_id end;why:='random_tie';
  else winner:=case when lv>rv then m.left_entry_id else m.right_entry_id end;why:='votes'; end if;
  insert into public.bracket_match_results(matchup_id,bracket_id,round_index,left_votes,right_votes,winner_entry_id,resolution)
   values(m.id,p_id,m.round_index,lv,rv,winner,why);
  if m.next_matchup_id is not null then
   update public.bracket_matchups set left_entry_id=case when m.next_slot=0 then winner else left_entry_id end,
    right_entry_id=case when m.next_slot=1 then winner else right_entry_id end where id=m.next_matchup_id;
  end if;
 end loop;
 finished:=clock_timestamp();
 update public.bracket_rounds set status='closed',closed_at=finished where bracket_id=p_id and round_index=b.current_round;
 if b.current_round=b.total_rounds-1 then
  update public.brackets set status='completed',current_round=total_rounds,champion_entry_id=winner,completed_at=finished,updated_at=finished where id=p_id;
 else
  update public.bracket_rounds set status='open',starts_at=case when b.timing_mode='manual' or b.schedule_preferences ? 'roundMinutes' then finished else starts_at end,
   ends_at=case when b.schedule_preferences ? 'roundMinutes' then finished+make_interval(secs=>(b.schedule_preferences->'roundMinutes'->>(b.current_round+1))::integer*60) else ends_at end
   where bracket_id=p_id and round_index=b.current_round+1;
  update public.brackets set current_round=current_round+1,updated_at=finished where id=p_id;
 end if;
end $$;
create or replace function app_private.get_competition(p_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('serverNow',statement_timestamp(),'durationBased',b.schedule_preferences ? 'roundMinutes','id',b.id,'title',b.title,'description',b.description,'category',b.category_id,'trophyId',b.trophy_id,
  'visibility',b.visibility,'status',b.status,'reviewMessage',b.review_message,'timingMode',b.timing_mode,
  'currentRound',b.current_round,'totalRounds',b.total_rounds,'startedAt',b.started_at,'championId',b.champion_entry_id,
  'creator',case when p.handle is not null then p.display_name end,
  'isOwner',coalesce(b.owner_id=(select auth.uid()) and app_private.active_account(),false),
  'saved',exists(select 1 from public.saved_brackets s where s.bracket_id=b.id and s.user_id=(select auth.uid()) and app_private.active_account()),
  'entries',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'name',e.name,'seed',e.seed) order by e.seed) from public.bracket_entries e where e.bracket_id=b.id),'[]'),
  'rounds',coalesce((select jsonb_agg(jsonb_build_object('index',r.round_index,'status',r.status,'endsAt',r.ends_at,'durationMinutes',(b.schedule_preferences->'roundMinutes'->>r.round_index)::integer) order by r.round_index) from public.bracket_rounds r where r.bracket_id=b.id),'[]'),
  'matchups',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'round',m.round_index,'position',m.position,'leftId',m.left_entry_id,'rightId',m.right_entry_id,
   'winnerId',res.winner_entry_id,'leftVotes',res.left_votes,'rightVotes',res.right_votes,'resolution',res.resolution,
   'myPick',v.selected_entry_id,'myRevision',coalesce(v.revision,0)) order by m.round_index,m.position)
   from public.bracket_matchups m join public.bracket_rounds r on r.bracket_id=m.bracket_id and r.round_index=m.round_index
   left join public.bracket_match_results res on res.matchup_id=m.id and r.status='closed'
   left join app_private.bracket_ballots v on v.matchup_id=m.id and v.voter_id=(select auth.uid()) and app_private.active_account()
   where m.bracket_id=b.id),'[]'))
 from public.brackets b left join public.profiles p on p.id=b.owner_id
 where b.id=p_id and app_private.can_read_bracket(b.id);
$$;


create function app_private.get_competition_status(p_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('status',b.status,'round',b.current_round,'serverNow',statement_timestamp(),'deadline',r.ends_at)
 from public.brackets b left join public.bracket_rounds r on r.bracket_id=b.id and r.round_index=b.current_round
 where b.id=p_id and app_private.can_read_bracket(b.id);
$$;
create function public.get_competition_status(p_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$select app_private.get_competition_status(p_id);$$;
revoke all on function app_private.get_competition_status(uuid), public.get_competition_status(uuid) from public,anon,authenticated;
grant execute on function app_private.get_competition_status(uuid), public.get_competition_status(uuid) to anon,authenticated;
