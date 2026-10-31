-- Shared competition lifecycle. Review timing and worker permissions stay private.
alter table public.profiles add column deactivated_at timestamptz, add column last_deactivated_at timestamptz;
alter table public.brackets add column review_message text;
alter table public.brackets drop constraint brackets_status_check, drop constraint brackets_check1;
alter table public.brackets add constraint brackets_status_check check (status in ('draft','pending_review','active','completed'));
alter table public.brackets add constraint brackets_lifecycle_check check (
 (status in ('draft','pending_review') and started_at is null and completed_at is null and champion_entry_id is null and current_round is null and total_rounds is null)
 or (status='active' and visibility is not null and timing_mode is not null and char_length(title)>=5 and started_at is not null and total_rounds is not null and current_round is not null and current_round between 0 and total_rounds-1 and completed_at is null and champion_entry_id is null)
 or (status='completed' and visibility is not null and timing_mode is not null and char_length(title)>=5 and started_at is not null and total_rounds is not null and current_round is not null and current_round=total_rounds and completed_at is not null and completed_at>=started_at and champion_entry_id is not null)
);
create table app_private.bracket_review_queue (
 bracket_id uuid primary key references public.brackets(id) on delete cascade,
 not_before timestamptz not null
);
create index bracket_review_due_idx on app_private.bracket_review_queue(not_before,bracket_id);
create table app_private.deleting_brackets (bracket_id uuid primary key);
create table app_private.competition_worker_errors (
 bracket_id uuid primary key references public.brackets(id) on delete cascade,
 failed_at timestamptz not null, error_code text not null
);
create table public.saved_brackets (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 bracket_id uuid references public.brackets(id) on delete set null,
 saved_at timestamptz not null default clock_timestamp()
);
create unique index saved_brackets_unique_idx on public.saved_brackets(user_id,bracket_id) where bracket_id is not null;
create index saved_brackets_bracket_idx on public.saved_brackets(bracket_id) where bracket_id is not null;
create index saved_brackets_user_idx on public.saved_brackets(user_id,saved_at desc);
alter table public.saved_brackets enable row level security;
revoke all on public.saved_brackets from public,anon,authenticated;
grant select on public.saved_brackets to authenticated;
alter table app_private.bracket_review_queue enable row level security;
alter table app_private.deleting_brackets enable row level security;
alter table app_private.competition_worker_errors enable row level security;
revoke all on app_private.bracket_review_queue,app_private.deleting_brackets,app_private.competition_worker_errors from public,anon,authenticated;

create function app_private.active_account() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.deactivated_at is null
 and (p.last_deactivated_at is null or exists(select 1 from auth.sessions s where s.user_id=p.id and s.id::text=auth.jwt()->>'session_id')));
$$;
revoke all on function app_private.active_account() from public,anon,authenticated;
grant execute on function app_private.active_account() to authenticated;

create policy saved_brackets_own_read on public.saved_brackets for select to authenticated using (
 user_id=(select auth.uid()) and app_private.active_account()
);

create function app_private.require_active_user(p_username boolean default true) returns uuid
language plpgsql security definer set search_path='' as $$
declare v public.profiles%rowtype; v_id uuid := auth.uid();
begin
 select * into v from public.profiles where id=v_id for share;
 if not found or not app_private.active_account() or (p_username and v.handle is null) then
  raise exception using errcode='42501',message='Sign in with an active account and choose a username first.';
 end if;
 return v_id;
