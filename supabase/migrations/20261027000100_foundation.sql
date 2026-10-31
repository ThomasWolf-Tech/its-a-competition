-- Foundation only: protected records, read permissions, and owner-only draft saving.
-- Publishing, voting, invitation redemption, and round closure follow separately.

create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;
grant usage on schema app_private to anon, authenticated;
alter default privileges in schema app_private revoke all on tables from public, anon, authenticated;
alter default privileges in schema app_private revoke execute on functions from public, anon, authenticated;

create table public.bracket_categories (
  id text primary key,
  name text not null
);
create table public.trophy_catalog (
  id text primary key,
  name text not null,
  category text not null,
  asset_path text not null check (asset_path like '/trophies/achievements/%')
);
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text unique check (handle is null or handle ~ '^[a-z][a-z0-9_]{2,23}$'),
  display_name text not null default 'Competitor' check (char_length(display_name) between 1 and 60),
  created_at timestamptz not null default clock_timestamp()
);
create table public.brackets (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete restrict,
  title text not null default '' check (title = btrim(title) and char_length(title) <= 60),
  description text not null default '' check (char_length(description) <= 180),
  category_id text not null default 'everything-else' references public.bracket_categories(id),
  trophy_id text not null default 'crown' references public.trophy_catalog(id),
  visibility text check (visibility in ('public', 'private')),
  timing_mode text check (timing_mode in ('manual', 'end-date', 'per-round')),
  schedule_preferences jsonb not null default '{}'::jsonb
    check (jsonb_typeof(schedule_preferences) = 'object' and octet_length(schedule_preferences::text) <= 4096),
  status text not null default 'draft' check (status in ('draft', 'active', 'completed')),
  revision bigint not null default 1 check (revision > 0),
  rules_version smallint not null default 1 check (rules_version = 1),
  total_rounds smallint check (total_rounds between 1 and 5),
  current_round smallint,
  started_at timestamptz,
  completed_at timestamptz,
  champion_entry_id uuid,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  check (visibility is distinct from 'public' or timing_mode is distinct from 'manual'),
  check (
    (status = 'draft' and started_at is null and completed_at is null and champion_entry_id is null and current_round is null and total_rounds is null)
    or
    (status = 'active' and visibility is not null and timing_mode is not null and char_length(title) >= 5
      and started_at is not null and total_rounds is not null and current_round is not null
      and current_round >= 0 and current_round < total_rounds and completed_at is null and champion_entry_id is null)
    or
    (status = 'completed' and visibility is not null and timing_mode is not null and char_length(title) >= 5
      and started_at is not null and total_rounds is not null and current_round is not null
      and current_round = total_rounds and completed_at is not null and completed_at >= started_at and champion_entry_id is not null)
  )
);
create table public.bracket_entries (
  id uuid primary key default gen_random_uuid(),
  bracket_id uuid not null references public.brackets(id) on delete cascade,
  seed smallint not null check (seed between 1 and 32),
  name text not null check (name = btrim(name) and char_length(name) <= 24),
  unique (bracket_id, seed),
  unique (bracket_id, id)
);
alter table public.brackets add constraint brackets_champion_entry_fk
  foreign key (id, champion_entry_id) references public.bracket_entries(bracket_id, id);

