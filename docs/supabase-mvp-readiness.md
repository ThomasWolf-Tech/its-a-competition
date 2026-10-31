# Supabase MVP readiness review

Reviewed October 27, 2026. Scope: the existing hero, creation form, bracket pages, and the account/access support they need to work as shared competitions. This is an implementation proposal and decision register. The foundation schema is now applied and tested locally and on the hosted its-a-competition project under One Bad Wolf. Confirmed rules remain in [bracket-access-and-scheduling.md](./bracket-access-and-scheduling.md).

Current-status note (October 30): this is a historical proposal with superseded setup/open decisions. Accounts, usernames, policies, drafts, Google initiation, and category trending are deployed. Shared review/automatic activation, durable pages, voting/results/Cron, recoverable deactivation/restoration and bracket deletion are implemented/tested locally; the hosted lifecycle migration is applied and Cron/permissions are verified. These replace explicit creator publication and the undecided owner-exit policy. Invitations, homepage/search integration, share images, completed Google sign-in, production email and hosting remain. Use [the current checklist](../PRE_LAUNCH_CHECKLIST.md) and [lifecycle notes](./competition-lifecycle.md); do not repeat completed setup from this review.

## Current application gaps

| Area | Current implementation | Needed for launch |
| --- | --- | --- |
| Hero | `SHOWCASES` fixtures with fictional creators and vote totals; custom slide reads tab storage | A limited public-only feed with real creator identity, current-round matchup, canonical bracket link, and an honest empty state. Private brackets and drafts must never enter the feed or shared cache. |
| Search in header | Filters local showcase fixtures | Basic public title/category search if this control remains at launch; otherwise remove/label the demo control. No separate discovery product is required. |
| Creation | Owner-only Supabase drafts and durable edit URLs; separate tab-local practice previews | Publishing/full tournament validation and start semantics; drafts already have verified ownership, revision checks, and cross-device retrieval. |
| Bracket route | `/bracket/custom` points to a tab's single setup; query parameter selects sample fixtures | A durable `/bracket/[id]` route; public server-rendered data/metadata; authorized private reads and no indexing; return-to-bracket after sign-in. Keep the practice demo clearly separate if retained. |
| Voting | Browser reducer stores a single person's picks | One active selection per signed-in user per matchup, atomic replacement, idempotent retries, verified access, and server-clock deadline enforcement. |
| Advancement | Demo requires a pick in every matchup; scheduled previews cannot resolve results | Server closure using crowd totals. A creator can end a private manual round even with missing votes; resolve 0–0 matchups by seed. Scheduled public/private rounds close without a browser. |
| Results/history | Browser rebuilds winners from local selections | Finalized per-side matchup totals, winner, champion, and resolution method; no permanent ballot/change-event history. |
| Accounts | Email/password, confirmation/recovery, cookies, account page, and Google initiation/callback code implemented | Activate/test hosted Google, callback and SMTP configuration, and minimal public creator identity. Trophy collections remain deferred. |

The hosted project is now its-a-competition (lcagyfenkrkovuztjfte), One Bad Wolf, us-east-2. The repository now has a pinned Supabase CLI (2.122.0), local native-stack configuration, three foundation/catalog/policy migrations, generated public-schema types, 73 passing pgTAP assertions, and passing real concurrent-draft-save tests. The CLI supplies a local Postgres 17 runtime without Docker. Supabase SDK/SSR wiring and a hosted-backed local environment are now implemented for authentication and saved drafts. Google activation, hosted Auth settings, and production deployment environment remain pending. All three migrations and all 73 assertions have been verified on the hosted database; the local CLI is not linked and the web app now connects for accounts and drafts. See [foundation setup](../supabase/README.md).

## Confirmed rules that do not need to be asked again

- Sign-in for all shared votes, including private brackets. One selection per user per matchup; changes replace it until closure.
- No open-round competitor totals, percentages, or leading indicators in the UI **or public data responses**. Reveal after successful round closure.
- Resolve byes automatically; 0–0 by lower numeric seed; unequal votes by majority; equal positive votes by a fair random choice made once by the server and persisted.
- Public schedules are fixed. No owner overrides, manual advancement, reset, or reseeding after start.
- Private brackets support scheduled or owner-controlled manual rounds and solo play. Shared access uses stored, server-validated invitation links.
- Retain bracket/entrant data, final per-matchup totals/winners, and champion. A permanent individual vote or vote-change audit stream is not required.
- Keep the current two-sided single-elimination format. The local 2–32-entrant implementation is a proposed launch limit, not an expansion to other formats.

## Data model

The foundation tables now exist locally. Controlled publication/voting/invitation/closure operations and web integration remain pending; the three additional structural/expiry/cleanup decisions are now confirmed; remaining launch choices are listed below. Use PostgreSQL constraints, permissions, and controlled functions rather than browser-only rules.

