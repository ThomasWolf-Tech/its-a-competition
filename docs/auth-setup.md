# Authentication and saved drafts

Implemented October 28, 2026. Supabase owns accounts and passwords. The application uses pinned `@supabase/ssr` cookie clients, session refresh in Next.js Proxy, verified `getUser()` checks at protected reads/actions, and RLS. The normal local preview now points to the hosted project through ignored `.env.local`, using a publishable key only.

## Available app flows

- `/login`: email/password sign-in, signup, resend confirmation, forgot password, and Google OAuth initiation. Google is disabled in the UI until the project's public provider settings report it enabled.
- `/auth/callback`: exchange PKCE authorization codes for a cookie session. `/auth/recovery` performs the same exchange and sends password recovery to its dedicated form. Provider redirect URLs are fixed; a short-lived, non-secret return-path cookie is validated against local app routes before redirecting.
- `/auth/confirm`: verifies signup/email/recovery token hashes for custom server-side email templates. Tokens/codes are removed from the destination URL; failures show a generic expired-link message.
- `/auth/reset-password`: authenticated password replacement. No passwords or auth tokens are stored in application records, memory files, or source control.
- `/account`: username onboarding/settings, private sign-in email, and sign-out. `/account/brackets`: the signed-in user's most recent 100 saved drafts. Header dropdown contains Account and My Brackets.
- Email signup requires an explicit username; the auth-user insert trigger validates and claims it atomically. Existing and Google users without a username must choose one before creating/saving brackets. Provider names/photos do not become public profile data. Auth metadata updates never rename profiles.
- Usernames use 3–24 ASCII letters/numbers/underscores, with capitalization preserved in `display_name` and a unique lowercase `handle`. Reserved identity names are blocked. The checked `set_username` RPC locks the caller’s profile, validates the name, and stores the next eligible date three calendar months later in UTC. Initial choice also starts the cooldown; case-only changes count, exact retries do not reset it. Direct profile writes remain denied. The initial language filter is locally implemented; see [content policy](./content-policy.md) for deployment status, coverage, and limits.
- Username migration `supabase/migrations/20261029030845_username_profiles.sql` is applied locally and on hosted Supabase with explicit user approval. Migration histories match. All 37 username assertions pass on hosted with fixtures rolled back; the regular port-3000 preview loads onboarding for the existing account. No real username was chosen or changed during verification.
- Hosted advisors report one existing Auth warning: leaked-password protection is disabled. Supabase makes this feature available only on Pro and above; no plan change was made. See [password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Username database checks introduce no security warnings. Existing INFO notices cover deliberately policy-free private tables, 11 unindexed foreign keys, and four unused indexes; revisit indexes against actual workloads.
- `/create` requires sign-in. Save unfinished drafts to the existing owner-only RPC; reopen via `/create?draft=<uuid>`. Stale revisions stop with a reload action. Saving does not publish, create rounds, or start a clock. Absolute draft deadlines are serialized as UTC instants before leaving the creator's browser and displayed in the returning device's timezone; duration shortcuts remain durations.
- Preview bracket remains a tab-local practice experience. Preview picks never become shared votes or alter the stored draft. Existing preview setups can be explicitly imported via `/create?import=preview` after signing in.

Session-related responses are private/no-store. Authenticated data is neither stored in shared React/Next caches nor included in static shells. Server clients are request-scoped; initial authentication is deferred until request time before the SDK initializes time-dependent state. Server Actions provide their normal same-origin/CSRF protections; RLS and ownership are enforced independently of UI checks.

## Hosted setup still required

The connector supports database/project operations but does not expose Auth configuration changes. Latest recorded verification (October 28): the public settings endpoint reports email/password and Google enabled, email confirmation required, and anonymous auth disabled. Google initiation reached consent with the configured client and Supabase callback. Completed consent, return/session verification, production SMTP delivery, the production redirect allowlist, and hosted password settings remain unverified.

### Redirect URLs

In [URL Configuration](https://supabase.com/dashboard/project/lcagyfenkrkovuztjfte/auth/url-configuration), use the actual deployed site origin as Site URL when hosting is ready. During local testing, use `http://127.0.0.1:3000` and allow these exact app callbacks:

```text
http://127.0.0.1:3000/auth/callback
http://127.0.0.1:3000/auth/recovery
http://localhost:3000/auth/callback
http://localhost:3000/auth/recovery
```

At launch, add the deployed HTTPS callbacks and set Site URL to `https://itsacompetition.com` once that origin serves the app. Keep development origins only in the intended development configuration. The browser computes callbacks from its current origin. `NEXT_PUBLIC_SITE_URL` is the trusted canonical origin for callback destinations. Set it to the deployed origin in hosting environment variables. During local development, callbacks preserve either localhost or 127.0.0.1 on the configured port; arbitrary Host headers and return URLs cannot redirect to another site.

### Google

Setup progress October 28: Google Cloud project **Its a Competition** (ID `its-a-competition`) and branding are configured, using support@itsacompetition.com as support/developer contact. The support Google identity exists and has the user-approved OAuth Config Editor role. Cloudflare forwarding is enabled to the authorized Gmail destination; the destination is Verified and rule Active. An OAuth client is now configured in Supabase and Google initiation reached consent. Earlier account/client-creation handoff notes below are historical; do not create a duplicate client. Finish real sign-in and production delivery/callback verification.

Use the existing **Web application** OAuth client and project. [Supabase's Google guide](https://supabase.com/docs/guides/auth/social-sign-in/auth-google) covers the configuration. Branding/audience and basic `openid`, email, and profile scopes are configured; production readiness and completed sign-in still require verification.

- Authorized JavaScript origins: the actual local app origin during development and `https://itsacompetition.com` when deployed.
- Authorized Google redirect URI: `https://lcagyfenkrkovuztjfte.supabase.co/auth/v1/callback`.
- The client credentials are already configured and the provider is enabled. Any necessary future credential changes belong directly in the project's Google provider settings. Do not paste the client secret into chat or put it in app source/environment files.
- Keep nonce/email verification safeguards enabled. If the Google app is in Testing, add the intended testers and verify their sign-in; prepare the consent screen/audience for public launch.

Google's provider callback above is different from the app's `/auth/callback`. Supabase receives Google's response first and then redirects to the app for the PKCE exchange. Actual Google consent and hosted email delivery remain unverified until these external settings are completed.

### Email delivery

Keep email confirmation enabled. Set the hosted minimum password length to at least 8 to match the app's signup/reset forms.

Supabase still provides email/password authentication, but a production email sender is needed for confirmation/recovery messages. Its [default SMTP service](https://supabase.com/docs/guides/auth/auth-smtp) only sends to project-team addresses and is intended for testing. Configure a transactional SMTP provider, verify the sending domain's DNS in Cloudflare, choose the From address/name, and enter SMTP credentials directly in Supabase. No provider has been selected or configured yet.

Default confirmation/reset templates can use Supabase's confirmation URL with the app's fixed redirect callbacks (PKCE; open the link in the browser that initiated the request). For cross-browser verification, the app also supports a token-hash template linking to:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup">Confirm your email</a>
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Reset your password</a>
```

Test the actual message links after saving templates and SMTP settings. Never place service-role or SMTP secrets in `NEXT_PUBLIC_` variables.

## Local verification

```sh
npm run db:start
npm run db:migrate
npm run auth:preview   # leave running in a separate terminal: 127.0.0.1:3001
npm run auth:test
# Stop the auth preview, then:
npm run db:stop
```

The local preview reads loopback connection details from CLI status into memory, overrides the hosted environment only for that child process, and uses ignored `.next-auth-test` build output. It does not modify `.env.local`. Local email confirmation is disabled in config for disposable signup tests; hosted confirmations remain enabled. Token-hash confirmation/recovery tests generate local links with the local admin API without delivering email. The integration script verifies signup, refresh, owner-only drafts, guest/unrelated-user denial, server confirmation cookies, replay rejection, recovery, password replacement, sign-out, callback guards, and cleanup through local psql. It refuses hosted URLs.

Browser verification additionally covered sign-in, draft creation, full reload, account listing/reopening, stale second-tab saves, sign-out, and the signed-out redirect back to sign-in. Final test fixtures were removed; no hosted test accounts were created. This is not a Google consent or real SMTP delivery test.

## Dedicated support address prerequisite

Google's [support-email requirements](https://support.google.com/cloud/answer/15549049?hl=en) allow a Google Group managed by the signed-in user, or that user's Google-account address. A plain Cloudflare forwarding rule does not by itself make an address available in the dropdown. For a custom-domain address without Workspace, first establish incoming mail, then register that address as a non-Gmail Google account, explicitly grant the new identity the necessary project role, and configure branding while signed in as that identity. A managed Google Group is another route if a dedicated googlegroups.com address is acceptable.

[Cloudflare Email Routing](https://developers.cloudflare.com/email-service/get-started/route-emails/) can forward incoming support mail after destination verification. Decide the destination inbox before saving rules; inspect existing mail DNS before changing MX records. Receiving through a forwarding alias does not by itself configure branded outgoing support replies. It also does not replace the SMTP sender needed by Supabase for authentication emails.

### Current forwarding verification (October 28)

Cloudflare routing is Enabled; support@itsacompetition.com is Active and its destination is Verified. The domain had no DNS records before onboarding. Cloudflare added three MX records, SPF, and its DKIM TXT; no existing mail records were replaced. Public DNS resolves route1.mx.cloudflare.net (priority 48), route2.mx.cloudflare.net (56), route3.mx.cloudflare.net (49), and SPF `v=spf1 include:_spf.mx.cloudflare.net ~all`. Catch-all stays disabled. Actual delivery still needs a received message; the support Google-account verification email can exercise that path next.

The Google signup page is prepared for user handoff. Choose the existing-email option and use support@itsacompetition.com. The user must enter their own name/birth details/password as requested, verify the email, and accept any terms. No new Google credentials have been entered or created by the assistant. Once the account exists, review and explicitly authorize the necessary project-role grant before proceeding with OAuth branding.

### Support Google identity and project access

The user created the support Google account; its signed-in identity was verified as support@itsacompetition.com. The user explicitly approved and the assistant saved/verified the project grant for support@itsacompetition.com with **OAuth Config Editor (Beta)** (`roles/oauthconfig.editor`). [Google's role reference](https://docs.cloud.google.com/iam/docs/roles-permissions/oauthconfig) lists OAuth branding/client management, client-secret access, and project visibility. The support identity now has that role; the personal account remains Owner. Switching to the support identity reached Google Cloud’s first-use Terms of Service dialog. The user accepted the Cloud terms and approved the separate Google API Services User Data Policy; branding is now saved.

### Historical Google credential handoff (completed; see current status above)

Branding is saved; audience is External/Testing with the personal and support accounts as test users. Data Access has only `openid`, `https://www.googleapis.com/auth/userinfo.email`, and `https://www.googleapis.com/auth/userinfo.profile`. Saved through existing Owner access because Google’s scopes/clients UI requires additional service-usage/service-account read permissions beyond the support account’s OAuth role. No extra IAM role was granted.

The **Create OAuth client ID** form is prepared in the existing owner tab with type Web application, name Its a Competition Web, these origins:

```text
https://itsacompetition.com
http://localhost:3000
http://127.0.0.1:3000
```

and this single Google callback:

```text
https://lcagyfenkrkovuztjfte.supabase.co/auth/v1/callback
```

The form has no validation errors and Create is enabled. It has not been submitted. The user must create the client and copy its client ID/secret directly into the Google provider settings of the existing Supabase project, then enable/save the provider. Supabase’s dashboard is currently signed out; sign in with the existing Supabase account that owns One Bad Wolf. Do not create a new Supabase account for the support address. No secret should be posted in chat, captured in screenshots, or added to app source.

Provider activation and initiation have since been verified through the public settings endpoint and the app’s Google button. Configure/verify the production callback allowlist and complete real Google consent, return, and session testing. Public publishing/brand verification still require deployed homepage/privacy/terms and domain readiness. No public OAuth publishing has been verified.
