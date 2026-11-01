# Quality review — November 1, 2026

This review targets concrete engineering weaknesses behind the submission criteria. It does not predict a score or leaderboard position. These changes must be published and evaluated before they can affect a submitted repository.

## Changes and verification

| Area | Change | Evidence |
| --- | --- | --- |
| Code quality | Split the 1,744-line workspace into focused page components, a request lifecycle hook, task rows, and shared dialogs. Enable TypeScript ESLint rules and reject lint warnings. | `components/workspace/`, `components/ui/dialog.tsx`, `pnpm lint`, `pnpm typecheck` |
| Security and integrity | Validate AI results for both storage modes; enforce event identity/version and bounded output. Reject cross-event backup previews, ambiguous IDs, overpayments, quote payments, future payment records, and inconsistent fixed allocations. Mark API responses private/no-store and reject JSON lookalike media types. | `tests/backup-integrity.test.ts`, `tests/state-integrity.test.ts`, `tests/request-body.test.ts`, `tests/api.test.ts` |
| Reliability | Ignore obsolete event-load responses and errors; serialize saves; ignore stale child results; refresh renamed event options. A blocked optional selection preference no longer prevents database workspace loading. | `tests/workspace-data.test.ts` |
| Efficiency | Load workspace pages and forms on demand; fetch only the latest 200 conversation messages in chronological order; omit repeated chat/action logs from AI tool results. Retain the six-round agent bound and 12-message model context. | `components/workspace.tsx`, `lib/db/events.ts`, `tests/agent.test.ts`, `tests/api.test.ts` |
| Testing | Add negative-path agent and backup tests, a 360-combination budget matrix, request lifecycle regressions, and database snapshot/history tests. All tests use deterministic rules or mocked model transport. | `pnpm test`, `pnpm test:db` |
| Accessibility | Isolate dialog backgrounds with `inert`, lock scrolling, wrap keyboard focus and restore it on close. Correct Timeline/Vendors heading levels, expose idea filter selection, name budget tables and the chat log. Scan eight workspace sections. | `components/ui/dialog.tsx`, `tests/frontend.test.ts` |
| Problem alignment | Preserve the exact wedding flow: create → reduce budget → increase guests → sustainability → date change → review/apply. PostgreSQL remains the source of truth in database mode. Manual task decisions and vendor booking status survive replanning; no live vendor listings are fabricated. | `tests/api.test.ts`, `tests/management.test.ts` |

## Reproduce

Local verification completed: **131 database-free tests + 14 PostgreSQL tests = 145 passing tests**, zero-warning lint, TypeScript checks, production build, and submission source checks (about 0.91 MB). A production localhost walkthrough verified example creation, dialog isolation/Escape, navigation, and budget proposal approval; no browser console warnings or errors were captured during that walkthrough. Local tooling was Node.js 24.22.1 / pnpm 11.25.0; the declared CI targets remain Node.js 22 / pnpm 10.28.2. Remote CI and deployment have not been run for these local changes.

Use Node.js 22 and pnpm 10.28.2 (declared in `package.json`). Install with `pnpm install --frozen-lockfile`, then run:

```sh
pnpm db:generate
pnpm check
pnpm build
```

For database tests, point `DATABASE_URL` to a **separate UTF-8 PostgreSQL test database**, apply the existing migrations with `pnpm db:migrate`, and run `pnpm test:db`. CI provisions its own PostgreSQL service and builds each storage edition. No migration or production-data reset is required for this review.

The budget matrix is one test exercising 360 combinations, not 360 independent test cases. Automated accessibility checks use JSDOM and exclude color contrast, which requires browser/manual inspection. Model transport is mocked: these checks do not assert live-model accuracy, provider availability, or WCAG conformance.

## Submission boundaries

- The hosted public demo uses browser storage. Evaluate the original brief's database-source-of-truth requirement using the PostgreSQL edition and its setup instructions.
- Run `pnpm check:submission` to verify the source snapshot stays below 10 MB and excludes common credential/media artifacts. This does not inspect all Git history or guarantee detection of every secret.
- Keep video files outside Git and submit the actual accessible YouTube/Drive link separately.
- Local improvements do not change the already-deployed site or submission until published. No top-100 outcome is guaranteed.

Agent tool definitions retain strict schemas and serial calls as described in the [official OpenAI function-calling guide](https://developers.openai.com/api/docs/guides/function-calling). Application validation additionally checks domain invariants that JSON structure alone cannot establish.
