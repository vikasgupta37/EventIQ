# Deploy EventIQ on Vercel

Public deployments use Google sign-in. Demo mode is rejected by the Vercel build.
Each Google subject owns a separate user record; accounts are never linked by email.
Existing local demo events are not uploaded or assigned to new users.

## Required configuration

Set these in the Vercel project's **Production** environment:

| Variable                | Value                                                   |
| ----------------------- | ------------------------------------------------------- |
| DATABASE_URL            | Hosted PostgreSQL runtime connection URL                |
| DIRECT_URL              | Optional non-pooled migration connection                |
| APP_ORIGIN              | Exact HTTPS production origin, no trailing slash        |
| NEXTAUTH_URL            | Same value as APP_ORIGIN                                |
| NEXTAUTH_SECRET         | Cryptographically random secret, at least 32 characters |
| GOOGLE_CLIENT_ID        | Google OAuth web client ID                              |
| GOOGLE_CLIENT_SECRET    | Google OAuth web client secret                          |
| DEMO_MODE               | false                                                   |
| OPENAI_API_KEY          | Optional server key for connected AI and voice          |
| OPENAI_MODEL            | Compatible planning model accessible to your account    |
| OPENAI_TRANSCRIBE_MODEL | Available transcription model                           |

Generate the auth secret using a password manager or Node's crypto.randomBytes(32).
Enter secrets in Vercel settings or via its authenticated CLI; do not commit them.
Do not connect previews to the production database. A preview needs its own database,
registered Google callback, origin, and authentication configuration.

## Google configuration

In Google Cloud, configure an OAuth consent screen for EventIQ and a **Web application**
OAuth client. Request only openid, email, and profile. Add:

- Authorized JavaScript origin: your APP_ORIGIN.
- Authorized redirect URI: APP_ORIGIN followed by /api/auth/callback/google.
- For optional local testing: http://127.0.0.1:3000/api/auth/callback/google.

While the consent screen is in Testing, add intended testers. To allow general public
sign-in, publish the consent screen according to Google's requirements.
No Google password or access token is exposed to the EventIQ browser session.

## Vercel project settings

Import vikasgupta37/EventIQ and select Next.js, the repository root, and Node.js 22.x.
The committed vercel.json selects pnpm install --frozen-lockfile and pnpm run build:vercel.
This generates Prisma Client, applies committed migrations, and builds Next.js.
On Vercel the output is .next; local production builds retain .next-production.
Do not run the local database script, Docker Compose, or the demo seed on Vercel.

The RequestRateLimit migration provides atomic per-user counters shared by function instances:
60 mutations per minute and 10 AI-related mutations per minute. These are application
limits, not a provider spending cap. Set provider budget alerts separately.

Audio is capped at 4 MiB on both client and server, leaving multipart headroom under
Vercel's 4.5 MB function payload limit. API routes allow up to 300 seconds; actual
availability depends on the project's Vercel function configuration.

## Verify the release

1. A signed-out visit to /dashboard redirects to /signin.
2. Sign in with a verified Google account and create a new event.
3. Refresh and verify persistence.
4. Review and apply an AI change, then undo before any other edits.
5. Add a guest, a confirmed expense, and a partial payment.
6. Sign out, sign in with a different account, and verify the first account's events
   are not listed or accessible by ID.
7. Verify small voice uploads, declined microphone permission, and oversized-upload errors.
8. Confirm the production origin accepts writes and cross-origin requests are rejected.

## Rollback

Use Vercel's deployment rollback for application code. Database migrations remain applied;
review migration compatibility before rolling back and use your provider's backups for data
recovery. Never run prisma migrate reset against production.

## References

- [NextAuth Google provider](https://next-auth.js.org/providers/google)
- [Vercel Marketplace storage](https://vercel.com/docs/marketplace-storage)
- [Vercel function limits](https://vercel.com/docs/functions/limitations)