create table public.bracket_rounds (
  bracket_id uuid not null references public.brackets(id) on delete cascade,
  round_index smallint not null check (round_index between 0 and 4),
  status text not null default 'upcoming' check (status in ('upcoming', 'open', 'closed')),
  starts_at timestamptz,
  ends_at timestamptz,
  closed_at timestamptz,
  primary key (bracket_id, round_index),
  check (ends_at is null or (starts_at is not null and ends_at > starts_at)),
  check (status = 'upcoming' or starts_at is not null),
  check ((status = 'closed' and closed_at is not null and closed_at >= starts_at) or (status <> 'closed' and closed_at is null))
);
create table public.bracket_matchups (
  id uuid primary key default gen_random_uuid(),
  bracket_id uuid not null,
  round_index smallint not null,
  position smallint not null check (position between 0 and 15),
  left_entry_id uuid,
  right_entry_id uuid,
  next_matchup_id uuid,
  next_slot smallint check (next_slot in (0, 1)),
  unique (bracket_id, round_index, position),
  unique (bracket_id, id),
  unique (bracket_id, round_index, id),
  foreign key (bracket_id, round_index) references public.bracket_rounds(bracket_id, round_index) on delete cascade,
  foreign key (bracket_id, left_entry_id) references public.bracket_entries(bracket_id, id),
  foreign key (bracket_id, right_entry_id) references public.bracket_entries(bracket_id, id),
  foreign key (bracket_id, next_matchup_id) references public.bracket_matchups(bracket_id, id),
  check (left_entry_id is null or right_entry_id is null or left_entry_id <> right_entry_id),
  check ((next_matchup_id is null) = (next_slot is null)),
  check (next_matchup_id is null or next_matchup_id <> id)
);
create table public.bracket_match_results (
  matchup_id uuid primary key,
  bracket_id uuid not null,
  round_index smallint not null,
  left_votes bigint not null check (left_votes >= 0),
  right_votes bigint not null check (right_votes >= 0),
  winner_entry_id uuid not null,
  resolution text not null check (resolution in ('votes', 'seed', 'random_tie', 'bye')),
  finalized_at timestamptz not null default clock_timestamp(),
  foreign key (bracket_id, round_index, matchup_id) references public.bracket_matchups(bracket_id, round_index, id) on delete cascade,
  foreign key (bracket_id, winner_entry_id) references public.bracket_entries(bracket_id, id),
  check ((resolution = 'votes' and left_votes <> right_votes)
    or (resolution = 'random_tie' and left_votes = right_votes and left_votes > 0)
    or (resolution in ('seed', 'bye') and left_votes = 0 and right_votes = 0))
);
create table app_private.bracket_ballots (
  matchup_id uuid not null,
  voter_id uuid not null references auth.users(id) on delete restrict,
  bracket_id uuid not null,
  round_index smallint not null,
  selected_entry_id uuid not null,
  revision bigint not null default 1 check (revision > 0),
  last_request_id uuid not null,
  updated_at timestamptz not null default clock_timestamp(),
  primary key (matchup_id, voter_id),
  foreign key (bracket_id, round_index, matchup_id) references public.bracket_matchups(bracket_id, round_index, id) on delete cascade,
  foreign key (bracket_id, selected_entry_id) references public.bracket_entries(bracket_id, id)
);
create table app_private.bracket_invitations (
  id uuid primary key default gen_random_uuid(),
  bracket_id uuid not null references public.brackets(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  issued_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz,
  revoked_at timestamptz,
  check (expires_at is null or expires_at > created_at)
);
create table public.bracket_memberships (
  bracket_id uuid not null references public.brackets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  invitation_id uuid references app_private.bracket_invitations(id) on delete set null,
  joined_at timestamptz not null default clock_timestamp(),
  revoked_at timestamptz,
  primary key (bracket_id, user_id)
);

create index brackets_owner_status_idx on public.brackets(owner_id, status, updated_at desc);
create index brackets_public_feed_idx on public.brackets(started_at desc, id) where visibility = 'public' and status = 'active';
create index bracket_rounds_due_idx on public.bracket_rounds(ends_at, bracket_id) where status = 'open' and ends_at is not null;
create index bracket_ballots_round_idx on app_private.bracket_ballots(bracket_id, round_index, matchup_id);
create index bracket_ballots_voter_idx on app_private.bracket_ballots(voter_id, bracket_id, round_index);
create index bracket_invitations_bracket_idx on app_private.bracket_invitations(bracket_id);
create index bracket_memberships_user_idx on public.bracket_memberships(user_id, bracket_id) where revoked_at is null;

create function app_private.is_bracket_owner(p_bracket_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.brackets b where b.id = p_bracket_id and b.owner_id = (select auth.uid()));
$$;
create function app_private.can_read_bracket(p_bracket_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.brackets b where b.id = p_bracket_id and (
      b.owner_id = (select auth.uid())
      or (b.status <> 'draft' and b.visibility = 'public')
      or (b.status <> 'draft' and exists (
        select 1 from public.bracket_memberships m
        where m.bracket_id = b.id and m.user_id = (select auth.uid()) and m.revoked_at is null
      ))
    )
  );
$$;
revoke all on function app_private.is_bracket_owner(uuid), app_private.can_read_bracket(uuid) from public, anon, authenticated;
grant execute on function app_private.can_read_bracket(uuid) to anon, authenticated;
grant execute on function app_private.is_bracket_owner(uuid) to authenticated;

-- Enable RLS and explicitly undo the hosted platform's default table grants.
do $$
declare table_name text;
begin
  foreach table_name in array array['bracket_categories', 'trophy_catalog', 'profiles', 'brackets', 'bracket_entries', 'bracket_rounds', 'bracket_matchups', 'bracket_match_results', 'bracket_memberships'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from public, anon, authenticated', table_name);
  end loop;
end;
$$;
alter table app_private.bracket_ballots enable row level security;
alter table app_private.bracket_invitations enable row level security;
revoke all on app_private.bracket_ballots, app_private.bracket_invitations from public, anon, authenticated;

grant select on public.bracket_categories, public.trophy_catalog, public.brackets, public.bracket_entries, public.bracket_rounds, public.bracket_matchups, public.bracket_match_results to anon, authenticated;
grant select on public.profiles, public.bracket_memberships to authenticated;
create policy categories_read on public.bracket_categories for select to anon, authenticated using (true);
create policy trophies_read on public.trophy_catalog for select to anon, authenticated using (true);
create policy profiles_own_read on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy brackets_read on public.brackets for select to anon, authenticated using (app_private.can_read_bracket(id));
create policy entries_read on public.bracket_entries for select to anon, authenticated using (app_private.can_read_bracket(bracket_id));
create policy rounds_read on public.bracket_rounds for select to anon, authenticated using (app_private.can_read_bracket(bracket_id));
create policy matchups_read on public.bracket_matchups for select to anon, authenticated using (app_private.can_read_bracket(bracket_id));
create policy results_closed_read on public.bracket_match_results for select to anon, authenticated using (
  app_private.can_read_bracket(bracket_id) and exists (
    select 1 from public.bracket_rounds r
    where r.bracket_id = bracket_match_results.bracket_id and r.round_index = bracket_match_results.round_index and r.status = 'closed'
  )
);
create policy memberships_read on public.bracket_memberships for select to authenticated
  using (user_id = (select auth.uid()) or app_private.is_bracket_owner(bracket_id));

create function app_private.create_user_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- Provider metadata/email never becomes public profile data implicitly.
  insert into public.profiles(id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function app_private.create_user_profile() from public, anon, authenticated;
create trigger competition_create_profile after insert on auth.users for each row execute function app_private.create_user_profile();
insert into public.profiles(id) select id from auth.users on conflict (id) do nothing;

create function public.save_bracket_draft(
  p_bracket_id uuid,
  p_expected_revision bigint,
  p_title text,
  p_description text,
  p_category_id text,
  p_trophy_id text,
  p_visibility text,
  p_schedule_preferences jsonb,
  p_names text[]
) returns jsonb
language plpgsql security definer set search_path = '' as $$
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
$$;
revoke all on function public.save_bracket_draft(uuid, bigint, text, text, text, text, text, jsonb, text[]) from public, anon, authenticated;
grant execute on function public.save_bracket_draft(uuid, bigint, text, text, text, text, text, jsonb, text[]) to authenticated;
