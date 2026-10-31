-- Anonymous participation counters survive ballot cleanup. No voter, matchup,
-- selected entrant, or open-round result is retained or exposed by discovery.
create table app_private.bracket_vote_activity (
  bracket_id uuid not null references public.brackets(id) on delete cascade,
  bucket_start timestamptz not null,
  vote_count bigint not null check (vote_count > 0),
  last_vote_at timestamptz not null,
  primary key (bracket_id, bucket_start)
);
alter table app_private.bracket_vote_activity enable row level security;
revoke all on app_private.bracket_vote_activity from public, anon, authenticated;

-- Legacy records have no trustworthy first-cast timestamps. Preserve their
-- all-time participation without inventing recent activity from updates/closure.
insert into app_private.bracket_vote_activity(bracket_id, bucket_start, vote_count, last_vote_at)
select bracket_id, '-infinity'::timestamptz, sum(votes), '-infinity'::timestamptz
from (
  select v.bracket_id, count(*)::bigint as votes
  from app_private.bracket_ballots v
  join public.brackets b on b.id = v.bracket_id
  where b.visibility = 'public' and b.status in ('active', 'completed')
  group by v.bracket_id
  union all
  select r.bracket_id, sum(r.left_votes + r.right_votes)::bigint
  from public.bracket_match_results r
  join public.bracket_rounds rd using (bracket_id, round_index)
  join public.brackets b on b.id = r.bracket_id
  where rd.status = 'closed' and b.visibility = 'public' and b.status in ('active', 'completed')
  group by r.bracket_id
) legacy group by bracket_id having sum(votes) > 0;

create function app_private.record_bracket_vote_activity() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_now timestamptz := statement_timestamp();
begin
  -- Only first inserts count. ON CONFLICT updates/vote changes never add activity.
  -- This supplements, and does not replace, the future authoritative vote RPC.
  if exists (
    select 1 from public.brackets b
    join public.bracket_rounds r on r.bracket_id = b.id and r.round_index = b.current_round
    join public.bracket_matchups m on m.bracket_id = r.bracket_id and m.round_index = r.round_index
    where b.id = new.bracket_id and b.visibility = 'public' and b.status = 'active'
      and r.status = 'open' and r.round_index = new.round_index and m.id = new.matchup_id
      and new.selected_entry_id in (m.left_entry_id, m.right_entry_id)
      and m.left_entry_id is not null and m.right_entry_id is not null
      and r.starts_at <= v_now and (r.ends_at is null or r.ends_at > v_now)
  ) then
    insert into app_private.bracket_vote_activity(bracket_id, bucket_start, vote_count, last_vote_at)
    values (new.bracket_id, date_trunc('minute', v_now), 1, v_now)
    on conflict (bracket_id, bucket_start) do update
      set vote_count = app_private.bracket_vote_activity.vote_count + 1,
          last_vote_at = greatest(app_private.bracket_vote_activity.last_vote_at, excluded.last_vote_at);
  end if;
  return new;
end;
$$;
revoke all on function app_private.record_bracket_vote_activity() from public, anon, authenticated;
create trigger bracket_ballots_record_activity after insert on app_private.bracket_ballots
for each row execute function app_private.record_bracket_vote_activity();

-- Privileged access is necessary only to rank anonymous counters. This public
-- discovery operation deliberately requires no sign-in; it has no caller inputs
-- and returns only published public metadata, never counts or personal ballots.
create function app_private.get_trending_brackets() returns jsonb
language sql stable security definer set search_path = '' as $$
  with windows(priority, hours, label) as (
    values (1, 24, 'Past 24 hours'), (2, 72, 'Past 3 days'),
           (3, 168, 'Past 7 days'), (4, 720, 'Past 30 days'), (5, null, 'All time')
  ), eligible as materialized (
    select b.id, b.title, b.description, b.category_id, b.trophy_id,
      b.status, b.started_at, b.current_round, b.total_rounds, case when p.handle is not null then p.display_name end as creator
    from public.brackets b left join public.profiles p on p.id = b.owner_id
    where b.visibility = 'public' and b.status in ('active', 'completed')
  ), scores as materialized (
    select e.id, e.category_id, w.priority, sum(a.vote_count) as votes, max(a.last_vote_at) as latest
    from eligible e join app_private.bracket_vote_activity a on a.bracket_id = e.id
    cross join windows w
    where a.bucket_start <= statement_timestamp()
      and (w.hours is null or a.bucket_start >= date_trunc('minute', statement_timestamp() - make_interval(hours => w.hours)))
    group by e.id, e.category_id, w.priority
  ), chosen as (
    select c.id, coalesce(min(s.priority) filter (where s.candidates >= 10), 5) as priority
    from public.bracket_categories c left join (
      select category_id, priority, count(*) as candidates from scores group by category_id, priority
    ) s on s.category_id = c.id group by c.id
  ), ranked as (
    select s.*, row_number() over (partition by s.category_id order by s.votes desc, s.latest desc, e.started_at desc, e.id) as rank
    from scores s join chosen c on c.id = s.category_id and c.priority = s.priority
    join eligible e on e.id = s.id
  )
  select jsonb_build_object(
    'generatedAt', statement_timestamp(),
    'categories', (select jsonb_agg(jsonb_build_object(
      'id', c.id, 'window', w.label,
      'brackets', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', e.id, 'title', e.title, 'description', e.description, 'trophyId', e.trophy_id,
          'creator', e.creator, 'status', e.status, 'currentRound', e.current_round,
          'totalRounds', e.total_rounds,
          'entries', (select jsonb_agg(be.name order by be.seed) from public.bracket_entries be where be.bracket_id = e.id)
        ) order by r.rank)
        from ranked r join eligible e on e.id = r.id where r.category_id = c.id and r.rank <= 10
      ), '[]'::jsonb)
    ) order by c.id)
    from chosen c join windows w on w.priority = c.priority)
  );
$$;
revoke all on function app_private.get_trending_brackets() from public, anon, authenticated;
grant execute on function app_private.get_trending_brackets() to anon, authenticated;
create function public.get_trending_brackets() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select app_private.get_trending_brackets();
$$;
revoke all on function public.get_trending_brackets() from public, anon, authenticated;
grant execute on function public.get_trending_brackets() to anon, authenticated;