end $$;
CREATE OR REPLACE FUNCTION app_private.save_bracket_draft (
  p_bracket_id           uuid,
  p_expected_revision    bigint,
  p_title                text,
  p_description          text,
  p_category_id          text,
  p_trophy_id            text,
  p_visibility           text,
  p_schedule_preferences jsonb,
  p_names                text[]
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_user_id uuid := auth.uid();
  v_bracket public.brackets%rowtype;
  v_title text := btrim(coalesce(p_title, ''));
  v_description text := btrim(coalesce(p_description, ''));
  v_category text := coalesce(p_category_id, 'everything-else');
  v_trophy text := coalesce(p_trophy_id, 'crown');
  v_visibility text := nullif(p_visibility, '');
  v_schedule jsonb := coalesce(p_schedule_preferences, '{}'::jsonb);
  v_mode text;
  v_names text[];
  v_existing_names text[];
  v_exists boolean;
  v_same boolean;
begin
  perform app_private.require_active_user();
  if v_user_id is null then raise exception using errcode = '42501', message = 'Sign in to save a bracket.'; end if;
  if p_bracket_id is null or p_expected_revision is null or p_expected_revision < 0 then
    raise exception using errcode = '22023', message = 'A bracket ID and valid revision are required.';
  end if;
  if char_length(v_title) > 60 or char_length(v_description) > 180 then
    raise exception using errcode = '22023', message = 'Bracket text exceeds the allowed length.';
  end if;
  if v_visibility is not null and v_visibility not in ('public', 'private') then
    raise exception using errcode = '22023', message = 'Choose public or private visibility.';
  end if;
  if jsonb_typeof(v_schedule) <> 'object' or octet_length(v_schedule::text) > 4096 then
    raise exception using errcode = '22023', message = 'Invalid draft schedule.';
  end if;
  v_mode := nullif(v_schedule ->> 'mode', '');
  if (v_mode is not null and v_mode not in ('manual', 'end-date', 'per-round')) or (v_visibility = 'public' and v_mode = 'manual') then
    raise exception using errcode = '22023', message = 'Public brackets require a schedule.';
  end if;
  if not exists (select 1 from public.bracket_categories where id = v_category)
    or not exists (select 1 from public.trophy_catalog where id = v_trophy) then
    raise exception using errcode = '22023', message = 'Choose a valid category and trophy.';
  end if;
  if cardinality(coalesce(p_names, '{}'::text[])) > 32 or coalesce(array_ndims(p_names), 1) <> 1
    or exists (select 1 from unnest(p_names) n where n is null or char_length(btrim(n)) > 24) then
    raise exception using errcode = '22023', message = 'Drafts allow up to 32 names of at most 24 characters.';
  end if;
  select coalesce(array_agg(btrim(name) order by ordinal), '{}'::text[]) into v_names
    from unnest(p_names) with ordinality as input(name, ordinal);

  -- Coordinate concurrent creates of the same client-generated ID, as well as saves.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_bracket_id::text, 0));
  select * into v_bracket from public.brackets where id = p_bracket_id for update;
  v_exists := found;
  if v_exists then
    if v_bracket.owner_id <> v_user_id then
      raise exception using errcode = '42501', message = 'Bracket unavailable.';
    end if;
    if v_bracket.status <> 'draft' then
      raise exception using errcode = '55000', message = 'This bracket has already started.';
    end if;
    select coalesce(array_agg(name order by seed), '{}'::text[]) into v_existing_names
      from public.bracket_entries where bracket_id = p_bracket_id;
    v_same := v_bracket.title = v_title and v_bracket.description = v_description
      and v_bracket.category_id = v_category and v_bracket.trophy_id = v_trophy
      and v_bracket.visibility is not distinct from v_visibility
      and v_bracket.schedule_preferences = v_schedule and v_existing_names = v_names;
    if v_bracket.revision <> p_expected_revision then
      -- An identical retry returns the already-saved revision without another write.
      if v_bracket.revision = p_expected_revision + 1 and v_same then
        return jsonb_build_object('id', p_bracket_id, 'revision', v_bracket.revision);
      end if;
      raise exception using errcode = '40001', message = 'The draft changed. Reload it before saving again.';
    end if;
    if v_same then return jsonb_build_object('id', p_bracket_id, 'revision', v_bracket.revision); end if;
    update public.brackets set title = v_title, description = v_description, category_id = v_category,
      trophy_id = v_trophy, visibility = v_visibility, timing_mode = v_mode,
      schedule_preferences = v_schedule, revision = revision + 1, updated_at = clock_timestamp()
      where id = p_bracket_id returning * into v_bracket;
    delete from public.bracket_entries where bracket_id = p_bracket_id;
  else
    if p_expected_revision <> 0 then
      raise exception using errcode = '40001', message = 'The draft changed. Reload it before saving again.';
    end if;
    insert into public.brackets(id, owner_id, title, description, category_id, trophy_id, visibility, timing_mode, schedule_preferences)
      values (p_bracket_id, v_user_id, v_title, v_description, v_category, v_trophy, v_visibility, v_mode, v_schedule)
      returning * into v_bracket;
  end if;
  insert into public.bracket_entries(bracket_id, seed, name)
    select p_bracket_id, ordinal::smallint, name from unnest(v_names) with ordinality as input(name, ordinal);
  return jsonb_build_object('id', p_bracket_id, 'revision', v_bracket.revision);
