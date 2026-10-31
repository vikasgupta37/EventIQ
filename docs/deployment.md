# Deploy the public EventIQ demo on Vercel

The selected deployment uses **browser storage and no sign-in**. No database is
connected. Each browser has its own events, guests, expenses, payments, and plan
history. Clearing site data removes those records. Use Export backup / Import
backup to move plans between browsers. Import adds events and rejects duplicates.

## Production settings

| Variable                 | Value                                                     |
| ------------------------ | --------------------------------------------------------- |
| NEXT_PUBLIC_STORAGE_MODE | browser                                                   |
| APP_ORIGIN               | https://eventiq-ashy.vercel.app                           |
| OPENAI_API_KEY           | Optional server-side secret for AI and voice              |
| OPENAI_MODEL             | Compatible Responses API model accessible to your account |
| OPENAI_TRANSCRIBE_MODEL  | gpt-transcribe, or a compatible accessible model          |

Database URLs, Google credentials, and NextAuth secrets are **not required** in
browser mode. The public storage mode is compiled into the client bundle; redeploy
after changing it. Never give an API key a NEXT_PUBLIC_ prefix.

Use Node.js 22.x and the repository root. vercel.json runs pnpm install
--frozen-lockfile and pnpm run build:vercel. The build generates Prisma's optional
types, skips all database migrations in browser mode, and builds Next.js.

## Data and AI behavior

Manual planning, tasks, guests, and expenses persist in localStorage. The browser
serializes changes using Web Locks where available, checks event versions for AI
proposals, and reports storage failures instead of claiming a save succeeded.
Backups contain personal event data; store them privately. Browser storage is
shared by people using the same browser profile and site origin.

AI extraction, planning, and transcription use stateless server endpoints.
Planning sends the event plan and latest 12 chat messages; the guest contact list
and expense ledger are not included. Typed messages and event fields may still
contain personal details. OpenAI processes these requests; no event database is
maintained by this app. Responses API requests use store: false.

Manual event creation generates a deterministic initial plan. AI personalization
is requested explicitly in the planner. Without a key, the server uses the
limited deterministic parser. AI requests still require network access.

Requests enforce the configured origin and validate bounded payloads (256 KiB
for JSON, 4 MiB audio). A warm function instance permits 10 AI requests per IP per
minute. This in-memory burst limit resets on cold starts and is not a global
spending cap. The anonymous demo is not a substitute for a protected production
service; configure provider budgets and Vercel firewall controls for wider usage.

## Release checks

1. Open /dashboard and /events/new without sign-in.
2. Create an event, refresh, and verify browser persistence.
3. Add a guest, confirmed expense, and payment; check invalid payments are rejected.
4. Request an AI change, review it, apply it, and undo it before another edit.
5. Export a backup; import it into another browser profile.
6. Verify another browser profile starts with no events.
7. Confirm /api/events does not expose server-stored events and /api/auth/providers is disabled.
8. Check /api/health reports storage: browser. This reports configuration, not live model access.

## Optional database edition

The repository retains the PostgreSQL / Google sign-in implementation for future
use. Set NEXT_PUBLIC_STORAGE_MODE=database, configure DATABASE_URL, optional
DIRECT_URL for migrations, APP_ORIGIN, NEXTAUTH_URL, NEXTAUTH_SECRET (32+ random
characters), GOOGLE_CLIENT_ID, and GOOGLE_CLIENT_SECRET. Register the Google
callback at APP_ORIGIN/api/auth/callback/google. Set DEMO_MODE=false on Vercel.
Each deployment environment must have its own database. The database build runs
committed migrations and never seeds local demo data.

## Rollback

A Vercel rollback restores code and its bundled storage mode. Browser data remains
on the visitor's device. Export backups before making incompatible storage-format
changes. Database migrations matter only when using the optional database edition.

## References

- [Vercel environment variables](https://vercel.com/docs/environment-variables)
- [Vercel function limits](https://vercel.com/docs/functions/limitations)
- [NextAuth Google provider, optional database edition](https://next-auth.js.org/providers/google)
