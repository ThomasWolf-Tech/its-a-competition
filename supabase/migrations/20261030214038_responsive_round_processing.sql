-- One shared database job; avoid missing a cutoff by a full minute.
select cron.schedule('competition-lifecycle','5 seconds','select app_private.process_competitions()');
-- Keep frequent no-op passes cheap; existing worker limits/locks still apply.
create index bracket_rounds_open_deadline_idx on public.bracket_rounds(ends_at,bracket_id,round_index) where status='open' and ends_at is not null;
-- Cron run history is not pruned automatically. Limit this job's diagnostics.
select cron.schedule('competition-lifecycle-history','17 3 * * *',
 $$delete from cron.job_run_details where jobid=(select jobid from cron.job where jobname='competition-lifecycle') and end_time<now()-interval '7 days'$$);