end;
$function$;

create or replace function app_private.require_bracket_username() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is not null then perform app_private.require_active_user(); end if;
 return new;
end $$;
create or replace function app_private.is_bracket_owner(p_bracket_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.brackets b join public.profiles p on p.id=b.owner_id
 where b.id=p_bracket_id and p.id=(select auth.uid()) and app_private.active_account());
$$;
create or replace function app_private.can_read_bracket(p_bracket_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.brackets b where b.id=p_bracket_id and (
  (b.visibility='public' and b.status in ('active','completed')) or
  (app_private.active_account() and
   (b.owner_id=(select auth.uid()) or (b.status in ('active','completed') and exists(
    select 1 from public.bracket_memberships m where m.bracket_id=b.id and m.user_id=(select auth.uid()) and m.revoked_at is null))))));
$$;
-- Queue initialization may create rounds, but active schedules remain immutable.
create or replace function app_private.guard_started_bracket() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if old.status in ('active','completed') then
  if new.status not in ('active','completed') or row(new.owner_id,new.visibility,new.timing_mode,new.schedule_preferences,new.total_rounds,new.started_at)
    is distinct from row(old.owner_id,old.visibility,old.timing_mode,old.schedule_preferences,old.total_rounds,old.started_at) then
   raise exception using errcode='55000',message='Started bracket structure is locked.';
  end if;
  if old.status='completed' and row(new.status,new.current_round,new.champion_entry_id,new.completed_at)
   is distinct from row(old.status,old.current_round,old.champion_entry_id,old.completed_at) then
   raise exception using errcode='55000',message='Completed bracket results are locked.';
  end if;
 elsif old.status='pending_review' and row(new.owner_id,new.title,new.description,new.category_id,new.trophy_id,new.visibility,new.timing_mode,new.schedule_preferences)
   is distinct from row(old.owner_id,old.title,old.description,old.category_id,old.trophy_id,old.visibility,old.timing_mode,old.schedule_preferences) then
  raise exception using errcode='55000',message='Submitted brackets are locked during review.';
 end if;
 return new;
end $$;
-- Whole-bracket deletion is an authorized destructive operation, distinct from
-- attempts to alter a started entrant or rewrite a finalized result.
create or replace function app_private.guard_started_entries() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_old uuid; v_new uuid; v_status text;
begin
 if tg_op='DELETE' and exists(select 1 from app_private.deleting_brackets where bracket_id=old.bracket_id) then return old; end if;
 if tg_op<>'INSERT' then v_old:=old.bracket_id; end if;
 if tg_op<>'DELETE' then v_new:=new.bracket_id; end if;
 for v_status in select status from public.brackets where id in (v_old,v_new) order by id for share loop
  if v_status<>'draft' then raise exception using errcode='55000',message='Started bracket competitors and seeds are locked.'; end if;
 end loop;
 if tg_op='DELETE' then return old; end if;
 return new;
end $$;
create or replace function app_private.guard_final_results() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='DELETE' and exists(select 1 from app_private.deleting_brackets where bracket_id=old.bracket_id) then return old; end if;
 if exists(select 1 from public.bracket_rounds where bracket_id=old.bracket_id and round_index=old.round_index and status='closed') then
  raise exception using errcode='55000',message='Finalized matchup results are locked.';
 end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end $$;
