# MVP language policy

Confirmed October 28, 2026: keep username filters; guard against slurs in bracket text; remove the other automatic bracket-language checks. Reporting and moderator removal belong on the development wishlist.

## Current behavior

- **Usernames:** retain the existing profanity, sexual-language, slur/targeted-hate, reserved-name, uniqueness, and three-month rename rules.
- **Bracket names, descriptions, and competitor names:** check only for matched slurs, for both public and private brackets. Other profanity, explicit-language terms, and phrase-based abuse checks do not automatically block bracket text in this MVP.
- There is no media-title catalog, approved-title list, or special title bypass. All non-slur titles are handled alike.
- The English-first slur check uses word boundaries, Unicode compatibility normalization, common invisible-character removal, and common substitution/spacing patterns. This remains a limited automatic guardrail; it does not understand every language or context.
- App validation and PostgreSQL enforce the same rules. A rejected write names the field and preserves input, the previous saved draft, its revision, and the existing username/cooldown. Old records are not automatically rewritten or deleted.

## Maintenance and future work

The source is `src/lib/content-policy.ts`; shared behavior cases are in `src/lib/content-policy.cases.ts`. `scripts/render-content-policy.mjs` renders SQL helpers, and `--tests` renders the matching PostgreSQL cases. Test locally and generate a forward migration for database policy changes; do not edit old migration history to undo a policy.

User reporting, review tools, and authorized content removal/hiding are future work in [DEV_WISHLIST.md](../DEV_WISHLIST.md). No reporting queue, moderation interface, or automatic removal was added here. No paid service or external text transmission is involved.

## Verification

MVP migration: `supabase/migrations/20261029040259_mvp_content_policy.sql`, applied locally and hosted with explicit user deployment approval and matching history. All 89 app tests, 185 local SQL assertions, concurrency checks, and 75 rolled-back hosted policy checks pass. No hosted fixtures remain. Advisors are unchanged from [auth setup](./auth-setup.md). The earlier broad filter and media-title exceptions are superseded by this policy.
