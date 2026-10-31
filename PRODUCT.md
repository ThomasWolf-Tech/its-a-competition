# It's a Competition

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Friends and communities settling playful debates through public voting brackets or private solo/invited competitions. Creators organize the contenders and rules; participants back their favorites through successive rounds.

## Product Purpose

Turn opinions about movies, snacks, teams, and other topics into a competition with a completed bracket and one champion. Support friendly rivalry, public participation, and private play, including playing alone without invitations.

## Operating Context

Responsive web comes first. Native iOS and Android apps are later work, with reusable backend and domain rules. Public pages should be discoverable and searchable; private competition data requires authorized access.

Creators sign in, choose public or private visibility, enter contenders, choose a trophy and round controls, and save a draft or submit a shared bracket. Submission enters pending review before automatic activation. Participants sign in to vote and can change a selection until the round closes.

## Capabilities and Constraints

- Existing stack: Next.js App Router, TypeScript, Tailwind CSS, and Supabase. Authoritative permissions, votes, deadlines, and transitions belong in the backend.
- Current builder supports 2–32 competitors. Entry order sets seeds; byes accommodate uneven fields. The two-sided March Madness layout is single elimination.
- Public rounds use immutable durations and automatic closure. Private brackets may use timed rounds or creator-controlled manual closure. Started brackets freeze entrants, seeds, visibility, and timing mode.
- Open rounds hide competitor vote totals, percentages, and leader indicators. Completed rounds reveal persisted results. A 0–0 matchup advances the higher seed; positive ties receive one persisted server-side random outcome.
- Completed history retains the champion, matchup winners, and finalized totals. Individual ballots are removed after safe round finalization.
- Accounts use unique public usernames, without profile photos or automatic Google photos. Email/password authentication and Google sign-in are intended; production authentication verification remains launch work.
- Permanent account deletion removes identity and all private brackets. Public live/completed brackets remain with anonymous attribution.
- Private trophy rooms award the selected trophy for a perfect champion run in public brackets with at least 16 actual entrants, excluding the creator. Repeated designs group together; earned dates remain individually stored.
- Private invitation operations remain pending. Confirmed direction: seven-day invite links, lasting membership after signed-in redemption, and separate link revocation and member removal.
- Homepage carousel and header search currently use demo fixtures; the separate category trending feed uses shared public competitions. Practice previews remain distinct from shared voting.
- Public bracket share images are optional polish, not a confirmed MVP requirement.
- Launch quotas, abuse controls, production hosting, and backup/log retention remain open. PRE_LAUNCH_CHECKLIST.md tracks release work; DEV_WISHLIST.md tracks future enhancements.

## Brand Commitments

The working product name is **It's a Competition**. Keep the brack-it technical folder/package name until a rename is requested. The user owns itsacompetition.com; production hosting and DNS configuration are unverified.

Keep playful language mainly in marketing and celebrations. Forms use concise, direct instructions; settings use businesslike language. The brand voice is playful, friendly, and competitive: a response to “it's not a competition.” No tagline is confirmed. Preserve the user-approved space-blue identity, coordinated light/dark modes, matte controls, and Rally Relic trophy logo. The logo's removed background bracket diagrams must stay removed. Exact visual implementation lives in the existing code and assets; this initialization does not redesign it.

## Evidence on Hand

- MEMORY.md contains confirmed decisions and implementation checkpoints; use later checkpoints over superseded notes.
- PRE_LAUNCH_CHECKLIST.md records remaining release work.
- docs/competition-lifecycle.md, docs/bracket-access-and-scheduling.md, docs/content-policy.md, and docs/trophy-room.md describe current rules.
- public/brand/rally-relic-trophy-v2.png is the active logo artwork.
- public/trophies/achievements contains the selected achievement artwork; docs/trophy-art records art direction.
- Homepage demo creators and vote totals are fixtures, not evidence of actual community participation. Do not turn them into real usage claims.

## Product Principles

- Make friendly competition understandable and enjoyable, including solo private play.
- Keep shared outcomes and access trustworthy through backend enforcement.
- Preserve suspense until a round's results are finalized.
- Distinguish real shared activity from local practice and demo content.
- Keep responsive web usable now while preserving reusable rules for future mobile apps.

## Accessibility & Inclusion

Preserve keyboard access, visible focus, reduced-motion behavior, and readable light/dark themes. The confirmed minimum UI text size is 12px at the default browser size. Selected states use a checkmark as well as color. Competitors use initials; image uploads are deferred.