CREATE OR REPLACE FUNCTION app_private.guard_round_structure()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare v_status text; v_mode text;
begin
  select status, timing_mode into v_status, v_mode from public.brackets where id = new.bracket_id for share;
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
      if v_mode is distinct from 'manual' or old.status <> 'upcoming' or new.status <> 'open'
        or old.starts_at is not null or new.starts_at is null or new.ends_at is distinct from old.ends_at then
        raise exception using errcode = '55000', message = 'Started round deadlines are locked.';
      end if;
    end if;
  end if;
  return new;
end;
$function$;


create function app_private.submission_schedule(p_id uuid,p_start timestamptz) returns timestamptz[]
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
  if b.timing_mode='end-date' then
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
create function app_private.submit_bracket(p_id uuid,p_revision bigint) returns uuid
language plpgsql security definer set search_path='' as $$
declare u uuid:=app_private.require_active_user(); b public.brackets%rowtype;
begin
 select * into b from public.brackets where id=p_id for update;
 if b.id is null or b.owner_id<>u then raise exception using errcode='42501',message='Bracket unavailable.'; end if;
 if b.status='pending_review' then return b.id; end if;
 if b.status<>'draft' then raise exception using errcode='55000',message='This bracket has already started.'; end if;
 if b.revision<>p_revision then raise exception using errcode='40001',message='Your draft changed. Reload it before submitting.'; end if;
 perform app_private.submission_schedule(p_id,clock_timestamp()+interval '3 minutes');
 update public.brackets set status='pending_review',review_message=null,revision=revision+1,updated_at=clock_timestamp() where id=p_id;
 insert into app_private.bracket_review_queue values(p_id,clock_timestamp()+interval '3 minutes');
 return p_id;
