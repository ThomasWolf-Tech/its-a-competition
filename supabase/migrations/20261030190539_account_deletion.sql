-- Delete identities while keeping public started competitions and anonymous votes.
alter table public.brackets alter column owner_id drop not null;
alter table public.brackets drop constraint brackets_owner_id_fkey;
alter table public.brackets add constraint brackets_owner_id_fkey foreign key(owner_id) references auth.users(id) on delete restrict;
alter table public.brackets add constraint anonymous_brackets_started_public check(owner_id is not null or (visibility='public' and status in ('active','completed')));

-- A deleted voter keeps one unlinked ballot until normal round cleanup.
alter table app_private.bracket_ballots drop constraint bracket_ballots_pkey;
alter table app_private.bracket_ballots add column id uuid not null default gen_random_uuid() primary key;
alter table app_private.bracket_ballots alter column voter_id drop not null;
alter table app_private.bracket_ballots add constraint bracket_ballots_matchup_voter_key unique(matchup_id,voter_id);
alter table app_private.bracket_ballots drop constraint bracket_ballots_voter_id_fkey;
alter table app_private.bracket_ballots add constraint bracket_ballots_voter_id_fkey foreign key(voter_id) references auth.users(id) on delete set null;
create table app_private.deleting_accounts(user_id uuid primary key);
alter table app_private.deleting_accounts enable row level security;
revoke all on app_private.deleting_accounts from public,anon,authenticated;

create or replace function app_private.submit_bracket(p_id uuid,p_revision bigint) returns uuid
language plpgsql security definer set search_path='' as $$
declare u uuid:=app_private.require_active_user(); b public.brackets%rowtype;
begin
 select * into b from public.brackets where id=p_id for update;
 if b.id is null or b.owner_id is distinct from u then raise exception using errcode='42501',message='Bracket unavailable.'; end if;
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

create or replace function app_private.close_manual_round(p_id uuid,p_round integer) returns void
language plpgsql security definer set search_path='' as $$
declare u uuid:=app_private.require_active_user(); b public.brackets%rowtype;
begin
 select * into b from public.brackets where id=p_id for update;
 if b.id is null or b.owner_id is distinct from u or b.visibility<>'private' or b.timing_mode<>'manual' then
  raise exception using errcode='42501',message='Only the creator can close a private manual round.';
 end if;
 if b.current_round>p_round or b.status='completed' then return; end if;
 if b.status<>'active' or b.current_round<>p_round then raise exception using errcode='55000',message='Refresh to see the current round.'; end if;
 perform app_private.resolve_bracket_round(p_id);
end $$;

create or replace function app_private.delete_competition(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare u uuid:=app_private.require_active_user(false); b public.brackets%rowtype;
begin
 select * into b from public.brackets where id=p_id for update;
 if b.id is null then return; end if;
 if b.owner_id is distinct from u then raise exception using errcode='42501',message='Only the creator can delete this bracket.'; end if;
 insert into app_private.deleting_brackets values(p_id);
 delete from app_private.bracket_ballots where bracket_id=p_id;
 delete from public.bracket_match_results where bracket_id=p_id;
 delete from public.bracket_matchups where bracket_id=p_id;
 delete from public.brackets where id=p_id;
 delete from app_private.deleting_brackets where bracket_id=p_id;
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
    if v_bracket.owner_id is distinct from v_user_id then
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

create or replace function app_private.guard_started_bracket() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.owner_id is distinct from old.owner_id and old.status in ('active','completed') then
  if not (new.owner_id is null and old.visibility='public' and exists(select 1 from app_private.deleting_accounts where user_id=old.owner_id)) then
   raise exception using errcode='55000',message='Started bracket ownership is locked.';
  end if;
 end if;
 if old.status in ('active','completed') then
  if new.status not in ('active','completed') or row(new.visibility,new.timing_mode,new.schedule_preferences,new.total_rounds,new.started_at)
    is distinct from row(old.visibility,old.timing_mode,old.schedule_preferences,old.total_rounds,old.started_at) then
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

-- This trigger also makes administrator-initiated Auth deletion consistent.
create function app_private.cleanup_deleted_account() returns trigger
language plpgsql security definer set search_path='' as $$
declare b record;
begin
 perform 1 from public.profiles where id=old.id for update;
 insert into app_private.deleting_accounts values(old.id);
 for b in select id,visibility,status from public.brackets where owner_id=old.id order by id for update loop
  if b.visibility='public' and b.status in ('active','completed') then
   update public.brackets set owner_id=null where id=b.id;
  else
   insert into app_private.deleting_brackets values(b.id);
   delete from app_private.bracket_ballots where bracket_id=b.id;
   delete from public.bracket_match_results where bracket_id=b.id;
   delete from public.bracket_matchups where bracket_id=b.id;
   delete from public.brackets where id=b.id;
   delete from app_private.deleting_brackets where bracket_id=b.id;
  end if;
 end loop;
 delete from public.bracket_memberships where user_id=old.id;
 delete from app_private.bracket_invitations where issued_by=old.id;
 delete from auth.sessions where user_id=old.id;
 delete from app_private.deleting_accounts where user_id=old.id;
 return old;
end $$;
revoke all on function app_private.cleanup_deleted_account() from public,anon,authenticated;
create trigger cleanup_deleted_account before delete on auth.users for each row execute function app_private.cleanup_deleted_account();

create function app_private.delete_account() returns void
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();
begin
 -- Require a real current session; a leftover JWT cannot delete a returning identity.
 if u is null or not exists(select 1 from auth.sessions where user_id=u and id::text=auth.jwt()->>'session_id') then
  raise exception using errcode='42501',message='Sign in again before deleting your account.';
 end if;
 perform 1 from public.profiles where id=u for update;
 if not found then raise exception using errcode='42501',message='Account unavailable.'; end if;
 delete from auth.users where id=u;
end $$;
create function public.delete_account() returns void language sql security invoker set search_path='' as $$select app_private.delete_account();$$;
revoke all on function app_private.delete_account(),public.delete_account() from public,anon,authenticated;
grant execute on function app_private.delete_account(),public.delete_account() to authenticated;
-- Legacy functions remain for migration compatibility, with no app/client access.
revoke all on function public.deactivate_account(),public.reactivate_account(),app_private.deactivate_account(),app_private.reactivate_account() from public,anon,authenticated;
