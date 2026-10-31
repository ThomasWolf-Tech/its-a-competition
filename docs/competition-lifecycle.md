# Shared competition lifecycle

Confirmed October 30, 2026. This supersedes the earlier creator-controlled publication plan.

## Submission and review

Creators may keep incomplete owner-only drafts. **Submit bracket** validates and saves the completed setup, then atomically changes it to `pending_review`. There is no creator control for the actual activation time. Submitted names, category, visibility, trophy, and schedule preferences are frozen while queued.

The UI says **Pending review** and explains that the bracket goes live automatically when review is complete. It does not claim human review. The implemented review consists of the existing content/structure/schedule checks, rechecked before activation; future moderation can extend the private queue. No human moderation system has been implemented.

The initial internal hold is three minutes, followed by the next scheduler pass. This is a server setting, not a user-selectable deadline or a client timer. The private queue and worker functions have no ordinary user grants. Retries neither duplicate a submission nor restart the hold.

A single PostgreSQL Cron job, `competition-lifecycle`, calls `app_private.process_competitions()` every five seconds (updated by migration `20261030214038_responsive_round_processing.sql`). It activates up to 50 due submissions and processes bounded batches of due timed rounds. Unexpected failures retain the queued bracket and record a private error code; they do not claim the user’s content was rejected. Invalid or expired schedules return to the owner’s draft with a needs-changes message and preserved entrants.

New timed submissions use days/hours/minutes durations (one minute through 30 days, 23 hours and 59 minutes). First-round clocks start at activation; subsequent clocks start when each round actually opens. Delayed processing never consumes a new round’s allotted time. Existing live fixed schedules and previously accepted legacy queued schedules retain their original behavior. The builder no longer offers date selection.

## Shared brackets and votes

`/bracket/[id]` is the durable bracket page. The shared page reuses the existing two-sided bracket canvas, with server snapshots and mutations replacing local practice state. Pending/draft brackets are owner-only; private live brackets require ownership or active membership. Public live/completed brackets can be read anonymously. Metadata allows indexing only for public active/completed brackets. Unavailable and unauthorized links share the same generic unavailable page.

Votes require an active signed-in account and a username. One ballot exists per user/matchup, changes use optimistic revisions, and identical request retries are idempotent. The operation verifies membership, matchup entrants, round status, and the database clock after acquiring locks. A delayed request cannot slip past the cutoff. No open-round totals or other users’ selections are returned.

Closure saves all results, advances winners, updates the champion/current round, and purges that round’s ballots in one transaction. Byes advance automatically; 0–0 uses the higher seed; positive ties use one random server draw persisted in the final result. Retrying an already closed round cannot advance another round or reroll. Public and private timed rounds close from Cron with no browser. Only the active creator can end private manual rounds. Completed-round totals are available on the shared page.

A small authorized status RPC checks once per visible minute, with a bounded two-second burst after cutoff and slower retries afterward; one authorized snapshot is applied directly on a changed status/round. Countdown ticks make no database calls. Hidden/completed pages stop polling. The trending page remains a separate one-snapshot-per-visit feed; votes and transitions are not publicly broadcast.

## Permanent account deletion

The user replaced recoverable deactivation with permanent deletion on October 30. The account form explicitly confirms irreversibility and retained anonymous public competitions.

Deletion removes the Auth identity, profile/username, sessions, saved list, memberships, invitations issued by that user, drafts, pending submissions, and **all private brackets**, including completed private brackets. Private competition data cascades; other users’ saved private links become unavailable markers.

Public active/completed brackets remain with a null owner and display **Anonymous** as creator. Timed rounds continue. Existing ballots lose their voter identity but still count; normal round finalization purges them. Completed results and anonymous activity counts remain. Public text supplied by the creator remains as bracket content; automatic redaction of personally identifying text is not implemented. Backup/log retention remains a separate operational policy.

Account deletion requires the caller’s current authenticated session and runs atomically. An Auth deletion trigger applies the same cleanup for administrative deletions. Private marker tables allow only the narrowly scoped ownership anonymization; no client grants exist. Null-safe owner checks reject attempts to take control of anonymous brackets. Deleted JWTs cannot mutate or read private content. Signing up with the same email creates a new identity without recovery of ownership or saved data. Legacy deactivate/reactivate functions remain only for migration compatibility with client execution revoked; they are no longer offered in the app.

Development deletion tests use disposable local users only. No real account is deleted by deployment.

## Deleting a bracket

