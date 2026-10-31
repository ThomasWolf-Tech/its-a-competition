# Trending discovery

The `/trending` page shows up to **10 public brackets in the selected category**. The header’s Trending link opens this page. The homepage spotlight remains the existing sample carousel.

## Ranking defaults

Each category independently tries these vote windows in order:

1. Past 24 hours.
2. Past 3 days.
3. Past 7 days.
4. Past 30 days.
5. All time.

Use the first window containing at least 10 brackets with positive activity. If none of the four recent windows fills the list, use all time and return however many qualifying brackets exist, capped at 10. Private brackets, drafts and brackets with no votes are excluded. Started public brackets can qualify while active or completed.

Sort by votes in the selected window, then most recent qualifying activity, then bracket start time, then bracket ID for deterministic ties. The candidate threshold matches the displayed limit: the user clarified that twenty referred to the proposed list size and accepted ten.

One new ballot per user per matchup counts once. Changing an existing pick or retrying an upsert does not add activity. This measures matchup participation, not unique people: a user voting in multiple matchups contributes multiple votes. The future vote operation must keep the same ballot row when changing a selection.

These window lengths and tie-break ordering are implementation defaults, not separately confirmed product decisions.

## Category selection

The user requested a searchable dropdown and only the selected category’s list. Selection uses `?category=<id>` so refresh and Back/Forward retain it without refetching or replacing the loaded ranking snapshot. Earlier `#category` links still work.

The current default is the first category with trending brackets in catalog order, falling back to Food & Drink when all categories are empty. This is the implemented recommendation; the user has not separately confirmed a default. An explicit category in the URL always takes precedence, even if its list is empty. The dropdown supports type filtering, mouse/touch selection, arrow/Home/End navigation, Enter, Escape, and outside-click/focus dismissal.

## Data and privacy

`app_private.bracket_vote_activity` stores minute buckets containing only bracket ID, vote count and latest activity time. Recent lower boundaries are rounded down to the minute (less than one minute of boundary tolerance); votes are never counted from future buckets. The primary key supports indexed lookups by bracket and time and atomic increments.

An AFTER INSERT trigger on private ballots records only votes in valid, open public matchups. Counter writes share the ballot transaction. Personal ballot deletion at round closure does not delete these anonymous aggregates, so closing a round does not erase trending history. No voter IDs, matchup IDs, selections or per-competitor results enter this table.

Legacy ballots and closed results, if present when migrating, are preserved only in an all-time bucket. Their update/finalization timestamps are not treated as first-vote timestamps.

The private table has RLS, no client read/write grants, and no policies. A private SECURITY DEFINER read function returns only public metadata and seeded contender names; its public RPC wrapper uses SECURITY INVOKER. Both anonymous and signed-in visitors may call this public discovery operation. No vote counts, owner UUIDs or individual ballots are returned. Displayed creator names preserve chosen username capitalization; users without a chosen username have no public identity attached.

## Rendering and current limits

The server reads one fresh snapshot per request under Suspense, with no polling or Realtime subscription. Route navigation and the data-loading boundary share an animated skeleton for the category selector, category heading, and bracket cards. The 1.6-second matte pulse uses theme colors, stops for reduced-motion preferences, and is replaced as soon as the feed is ready. A screen-reader status announces loading; placeholder shapes are hidden from accessibility and cannot receive focus. The navigation link disables speculative prefetching. A searchable category dropdown displays one category at a time, with its window label, expandable contender lists, and accessible loading/error/empty states. The explanatory trending disclosure and demo/create promotional empty-state block were removed at the user’s request. There are no fabricated rankings or links to unimplemented shared bracket pages.

Migration `20261029160000_trending_discovery.sql` is applied locally and on hosted project `lcagyfenkrkovuztjfte`, following explicit user approval on October 29, 2026. Hosted migration history matches the repository. Anonymous feed execution and private counter permissions were verified, and the normal preview at http://127.0.0.1:3000/trending successfully reads the hosted feed. All ten categories currently have empty lists because no shared brackets or votes exist. No hosted fixtures were added.

October 30: shared submission, voting and round-advancement RPCs are implemented and the lifecycle migration is deployed. First shared ballot inserts feed discovery; vote replacements/retries do not inflate activity, and finalized rounds purge individual ballots without removing anonymous activity counters. Local practice picks do not enter discovery. See [competition lifecycle](./competition-lifecycle.md).

## Verification

`supabase/tests/trending.test.sql` tests all fallback stages, category independence, top-ten ordering and limits, private/draft/zero/future exclusions, deterministic ties, anonymous and authenticated reads, sanitized output, vote-change deduplication, transaction rollback, ballot cleanup, and completed-bracket eligibility.

Run `npm run db:test`, `npm test`, `npm run lint`, `npx tsc --noEmit`, and `npm run build`. The local database CLI remains unlinked to the hosted project.
