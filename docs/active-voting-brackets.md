# Active voting brackets

Account and My brackets show a list of active shared brackets the signed-in user has voted in. Rows include the title, visibility, current round name and number, next scheduled start in the device’s time zone, and a return-to-voting link. Finals explicitly have no next round; manual competitions wait for the creator. Past cutoffs show finalization/starting status rather than a stale scheduled start. Rows sort by the current deadline, with manual competitions last.

`get_voting_brackets()` returns one authorized snapshot, including server time. It accepts no user ID and reads only the authenticated active user’s participation. Private access is rechecked on every read. The JSON snapshot avoids the REST row limit silently cutting off the list. Populated lists refresh once per visible minute and on return to the window.

The private `bracket_participation` table stores only bracket/user IDs. An accepted vote inserts the relationship atomically; changing a pick or voting in another matchup does not create duplicate rows. Relationships survive normal per-round ballot deletion and are deleted when the bracket completes, the bracket is deleted, or the account is deleted. They never record previous selections or grant access to a private bracket. Saved bookmarks remain separate.

Migration `20261031043532_active_voting_brackets.sql` backfills relationships from surviving active ballots and transient trophy eligibility. Already-purged participation that has no surviving evidence cannot be reconstructed. Future votes always establish the relationship.

Verification: 96 app tests; 378 database assertions plus existing concurrency checks; local advisors; application lint, TypeScript and production build. Real local API/browser fixtures verified populated Account/My brackets lists, a working voting link, participation after ballot cleanup, long titles, desktop/mobile/tablet layouts and both themes. Temporary fixtures are removed afterward.

Deployment: applied locally only. Automatic approval review rejected the hosted migration because the current request did not explicitly authorize persistent schema/trigger/access-control changes to the shared Supabase project. Obtain the user’s explicit authorization to apply this migration to `its-a-competition` (`lcagyfenkrkovuztjfte`), then verify hosted permissions, migration history, advisors and the normal account preview. Do not infer a successful hosted deployment from local checks.
