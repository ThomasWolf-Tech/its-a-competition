# Pre-launch checklist

Planning notes only. Unchecked items are not implemented or verified for production. This checklist does not make every wish-list feature a launch requirement.

## Confirmed rule to implement before going live

- [ ] **Zero-vote round:** when a round closes with no votes, resolve its matchups by seed order. The higher-ranked seed (lower numeric seed) advances.
- [ ] Apply the rule to round closure through the authoritative backend, whether closure is manual or deadline-driven. Repeated closure attempts must produce the same result.
- [ ] Verify seed-based advancement, including after randomizing seeds, through later rounds and the final. Existing byes must continue to work.
- **Internal implementation rule:** do not add explanations, notices, labels, or help text about this fallback anywhere on the site. Record it only in development notes.
- Nonzero-vote ties and partially unvoted rounds are separate decisions; do not silently extend this rule to those cases.

## Private-bracket experience

- [ ] Make the private option clearly support both solo use and invited participants. Use the suggested description in [DEV_WISHLIST.md](./DEV_WISHLIST.md) as a starting point.
- [ ] Verify a creator can create a private bracket, cast votes, and manually advance rounds with no invitations or other participants required.
- [ ] Verify invited play and access controls if invitations are included at launch.
- [ ] Keep private brackets out of public search, trending results, and search-engine indexing. The current local custom slide is only a browser-tab preview.

## Release review

- [ ] Confirm the actual launch scope and resolve voting, tie, and invitation rules for included features.
- [ ] Connect real persistence, creator identity, and vote/trend data for shared competitions. Remove or clearly label sample content.
- [ ] Enforce permissions, votes, round transitions, and any deadlines in the backend; check private-data access controls.
- [ ] Complete lint, TypeScript, domain tests, production build, and a browser walkthrough covering mobile, keyboard use, light/dark themes, reduced motion, and the 12px text minimum.
- [ ] Select hosting and configure production domains, environment variables, authentication callbacks, and recovery/backup arrangements for stored competitions.

Wishlist enhancements are tracked separately in [DEV_WISHLIST.md](./DEV_WISHLIST.md).