Only an active creator can delete their bracket. The confirmation UI states that the operation is permanent. The operation locks the parent, deletes ballots/results/matchups in referential order, then deletes the bracket so entries, rounds, invitations, memberships, review jobs, anonymous activity, and worker errors cascade. Frozen entrants/results can be deleted only as part of this whole-bracket operation; clients cannot use a session setting or call the worker to bypass guards.

A saved relationship has `bracket_id` set to null rather than retaining bracket content. Its owner sees **Bracket unavailable — This bracket was deleted by its creator** and can remove the saved item. No deleted title, entrants, votes, or results are kept in this marker. Loss of private access uses a distinct generic unavailable message while the bracket ID remains present.

## Deployment and verification

Migration: `20261030172902_competition_lifecycle.sql`, applied locally and to hosted project `lcagyfenkrkovuztjfte` after explicit user approval on October 30. Migration history matches the repository. Hosted Cron is active and successful minute runs are verified. No hosted test accounts or brackets were created, and the existing profile remains active and unchanged.

Hosted checks confirm RLS on all new tables, no client access to the queue/ballots/worker, and anonymous access only to the checked competition reader. No new advisor warnings were introduced; the previously recorded disabled leaked-password-protection warning remains. Local advisors report no issues.

Verification passed: clean migration replay, 273 SQL assertions, concurrent draft/username tests, 89 app tests, real local Auth/Data API/Cron integration, lint, TypeScript and production build. Browser testing with disposable local accounts covered submission/Pending review, natural delayed activation, retained account restoration, private solo voting/manual finalization, finalized totals, and unavailable saved items. The full mobile/accessibility release matrix is still open in the checklist.

- `npm run db:test`: database lifecycle/security checks plus existing draft/username concurrency tests.
- `node scripts/test-competition-local.mjs`: real local Auth/Data API integration and Cron activation without a browser, concurrent vote retries/replacements, hidden results, ties, account deletion/anonymization, private cascade deletion and unavailable bookmarks. Refuses hosted targets and cleans disposable fixtures.
- `npm test`, `npm run lint`, TypeScript/production build, local advisors, and browser checks.

Private invitation issuance/redemption/member-management UI, real homepage-feed integration, public search, share-image work, production SMTP/Google verification, hosting and the broader release checklist remain separate tasks.

## Duration and reveal update

Migration `20261030182340_round_durations_and_status.sql` is applied locally and hosted with matching history. Existing Cron and private worker/ballot restrictions remain intact. Clean replay, 290 SQL assertions, concurrent writes, 92 app tests and actual local API/Cron integration passed. Browser verified custom durations saved/reloaded and automatic timed progression, mobile counting overlay, gold champion trail, and no historical reveal on refresh. Lint, TypeScript and production build passed. The result overlay covers completed-round details as well as the bracket; moving effects honor reduced-motion preferences.

## Account deletion verification

Migration `20261030190539_account_deletion.sql`: local clean replay and 317 SQL assertions pass, including public live/completed retention, private manual/timed/completed deletion, anonymous vote preservation, null-owner authorization, retired deactivation APIs and stale-session denial. Actual local API integration verifies deletion, sign-in failure for deleted credentials, new registration with the same email, and uninterrupted result finalization. 92 app tests, lint, TypeScript and production build pass. Account UI wording inspected without submitting deletion for the real account. Migration is applied locally and hosted with matching history; permissions and existing-profile preservation verified.

## Short-round transition fix

October 30: Testing 123 had one-minute voting windows but the minute scheduler missed cutoffs by milliseconds, delaying closure nearly a minute. The UI could also stop polling after requesting a route refresh, leaving stale closed-round state displayed while the next round was already open. Historical browser timing is unavailable, so the precise client delay cannot be reconstructed. Changed updates to direct authorized snapshot reads with retry, refreshed the local clock on deadline changes, and moved the shared worker to five-second intervals with a partial open-deadline index. Daily cleanup limits this worker’s diagnostic history to seven days. Hidden-tab polling remains off; normal visible polling remains once/minute.

Migration `20261030214038_responsive_round_processing.sql` applied locally and hosted. 354 SQL checks, concurrent operations, clean replay, actual API/Cron lifecycle integration, lint/TypeScript/build pass. Local 32-entrant one-minute browser test advanced through Round of 16, quarterfinals and semifinals with overlay cleared; a semifinal vote was successfully cast without manual refresh. Disposable fixtures removed; no real bracket results or voting deadlines were rewritten.
