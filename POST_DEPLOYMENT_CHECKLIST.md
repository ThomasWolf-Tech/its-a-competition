# Post-deployment checklist

Planning notes only. Complete these checks after the production website is publicly accessible.

## Google sign-in branding

- [ ] Verify ownership of `itsacompetition.com` in Google Search Console using an account associated with the Google Cloud project.
- [ ] Confirm the public homepage describes It's a Competition and links to the published privacy policy; ensure the policy accurately explains Google user data access, use, storage, and sharing. Configure the actual public homepage, privacy policy, and applicable terms URLs in Google Auth Platform.
- [ ] Confirm the app name, logo, `support@itsacompetition.com` support/developer contact, and authorized domains in Google Auth Platform → Branding.
- [ ] Submit Google branding for verification, address any review feedback, and publish the approved branding. Verify that production Google sign-in displays the approved name and logo.
- Brand verification is separate from Supabase’s paid custom auth domain add-on; a paid custom domain is not a prerequisite for this checklist. See [Google’s brand verification requirements](https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification).

Pre-launch requirements are tracked in [PRE_LAUNCH_CHECKLIST.md](./PRE_LAUNCH_CHECKLIST.md).
