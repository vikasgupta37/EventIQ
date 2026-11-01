# Quality review — November 1, 2026

This review maps engineering changes to reproducible checks. It does not predict a score or leaderboard position. A submission can only benefit from changes that have been published and included in its evaluation.

## Changes and verification

| Area | Change | Evidence |
| --- | --- | --- |
| Code quality | Split the 1,744-line workspace into focused views, a request lifecycle hook, task rows, and shared dialogs. Enforce TypeScript ESLint rules with zero warnings. | `components/workspace/`, `components/ui/dialog.tsx`, `pnpm lint`, `pnpm typecheck` |
| Data integrity | Validate model results, event identity/version, backups, task graphs, budget totals, and payments. Reject cross-event previews, overpayments, quote payments, and inconsistent allocations. | `tests/backup-integrity.test.ts`, `tests/state-integrity.test.ts`, `tests/management.test.ts` |
| Request safety | Bound JSON/audio, verify request origin, mark API responses private/no-store, limit active anonymous requests after upload validation, and reject truncated model output. | `tests/request-body.test.ts`, `tests/ai-execution.test.ts`, `tests/agent.test.ts`, `tests/browser-api.test.ts` |
| Reliability | Abort obsolete workspace requests, ignore late responses, serialize saves, and prevent cancelled planning results from being staged. Preserve useful client errors and support empty successful responses. | `tests/workspace-data.test.ts`, `tests/client-api.test.ts`, `tests/ai-execution.test.ts` |
| Efficiency | Load views/forms on demand; fetch the latest 200 conversation messages; send at most 12 recent chat messages to the planner; omit repeated logs from tool results. Apply one deadline to the complete agent loop. | `components/workspace.tsx`, `lib/db/events.ts`, `lib/agent/execution.ts`, `tests/agent.test.ts` |
| Testing | Enforce measured coverage floors. Exercise real desktop/mobile browsers, fresh database fixtures, negative paths, and a 360-combination budget matrix. Publish CI reports. | `vitest.coverage.config.ts`, `playwright.config.ts`, `.github/workflows/quality.yml` |
| Accessibility | Isolate modal backgrounds with `inert`, trap/restore focus, support Escape and reduced motion, label controls and chart values, improve text contrast in both themes, and make the mobile budget table keyboard-scrollable. Run axe in a real browser, including contrast checks. | `components/ui/dialog.tsx`, `tests/frontend.test.ts`, `tests/e2e/public-demo.spec.ts` |
| Problem alignment | Preserve creation → budget reduction → guest increase → sustainability → date change → review/apply. Manual task decisions and vendor booking statuses survive replanning. | `tests/api.test.ts`, `tests/management.test.ts`, README demo flow |

## Verification snapshot

Local verification uses **Node.js 22.23.4 / pnpm 10.28.2**, matching the declared major/runtime targets. The latest completed unit/UI/API run passed **154 database-free tests**. A separate run passed **14 PostgreSQL tests** on a newly created UTF-8 database with migrations and no seed data; the management fixture also passed independently. The browser production build and Prisma generation passed. The production dependency audit reported no known vulnerabilities at the time of this check.

Measured Vitest coverage:

| Metric | Measured | CI minimum |
| --- | ---: | ---: |
| Statements | 80.95% | 80% |
| Branches | 71.50% | 69% |
| Functions | 74.59% | 73% |
| Lines | 81.69% | 80% |

The coverage denominator includes `lib/**/*.ts` and `components/**/*.{ts,tsx}`, excluding the database implementation in `lib/db/`, `lib/server/database-api.ts`, and `lib/tools/`. The optional database edition has a separate integration job; its execution and Playwright runs are not added to these coverage percentages. This is not a claim of whole-repository coverage.

