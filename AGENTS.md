<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project guidance

- Read root MEMORY.md and applicable global guidance before working. Keep project memory concise and current when durable decisions are confirmed.
- Use Next.js App Router, TypeScript, Tailwind, and the planned Supabase backend. Current scope includes the local bracket demo and creation page; do not add backend services or other product areas without user direction.
- Working product name is It's a Competition. Keep the existing brack-it folder/package name until a technical rename is requested.
- Build responsive web first, with SEO for public pages and backend/domain logic reusable by future mobile apps.
- The first bracket has 16 competitors total, eight per side. Two-sided March Madness is a single-elimination layout, not double elimination.
- Today's votes are local demo selections. Authoritative permissions, voting, and tournament transitions must be enforced by the backend when shared competitions are implemented.
- Never store credentials in memory or source control, or expose privileged Supabase credentials to clients.
- Preserve the distinction between confirmed decisions and future proposals in MEMORY.md.