| Record | Purpose | Retention/access |
| --- | --- | --- |
| Auth user + minimal profile | Stable owner/voter identity; public username/display identity; no public email exposure | Account data. Profile collection pages and trophy inventory are outside this milestone. |
| Bracket | Owner, title, description, category, trophy ID, visibility, lifecycle status, timing mode, start/end, current round, champion | Long term when published. Drafts are confirmed owner-only until explicit publication. Public visibility applies only after publishing. |
| Entry | Bracket-scoped ID, name, unique seed, initials presentation | Long term. Freeze structure at start. Existing browser IDs such as `competitor-1` are not globally unique DB identities. |
| Round | Round number, scheduled start/end, open/closed status, actual closure time | Long term. Scheduled deadline and actual processing time are distinct. |
| Matchup | Round/position, up to two entrant IDs, links to the next matchup slot, bye status | Long term. Makes the seeded tree and later-round participants deterministic. |
| Active ballot (non-exposed schema) | User, matchup, selected entry, concurrency version/request identity | Temporary. Unique `(matchup_id, user_id)`; voter can fetch only their own active selections through a guarded function. No creator access to other ballots. |
| Final match result | Matchup, final totals for both sides, winner, decision method (`votes`, `seed`, `random_tie`, `bye`) | Long term; readable only after its round is finalized, subject to bracket access. The method supports future tie indicators without storing individual vote history. |
| Private invitation (non-exposed schema) | Bracket, token verifier, issuer, revocation/optional expiry | No raw token stored or returned in ordinary bracket/feed responses. Redeeming grants only the agreed access level. |
| Private membership (confirmed) | Bracket + user + active/revoked access | Unique membership, separate from creator ownership. Revocation of a link and removal of an existing member are separate operations. |

Use static trophy/category IDs matching the existing catalogs; reject unknown IDs. No image uploads or new storage bucket are needed for today's repo-hosted artwork.

## Recommended write/read boundaries

- Create/update draft and publish, cast/replace vote, redeem invitation, and manually close a private round through narrow database functions. Publishing creates/finalizes entries, rounds, matches, and the resolved UTC schedule atomically. Use a client request identifier to avoid duplicate brackets on retry.
- User identity comes from a verified session, not a submitted owner/voter ID. Resolve permissions inside every operation, even if the page already checked them. Default-deny table writes and grant function execution only to intended callers.
- Keep ballots and unpublished totals outside exposed schemas; public result rows are created only at closure. RLS controls which rows are readable, so do not put a hidden tally into an otherwise readable matchup row and assume RLS hides that column.
- Any privileged function must explicitly verify ownership/membership, use a fixed search path and qualified table names, and have narrow execution grants. A service key is not needed in the browser. Avoid ordinary app requests that bypass permissions with a service identity.
- Server reads provide a public bracket snapshot, authorized private bracket snapshot, own active selections, and the hero's public feed. Never share-cache private/user-specific data, session refresh responses, or cookies.
- Consider no per-vote tally-counter updates for the initial MVP: store the active ballot and aggregate indexed ballots at round closure. This avoids counter contention and suits hidden totals. Benchmark closure before choosing this over maintained internal counters; the choice is an implementation decision, not a product requirement.
- If a participation count is approved, recommend counting current accepted matchup selections, not changes/retries as extra votes. Preserve closed-round counts and combine with active-round counts; otherwise deleting ballots would make the count fall. Cache this rather than broadcasting each vote.

Supabase's [RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security) calls for explicit grants/policies and tests; views and privileged functions need separate care. Its [function guidance](https://supabase.com/docs/guides/database/functions) covers search paths, caller checks, and execution grants.

## Closure, concurrency, and cleanup

1. A shared scheduler looks up due open rounds through a deadline/status index; process a bounded number each run. Use Supabase Cron, not one browser timer or a separate job per bracket.
2. Voting and closure coordinate on the same round. Ordinary votes should not require an exclusive lock on the whole bracket. Serialize conflicting replacements for the same ballot and use revisions to prevent a delayed older request overwriting a newer choice.
3. Validate the actual database clock after acquiring the required lock, so a request that waited across a deadline cannot slip in based on an earlier request/transaction timestamp.
4. Closure takes exclusive control of the round, resolves all matchups from one stable set of ballots, persists totals and winners, fills the next matchup slots, updates progress/champion, and closes the round in one transaction.
5. If already closed, return the stored outcome. A retry cannot redraw a tie or count the same votes twice. Public deadlines stay anchored to the saved schedule; delayed processing cannot silently extend them. A scheduler outage must catch up due rounds in order.
6. Purge ballots atomically as each round’s results are finalized (confirmed); results and deletion commit together. A failed closure never deletes ballots. Preserve permanent results independently of voter/account deletion. Backup copies and platform logs have their own retention windows.
7. Monitor scheduler health, failed closures, and overdue open rounds. Retain bounded operational run logs without recording individual choices or invitation secrets.

