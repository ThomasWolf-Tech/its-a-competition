# Trophy room

Confirmed October 30, 2026.

## Earning rules

- Public brackets only, with **at least 16 actual competitors**, not padded slots.
- A user must back the eventual champion in every matchup that competitor actually plays. The final saved vote when each round closes is authoritative; changes before cutoff are allowed.
- Automatic byes count without a vote. A user must start at the champion’s first contested matchup; a missed contested round or late join prevents the award.
- The bracket creator cannot earn that bracket’s trophy.
- Each qualifying user receives exactly one copy of the bracket’s selected trophy on finalization. No client can award or alter trophies.
- Multiple awards for the same trophy group into one card with ×2, ×3, etc. Counts are derived from individual award rows, not incremented browser counters.
- Trophy rooms are private for this version. Awards survive source-bracket deletion, with only the source link set to null. Account deletion removes that account’s awards and active eligibility.

## Data and performance

`app_private.trophy_candidates` retains only surviving user/entrant eligibility across rounds. It is inaccessible to clients and cleared on completion or bracket/account deletion. Each round processes final selections before the existing ballot purge, in the same transaction as results and advancement. No new per-vote browser request, polling feed, or permanent ballot history is introduced.

`public.trophy_awards` stores one immutable-to-clients event per user/bracket, the exact `trophy_id`, `earned_at` timestamp with timezone, and rule version. User-only SELECT RLS protects award history. `get_trophy_room()` runs as invoker and returns grouped quantities plus first/latest earned dates. The room loads a snapshot on navigation; it does not poll.

Timestamp storage preserves the instant for future yearly views; year/season boundaries and seasonal eligibility are future product work. Future seasonal trophies should use distinct catalog IDs so they never merge with ordinary trophies. Existing completed brackets cannot be backfilled because ballots were already purged. In-progress brackets whose champion’s earlier contested rounds predate this feature cannot receive reconstructed awards.

## UI and verification

`/account/trophies` includes earning rules, an empty state, grouped artwork/counts and latest earned dates. Account menu links to the room; signed-in headers show the stored public display name, with ellipsis for long names and the full accessible label. Profile changes refresh the header; signed-out users see Account.

Migration `20261030191259_trophy_room.sql`. Local tests cover perfect runs, changing votes, missing rounds, late joins, creator exclusion, automatic byes, actual entrant minimum, private denial, duplicate prevention, private reads, forbidden writes, source deletion and account deletion. Browser checks cover the populated ×3 room, empty state, menu, long username, light/dark themes and 390px mobile layout without horizontal page overflow. Browser awards were disposable visual fixtures; awarding correctness was tested separately through real database finalization.

Migration applied locally and hosted with matching history. Final clean replay, 342 database assertions, concurrency and lifecycle integration, 92 app tests, lint, TypeScript and production build pass. Hosted RLS/grants verified without creating any hosted awards. Future public trophy displays, yearly filters and seasonal awards remain unimplemented.
