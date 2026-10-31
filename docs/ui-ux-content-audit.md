# UI/UX and content audit

October 30, 2026. Phase 1 only; implementation awaits user approval.

Method: independent content/design assessment (`/root/content_review`) and technical/detector assessment (`/root/technical_review`), reconciled with parent browser inspection. No application content, styles, business logic, contracts, or data changed.

## Verdict

The website has a coherent identity: space blue, trophy art, bracket progression, initials and selected checkmarks. Preserve it. Repetition across functional pages weakens the voice: rivalry, stage, crown and bragging-rights phrases repeatedly replace literal headings and instructions. Concentrate personality in the landing page and celebrations; make forms and settings direct.

## Coverage checklist

All frontend route/component source was reviewed, including validation and action-returned messages. Rendered coverage is explicitly narrower than source coverage.

| Route | Source | Rendered evidence |
| --- | --- | --- |
| `/` | Reviewed | Desktop and 390×844 mobile; hero, main copy, navigation |
| `/create` | Reviewed | Desktop and mobile; initial visibility choice; private fields and summary inspected |
| `/bracket` | Reviewed | Mobile bracket, progress, voting controls and horizontal-scroll layout |
| `/bracket/custom` | Reviewed | Mobile empty preview |
| `/bracket/[id]` | Reviewed | Existing completed 32-entry public bracket, desktop controls and rules drawer |
| `/trending` | Reviewed | Desktop and mobile real listing; category picker and empty-state source |
| `/account` | Reviewed | Desktop light, mobile dark, username cooldown and deletion disclosure |
| `/account/brackets` | Reviewed | Existing owned bracket and empty saved list |
| `/account/trophies` | Reviewed | Desktop and mobile populated room; empty-state source |
| `/login` | Reviewed | Login/signup/forgot/resend/error modes source only; retained existing signed-in session |
| `/auth/reset-password` | Reviewed | Desktop reset form; no credentials entered or submitted |

- [x] Shared header/footer, search modal, account dropdown, theme toggle and carousel controls.
- [x] Builder visibility, details, competitors, trophy categories/selection, schedule fields, summary, draft/save/submission states.
- [x] Local/shared bracket views, match cards, rules drawer, schedule disclosure, clock/counting/reveal/champion states and results.
- [x] Authentication modes, username onboarding/settings, account deletion, saved-item removal and bracket deletion controls.
- [x] Trending selector, listings, loading skeletons, empty/error states.
- [x] Route loading/error/unavailable states and auth redirect/callback message paths.
- [x] Shared CSS tokens, responsive breakpoints, labels, focus/pressed/live-region semantics and reduced-motion implementations.
- [ ] Rendered signed-out login/signup/forgot/resend and username onboarding.
- [ ] Rendered shared live/manual/timed transition, pending review, private invited access and failure states.
- [ ] Physical touch, screen-reader testing, text zoom and full contrast/performance certification.

No account, votes, drafts or stored competitions were mutated. Search/rules/category/account controls were inspected; Escape dismissal was exercised. Temporary review tab closed and viewport override reset.

## Prioritized findings

### P1: Trending cannot open its brackets

`src/app/trending/page.tsx:45–57`: titles are plain headings; no link uses the bracket ID. Confirmed in the actual populated feed. This blocks the discovery-to-participation journey, including the trophy room's empty-state destination.

Proposed fix: link each bracket title to its existing shared page. Preserve the layout and competitor disclosure. This is a frontend interaction repair, not a backend change.

### P1: Capability claims contradict current features

- `src/components/site-header.tsx:44`: “Public discovery is coming later” appears alongside working Trending. Say “Search demo brackets. Browse Trending for public competitions.”
- `src/components/bracket-rules.tsx:42`: “Shared voting and sign-in are coming next” is obsolete. Explain that practice picks stay in this tab while shared votes use an account.
- `src/components/bracket-schedule-card.tsx:10`: publishing/results future promises should become a direct explanation of local preview limits.
- `src/components/bracket-builder.tsx:146–148`, rules and schedule copy imply invitations are available although invitation operations remain pending. Describe current solo access and state invitation availability accurately.
- `src/components/username-form.tsx:12`: remove the reference to “future comments.”

Preserve demo labels, private access facts and local/shared distinctions. Shortening must not conceal limitations.

### P1: Shared submission does not guide users to errors

`src/components/bracket-builder.tsx:79–86,190`: the primary submission click handler returns on invalid configuration without the focus routing present in preview submission. Missing visibility has no explicit field error; required sections remain hidden. Other errors can be far above a mobile user at the bottom of the form.

Proposed fix: consistent first-invalid-field focus and visible visibility feedback using unchanged validation rules. Label the outcome “Submit for review.” Do not change submission lifecycle or backend validation.