[Supabase Cron](https://supabase.com/docs/guides/cron) can execute database functions directly and records job runs. Scheduling precision and result-processing delay should be tested separately from exact vote cutoff enforcement.

## Open decisions

Resolved: initial hosted project created under One Bad Wolf; owner-only drafts precede explicit publish/start; signed-in link redemption creates ongoing membership, with link/member revocation separated. The remaining recommendations below are proposals until accepted. Also resolved: freeze structures for all started brackets; invitation links expire after seven days; individual ballots are deleted when each round is safely finalized. The local policy migration enforces those safeguards, while public mutation RPCs still need implementation.

| Decision | Recommendation | Why it matters |
| --- | --- | --- |
| Hero selection and count | Use a small feed of newest active public brackets initially; retain sample content only as labeled practice. Participation count remains optional | No ranking infrastructure required. Never feature private brackets, even for their owner, in a globally cached feed. |
| User identity | Email/Google sign-in with a public handle, not username/password login | Existing auth direction; determine whether handles are chosen or generated and what happens if already taken. |
| Account removal / owner exit | Preserve published competition results; anonymize attribution appropriately; resolve how ongoing manual-private brackets are handled | Account deletion must not cascade away accepted totals or leave a manual bracket without a closure policy. No transfer/cancellation policy is confirmed. |
| Launch limits and abuse controls | Keep the current 2–32 entrants; set bounded creation/vote requests and an owner active-bracket limit | Match UI and protect shared DB capacity. Exact quotas are not yet chosen. |
| Infrastructure | Confirm project region, development/test DB, production backups, Google OAuth, email delivery, and web host | Required before launch. Cloudflare domain ownership does not establish web hosting or email sending. |

## Authentication and deployment dependencies

- Add the supported Supabase browser/server clients and request-time verified session handling. Next.js in this repo enables Cache Components; session-dependent UI needs the local guide's request-time/Suspense boundaries. Do not blindly copy an older middleware/auth example.
- Complete Google provider credentials, public consent setup as required, exact callback URLs, and local/production return URL allowlists. Do not accept arbitrary external return URLs supplied by callers.
- Configure production SMTP for email confirmation and password recovery. Supabase's default email sender is restricted to project-team addresses and is not production-ready. Owning `itsacompetition.com` through Cloudflare does not by itself provide an outgoing SMTP service. See [custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
- Public URL/publishable key can be app configuration; DB passwords, invitation secrets, provider secrets, and privileged keys stay in appropriate secret stores/environment settings, never memory or source control. No credentials requested in chat.
- Use reviewed, versioned migrations and a separate test environment. Supabase CLI/local Postgres tooling must be made available, or an isolated hosted development DB chosen, before DB permission/concurrency tests can run.
- Choose backup/recovery coverage and verify a restore before production use. Supabase documents plan-dependent backups and separate storage-object limitations in [Database Backups](https://supabase.com/docs/guides/platform/backups). Deleting a row from the live DB is not immediate erasure from all retained backups.

## Build sequence and acceptance checks

1. **Foundation:** settle the first decisions; provision/connect the intended development project; migrations, constraints, row policies/function grants, generated types, verified auth, and minimum profiles. Test anonymous, owner, member, nonmember, and unrelated-user requests against the actual database.
2. **Persist creation:** save/reopen on another device; duplicate-submit retry; server-rejected invalid catalog IDs/names/seeds/times; owner-only draft visibility; explicit start if selected; start-time structural freeze.
3. **Shared bracket:** durable route; own votes; sign-in return; private link redemption/denial/revocation; vote replacement/concurrency/retry; no hidden totals through direct API calls; creator-only private manual closure with zero/partial votes.
4. **Timed results:** scheduler; deadline-race tests; concurrent/repeated closure; majority/0–0/random tie/byes/final; late-job catch-up; no public manual control; cleanup after successful finalization; stable results after cleanup.
5. **Real hero and launch:** replace fixtures and links with actual public data; public metadata/search; no private data in feed/cache/indexing; email/Google callbacks; restore/recovery test; representative vote/closure load test; deploy with the owned domain.

No chat, live vote broadcasts, native app, uploads, trophy collections, tie-break animation, or rematch flow is required by this review. A protected foundation schema, owner-only draft RPC, and confirmed-policy guards have been implemented/tested locally; shared web auth, publishing/voting/closure operations, and hosted integration have not.