end $$;
create function app_private.activate_bracket(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare b public.brackets%rowtype; n integer; size integer:=2; rounds integer:=1; seeds integer[]:=array[1,2];
 next_seeds integer[]; v_seed integer; ends timestamptz[]; started timestamptz:=clock_timestamp(); r integer; pos integer;
 left_id uuid; right_id uuid; next_id uuid;
begin
 select * into b from public.brackets where id=p_id for update;
 if b.status is distinct from 'pending_review' then return; end if;
 if not exists(select 1 from app_private.bracket_review_queue where bracket_id=p_id and not_before<=clock_timestamp()) then return; end if;
 ends:=app_private.submission_schedule(p_id,started);
 select count(*) into n from public.bracket_entries where bracket_id=p_id;
 while size<n loop
  size:=size*2; rounds:=rounds+1; next_seeds:='{}';
  foreach v_seed in array seeds loop next_seeds:=next_seeds||array[v_seed,size+1-v_seed]; end loop;
  seeds:=next_seeds;
 end loop;
 for r in 0..rounds-1 loop
  insert into public.bracket_rounds(bracket_id,round_index,starts_at,ends_at)
  values(p_id,r,case when b.timing_mode='manual' then null when r=0 then started else ends[r] end,ends[r+1]);
 end loop;
 for r in reverse rounds-1..0 loop
  for pos in 0..(size/(2^(r+1))::integer)-1 loop
   left_id:=null;right_id:=null;next_id:=null;
   if r=0 then
    select id into left_id from public.bracket_entries where bracket_id=p_id and seed=seeds[pos*2+1];
    select id into right_id from public.bracket_entries where bracket_id=p_id and seed=seeds[pos*2+2];
   end if;
   if r<rounds-1 then select id into next_id from public.bracket_matchups where bracket_id=p_id and round_index=r+1 and position=pos/2; end if;
   insert into public.bracket_matchups(bracket_id,round_index,position,left_entry_id,right_entry_id,next_matchup_id,next_slot)
   values(p_id,r,pos,left_id,right_id,next_id,case when next_id is not null then pos%2 end);
  end loop;
 end loop;
 update public.bracket_rounds set status='open',starts_at=started where bracket_id=p_id and round_index=0;
 update public.brackets set status='active',started_at=started,total_rounds=rounds,current_round=0,updated_at=started where id=p_id;
 delete from app_private.bracket_review_queue where bracket_id=p_id;
end $$;

create function app_private.resolve_bracket_round(p_id uuid) returns void
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
  update public.bracket_rounds set status='open',starts_at=case when b.timing_mode='manual' then finished else starts_at end
   where bracket_id=p_id and round_index=b.current_round+1;
  update public.brackets set current_round=current_round+1,updated_at=finished where id=p_id;
 end if;
end $$;
create function app_private.process_competitions() returns void
language plpgsql security definer set search_path='' as $$
declare item record; attempt integer;
begin
 for item in select b.id from public.brackets b join app_private.bracket_review_queue q on q.bracket_id=b.id
  where q.not_before<=clock_timestamp() order by q.not_before,b.id for update of b skip locked limit 50 loop
  begin
   perform app_private.activate_bracket(item.id);
  exception when sqlstate '22023' or sqlstate '22007' or sqlstate '22008' or sqlstate 'P0001' then
   update public.brackets set status='draft',review_message='Please check your bracket and choose later deadlines before submitting again.',revision=revision+1 where id=item.id;
   delete from app_private.bracket_review_queue where bracket_id=item.id;
  when others then
   insert into app_private.competition_worker_errors values(item.id,clock_timestamp(),sqlstate)
   on conflict(bracket_id) do update set failed_at=excluded.failed_at,error_code=excluded.error_code;
  end;
 end loop;
 for attempt in 1..5 loop
  for item in select b.id from public.brackets b join public.bracket_rounds r on r.bracket_id=b.id and r.round_index=b.current_round
   where b.status='active' and b.timing_mode<>'manual' and r.status='open' and r.ends_at<=clock_timestamp()
   order by r.ends_at,b.id for update of b skip locked limit 100 loop
   begin
    perform app_private.resolve_bracket_round(item.id);
    delete from app_private.competition_worker_errors where bracket_id=item.id;
   exception when others then
    insert into app_private.competition_worker_errors values(item.id,clock_timestamp(),sqlstate)
    on conflict(bracket_id) do update set failed_at=excluded.failed_at,error_code=excluded.error_code;
   end;
  end loop;
 end loop;
end $$;

create function app_private.cast_bracket_vote(p_matchup_id uuid,p_entry_id uuid,p_revision bigint,p_request_id uuid) returns bigint
language plpgsql security definer set search_path='' as $$
declare u uuid:=app_private.require_active_user(); b public.brackets%rowtype; r public.bracket_rounds%rowtype;
 m public.bracket_matchups%rowtype; v app_private.bracket_ballots%rowtype;
begin
 if p_revision is null or p_revision<0 or p_request_id is null then raise exception using errcode='22023',message='Invalid vote request.'; end if;
 select * into m from public.bracket_matchups where id=p_matchup_id;
 select * into b from public.brackets where id=m.bracket_id for share;
 if b.id is null or b.status<>'active' or not app_private.can_read_bracket(b.id) then raise exception using errcode='42501',message='Bracket unavailable.'; end if;
 select * into r from public.bracket_rounds where bracket_id=b.id and round_index=b.current_round for share;
 if r.status<>'open' or r.round_index<>m.round_index or r.starts_at>clock_timestamp() or (r.ends_at is not null and clock_timestamp()>=r.ends_at) then
  raise exception using errcode='55000',message='Voting is closed for this matchup.';
 end if;
 if m.left_entry_id is null or m.right_entry_id is null or p_entry_id is null or p_entry_id not in (m.left_entry_id,m.right_entry_id) then
  raise exception using errcode='22023',message='Choose a competitor in this matchup.';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(p_matchup_id::text||u::text,0));
 select * into v from app_private.bracket_ballots where matchup_id=p_matchup_id and voter_id=u for update;
 if found and v.last_request_id=p_request_id then
  if v.selected_entry_id<>p_entry_id then raise exception using errcode='22023',message='Use a new request for a changed vote.'; end if;
  return v.revision;
 end if;
 if coalesce(v.revision,0)<>p_revision then raise exception using errcode='40001',message='Your vote changed in another tab. Refresh before voting again.'; end if;
 -- Recheck after waiting on the per-ballot lock, using wall-clock server time.
 if r.ends_at is not null and clock_timestamp()>=r.ends_at then raise exception using errcode='55000',message='Voting is closed for this matchup.'; end if;
 insert into app_private.bracket_ballots(matchup_id,voter_id,bracket_id,round_index,selected_entry_id,last_request_id)
 values(p_matchup_id,u,b.id,m.round_index,p_entry_id,p_request_id)
 on conflict(matchup_id,voter_id) do update set selected_entry_id=excluded.selected_entry_id,last_request_id=excluded.last_request_id,
  revision=app_private.bracket_ballots.revision+1,updated_at=clock_timestamp()
 returning revision into p_revision;
 return p_revision;