### P1: Input boundaries are too faint

`src/components/bracket-builder.css:20,80` and `src/app/globals.css:663`: solid-color control boundary calculations give dark border ratios of 2.22:1 against the input and 1.92:1 against the card; light gives 1.58:1 and 1.69:1. These are below the 3:1 non-text requirement where a boundary identifies the control (WCAG 1.4.11).

Proposed fix: use a dedicated accessible control-border token in both existing palettes. Decorative separators do not all need stronger contrast. This calculation does not establish whole-site WCAG compliance.

### P2: Functional screens repeat marketing copy

The builder's opening, each section subtitle and summary repeat a similar persuasion cadence. Mobile rendering makes this especially visible before users reach inputs. Account, trophy, rules and loading states repeat it too.

| Existing | Proposed treatment |
| --- | --- |
| Who’s in on the rivalry? | Visibility |
| Name the showdown | Bracket details |
| Give every rivalry its time in the spotlight. | Remove; timing controls explain the task |
| Meet the contenders | Competitors |
| Choose what’s at stake | Trophy |
| THE STAGE IS YOURS | Bracket summary |
| Set the scene, stir the debate, have fun with it. This appears on your featured bracket. | Optional description, up to 180 characters. |
| Twenty virtual prizes. Your pick takes center stage. | Remove |
| Polishing your trophies… | Loading trophies… |
| Getting the arena ready… | Loading bracket setup… |
| Trending is taking a breather. | Trending couldn’t load. |

Keep the approved crossed-out landing premise, artwork, user-entered bracket names/descriptions, trophy names and meaningful celebration. Do not infer AI authorship from wording alone.

### P2: Status and ownership language is not always accurate

- `bracket-demo.tsx:115,150`: “YOUR SHOWDOWN” and “YOUR CHAMPION” appear for aggregate shared competitions regardless of ownership. Omit the eyebrow or use neutral competition/champion wording.
- `round-reveal.tsx:32`: “Awaiting results” also appears in a timed local preview that cannot generate automatic results. Make that state explicitly a closed preview.
- `round-reveal.tsx:52`: “The next round is almost ready” is unsuitable for the final and makes an unmeasured time promise. Use “Finalizing results.”
- `bracket-demo.tsx:169`: votes-saved wording should avoid implying individual votes persist after the documented per-round cleanup.
- Generic “Working…” and “One moment…” can become operation-specific where the UI knows whether it is saving, submitting or signing in.

### P2: Terminology and recovery copy drift

Standardize “My brackets” (not “My saved brackets” for the combined page), “competitor” in task UI, “round,” “matchup,” “draft,” “preview,” “submit for review,” and “save bracket.” Keep technical distinctions between these states.

Use destination-based navigation (“Back to home” instead of “Back to the good stuff”). Remove account greetings/subtitles that merely repeat the page heading. Shorten trophy introduction without losing all earning criteria. State username character rules precisely and retain the three-calendar-month restriction and actual eligibility date. Preserve anonymous-public-history and permanent-private-deletion disclosures.

Source also shows irreversible bracket deletion and manual closure receive less confirmation than account deletion. Flag for a separate user decision; do not add extra dialogs or change action behavior as an automatic copy cleanup.

### P2: Error views lose the skip-link destination

`src/app/account/error.tsx:2`, `src/app/create/error.tsx:2`, `src/app/bracket/[id]/error.tsx:3`: replacement error views use sections without the normal main landmark/`main-content` target. The persistent header still links there.

Proposed fix: preserve the normal landmark and skip destination while keeping the retry action. Verified in source; failures were not induced in the current session.

### P2: Compact navigation targets and information hierarchy

`globals.css:317–320`: inactive carousel indicators are approximately 15×44px and adjacent. Enlarge their invisible hit areas while keeping the approved small-dot design. Previous/next arrows provide equivalent controls, so this is not automatically a WCAG 2.5.8 failure.

Use the existing spacing/type tokens to remove gaps left by deleted copy. Let headings name tasks and helpers provide constraints. Mobile trophy rules currently occupy substantial space above the actual trophies; a shorter introduction with all rules retained improves hierarchy. Do not redesign the bracket or remove its intentional horizontal scrolling.

## Verification risks, not established defects

- Permitted 24-character wide/unbroken competitor names may overflow 56px rows in 160px columns; reproduce before selecting a wrapping/truncation fix.
- Light-mode champion paths use literal yellow; verify contrast while preserving text/checkmark cues.
- Carousel lacks an explicit persistent pause, intentionally removed earlier by the user. Assess accessibility options separately; do not silently restore the control.
- Counting-overlay scroll work should be profiled before claiming a performance defect.
- Theme resets after a full reload; persistence is a separate behavior choice, not authorized by this editorial pass.