The Playwright suite defines seven scenarios for each of two Chromium profiles: desktop and mobile emulation. It checks refresh persistence, guests/payments, approval/undo, backup restore into a fresh profile, duplicate rejection, modal focus, core-screen light/dark accessibility and layout, and production HTTP boundaries. Tests use deterministic planning with no paid API key. Consult the [current workflow run](https://github.com/vikasgupta37/EventIQ/actions/workflows/quality.yml) for the published commit's results; rerunning an older commit does not evaluate newer fixes.

## Reproduce

Install with `pnpm install --frozen-lockfile` using Node.js 22 and pnpm 10.28.2. For browser checks, set `NEXT_PUBLIC_STORAGE_MODE=browser` before building:

```sh
pnpm db:generate
pnpm check
pnpm audit --prod --audit-level=high
pnpm build
pnpm exec playwright install --with-deps chromium
pnpm test:e2e
```

`pnpm check` runs zero-warning lint, TypeScript, coverage-enforced tests, and the submission source check. `pnpm test` runs the same database-free tests without coverage instrumentation. Playwright starts the production server at `http://127.0.0.1:3100`, so leave that port free. It supplies a matching origin and clears the server's API key. To use an existing local Chrome installation, set `PLAYWRIGHT_CHROME_PATH` to its executable; CI uses Playwright's installed Chromium.

For database tests, point `DATABASE_URL` to a **separate UTF-8 PostgreSQL test database**, apply migrations with `pnpm db:migrate`, then run `pnpm test:db`. Seeding is unnecessary. CI provisions PostgreSQL 16, runs both storage editions, and retains browser reports, failure screenshots/traces, and coverage artifacts for seven days.

The budget matrix is one test exercising 360 combinations, not 360 independent tests. JSDOM accessibility checks exclude color contrast because it has no layout engine; the Playwright axe checks include it. Manual screen-reader, zoom, and assistive-technology testing remains necessary. Mocked model transport does not establish live-model accuracy or provider availability.

## AI resource limits

| Control | Bound |
| --- | --- |
| Complete planning operation | 90-second deadline across all tool rounds |
| Extraction / transcription | 45-second deadline per operation |
| Planner tool rounds | At most six |
| Responses output | At most 4,096 tokens per model response |
| SDK automatic retries | Disabled for these bounded operations |
| Anonymous request rate | Ten requests per IP per minute per warm instance |
| Active anonymous operations | Two per IP and four total per warm instance |
| Rate-limit key storage | At most 10,000 IP entries per minute window |

Cancellation reaches the provider request and prevents a cancelled draft from being staged. These are application resource controls, not a guarantee that disconnected requests incur no provider usage. The in-memory gate resets on cold starts and is not shared across instances; it is neither a distributed quota nor a spending cap. Wider public use needs provider budgets and platform abuse controls.

## Dependency security

The audit found two advisories in Prisma 6's configuration dependencies: [Effect request-context contamination](https://github.com/advisories/GHSA-38f7-945m-qr2g) and [deepmerge-ts recursion exhaustion](https://github.com/advisories/GHSA-ggr8-5vv4-36mx). `pnpm-workspace.yaml` scopes overrides to `@prisma/config>effect@3.20.0` and `@prisma/config>deepmerge-ts@8.0.0`. Prisma generation, fresh migrations, and the database tests verify the paths used by this project after the update.

These were dependency audit findings, not demonstrated exploits against EventIQ. Keep the overrides under review when upgrading Prisma. A clean audit only reflects the advisories known to the registry at that time.

## Submission boundaries

- The hosted public demo uses browser storage with no sign-in or connected database. Evaluate database-backed persistence through the optional PostgreSQL edition.
- `pnpm check:submission` checks the source snapshot against the 10 MB limit and common credential/media artifacts. It does not inspect all Git history or guarantee detection of every secret.
- Keep video files outside Git and submit an accessible video link separately.
- Submit or request reevaluation against the newly published commit. No top-100 outcome is guaranteed.

Agent tools retain strict schemas and serial calls as described in the [official OpenAI function-calling guide](https://developers.openai.com/api/docs/guides/function-calling). Application validation additionally checks domain rules that JSON structure alone cannot establish.