end $$;
create function app_private.close_manual_round(p_id uuid,p_round integer) returns void
language plpgsql security definer set search_path='' as $$
declare u uuid:=app_private.require_active_user(); b public.brackets%rowtype;
begin
 select * into b from public.brackets where id=p_id for update;
 if b.id is null or b.owner_id<>u or b.visibility<>'private' or b.timing_mode<>'manual' then
  raise exception using errcode='42501',message='Only the creator can close a private manual round.';
 end if;
 if b.current_round>p_round or b.status='completed' then return; end if;
 if b.status<>'active' or b.current_round<>p_round then raise exception using errcode='55000',message='Refresh to see the current round.'; end if;
 perform app_private.resolve_bracket_round(p_id);
end $$;
create function app_private.save_competition(p_id uuid,p_save boolean) returns void
language plpgsql security definer set search_path='' as $$
declare u uuid:=app_private.require_active_user();
begin
 perform 1 from public.brackets where id=p_id for share;
 if p_save then
  if not app_private.can_read_bracket(p_id) then raise exception using errcode='42501',message='Bracket unavailable.'; end if;
  insert into public.saved_brackets(user_id,bracket_id) values(u,p_id) on conflict(user_id,bracket_id) where bracket_id is not null do nothing;
 else delete from public.saved_brackets where user_id=u and bracket_id=p_id; end if;
end $$;
create function app_private.remove_saved_competition(p_saved_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare u uuid:=app_private.require_active_user();
begin delete from public.saved_brackets where id=p_saved_id and user_id=u; end $$;
create function app_private.delete_competition(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare u uuid:=app_private.require_active_user(false); b public.brackets%rowtype;
begin
 select * into b from public.brackets where id=p_id for update;
 if b.id is null then return; end if;
 if b.owner_id<>u then raise exception using errcode='42501',message='Only the creator can delete this bracket.'; end if;
 insert into app_private.deleting_brackets values(p_id);
 delete from app_private.bracket_ballots where bracket_id=p_id;
 delete from public.bracket_match_results where bracket_id=p_id;
 delete from public.bracket_matchups where bracket_id=p_id;
 delete from public.brackets where id=p_id;
 delete from app_private.deleting_brackets where bracket_id=p_id;
end $$;
create function app_private.deactivate_account() returns void
language plpgsql security definer set search_path='' as $$
declare u uuid:=app_private.require_active_user(false);
begin
 update public.profiles set deactivated_at=clock_timestamp(),last_deactivated_at=clock_timestamp() where id=u;
 -- Revoke refresh sessions; all app mutations additionally require an active profile.
 delete from auth.sessions where user_id=u;
end $$;
create function app_private.reactivate_account() returns void
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();
begin
 if u is null then raise exception using errcode='42501',message='Sign in first.'; end if;
 -- A revoked token cannot silently reactivate the account; require a live session.
 if not exists(select 1 from auth.sessions where user_id=u and id=(auth.jwt()->>'session_id')::uuid) then
  raise exception using errcode='42501',message='Sign in again to reactivate your account.';
 end if;
 update public.profiles set deactivated_at=null where id=u;
end $$;
-- Existing username writes must also respect account deactivation.
create function app_private.guard_active_profile_update() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid()=old.id and not app_private.active_account() and row(new.handle,new.display_name) is distinct from row(old.handle,old.display_name) then
  raise exception using errcode='42501',message='Reactivate your account before changing your username.';
 end if;
 return new;
end $$;
create trigger guard_active_profile_update before update on public.profiles for each row execute function app_private.guard_active_profile_update();

create function app_private.get_competition(p_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',b.id,'title',b.title,'description',b.description,'category',b.category_id,'trophyId',b.trophy_id,
  'visibility',b.visibility,'status',b.status,'reviewMessage',b.review_message,'timingMode',b.timing_mode,
  'currentRound',b.current_round,'totalRounds',b.total_rounds,'startedAt',b.started_at,'championId',b.champion_entry_id,
  'creator',case when p.handle is not null then p.display_name end,
  'isOwner',coalesce(b.owner_id=(select auth.uid()) and app_private.active_account(),false),
  'saved',exists(select 1 from public.saved_brackets s where s.bracket_id=b.id and s.user_id=(select auth.uid()) and app_private.active_account()),
  'entries',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'name',e.name,'seed',e.seed) order by e.seed) from public.bracket_entries e where e.bracket_id=b.id),'[]'),
  'rounds',coalesce((select jsonb_agg(jsonb_build_object('index',r.round_index,'status',r.status,'endsAt',r.ends_at) order by r.round_index) from public.bracket_rounds r where r.bracket_id=b.id),'[]'),
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

