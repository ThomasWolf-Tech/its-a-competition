# Bracket access and scheduling

Confirmed October 30, 2026. These rules supersede the former end-date picker and creator-controlled publishing plan. See [shared lifecycle](./competition-lifecycle.md).

## Creation and timing

- Choose public or private. Save keeps an owner-only draft; Submit bracket enters Pending review and automatic activation.
- Public brackets require a timer. Private brackets can use a timer or creator-controlled manual rounds.
- Timers use three selectors: days 0–30, hours 0–23, minutes 0–59. Total duration must be at least one minute. Zero minutes is valid with nonzero days/hours.
- Default is one day for every round; Customize each round allows different durations. Durations, entrants and other structural settings lock on submission.
- One day means 24 elapsed hours. Timezone and daylight-saving changes do not alter the selected duration.
- The first clock starts at activation. Each subsequent round receives its full duration when actually opened, including after a scheduler outage. Overall competition length is an estimate.
- New timed submissions require integer minute durations. Existing live fixed schedules retain their original deadlines and catch-up behavior; already-queued older schedules remain supported.
- The countdown uses days, hours and minutes only, including very long older schedules. Below one minute it reads “Less than a minute”; at cutoff it waits for confirmed results.

## Authoritative behavior

The server controls vote acceptance, access and round closure. One current ballot per authenticated account/matchup can be changed until the deadline. Open-round totals and other voters’ selections are never exposed. One shared Cron worker checks every five seconds and closes timed rounds without a browser; only an active creator can close private manual rounds. On account deletion, public started brackets continue with an anonymous creator; all private brackets are permanently deleted.

Byes advance automatically. A 0–0 matchup uses seed order; unequal totals use majority; positive ties use a persisted server-generated random result. Closure stores results and advances winners atomically, then removes individual ballots. A reveal animation never chooses or changes the outcome.

Shared pages use a small authorized status read once per visible minute, with up to fifteen two-second checks after cutoff, then ten-second checks for up to two minutes before returning to the slower cadence. Hidden/completed pages stop polling. A changed round/status fetches one full authorized snapshot and applies it directly to the shared component; failures keep retrying rather than stopping after requesting a route refresh. The countdown runs locally with server-clock correction and makes no database calls.

## Result presentation

Confirmed transitions pause behind a translucent bracket overlay and animated existing logo: “Counting votes. Settling rivalries.” A glowing connector sweep precedes the advancing names’ fade-in. The final winner receives confetti and a permanent gold path. Completed-page initial loads do not replay celebrations. Reduced-motion preferences suppress moving effects.

Practice pages remain local demos; timed practice previews stop voting at their cutoff but do not simulate authoritative shared results. Private invitation issuance/redemption and member management remain unfinished. Their confirmed design is signed-in redemption, lasting membership, seven-day link expiry, and independent link/member revocation; removed-member reuse policy still needs a decision.

## Verification

Migration `20261030182340_round_durations_and_status.sql` is applied locally and hosted with matching history. Clean replay, 290 SQL assertions, concurrency checks, real local Auth/Data API/Cron integration, 92 app tests, lint, TypeScript and production build passed. Browser checks covered duration input ranges, zero rejection, custom durations saved/reloaded, mobile overlay, automatic timed progression, gold winner path and no replay on refresh. The full release accessibility/device matrix remains open.
