# It's a Competition

Next.js App Router, TypeScript, Tailwind CSS, and ESLint.

Current shared flow: sign in, save a draft or **Submit bracket**, then see **Pending review** until automatic activation. Durable `/bracket/[id]` pages use server-controlled votes/results and scheduled or private manual rounds. Permanent account deletion removes identity, saved items, drafts/pending submissions and all private brackets; public live/completed brackets remain anonymous. Creator-requested bracket deletion removes competition data and leaves an unavailable saved marker. Lifecycle migrations are deployed to Supabase. See [lifecycle notes](./docs/competition-lifecycle.md) and [remaining launch work](./PRE_LAUNCH_CHECKLIST.md). Practice preview details below apply to `/bracket` and `/bracket/custom`.

The approved Rally Relic logo appears in the shared header/footer and browser icon. The transparent source is `public/brand/rally-relic-color.png`; artwork references and prompts are in `docs/brand/logo-concepts`.

## Local development

Requires Node.js 20.9 or newer and npm.

```bash
npm install
npm run dev
```

Open http://localhost:3000 for the landing page. The interactive bracket demo is at http://localhost:3000/bracket. Landing UI is in `src/components/landing.tsx`; shared navigation is in `src/components/site-header.tsx`; the bracket is in `src/components/bracket-demo.tsx`.

The bracket builder is at http://localhost:3000/create. Set a title, choose one of ten bracket categories, optionally add a short description (180 characters), enter 2–32 competitors, and choose one of 20 transparent achievement illustrations. Names are limited to 24 characters and titles to 5–60 characters. **Preview bracket** opens tab-local practice at `/bracket/custom`; **Submit bracket** queues a shared competition. Entry order sets seeds, with automatic first-round byes for uneven fields. The 20 virtual prizes use detailed transparent PNGs in `public/trophies/achievements`, served through Next Image. See `docs/trophy-art` for generation prompts and asset notes. Trophy animation is deferred.

Creation starts with an explicit private/public choice. Public brackets require round durations; private brackets may also use creator-controlled manual rounds. Choose days (0–30), hours (0–23), and minutes (0–59), with a minimum total of one minute. Use one duration for all rounds or customize each round. Every round receives its full time when it opens, independent of timezone/DST. Existing live fixed schedules remain unchanged. Shared pages include a local countdown, confirmed-result reveal, and gold champion celebration. Private invitation operations remain pending. See [access and scheduling notes](./docs/bracket-access-and-scheduling.md).

## Trending discovery

`/trending` lists up to 10 public brackets per category, using recent vote windows with progressively wider fallbacks. Rankings load once per visit or full refresh. Private brackets, drafts and local practice picks do not appear. The database feed is implemented locally and on hosted Supabase; anonymous access and private counters are verified. Shared publishing and voting remain pending, so there is no real community activity yet. See [trending discovery](./docs/trending-discovery.md).

## Supabase foundation

The database foundation is deployed and tested locally and on hosted Supabase; the web app now supports Supabase authentication and persistent drafts; bracket previews still use demo storage. See [supabase/README.md](./supabase/README.md) for the local migration/test commands and the remaining hosted/auth/integration work. The hosted project is its-a-competition under One Bad Wolf; Google activation and hosted callback/SMTP configuration remain pending. See [authentication setup](./docs/auth-setup.md).

## Checks

```bash
npm run lint
npm test
npm run build
```

`npm start` serves the production build after `npm run build`.

The dependency-free bracket tests use Node's TypeScript support and require Node.js 22.18+ (Node.js 24 recommended).

## Scope

The landing page uses the space-blue theme with a light/dark switch, sample-concept search, a guest profile dialog and bracket creation page, and an edge-to-edge viewport hero. Its carousel rotates every 6.5 seconds and can be paused; rotation also pauses during hover/focus, when offscreen, or in a hidden tab. The bracket backdrop has scroll parallax. A bold yellow X draws in two strokes over the about section's "It's not a competition" phrase when it reaches the middle of the viewport. Reduced-motion settings disable automatic rotation and motion effects and show the completed X. Featured concepts use demo creators and vote totals. Their Make a pick links open the matching playable bracket. The tab’s saved custom bracket is included as a local preview, with its description/category and local pick count. The teaser selects a random valid matchup from the current round and shows the champion on completion. Featured headlines use each bracket’s actual title, with responsive balanced wrapping and a blue trailing phrase; paragraphs use its optional short description without generated fallback text. Slides crossfade, and inactive slides are excluded from keyboard/accessibility interaction. Shared community trending is not connected yet.

The **Rules** button in the bracket toolbar opens an accessible side drawer explaining the confirmed shared-competition voting and resolution rules. The drawer labels the current local preview separately; authentication and server-side vote resolution are still pending.

The local demo has 16 fictional competitors, eight on each side, advancing to a central championship. Click a competitor card to vote; change your picks freely until advancing. Select a winner in every active matchup to enable **Advance round**. The final uses **Crown the winner**. **Reset bracket** clears all rounds.

Votes are local selections, not shared audience totals. Refresh/navigation preserve local progress within the same browser tab. Earlier rounds lock on advancement. Thumbnail initials are placeholders; optional image paths can be supplied in `src/lib/bracket.ts`. Image upload, authentication, and Supabase are not configured.

On narrower screens, scroll the bracket horizontally. Keyboard users can focus the bracket scroll region and use arrow keys, and use Tab/Enter/Space for voting controls.

See [MEMORY.md](./MEMORY.md) for current decisions, [DEV_WISHLIST.md](./DEV_WISHLIST.md) for future features, [PRE_LAUNCH_CHECKLIST.md](./PRE_LAUNCH_CHECKLIST.md) for release checks, and [AGENTS.md](./AGENTS.md) for project guidance.

Signed-in users see their public username in the header. The private [trophy room](./docs/trophy-room.md) awards a copy of a public 16+ entrant bracket’s trophy for backing its champion in every contested round; creators are excluded. Repeated trophies show a count, and individual award timestamps support future year/season features.
