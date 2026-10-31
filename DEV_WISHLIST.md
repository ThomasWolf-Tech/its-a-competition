# Development wish list

Notes only. Items below are future work, not implemented features or a commitment to include everything in the first release.

## Bracket creation and control

- [ ] **Randomize seeds:** offer a creation-time option to shuffle seed assignments instead of using entry order. Keep the resulting assignments stable once the bracket starts.
- [ ] **Private brackets for solo or invited play:** a creator can use a bracket alone, cast their own votes, and manually advance rounds, or invite others. Creating a private bracket must work without inviting anyone. This is a confirmed shared-MVP requirement tracked in the pre-launch checklist, rather than an optional enhancement; builder copy is implemented and shared operations remain pending.
  - Suggested description: **“Invite everyone or no one—your choice. Make your own picks or bring a few rivals, and advance the rounds when you’re ready.”**
  - Local builder now starts with an explicit private/public choice, with neither preselected. Private sharing still needs persisted, server-validated access links; see [access and scheduling notes](./docs/bracket-access-and-scheduling.md).
- [ ] Add other bracket layouts after the current two-sided March Madness format.
- [ ] Explore printable brackets and organizer-run real competitions.

## Predictions and rewards

- [x] **Private trophy room:** implemented with grouped trophy counts and individual earned dates. Confirmed earning rules are in [trophy-room notes](./docs/trophy-room.md); social and wagering extensions remain future work below.
- [ ] **Prediction mode:** predict bracket outcomes and earn trophies for accuracy. Scoring, prediction deadlines, eligibility, and reward rules still need design.

## Tie-breaker presentation

- [ ] **Let the fates decide:** show a fun animation when a tied matchup is resolved, possibly a spinning wheel featuring the two competitors. Reveal the outcome already randomly selected and saved by the server. Replays, refreshes, and different viewers must show the same result; the animation must never select or reroll the winner. Include a reduced-motion reveal.
- [ ] **Tie indicator:** keep a visible marker on the completed matchup so people can see that a tie occurred and fate decided the outcome. Preserve this as matchup-result metadata without retaining individual vote history.
- [ ] **Settle it again?** Explore an optional rematch/new-bracket prompt after a tie. Do not automatically create a bracket or alter the completed result. Exact scope and wording are still proposals.
- Random tie resolution itself is an MVP rule; animation, the lasting indicator, and rematch prompts are future polish.

## Appearance and trophies

- [ ] **Optional profile images:** explore custom image uploads or an avatar creator later. Current profiles use usernames only; do not automatically publish Google profile photos.
- [ ] **Logo animation:** the selected Rally Relic logo’s controller, basketball, film reel/strip, and donut burst outward, then come back together into its trophy-like silhouette. Preserve the current trophy-only artwork; do not reintroduce the removed background brackets. Explore a fun GIF or web animation once the static logo is selected; provide a reduced-motion version.
- [ ] **Bracket skins:** customize a bracket’s visual appearance.
- [ ] Upload a custom trophy or design one.
- [ ] Add subtle trophy animation, such as floating, orbiting, or shimmer. Independently animated parts require layered art or 3D; respect reduced-motion preferences.
- [ ] Revisit a larger head-to-head matchup panel for bigger brackets, with two expanded competitor cards and voting controls.
- Competitor image uploads remain deferred; initials are the approved presentation for now.

## Custom auth domain cost reference

- **Custom auth domain cost reference (checked October 28, 2026):** proposed `auth.itsacompetition.com` would use Supabase’s Custom Domain add-on: $10/month per project/domain ($0.0137/hour), available only on paid plans. Pro starts at $25/month, making a single Micro project plus the domain approximately $35/month before additional usage/taxes. This connects an existing domain; it does not purchase or renew the Cloudflare domain. No paid upgrade or domain setup is approved. Sources: [pricing](https://supabase.com/pricing), [domain billing](https://supabase.com/docs/guides/platform/manage-your-usage/custom-domains), [custom domains](https://supabase.com/docs/guides/platform/custom-domains).

## Reporting and moderation

- [ ] **Report and remove inappropriate content:** let users report bracket content and give authorized moderators tools to review reports and remove or hide offending content. Define reporting scope, permissions, and review/removal behavior before implementation. MVP keeps username filters and slur checks on bracket text; broader moderation is future work.

## Planned product areas

These are already part of the broader product direction. Choose release scope separately.

- Google/password authentication, shared storage, public/private permissions, and invitations.
- Public bracket search, actual community trends, public-page SEO, and share images.
- Fixed public schedules (one end date or individual round deadlines); private scheduled or creator-controlled manual rounds, enforced by the backend. Local setup and preview controls are implemented; automatic results are pending.
- Temporary live chat with moderation, rate limits, and automatic expiry; retention is undecided.
- Notifications, an installable web app, and later iOS/Android apps.

## Decisions still open

- Removed-member re-entry/restoration. Signed-in invitation redemption, seven-day link expiry, lasting membership, and separate link/member revocation are confirmed; their shared operations remain pending.
- Permanent account erasure and retention policy. October 30 MVP uses clearly labeled recoverable deactivation: retain identity, drafts, saved/live/submitted brackets; timed rounds continue and private manual rounds wait for return. Whole-bracket deletion is implemented separately. See docs/competition-lifecycle.md.
- Chat retention and launch limits for formats beyond the current 2–32-competitor builder.
- Unique-participant weighting or other future ranking refinements. Category trending already uses recent matchup votes with widening time windows; implementation defaults are documented in docs/trending-discovery.md. The homepage carousel still needs real-feed integration.

Pre-launch requirements are tracked in [PRE_LAUNCH_CHECKLIST.md](./PRE_LAUNCH_CHECKLIST.md).

## Trophy room extensions

- Add year filters using individual award timestamps; decide which timezone defines year boundaries.
- Design seasonal trophy catalog entries with distinct IDs, eligibility windows and versioned rules. Keep ordinary and seasonal trophy counts separate.
- [ ] **Visit other trophy rooms:** let users browse other users’ trophy collections. Define visibility/privacy controls; current trophy rooms remain private.
- [ ] **Wager earned trophies:** let users put eligible trophies at stake and lose or win ownership through agreed competition outcomes. Define eligible trophy types, how individual copies are selected from grouped counts, mutual acceptance, stake locking, settlement, cancellations and transfer history before implementation. Preserve original earned dates separately from later ownership changes. Citizen5’s exclusive **The Creator** award remains nontransferable and outside wagering unless explicitly changed.
- [ ] **Challenge someone for their trophy:** from another user’s trophy room, submit a challenge to play for a selected eligible trophy. The recipient must accept the challenge and stakes before play starts. Challenge format, counter-stakes, deadlines, ties and abandoned games still need design.
