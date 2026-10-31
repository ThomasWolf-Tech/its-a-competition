# Pre-launch checklist

Planning notes only. Unchecked items are not implemented or verified for production. This checklist does not make every wish-list feature a launch requirement.

Reviewed October 30, 2026. Accounts, drafts, policies, trending, and the shared lifecycle are implemented with hosted Supabase migrations applied. Submission/review, durable pages, voting/results, permanent account deletion, and creator deletion pass local integration/browser checks; hosted Cron/permissions are verified. Private invitations, real homepage/search integration, production authentication, hosting, and the final release walkthrough remain. See [competition lifecycle](./docs/competition-lifecycle.md).

## Supabase foundation

- [x] Confirm draft → Submit bracket → Pending review → automatic activation. Creators do not choose activation time. Private signed-in link redemption has lasting membership and separate link/member revocation.
- [x] Prepare/test the local schema foundation, owner-only draft RPC, catalogs, read policies/write denials, generated types, and concurrent draft saves.
- [x] Confirm all-started structure freezes, seven-day invitation expiry, and per-round ballot cleanup after safe finalization. Test the local guards and clean migration replay; run security/performance advisors.
- [x] Create initial hosted project under One Bad Wolf; apply all three foundation migrations and verify 73 assertions with rolled-back fixtures.
- [x] Implement/test the lifecycle migration locally: validated submission, private review queue, server activation, voting, result computation/advancement, and Cron closure.
- [x] Apply the lifecycle migration after explicit hosted approval; verify matching migration history, active/successful Cron, RLS and restricted worker/ballot/queue permissions. No real profile or competition was modified by tests.
- [ ] Implement/test invitation and membership mutation operations and their UI.
- [x] Add initial versioned migrations, constraints, database access/function grants, and generated app types; test foundational permissions locally and on hosted Supabase.
- [x] Implement email/password signup/sign-in, confirmation/resend/recovery, cookie sessions, sign-out, protected account/draft pages, and Google initiation/callback code; verify locally.
- [x] Enable the hosted Google provider and verify OAuth initiation reaches Google consent with the configured client/callback. This does not verify a completed sign-in.
- [ ] Complete end-to-end hosted Google sign-in and return/session verification; configure/test production callback allowlists and production confirmation/recovery email delivery. See [auth setup](./docs/auth-setup.md).
- [x] Connect owner-only persistent drafts with durable edit URLs, account listing, revision conflicts, and timezone-safe draft deadlines. Save does not publish or start clocks.
- [x] Implement and locally verify username-only Account settings and separate My Brackets, required username onboarding, database-enforced case-insensitive uniqueness/reserved names, and a three-calendar-month change cooldown. No profile images; username and bracket language policies are implemented below.
- [x] Apply the username-profile migration to hosted Supabase with explicit deployment approval; verify all 37 username assertions with rolled-back fixtures and confirm the regular preview loads onboarding.
- [x] Simplify MVP language checks: retain username filters and slur-only checks on bracket names, descriptions, and competitors; remove other bracket-language checks and the media-title catalog. See [content policy](./docs/content-policy.md).
- [x] Deploy the simplified MVP policy to hosted Supabase with explicit approval; all 56 parity and 19 write/rollback checks pass without retaining test records.
- [x] Connect shared submission/progress to controlled server operations locally. User/private snapshots are request-scoped, with private/no-store responses.

## Voting and round resolution

- [x] Require sign-in for every shared vote, including private brackets. One selection per user/matchup can be replaced until closure; stale revisions and duplicate requests are handled.
- [x] **0–0 matchup:** advance the higher-ranked seed per matchup, including partially voted rounds.
- [x] **Nonzero tie:** draw equally on the server and persist the winner once; retries/concurrent closure cannot reroll.
- [x] Verify manual/timed closure, byes, majority, 0–0, positive ties, later rounds/final, concurrent votes, repeat closure, and late-vote denial locally.
- [x] Provide an accessible rules side drawer on bracket pages explaining voting, hidden totals, closure, seeds, and random ties. The user's October 27 request supersedes the older internal-only restriction on seed-fallback copy.

## Private-bracket experience

- [x] Make the private option clearly support both solo use and invited participants. The builder explains solo play, optional invitations, and that shared invite links depend on publishing.
- [x] Verify private solo creation, voting, and creator-only manual advancement locally; no invitations required.
- [ ] Verify invited play and access controls if invitations are included at launch.
- [x] Keep private brackets out of trending/public reads and search-engine indexing; deny unrelated users access to shared pages. Public search remains a demo.
- [ ] Persist private invitations and validate access links on the server before returning bracket data or accepting votes. Invitations must not grant creator controls.

## Public schedules and round control

