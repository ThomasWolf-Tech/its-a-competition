# Project memory

## Product

- Working product name: **It's a Competition**, chosen by the user on October 25, 2026. The tone playfully answers people who say "it's not a competition." No tagline is confirmed.
- User reports itsacompetition.com and itisacompetition.com are available. Neither domain has been purchased or configured in this session. Keep the existing brack-it folder and package name for now; naming selection alone does not request a technical rename.
- Naming exploration is settled for now on It's a Competition. Earlier playful candidates included CrownThis, TakeSides, Tack-A-Side, and BracketRally. User reports PickRival is already used.
- Preliminary name screening October 25, 2026: TAKE SIDES already exists as a social voting app on Google Play (https://play.google.com/store/apps/details?id=com.takesides.takeSides). CrownThis appears as a prior creative-project name on a D&AD profile (https://www.dandad.org/profiles/person/129164/thamara-schmid/). Exact searches found no obvious product match for Tack-A-Side/TackASide, BracketRally, BracketJamboree, BracketSprout, or BracketHoopla; this is not domain, app-store, or trademark clearance and does not establish availability. These alternatives are proposals only.
- Future scope may include printable brackets and organizer-run real competitions, beyond voting. Naming and tournament modeling should leave room for these uses; this does not expand today's visual MVP.
- Competitor research and differentiation hypotheses are in COMPETITOR_NOTES.md. The exact brack-it competitor URL is not yet confirmed; similarly named sites must not be conflated.
- Fresh start: build a website for community competition brackets covering arbitrary topics such as movies, snacks, and teams.
- Support public and private brackets, public search, trending discovery, participant voting, owner-controlled round advancement, optional round deadlines, and temporary live chat.
- Support arbitrary competitor counts with byes, and single-sided or two-sided March Madness-style layouts. These layouts are distinct from double elimination; double elimination is not currently a confirmed requirement.
- SEO and searchable public bracket pages are priorities.
- Eventually publish iOS and Android apps; native apps are not required for the first release.
- Authentication should offer Google and password login. Avoid paid Google authentication requirements. Email/password with public usernames was recommended; exact username-login behavior remains undecided.

## Confirmed technology direction

- Next.js App Router with TypeScript for the website.
- Tailwind CSS for styling.
- Supabase for PostgreSQL, authentication, and Realtime.
- PostgreSQL search initially for public bracket discovery.
- Responsive, installable web app first.
- Expo / React Native is the preferred later native-app direction, subject to mobile testing; share backend and domain logic, with mobile-specific screens as needed.
- Keep authoritative voting, permissions, deadlines, and round advancement in the shared backend so future mobile clients use the same rules.
- Render meaningful public bracket content for SEO, with page metadata and share images. Private content requires access controls.
- Hosting is not selected. Consider Cloudflare Workers with the Next.js adapter or Vercel; account for commercial-use restrictions and runtime compatibility.

## Approved theme (October 26, 2026)

- User wants an energetic, consistent design with flat/matte buttons, three brand colors (primary, secondary, tertiary) and two core neutrals, with coordinated light and dark modes.
- User explicitly approved the space-blue bracket example as the theme. This supersedes the initial olive brand palette and the five earlier palette proposals.
- Primary brand color: deep space blue #101E3A, dominant in the brand and dark-mode canvas. Secondary: electric sky #65B8FF for voting, selection, and advancement actions. Tertiary: energy/championship yellow #F4D04E, reserved for crown, trophy, and special winner highlights.
- Two core neutrals: graphite #252B34 and chalk #F5F7FA. Derive card surfaces, muted text, and borders consistently from these and navy; do not introduce arbitrary colors across components.
- Approved preview dark surfaces: #101E3A canvas, #182A49 cards, #1C3052 supporting surfaces, #F5F7FA text, #B0BED3 muted text, #415675 borders. Light mode: #F5F7FA canvas, white cards, #EAF1F9 supporting surfaces, #101E3A text, #53647B muted text, #BCC8D8 borders; accessible action-blue shade #195E9B. Yellow text on light backgrounds uses darker #766000 where needed.
- Controls: solid flat/matte fills, restrained rounded corners (8px baseline), no gradients, glow, or raised effects. Provide clear focus, hover, disabled, selected, and completed states. Selections use a checkmark as well as color.
- Subtle gamification: seeded initials cards, numbered round progression, winner paths, and a crown/trophy badge. Convey competition energy without a full video-game theme. User's supplied image inspired the navy/blue/yellow combination, not literal lightning effects or character artwork.
- Approved reference: /Users/wolf/.codex/visualizations/2026/10/26/01a175f9-85d0-7852-bfcd-31264983e1ca/space-blue-bracket.html. Space-blue theme is now implemented on the landing page and bracket demo, with a shared light/dark switch. Dark is the initial theme; switch state survives client-side navigation but is not persisted across refreshes yet.

## Current state

- Bracket builder added at /create: title (60-character limit), 2–32 competitors, individual names (24-character limit), counters, required/unique-name validation, and initials thumbnails. These initial limits are implementation defaults, adjustable later. Entry order determines seeds; top seeds receive byes.
- Choose from 20 detailed transparent PNG achievement awards, five each for fantasy, movies, food (including donut), and animals. User wants sophisticated video-game achievement art with a Ready Player One sense of wonder. Fantasy includes a dragon and enchanted gold/amethyst relics; movies includes Blockbuster for action films; food uses recognizable natural textures; animals use believable wildlife and nature. Active assets: public/trophies/achievements; stable IDs and descriptive subject labels in src/lib/trophies.ts. Built-in image generation prompts and art direction are saved in docs/trophy-art. Next Image optimizes delivery. Older SVG assets and scripts/render-trophies.py are retired artwork, not the active generator. Chosen prize remains at bracket center after a champion is crowned. Site controls retain the matte theme.
- Build opens /bracket/custom with the chosen title, entrants, and trophy. Setup is stored in sessionStorage for this browser tab and can be edited via /create; picks reset on refresh. No publishing, accounts, shared voting, or backend persistence yet. Long descriptions/details are deferred by the user.

- Technology direction confirmed by the user on October 25, 2026.
- Homepage is now the landing page; the existing 16-team two-sided single-elimination demo moved to /bracket, with fictional teams and initials intact.
- Landing implementation (October 26): shared sticky navigation with logo holder, search, create, trending, theme switch, and guest profile. Search filters local sample concepts; Create opens /create, while profile remains a guest placeholder dialog. No auth, public discovery, or bracket creation backend is implemented.
- Hero is edge-to-edge and fills the first viewport below navigation. Features three clearly labeled sample concepts (snacks, movies, game night), blurred bracket/bokeh backdrop, initials matchup teaser, arrows, dots, keyboard/swipe controls, and automatic 6.5-second rotation with pause/play. Rotation pauses on hover/focus, hidden tabs, offscreen hero, and reduced motion.
- User requested a much more obvious rejection of "It's not a competition" because the thin scroll-drawn line was lost beside the parallax. Replaced it with a bold yellow X: two sequential strokes draw in about half a second when the phrase reaches 62% of viewport height, with a small impact/settle. The gesture finishes even if scrolling stops, stays crossed out, and resets only after returning far enough toward the hero for a fresh visit. Reduced-motion viewers see the finished X immediately. Background and foreground parallax remain.
- User prefers keeping the full-viewport hero but wants a more noticeable scroll invitation: "What's this all about?" with a larger down arrow, separated from carousel controls.
- About section is informational, not an action area. Enlarged headline, scroll-drawn crossed-out phrase, and paragraph; removed its bracket-demo CTA. Copy: "A friendly place to settle the score. Movies, snacks, teams, or whatever divides the group chat—bring your favorites, back your picks, and find out who comes out on top. Big opinions. Good company. One winner."
- User wants the closing line to convey being the best today, without implying permanent superiority. Current wording: "May the best win. Today, anyway." Render as a tagline, not a link. This replaces "May the best anything win" in the about section.
- Prioritize the two-sided March Madness-style bracket. Other bracket types are deferred.
- Demo interaction: vote directly in competitor cards; a pick replaces the prior selection for that matchup. Require all current matchups to have a pick before advancing the entire round. Past rounds lock. Final action crowns a winner. Reset clears all rounds; refresh also resets. This is local single-user selection, not shared audience vote totals, and does not define future crowd-voting/tie rules.
- Authentication, backend integration, persistence, discovery, chat, and automatic progression remain outside today's MVP.
- First bracket has 16 competitors total, eight on each side. User confirmed voting directly in the competitor/player cards for today's version. Plan image-ready competitor cards; uploading images is not requested yet.
- User approved the first bracket on October 25, 2026. Work resumed October 26 with theme selection and landing-page implementation.
- User loves the current initials-based thumbnails (including possible variations on initials). Keep these as the chosen presentation for now; do not add image uploads unless the user revisits that decision.
- Bracket now uses approved space-blue theme. Preserved initials, seed numbers, compact stacked cards, connectors, center trophy/champion, and round progress. Narrow screens use horizontal bracket scrolling. All teams are fictional sample content.
- Domain logic is in src/lib/bracket.ts; builder validation/storage helpers are in src/lib/bracket-config.ts. Builder UI is in src/components/bracket-builder.tsx, bracket UI in src/components/bracket-demo.tsx. npm test covers vote guards, advancement, byes and custom reset for 2/3/5/16/17/32 competitors, plus setup validation and malformed storage (Node 22.18+).
- Current Tailwind Turbopack rule rewrites module.css filenames and prevents CSS Module class exports; builder uses globally unique builder-* classes in its own stylesheet. Revisit loader configuration before introducing CSS Modules.
- Builder supports 2–32 competitors for the two-sided single-elimination format, using seeded first-round byes for uneven counts. Default remains 16. This is not a global limit for all future formats.
- Next.js 16.4.3, React 19.3.0, TypeScript, Tailwind CSS 4, and ESLint are scaffolded with npm and a lockfile. App Router sources are under src/app. Uses system fonts to avoid build-time font downloads. No Supabase integration yet.
- Validation after builder implementation: lint, TypeScript, 12 domain/configuration tests, and production build pass. Browser walkthrough verified field validation, all four trophy categories in dark/light themes, creating a five-competitor bracket with byes, voting through the final, and returning to edit the saved setup. Earlier Turbopack local-port failures did not recur on the latest escalated production build. Browser walkthrough verified all rounds, changing the final vote, champion display, and reset. npm run dev starts the local preview at http://127.0.0.1:3000.
- Git initialized on main at the user’s request to save the project to GitHub. Intended destination: a private its-a-competition repository under ThomasWolf-Tech. Remote creation/upload pending GitHub website sign-in; connector lacks repository creation.
- Development server restarted for landing-page review at http://127.0.0.1:3000; bracket demo is at /bracket.
- Open product choices include tie handling, voting eligibility/change rules, private invitations, chat retention, launch competitor limit, and the scope of today's MVP.

## Future ideas and unapproved proposals

- User-requested trophy customization: allow uploading a custom trophy or designing one. For now use only the 20 preset transparent PNG prizes.
- User-requested future wish list: subtle trophy animation (e.g. floating elements, slow orbit, crystal shimmer). No trophy animation is implemented yet; independent parts will need layered assets or 3D; respect reduced motion when adding it.

- User likes the future option of a larger head-to-head matchup panel: select a matchup in the compact bracket to see two larger competitor cards with images/names and vote buttons. Revisit for larger brackets; today voting stays directly inside the bracket's competitor cards.
- User-requested future idea: bracket "skins" so people can customize the visual appearance of their brackets. Details remain to be discussed; outside today's setup scope.
- Preserve the broader product requirements above for later sessions; they are not today's implementation scope.
- Prior proposed functional MVP was too broad and was not approved: authentication, public usernames, creation form, public/private brackets, 2–32 competitors with byes, both layouts, voting, manual advancement, public search, and SEO metadata.
- Suggested voting rules, not decided: signed-in voting, one vote per matchup, changes allowed until round closure, owner resolves ties.
- Suggested private access, not decided: invite links granting access after sign-in, with backend enforcement.
- Suggested discovery progression: newest public brackets and title search first, then trending based on recent votes and unique participants.
- Later features: timed rounds with server enforcement, live chat with moderation/rate limits and automatic expiry, notifications, generated share images, installable web-app support, and native mobile apps. Competitor images remain a possible future option; initials are the current chosen approach and uploads are deferred.
- Chat retention example of 24 hours and the proposed 32-competitor launch cap were suggestions only.

- Latest trophy-art pass: all 20 PNGs have alpha transparency; lint and TypeScript checks pass. Production build was not run because automatic approval review could not complete due to an account usage limit. Browser verified the corrected shark in the Animals picker and selected-prize preview at /create. Development server stopped at the user’s request after review.

- User approved the detailed achievement art. Shark corrected to replace the detached tail-like appendage with visibly foamy ocean spray; preserve its natural silhouette.
