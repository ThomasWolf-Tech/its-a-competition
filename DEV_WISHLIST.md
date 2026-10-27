# Development wish list

Notes only. Items below are future work, not implemented features or a commitment to include everything in the first release.

## Bracket creation and control

- [ ] **Randomize seeds:** offer a creation-time option to shuffle seed assignments instead of using entry order. Keep the resulting assignments stable once the bracket starts.
- [ ] **Private brackets for solo or invited play:** a creator can use a bracket alone, cast their own votes, and manually advance rounds, or invite others. Creating a private bracket must work without inviting anyone.
  - Suggested description: **“Invite everyone or no one—your choice. Make your own picks or bring a few rivals, and advance the rounds when you’re ready.”**
  - This describes the private option; a default public/private selection has not been decided.
- [ ] Add other bracket layouts after the current two-sided March Madness format.
- [ ] Explore printable brackets and organizer-run real competitions.

## Predictions and rewards

- [ ] **Prediction mode:** predict bracket outcomes and earn trophies for accuracy. Scoring, prediction deadlines, eligibility, and reward rules still need design.

## Appearance and trophies

- [ ] **Logo animation:** the selected Rally Relic logo’s controller, basketball, film reel/strip, and donut burst outward, then come back together into its trophy-like silhouette. Preserve the approved bracket design behind it. Explore a fun GIF or web animation once the static logo is selected; provide a reduced-motion version.
- [ ] **Bracket skins:** customize a bracket’s visual appearance.
- [ ] Upload a custom trophy or design one.
- [ ] Add subtle trophy animation, such as floating, orbiting, or shimmer. Independently animated parts require layered art or 3D; respect reduced-motion preferences.
- [ ] Revisit a larger head-to-head matchup panel for bigger brackets, with two expanded competitor cards and voting controls.
- Competitor image uploads remain deferred; initials are the approved presentation for now.

## Planned product areas

These are already part of the broader product direction. Choose release scope separately.

- Google/password authentication, shared storage, public/private permissions, and invitations.
- Public bracket search, actual community trends, public-page SEO, and share images.
- Owner-controlled round advancement and optional round deadlines enforced by the backend.
- Temporary live chat with moderation, rate limits, and automatic expiry; retention is undecided.
- Notifications, an installable web app, and later iOS/Android apps.

## Decisions still open

- Nonzero-vote ties and matchups with no votes when other matchups in the round did receive votes.
- Who may vote, how often, and whether votes can change before round closure.
- Private invitation/access mechanics and public/private creation defaults.
- Chat retention and launch limits for formats beyond the current 2–32-competitor builder.
- Discovery ranking. Recent votes and unique participants are a proposal, not a chosen algorithm.

Pre-launch requirements are tracked in [PRE_LAUNCH_CHECKLIST.md](./PRE_LAUNCH_CHECKLIST.md).
