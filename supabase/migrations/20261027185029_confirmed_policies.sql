-- Generated from the locally tested policy changes; incidental platform ACL churn removed.
SET local check_function_bodies = off;

DROP FUNCTION "public"."save_bracket_draft"(uuid, bigint, text, text, text, text, text, jsonb, text[]);

-- Existing local rows predate the mandatory lifetime; preserve their original issuance time.
UPDATE app_private.bracket_invitations SET expires_at = created_at + interval '168 hours';

ALTER TABLE "app_private"."bracket_invitations"
  ALTER COLUMN "expires_at" SET NOT NULL;

CREATE OR REPLACE FUNCTION app_private.guard_final_results()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if exists (select 1 from public.bracket_rounds where bracket_id = old.bracket_id and round_index = old.round_index and status = 'closed') then
    raise exception using errcode = '55000', message = 'Finalized matchup results are locked.';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION app_private.guard_invitation_lifetime()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if tg_op = 'INSERT' then
    new.created_at := clock_timestamp();
    new.expires_at := new.created_at + interval '168 hours';
  elsif row(new.id, new.bracket_id, new.token_hash, new.issued_by, new.created_at, new.expires_at)
    is distinct from row(old.id, old.bracket_id, old.token_hash, old.issued_by, old.created_at, old.expires_at)
    or (old.revoked_at is not null and new.revoked_at is null) then
    raise exception using errcode = '55000', message = 'Issue a replacement invitation instead of extending or restoring a link.';
  end if;
  return new;
end;
$function$;

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
    if v_status <> 'draft' then
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
    if v_status <> 'draft' and row(new.starts_at, new.ends_at) is distinct from row(old.starts_at, old.ends_at) then
      if v_mode is distinct from 'manual' or old.status <> 'upcoming' or new.status <> 'open'
        or old.starts_at is not null or new.starts_at is null or new.ends_at is distinct from old.ends_at then
        raise exception using errcode = '55000', message = 'Started round deadlines are locked.';
      end if;
    end if;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION app_private.guard_started_bracket()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if old.status <> 'draft' then
    if new.status = 'draft' or row(new.owner_id, new.visibility, new.timing_mode, new.schedule_preferences, new.total_rounds, new.started_at)
      is distinct from row(old.owner_id, old.visibility, old.timing_mode, old.schedule_preferences, old.total_rounds, old.started_at) then
      raise exception using errcode = '55000', message = 'Started bracket structure is locked.';
    end if;
    if old.status = 'completed' and row(new.status, new.current_round, new.champion_entry_id, new.completed_at)
      is distinct from row(old.status, old.current_round, old.champion_entry_id, old.completed_at) then
      raise exception using errcode = '55000', message = 'Completed bracket results are locked.';
    end if;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION app_private.guard_started_entries()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare v_old uuid; v_new uuid; v_status text;
begin
  if tg_op <> 'INSERT' then v_old := old.bracket_id; end if;
  if tg_op <> 'DELETE' then v_new := new.bracket_id; end if;
  -- The parent lock coordinates draft changes with publication. Ordered locks
  -- also cover a privileged attempt to move an entry to another bracket.
  for v_status in select status from public.brackets where id in (v_old, v_new) order by id for share loop
    if v_status <> 'draft' then
      raise exception using errcode = '55000', message = 'Started bracket competitors and seeds are locked.';
    end if;
  end loop;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION app_private.purge_finalized_round_ballots()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if new.status = 'closed' and old.status <> 'closed' then
    if not exists (select 1 from public.bracket_matchups where bracket_id = new.bracket_id and round_index = new.round_index)
      or exists (
        select 1 from public.bracket_matchups m
        left join public.bracket_match_results r on r.matchup_id = m.id
        where m.bracket_id = new.bracket_id and m.round_index = new.round_index and (
          r.matchup_id is null or (r.winner_entry_id is distinct from m.left_entry_id and r.winner_entry_id is distinct from m.right_entry_id)
        )
      ) then
      raise exception using errcode = '55000', message = 'Save a valid result for every matchup before closing the round.';
    end if;
    -- Deletion and result finalization commit together. Any later transaction
    -- failure restores the ballots along with rolling back the round closure.
    delete from app_private.bracket_ballots where bracket_id = new.bracket_id and round_index = new.round_index;
  end if;
  return new;
end;
$function$;

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

CREATE OR REPLACE FUNCTION public.save_bracket_draft (
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
  LANGUAGE sql
  SET search_path TO ''
  AS $function$
  select app_private.save_bracket_draft(p_bracket_id, p_expected_revision, p_title, p_description,
    p_category_id, p_trophy_id, p_visibility, p_schedule_preferences, p_names);
$function$;

REVOKE ALL ON FUNCTION "public"."save_bracket_draft"(uuid, bigint, text, text, text, text, text, jsonb, text[]) FROM PUBLIC, "anon";

ALTER TABLE "app_private"."bracket_invitations"
  ADD CONSTRAINT "invitation_seven_day_lifetime" CHECK ((expires_at = (created_at + '168:00:00'::interval)));

CREATE TRIGGER guard_invitation_lifetime
  BEFORE INSERT OR UPDATE ON app_private.bracket_invitations
  FOR EACH ROW
  EXECUTE FUNCTION app_private.guard_invitation_lifetime();

CREATE TRIGGER guard_started_entries
  BEFORE INSERT OR DELETE OR UPDATE ON public.bracket_entries
  FOR EACH ROW
  EXECUTE FUNCTION app_private.guard_started_entries();

CREATE TRIGGER guard_final_results
  BEFORE DELETE OR UPDATE ON public.bracket_match_results
  FOR EACH ROW
  EXECUTE FUNCTION app_private.guard_final_results();

CREATE TRIGGER guard_round_structure
  BEFORE INSERT OR UPDATE ON public.bracket_rounds
  FOR EACH ROW
  EXECUTE FUNCTION app_private.guard_round_structure();

CREATE TRIGGER purge_finalized_round_ballots
  AFTER UPDATE OF status ON public.bracket_rounds
  FOR EACH ROW
  EXECUTE FUNCTION app_private.purge_finalized_round_ballots();

CREATE TRIGGER guard_started_bracket
  BEFORE UPDATE ON public.brackets
  FOR EACH ROW
  EXECUTE FUNCTION app_private.guard_started_bracket();

REVOKE ALL ON FUNCTION "app_private"."guard_final_results"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "app_private"."guard_invitation_lifetime"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "app_private"."guard_round_structure"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "app_private"."guard_started_bracket"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "app_private"."guard_started_entries"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "app_private"."purge_finalized_round_ballots"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "app_private"."save_bracket_draft"(uuid, bigint, text, text, text, text, text, jsonb, text[]) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "app_private"."save_bracket_draft"(uuid, bigint, text, text, text, text, text, jsonb, text[]) TO "authenticated", "service_role";

GRANT EXECUTE ON FUNCTION "public"."save_bracket_draft"(uuid, bigint, text, text, text, text, text, jsonb, text[]) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."save_bracket_draft"(uuid, bigint, text, text, text, text, text, jsonb, text[]) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."save_bracket_draft"(uuid, bigint, text, text, text, text, text, jsonb, text[]) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."save_bracket_draft"(uuid, bigint, text, text, text, text, text, jsonb, text[]) TO "service_role";