- [x] Enforce immutable public round durations and frozen entrants; reject manual public closure and resets. New rounds receive their full durations when opened; existing live fixed schedules are preserved.
- [x] Verify actual local Cron activation/closure without a browser, database-clock cutoff, and safe retries.
- [x] Enforce creator-only private manual closure. Account deletion retains anonymous public started brackets and deletes all private brackets.
- [x] Return no open-round competitor totals or other users’ picks. Reveal finalized totals after closure.
- [x] Save completed results/champion and atomically purge the closed round’s individual ballots. Backups/log retention remains a release policy decision.
- These behaviors pass local integration checks; hosted Cron/permissions are also verified. See [lifecycle notes](./docs/competition-lifecycle.md).

- [x] Add duration-only creation, day/hour/minute countdowns, bounded status polling, confirmed-result overlay, connector/name reveals, confetti and gold winner path. Migration deployed; targeted desktop/mobile browser checks pass. Full release accessibility matrix remains below.

## Public pages and discovery

- [x] Implement/deploy the category trending feed: up to ten public active/completed brackets per category, recent-vote windows with progressively wider fallbacks, private anonymous counters, and no exposed individual votes or competitor totals. See [trending discovery](./docs/trending-discovery.md) for implementation defaults and verified access.
- [x] Add the searchable single-category selector, per-category window labels, URL-preserved selection, responsive empty states, and animated/reduced-motion loading skeletons.
- [x] Add durable shared `/bracket/[id]` pages with public content, creator usernames, finalized results, metadata, and authorized non-indexable private views. `/bracket` and `/bracket/custom` remain practice previews.
- [ ] Add and verify public bracket share images.
- [ ] Connect the homepage carousel to a fresh snapshot of up to 10 real public brackets on page load/full refresh, including the actual current-round matchup and permanent bracket link. Category ranking is implemented; the homepage still uses labeled sample concepts and an optional tab-local preview.
- [ ] Connect header search to public brackets, or explicitly keep it as a labeled demo control in the agreed launch scope. It currently searches sample fixtures.

## Release review

- [ ] Confirm the actual launch scope and finish invitation/access details for included features. Voting and tie rules are now confirmed.
- [x] Connect real persistence, creator usernames, votes and first-ballot trend counters in shared flows locally. Homepage/search sample integration remains above.
- [x] Enforce permissions, votes, transitions, deadlines, account deletion/session revocation and private reads in the database; verify locally.
- [ ] Complete lint, TypeScript, domain tests, production build, and a browser walkthrough covering mobile, keyboard use, light/dark themes, reduced motion, and the 12px text minimum.
- Current local checks: 92 app tests, 354 SQL assertions plus draft/username concurrency checks, real Auth/Data API/Cron lifecycle integration, lint, TypeScript/build and clean local advisors. Browser checks cover submission, live voting, deletion/anonymization, private solo finalization and deleted saved items. Invitation/member flows, the complete responsive/accessibility matrix and final release walkthrough remain.
- [ ] Select hosting and configure production domains, environment variables, authentication callbacks, and recovery/backup arrangements for stored competitions.
- [ ] Prepare/publish the public privacy/support pages and applicable terms needed for the production sign-in setup. Google branding verification itself remains in the post-deployment checklist.
- [ ] Review and commit the accumulated local changes before preparing a release deployment.

## Decisions to settle before completing the shared MVP

- [x] Replace deactivation with **Delete account**. Remove identity, saved items, drafts/pending submissions and all private brackets. Public live/completed brackets remain anonymous; returning users start fresh.
- [x] Implement/test permanent creator-requested whole-bracket deletion and an unavailable marker in saved lists. Confirmation explains permanent deletion; account deletion clearly explains what remains anonymous.
- [ ] Confirm launch entrant/active-bracket limits and creation/vote abuse controls. The current builder supports 2–32 entrants; a global launch cap and exact quotas have not been confirmed.

Wishlist enhancements are tracked separately in [DEV_WISHLIST.md](./DEV_WISHLIST.md).
After the website is live, follow [POST_DEPLOYMENT_CHECKLIST.md](./POST_DEPLOYMENT_CHECKLIST.md), including Google branding verification.

## Trophy room

- [x] Show signed-in public username in the header and add private Trophy room navigation.
- [x] Award the bracket trophy for a perfect champion run in public brackets with 16+ actual entrants; final selections count, byes count, creator excluded.
- [x] Group repeated trophies, preserve individual earned dates, protect awards with RLS, preserve awards after source deletion and erase them on account deletion. Migration deployed and verified.
- Year filters and seasonal trophies remain future work in DEV_WISHLIST.md. See [trophy-room rules and implementation](./docs/trophy-room.md).
