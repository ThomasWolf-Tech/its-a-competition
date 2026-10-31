# Supabase database foundation

Current status October 30: foundation, authentication, drafts, trending and competition lifecycle migrations are applied locally/hosted. Submission enters Pending review, then Cron activates and resolves scheduled rounds. Shared voting, results, recoverable deactivation/restoration, saved brackets and creator deletion are wired into `/bracket/[id]`. Private invitation operations remain pending. `/bracket` and `/bracket/custom` remain local practice. See [current lifecycle and verification](../docs/competition-lifecycle.md); older foundation setup sections below describe earlier milestones, not outstanding setup.

Latest checks: 273 local SQL assertions plus concurrency tests, real local Auth/Data API/Cron lifecycle integration, 89 app tests, lint/TypeScript/build and browser checks pass. Hosted Cron has successful runs, migration histories match, and queue/worker/ballot permissions are denied to clients. Existing hosted Auth leaked-password protection remains disabled; this release adds no new advisor warning.

## Hosted project

- `its-a-competition` (`lcagyfenkrkovuztjfte`), organization **One Bad Wolf**, region **us-east-2 (Ohio)**. Created through the Supabase connector on October 27, 2026; quoted project cost: $0/month on the organization’s Free plan.
- [Project dashboard](https://supabase.com/dashboard/project/lcagyfenkrkovuztjfte). All repository migrations are applied; hosted migration versions match local filenames. The connector initially assigned execution timestamps; only those three history versions were aligned afterward, without rerunning DDL. The local CLI is not linked to this hosted project.
- All 73 pgTAP assertions pass on the hosted database with fail-fast assertion wrappers and rolled-back fixtures. No test accounts or competitions remain. All 11 application tables have RLS enabled; catalogs contain 10 categories and 20 trophies.
- Hosted advisors returned no warnings/errors. Informational notices: intentionally policy-free/deny-all private tables, unused indexes on the empty database, and 11 foreign keys without covering indexes. Evaluate indexes against actual query and deletion paths before launch; avoid blindly adding write overhead to ballots. See [RLS notice](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [foreign-key indexing](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys), and [unused indexes](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).
- No API keys or privileged credentials were added to source files. Google provider activation, hosted redirect/email-delivery settings, publish/vote/invitation/closure operations, and scheduling are still pending. The ignored local app environment now contains only the hosted URL and publishable key. See [authentication setup](../docs/auth-setup.md).

## Trending discovery (October 29)

Migration `20261029160000_trending_discovery.sql` is applied locally and hosted after explicit user approval, with matching migration histories. The public feed returns up to ten brackets per category using progressively wider recent-vote windows. Anonymous activity counters remain private and survive round ballot cleanup. Anonymous feed execution, counter permissions, and the hosted-backed browser preview are verified; no hosted fixtures were created. Local checks include 213 database assertions plus concurrent draft/username tests. Advisors report no new warnings; the existing Auth leaked-password-protection warning remains. See [trending discovery](../docs/trending-discovery.md).

## Confirmed lifecycle

- Creators save owner-only drafts, then explicitly publish/start. Saving a draft cannot start voting or a clock.
- A signed-in player redeems a private invitation once to gain membership. Revoking that link stops future redemptions; it does not remove existing members. Removing a member separately removes private read/vote access.
- Every started bracket freezes competitors, seeds, visibility, timing mode, and saved schedules. Private manual creators can still end rounds.
- Invitation links expire exactly 168 hours after issuance; creators issue replacements rather than extending a link. Existing memberships survive link expiry/revocation.
- When a round’s matchup results are safely finalized, delete its individual votes in the same transaction. Results survive, and a failed transaction restores the votes. Backup/log retention is separate.

## Included

- Versioned PostgreSQL migrations for catalogs, minimal profiles, brackets, entries, rounds, matchups, final results, memberships, private invitations, and private active ballots.
- Explicit read grants/RLS and no ordinary client table-write grants. Public drafts stay owner-only. Private records require ownership or active membership. Even creators cannot read open totals or other voters' selections.
- `save_bracket_draft`: authenticated owner-only, transactional, caller-generated UUID, expected-revision checking, trimmed/bounded inputs, catalog validation, and idempotent identical retries. Incomplete drafts are allowed; full competition validation belongs to publication.
- Generated TypeScript definitions from the actual local database.
- Started-structure/deadline guards, immutable seven-day invitation expiry, cleanup only after complete round results, and immutable finalized outcomes. The exposed draft RPC uses caller privileges; privileged owner-checked work remains in the non-exposed schema.
- 73 pgTAP assertions plus real concurrent-create and conflicting-save tests. Fixtures use `.invalid` addresses and are rolled back or removed afterward.

The current migrations deliberately do not grant a way to publish, cast a shared vote, redeem/revoke an invitation, or close a round. Those controlled operations must follow with their own tests. Table constraints are not a substitute for those operation-specific guards (for example, checking that a selected entrant is in that exact matchup).

## Local workflow

Requires Node 22.18+ (24 recommended), npm, and a supported native runtime platform (Apple silicon macOS 14+ or supported Linux). The official Supabase CLI is pinned in `package.json`. This project uses its experimental native stack for development; production migrations use ordinary PostgreSQL, not a native-runtime-specific schema.

```sh
npm install
npm run db:start
npm run db:migrate
npm run db:test
npm run db:types
npm run db:advisors
npm run db:stop
```

`db:start` downloads the official verified local service binaries the first time and starts database/auth/REST. Other services, including local email delivery, are excluded for the foundation tests; enable local mail when implementing/testing signup and recovery. No real email credentials are configured here.

The helper commands target local services only. Downloaded runtime artifacts are excluded from Git, ESLint, and TypeScript; the generated app types under src/lib/supabase remain checked. They use the ignored `.supabase-local/` for binaries, database data, CLI state, and startup logs. Startup output can contain development credentials, so it is written to that ignored directory instead of the terminal. Do not paste those logs into chat or commit them. The concurrency test additionally rejects any database host that is not loopback.

For new schema work, iterate against the local database with SQL queries, run advisors, generate/review a CLI migration, and verify clean replay. Run `db:migrate` to apply reviewed migrations locally, then `db:test`, then regenerate types. Add subsequent migrations rather than editing one that has been deployed to a shared environment. Three reviewed local migrations exist today; none has been deployed to a hosted project.

## Hosted setup still needed

1. Install/connect the Supabase integration or use the official dashboard/CLI securely; select the intended organization and region and create the project. Do not put DB passwords, provider secrets, or privileged keys into chat or Git.
2. Keep a development/test database separate from production. Migrations require a successful DB-test run and review before hosted application; the supplied local helper does not perform hosted deployment.
3. Configure Google OAuth, production SMTP, verified-session web clients/callbacks, and exact allowed return URLs. No auth UI is connected yet.
4. Expose only the intended API schema. Keep `app_private` out of API-exposed schemas. Reproduce explicit default-deny grants in hosted configuration; each migration also revokes broad default grants on its own tables/functions.
5. Implement and test publication/structural freezes, invitations/membership mutations, vote replacement/late-vote denial, server round resolution, scheduled closure, and safe cleanup.
6. Wire the existing creation form, durable bracket route, and public hero feed to that backend. Remove sample totals from the production flow, then verify caching/privacy, recovery, and expected load.

Account deletion is intentionally not a cascading delete of owned brackets or active ballots. A deliberate account-removal/owner-exit policy is still needed before enabling that feature. Profile handles are nullable until the onboarding decision is finalized; provider email/name is not automatically published.

The current decision register is [Supabase MVP readiness](../docs/supabase-mvp-readiness.md).