create function public.submit_bracket(p_id uuid,p_revision bigint) returns uuid language sql security invoker set search_path='' as $$select app_private.submit_bracket(p_id,p_revision);$$;
create function public.cast_bracket_vote(p_matchup_id uuid,p_entry_id uuid,p_revision bigint,p_request_id uuid) returns bigint language sql security invoker set search_path='' as $$select app_private.cast_bracket_vote(p_matchup_id,p_entry_id,p_revision,p_request_id);$$;
create function public.close_manual_round(p_id uuid,p_round integer) returns void language sql security invoker set search_path='' as $$select app_private.close_manual_round(p_id,p_round);$$;
create function public.save_competition(p_id uuid,p_save boolean) returns void language sql security invoker set search_path='' as $$select app_private.save_competition(p_id,p_save);$$;
create function public.remove_saved_competition(p_saved_id uuid) returns void language sql security invoker set search_path='' as $$select app_private.remove_saved_competition(p_saved_id);$$;
create function public.delete_competition(p_id uuid) returns void language sql security invoker set search_path='' as $$select app_private.delete_competition(p_id);$$;
create function public.deactivate_account() returns void language sql security invoker set search_path='' as $$select app_private.deactivate_account();$$;
create function public.reactivate_account() returns void language sql security invoker set search_path='' as $$select app_private.reactivate_account();$$;
create function public.get_competition(p_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$select app_private.get_competition(p_id);$$;
do $$declare f record;begin
 for f in select p.oid::regprocedure as signature,n.nspname,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname in ('public','app_private') and p.proname=any(array['submit_bracket','cast_bracket_vote','close_manual_round','save_competition','remove_saved_competition','delete_competition','deactivate_account','reactivate_account','get_competition','require_active_user','submission_schedule','activate_bracket','resolve_bracket_round','process_competitions','guard_active_profile_update']) loop
  execute format('revoke all on function %s from public,anon,authenticated',f.signature);
  if f.proname in ('submit_bracket','cast_bracket_vote','close_manual_round','save_competition','remove_saved_competition','delete_competition','deactivate_account','reactivate_account','get_competition') then
   execute format('grant execute on function %s to authenticated',f.signature);
  end if;
  if f.proname='get_competition' then execute format('grant execute on function %s to anon',f.signature);end if;
 end loop;
end $$;
create extension if not exists pg_cron;
select cron.schedule('competition-lifecycle','* * * * *','select app_private.process_competitions()');
