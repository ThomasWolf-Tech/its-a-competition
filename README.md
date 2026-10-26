# It's a Competition

Next.js App Router, TypeScript, Tailwind CSS, and ESLint.

## Local development

Requires Node.js 20.9 or newer and npm.

```bash
npm install
npm run dev
```

Open http://localhost:3000 for the landing page. The interactive bracket demo is at http://localhost:3000/bracket. Landing UI is in `src/components/landing.tsx`; shared navigation is in `src/components/site-header.tsx`; the bracket is in `src/components/bracket-demo.tsx`.

The bracket builder is at http://localhost:3000/create. Set a title, enter 2–32 competitors, and choose one of 20 transparent achievement illustrations. Names are limited to 24 characters and titles to 60. Building opens a playable local preview at `/bracket/custom`. Setup is kept in sessionStorage for that tab; refresh resets picks. Entry order sets seeds, with automatic first-round byes for uneven fields. Nothing is published or shared. The 20 virtual prizes use detailed transparent PNGs in `public/trophies/achievements`, served through Next Image. Each category has its own art direction, including a fantasy dragon and an action-movie award. See `docs/trophy-art` for generation prompts and asset notes. Trophy animation is deferred.

## Checks

```bash
npm run lint
npm test
npm run build
```

`npm start` serves the production build after `npm run build`.

The dependency-free bracket tests use Node's TypeScript support and require Node.js 22.18+ (Node.js 24 recommended).

## Scope

The landing page uses the space-blue theme with a light/dark switch, sample-concept search, a guest profile dialog and bracket creation page, and an edge-to-edge viewport hero. Its carousel rotates every 6.5 seconds and can be paused; rotation also pauses during hover/focus, when offscreen, or in a hidden tab. The bracket backdrop has scroll parallax. A bold yellow X draws in two strokes over the about section's "It's not a competition" phrase when it reaches the middle of the viewport. Reduced-motion settings disable automatic rotation and motion effects and show the completed X. Featured concepts are samples, not live community trends.

The local demo has 16 fictional competitors, eight on each side, advancing to a central championship. Click a competitor card to vote; change your picks freely until advancing. Select a winner in every active matchup to enable **Advance round**. The final uses **Crown the winner**. **Reset bracket** clears all rounds.

Votes are local selections, not shared audience totals. Refreshing resets the bracket. Earlier rounds lock on advancement. Thumbnail initials are placeholders; optional image paths can be supplied in `src/lib/bracket.ts`. Image upload, authentication, and Supabase are not configured.

On narrower screens, scroll the bracket horizontally. Keyboard users can focus the bracket scroll region and use arrow keys, and use Tab/Enter/Space for voting controls.

See MEMORY.md for decisions and future ideas, and AGENTS.md for project guidance.