## Review scores and limits

Nielsen heuristic assessment: status 3, real-world match 3, control/freedom 2, consistency 2, error prevention 2, recognition 3, efficiency 2, minimalism 2, error recovery 3, help 3. Total **25/40**, a qualitative baseline rather than a release certification.

Technical source assessment: accessibility 2, performance 3 (provisional), theming 3, responsive 3 (provisional), integrity 2; **13/20**. Browser samples support broadly responsive layouts, but do not certify all states or physical gestures.

First-time participant risk: discovery dead end and contradictory feature availability. Interrupted mobile creator risk: offscreen validation and weak first-save status. Keyboard/screen-reader risk: missing error-view skip target and inconsistent invalid-field focus.

## What works

Preserve the brand palette, responsive grouping, initials, trophy artwork, native dialogs, visible focus, checkmarks/pressed states, hidden inactive slides, reduced-motion states and intentional bracket scroll region. Keep factual rules for ties, zero votes, byes, hidden results, trophy eligibility, deletion and privacy. Do not substitute generic novelty for the existing identity.

## Checks and detector interpretation

The source detector returned one warning: `overused-font` for Arial at `src/app/globals.css:67`. It does not justify replacing the existing font. It missed the navigation and copy defects, so a near-empty detector result is not a clean user-experience audit.

Application ESLint passed with no output. Repository lint exited successfully with 188 warnings in bundled Impeccable scripts, not application source. No build/domain/backend tests were rerun because this phase changes no application code. Browser mutation/injection is unavailable through the read-only evaluate interface; no overlay or helper server was started, and no user-visible detector overlay is claimed.

## Proposed approved-work scope

1. Correct stale claims and standardize content across every route/state.
2. Remove repetitive functional-screen copy and adjust the resulting spacing/hierarchy.
3. Fix title links, validation presentation/focus, control borders, skip landmarks and indicator hit areas if included in approval.
4. Preserve all business rules, contracts, data models, branding and user-created content.
5. Verify changed routes in both themes at desktop/mobile; keyboard-test dialogs/forms; exercise important workflows with suitable local fixtures. Run application lint, TypeScript, relevant existing tests and production build.

Questions for approval: include the identified frontend usability/accessibility repairs or limit this pass to wording/spacing? Preserve playful voice mainly in marketing/celebration, or retain more of it throughout task screens? No implementation starts until the user approves.

## Approved implementation checkpoint

The user approved content plus the identified frontend usability/accessibility repairs, with playful language mainly in marketing/celebrations and businesslike settings.

- [x] Clean up task headings, helper text, loading/empty states and settings language across routes; retain factual disclosures and branded celebration.
- [x] Correct stale discovery/shared-voting/invitation/comments claims and local-preview status language.
- [x] Link real trending titles and sample search results to their existing bracket pages.
- [x] Consistent invalid-field focus for shared submission and preview; explicit visibility error, correct duration feedback and unsaved-state presentation.
- [x] Preserve main landmarks/skip targets on error and unavailable pages; use installed Next 16.4 retry support.
- [x] Strengthen control boundaries within existing themes and enlarge dot hit areas without changing carousel behavior.
- [x] Reproduce long-name overflow (88px name in a 56px row); constrain names to two lines (35px), preserving full accessible names and native hover titles.
- [x] Preserve all trophy rules in a native expandable explanation so collections appear sooner on mobile.
- [x] Browser check: desktop/light and mobile/dark forms/settings, private/manual preview creation and local champion progression, missing visibility/title/competitor/zero-duration focus, trending-to-shared navigation, search-to-matching-demo navigation, unavailable-page single main/skip destination, mobile trophy disclosure and guest sign-in/signup/recovery layouts.

Guest authentication screens were checked in an isolated frontend preview with placeholder local configuration, without submitting authentication actions. Normal port 3000 remains backed by the existing configuration. No real drafts, accounts, votes or competition records were changed. Disposable preview data stayed in the temporary browser tab.

Known limits: no physical touch/screen-reader certification, no newly exercised shared live-round transition or OAuth/email delivery flow, and no runtime profiling. Native hover titles expose clipped names on desktop; accessible labels retain the full name. Previously removed carousel pause and theme persistence remain separate behavior decisions. Additional destructive-action confirmations were not introduced.

Final checks: 92 existing app/domain tests passed; application-only ESLint and TypeScript passed with no findings; final production build passed. Repository lint has zero errors and the same 188 warnings in bundled Impeccable scripts. Normal local preview restored on port 3000 after clearing stale generated CSS. Temporary guest preview stopped, generated configuration additions removed, viewport reset and both temporary QA tabs closed. Review screenshot: /private/tmp/competition-ui-cleanup-desktop.jpg. No commit or deployment performed.
