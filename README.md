<div align="center">
  <img src="docs/assets/eventiq-logo.svg" alt="EventIQ logo" width="80" height="80" />
  <h1>EventIQ</h1>
  <p><strong>Smarter Planning. Better Celebrations.</strong></p>
  <p>Turn an event idea into a living plan—with budgets, tasks, guests,<br />and an AI planner whose changes stay in your control.</p>

  <p>
    <a href="https://eventiq-ashy.vercel.app"><img src="https://img.shields.io/badge/DEMO-LIVE%20NOW-FF6633?style=for-the-badge&amp;logo=icloud&amp;logoColor=white&amp;labelColor=555555" alt="Demo — Live Now" /></a>
    &nbsp;
    <a href="https://github.com/vikasgupta37/EventIQ"><img src="https://img.shields.io/badge/PROJECT-REPOSITORY-85C900?style=for-the-badge&amp;logo=github&amp;logoColor=white&amp;labelColor=555555" alt="Project — Repository" /></a>
  </p>

  <p>
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-225447?style=flat-square" alt="License: MIT" /></a>
    <img src="https://img.shields.io/badge/Next.js-16-111827?style=flat-square&logo=nextdotjs" alt="Next.js 16" />
    <img src="https://img.shields.io/badge/React-19-149eca?style=flat-square&logo=react&logoColor=white" alt="React 19" />
    <img src="https://img.shields.io/badge/TypeScript-Strict-3178c6?style=flat-square&logo=typescript&logoColor=white" alt="Strict TypeScript" />
    <img src="https://img.shields.io/badge/Storage-Browser-225447?style=flat-square" alt="Browser storage" />
    <img src="https://img.shields.io/badge/Stage-Public_Demo-d4a74f?style=flat-square" alt="Stage: public demo" />
  </p>

  <p>
    <a href="https://eventiq-ashy.vercel.app">Live demo</a> ·
    <a href="#overview">Overview</a> ·
    <a href="#screenshots">Screenshots</a> ·
    <a href="#setup">Quick start</a> ·
    <a href="#architecture">Architecture</a> ·
    <a href="#demo">Demo walkthrough</a>
  </p>
</div>

---

<a id="overview"></a>

## ✨ Product overview

EventIQ is a full-stack event-planning workspace for weddings, birthdays, community gatherings, corporate events, and private celebrations. Describe your event in everyday language, review the extracted details, and create a structured plan that connects your budget, timeline, tasks, and service requirements.

As plans change, ask the AI planner for help. EventIQ calculates the consequences, shows a before-and-after proposal, and saves the changes only when you apply them.

> **The core idea:** AI helps interpret intent and personalize a plan. Deterministic code calculates budgets and dependencies. The user approves AI changes to an existing event.

| For visitors                  | What to explore                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------ |
| **Users**                     | One workspace for planning, RSVPs, costs, and next steps                                         |
| **Hackathon judges**          | A stateful agent with validated tools, reviewable changes, and undo                              |
| **Developers and recruiters** | Typed planning logic, versioned browser persistence, stateless AI, and unit/UI/integration tests |

**Current scope:** a public demo with no sign-in and no connected database. Events, guests, expenses, and history stay in the current browser. Export backups before clearing site data; plans do not sync across devices. AI requests send event details and recent chat for processing. Connected AI and transcription are optional. The optional PostgreSQL / Google sign-in edition remains in the source. Payment entries are records of money already paid; supplier search, booking, and payment processing are not connected.

## 🎯 Problem statement

Planning an event means coordinating decisions that constantly affect one another. A larger guest list changes catering costs and venue requirements. A smaller budget changes priorities. A new date shifts deadlines.

When those decisions live across spreadsheets, messages, and notes, it is easy to lose context, miss dependencies, or confuse estimates with actual commitments. A conversational assistant alone also needs a reliable way to turn advice into a saved, inspectable plan.

## 💡 Solution

EventIQ connects the planning conversation to structured event data:

1. **Capture intent:** extract an event brief from natural language and expose assumptions for review.
2. **Build the plan:** calculate allocations, tasks, milestones, service needs, and risks.
3. **Adapt together:** propose related changes when budget, guest count, date, or preferences change.
4. **Keep control:** review AI proposals, apply or discard them, and undo eligible applied changes.
5. **Track execution:** manage RSVPs, vendor statuses, expense commitments, and recorded payments.

## 🚀 Key features

| Feature                             | What it delivers                                                                                                                                |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Natural-language event creation** | Editable extraction with explicit assumptions before saving                                                                                     |
| **Connected AI planner**            | Stateful conversation and validated tool calls against an isolated draft                                                                        |
| **Review and undo**                 | Persisted proposals, readable differences, apply/discard, and version-checked undo                                                              |
| **Budget planning**                 | Ten allocation categories, approximately 10% contingency rounded to whole currency units, fixed photography allocations, and separate estimates |
| **Tasks and timeline**              | Dependencies, priorities, owners, deadlines, progress, and preservation of customized tasks                                                     |
| **Service checklist**               | Requirements, selection criteria, questions, notes, estimates, and user-managed booking statuses                                                |
| **Guests and RSVPs**                | Party counts, plus-ones, dietary preferences, seating groups, and explicit headcount synchronization                                            |
| **Expenses and payments**           | Quotes versus commitments, deposits, outstanding balances, and overpayment prevention                                                           |
| **Risk insights**                   | Budget overruns, preparation constraints, missing bookings, and capacity concerns                                                               |
| **Voice interaction**               | On-demand recording, editable transcription, and optional browser-generated spoken replies                                                      |
| **Personal workspace**              | Event switching, responsive layouts, light/dark/system appearance, and a time-zone-aware live clock                                             |
| **Offline demo**                    | Supported planning commands work without an API key, clearly labeled as deterministic demo behavior                                             |

<a id="screenshots"></a>

## 🖼 Screenshots and demo

These are actual development captures with sample event data, not generated UI mockups. The planning-studio image shows the emerald-and-cream visual direction; the expense capture uses an earlier theme. Dates and values reflect the captured demo state.

<table>
  <tr>
    <td align="center" width="50%">
      <img src="docs/screenshots/planning-studio.png" alt="EventIQ planning studio with an event overview, budget cards, and an AI planning shortcut" width="410" />
      <br /><strong>Planning studio</strong><br />A focused overview of the event and its next action.
    </td>
    <td align="center" width="50%">
      <img src="docs/screenshots/live-clock.png" alt="EventIQ live clock with a time-zone selector set to Kolkata" width="410" />
      <br /><strong>Workspace details</strong><br />Local time, appearance controls, and responsive navigation.
    </td>
  </tr>
</table>

<details>
<summary><strong>View expense and payment tracking</strong></summary>

![Expense ledger showing a confirmed commitment, a recorded deposit, and the outstanding balance](docs/screenshots/expenses.png)

The ledger separates estimated planning costs from confirmed expenses and recorded payments. Recording a payment does not transfer money.

</details>

**[Open the live demo →](https://eventiq-ashy.vercel.app)** No sign-in required. Each browser starts with its own empty workspace. Create an event, explore the planner, and export a backup to keep your work.

**Try it locally:** follow the [setup guide](#setup), open [http://127.0.0.1:3000](http://127.0.0.1:3000), and run the [demo walkthrough](#demo). A demo video is not yet published.

## 🧭 How EventIQ works

| Step            | User action                                              | System behavior                                                         |
| --------------- | -------------------------------------------------------- | ----------------------------------------------------------------------- |
| **1. Describe** | Enter the event type, location, date, guests, and budget | Extracts structured details and lists assumptions                       |
| **2. Review**   | Correct the brief and create the event                   | Saves the initial plan with budgets, tasks, services, and risks         |
| **3. Ask**      | Request a change by text or reviewed voice transcript    | Runs tools on a draft and recalculates affected sections                |
| **4. Approve**  | Inspect differences and select **Apply changes**         | Checks the event version and saves the approved proposal in the browser |
| **5. Execute**  | Update tasks, RSVPs, services, and expense records       | Refreshes saved state and relevant planning summaries                   |

Initial creation and manual form edits save directly. AI changes to existing events use the proposal flow. Read-only answers save conversation messages without changing the plan.

### Example user interaction

```text
You:       Wedding in Delhi, February 2027, 250 guests, ₹12 lakh budget.
EventIQ:   Extracts a reviewable event brief.
           A month-only date uses the 14th as an explicit assumption.

You:       [Review details → Create event & plan]
EventIQ:   Builds the budget, tasks, timeline, service checklist, and risks.

You:       Reduce my budget to ₹10 lakh.
EventIQ:   Shows a proposal with before/after differences.
           The saved event stays unchanged until you apply it.

You:       [Apply changes]
EventIQ:   Saves the reviewed budget and dependent plan updates.

You:       Increase guests to 350.
EventIQ:   Proposes updated costs, capacity requirements, tasks, and risks.

You:       Make it eco-friendly.
EventIQ:   Proposes sustainability-related planning changes.
```

This is an illustrative walkthrough of supported behavior; exact connected-model wording varies.

<a id="architecture"></a>

## 🏗 Architecture

The public demo stores records in each visitor's browser. Next.js serves the UI and stateless AI endpoints; it does not store event records on a server. The optional database edition is documented separately.

```mermaid
flowchart TB
    UI["Next.js + React workspace"]
    LOCAL[("Browser localStorage")]
    ENGINE["Deterministic planning engines"]
    REVIEW["Review / apply / discard / undo"]
    API["Stateless Next.js AI endpoints"]
    GUARD["Origin check, bounded input, burst limit"]
    AGENT["Agent orchestrator"]
    AI["OpenAI Responses / transcription"]
    BACKUP["Export / import JSON backup"]
    UI <-->|"Events, guests, expenses, history"| LOCAL
    UI -->|"Manual changes"| ENGINE --> LOCAL
    UI -->|"Event plan + recent chat"| API --> GUARD --> AGENT
    AGENT <-->|"Validated tool calls"| AI
    AGENT -->|"Draft only"| REVIEW --> UI
    UI -->|"User-approved changes"| LOCAL
    LOCAL <--> BACKUP
    classDef green fill:#e4f2eb,stroke:#225447,color:#163b31
    class UI,LOCAL,ENGINE,REVIEW green
```

Diagram source: [docs/architecture.mmd](docs/architecture.mmd).

### AI agent workflow

```mermaid
flowchart TD
    START["Typed request or reviewed voice transcript"]
    LOAD["Read event from this browser"]
    SEND["Send plan and recent chat to stateless endpoint"]
    MODE{"Server API key configured?"}
    MODEL["Model selects tools on an isolated draft"]
    RULES["Limited deterministic parser"]
    DIFF{"Plan differences?"}
    PROPOSAL["Save local proposal and conversation"]
    ANSWER["Save local conversation"]
    CHOICE{"Review proposal"}
    APPLY["Check current version, save to browser"]
    UNDO["Undo only while applied version is current"]
    START --> LOAD --> SEND --> MODE
    MODE -->|Yes| MODEL --> DIFF
    MODE -->|No| RULES --> DIFF
    DIFF -->|Yes| PROPOSAL --> CHOICE
    DIFF -->|No| ANSWER
    CHOICE -->|Apply| APPLY --> UNDO
    CHOICE -->|Discard| DISCARD["Discard local proposal"]
```

Diagram source: [docs/agent-workflow.mmd](docs/agent-workflow.mmd).

### System and data flow

This sequence follows an AI request through proposal review and persistence.

```mermaid
sequenceDiagram
    actor User
    participant Browser as React workspace
    participant Local as Browser storage
    participant API as Stateless Next.js API
    participant Agent as Planner + engines
    User->>Browser: Reduce the event budget
    Browser->>Local: Read current plan and version
    Local-->>Browser: EventState
    Browser->>API: POST /api/demo/plan (state, message)
    API->>API: Validate origin, payload and limits
    API->>Agent: Run against isolated draft
    Agent-->>API: Proposed state and explanation
    API-->>Browser: Draft (no server persistence)
    Browser->>Local: Check version, save local preview
    Browser-->>User: Show before / after differences
    User->>Browser: Apply changes
    Browser->>Local: Check current version
    alt Version matches
        Browser->>Local: Save plan, increment version, mark applied
        Browser-->>User: Updated plan
    else Event changed
        Browser-->>User: Request a fresh proposal
    end
```

Diagram source: [docs/data-flow.mmd](docs/data-flow.mmd). See the [documentation asset guide](docs/README.md) for diagram and screenshot details.

## 🧠 Agent and tool architecture

[The orchestrator](lib/agent/orchestrator.ts) exposes four model-callable tools. Tool names describe capabilities; existing-event mutations run against an isolated in-memory draft.

| Model-callable tool  | Responsibility                                                        | Boundary                                                              |
| -------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `get_event_state`    | Read the current structured planning state                            | Guest contact records and the expense ledger are separate             |
| `update_event_state` | Change supported event requirements and regenerate dependent sections | Arguments are validated; cannot mark a supplier booked                |
| `create_event_plan`  | Personalize category weights and ideas                                | Code performs allocation arithmetic and validates category uniqueness |
| `search_vendors`     | Report supplier-search availability                                   | Returns unavailable until a real provider is connected                |

The connected loop uses the OpenAI Responses API, the latest 12 conversation messages, and up to six model iterations. Parallel tool calls are disabled. Unsupported tools and invalid arguments fail the turn; existing saved event state is not partially updated.

The broader [typed service surface](lib/tools/index.ts) includes extraction, budget calculation/rebalancing, task and timeline generation, service recommendations, ideas, risk identification, and a vendor-provider interface. These helpers are not all exposed as independent model tools.

**Offline mode:** a deterministic parser handles supported budget, guest, date, photography-allocation, sustainability, checklist, and advisory requests. It is not an LLM and does not promise arbitrary language understanding.

**Initial creation:** the browser creates a deterministic plan immediately. Ask the planner to personalize it; changes remain proposals until approved.

## 🧰 Tech stack

| Layer          | Technology                                     | Role                                                               |
| -------------- | ---------------------------------------------- | ------------------------------------------------------------------ |
| Application    | Next.js 16.4.3, React 19, TypeScript           | App Router, route handlers, typed UI and domain code               |
| Presentation   | CSS, Lucide React, Recharts                    | Responsive styling, icons, and budget visualization                |
| Authentication | None in public demo; optional NextAuth / Google | Public access; sign-in retained for the database edition |
| Validation     | Zod 4                                          | Request schemas and model-tool argument validation                 |
| Persistence | Browser localStorage + JSON backups | Local plans and history; optional PostgreSQL / Prisma edition |
| AI             | OpenAI SDK                                     | Structured extraction, Responses tool calling, and transcription   |
| Voice          | MediaRecorder, browser speech synthesis        | On-demand capture and optional spoken replies                      |
| Tests          | Vitest, Testing Library, jsdom                 | Domain, mocked agent, UI, and API/database tests                   |
| Local tooling | pnpm, tsx; optional PostgreSQL tooling | Development scripts and optional database tests |

## ☁️ Deploy on Vercel

Set `NEXT_PUBLIC_STORAGE_MODE=browser` and `APP_ORIGIN` to the deployment's HTTPS origin. Add an optional server-side `OPENAI_API_KEY` for AI and voice. No database or Google credentials are required. The **[Vercel deployment guide](docs/deployment.md)** covers setup, backups, AI data handling, and release checks.

<a id="setup"></a>

## ⚡ Installation and local setup

### Prerequisites

- **Node.js 22.x** and **pnpm 10.28.2** installed.
- A terminal with access to this repository.
- No database or Docker is required for the public browser demo.
- An OpenAI API key only if you want connected AI or transcription.

### 1. Clone and install

```sh
git clone https://github.com/vikasgupta37/EventIQ.git
cd EventIQ
pnpm install
```

Copy the environment template:

```sh
# macOS / Linux
cp .env.example .env
```

```powershell
# Windows PowerShell
Copy-Item .env.example .env
```

Keep `OPENAI_API_KEY` empty for an offline first run. Generate the optional database client's build types (this does not connect to a database):

```sh
pnpm db:generate
```

### 2. Choose storage

The environment template defaults to `NEXT_PUBLIC_STORAGE_MODE=browser`. Skip database setup and go straight to **Run the frontend and backend** below. Your first workspace is empty; create an event to start. AI requests need a network connection even when using the rule-based parser.

<details>
<summary>Optional PostgreSQL edition: database setup and seed</summary>

Set `NEXT_PUBLIC_STORAGE_MODE=database` first. For a local demo identity use `DEMO_MODE=true`.

#### Start the database

Choose one option. Both local options use port **54329**; do not run them together.

| Option                  | Command                | Notes                                                         |
| ----------------------- | ---------------------- | ------------------------------------------------------------- |
| **Embedded PostgreSQL** | `pnpm db:local`        | No Docker required; keep this terminal open                   |
| **Docker Compose**      | `docker compose up -d` | PostgreSQL 17 with a named persistent volume                  |
| **Hosted PostgreSQL**   | Set `DATABASE_URL`     | Skip both local database commands; use a development database |

The embedded runner stores data in `.data/postgres/` and binds to loopback. Stop it gracefully with **Ctrl+C**. Do not launch a second embedded instance against the same data directory.

#### Apply migrations and seed

In another terminal, from the repository root:

```sh
pnpm db:migrate
pnpm db:seed
```

The seed creates the local demo user and **Delhi Modern Wedding** if that user has no events. Re-running it preserves existing events. If an AI key is configured, creating the seed event may invoke billable personalization.

</details>

### 3. Run the frontend and backend

```sh
pnpm dev
```

Open **[http://127.0.0.1:3000](http://127.0.0.1:3000)**. Use this exact origin to match `APP_ORIGIN`. Next.js serves both the UI and `/api/*`; there is no separate backend start command.

For a local production build:

```sh
pnpm build
pnpm start
```

Production output uses `.next-production/` locally and `.next/` on Vercel. The start script binds to loopback. Browser mode needs no database process. In the optional database edition, keep PostgreSQL running; hosted deployments also require Google sign-in.

### Environment variables

`NEXT_PUBLIC_STORAGE_MODE=browser` selects the public demo. Only `APP_ORIGIN` and optional OpenAI settings apply in that mode. Database, `DEMO_MODE`, and NextAuth / Google variables below apply only to the optional database edition.

| Variable                                    | Example/default in this repository                                                   | Purpose                                                       |
| ------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| `DATABASE_URL`                              | `postgresql://eventiq:eventiq_local_only@127.0.0.1:54329/eventiq_utf8?schema=public` | Local development connection; replace for your database       |
| `DEMO_MODE`                                 | `true` locally; `false` on Vercel                                                    | Enables local-only demo identity                              |
| `APP_ORIGIN`                                | `http://127.0.0.1:3000`                                                              | Expected browser origin for mutations                         |
| `NEXTAUTH_URL`                              | Same origin as `APP_ORIGIN`                                                          | Canonical authentication URL                                  |
| `NEXTAUTH_SECRET`                           | Empty locally                                                                        | Random session-encryption secret; required for Google sign-in |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Empty locally                                                                        | Google OAuth web client credentials                           |
| `DIRECT_URL`                                | Optional                                                                             | Non-pooled hosted connection used for deployment migrations   |
| `OPENAI_API_KEY`                            | Empty                                                                                | Server-side key; empty enables offline planning               |
| `OPENAI_MODEL`                              | `gpt-5.4-mini`                                                                       | Configurable model name used for extraction and planning      |
| `OPENAI_TRANSCRIBE_MODEL`                   | `gpt-transcribe`                                                                     | Configurable transcription model name                         |

Model names above are repository configuration values, not a guarantee of account availability. Choose compatible models accessible to your account and restart the app after changing the environment. Never commit a populated `.env`.

### Database development (optional edition)

The schema covers events, preferences, budgets/categories, tasks, timelines, service categories, recommendations, risks, conversations, actions, guests, expenses, payments, and plan changes.

```sh
# Create a migration while developing schema changes
pnpm exec prisma migrate dev --name describe_change
pnpm db:generate

# Apply committed migrations to an existing database
pnpm db:migrate
```

On Windows, stop the Next.js process before regenerating Prisma if its engine DLL is locked. Back up important data before applying migrations. The current `Vendor` model is reserved for future verified supplier integrations.

### Troubleshooting

| Symptom                                    | What to check                                                                                                            |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Database connection fails                  | PostgreSQL is running; `DATABASE_URL` matches the selected database                                                      |
| Port 54329 is occupied                     | Only one database option is running                                                                                      |
| Cross-origin write rejected                | Browser URL and `APP_ORIGIN` match exactly, including hostname and port                                                  |
| AI or transcription is unavailable         | Server key, configured model, account access, and connectivity                                                           |
| Dependencies fail after moving the project | Run `pnpm install` and `pnpm db:generate` on the target machine; do not reuse another machine's `node_modules` junctions |
| Microphone is unavailable                  | Use HTTPS or localhost, allow browser permission, or type the request instead                                            |

## 🧪 Testing

Run the project checks from the repository root:

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

| Coverage area    | Examples                                                                                           |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| Domain logic     | Extraction, valid dates, allocation totals, fixed budgets, task preservation, risks                |
| Agent behavior   | Mocked tool selection, argument validation, and provider failures                                  |
| API and database | Persistence, ownership, stale-state checks, guests, payments, proposal lifecycle                   |
| UI               | Creation, chat approval, task actions, expenses, voice controls, appearance, and clock preferences |

**Default tests:** `pnpm test` runs the database-free unit, UI, agent, browser-storage, and stateless API suites. Browser-storage tests cover reloads, backups, storage failures, guest and payment validation, and proposal conflicts.

**Optional database tests:** run `pnpm test:db` with `NEXT_PUBLIC_STORAGE_MODE=database`, `DEMO_MODE=true`, a dedicated test database, and applied migrations. They create disposable events and clean up their own records.

To run only the unit and mocked UI suites:

```sh
pnpm exec vitest run tests/engines.test.ts tests/agent.test.ts tests/frontend.test.ts tests/management-ui.test.ts tests/voice.test.ts tests/voice-ui.test.ts tests/appearance.test.ts tests/clock.test.ts tests/auth.test.ts tests/account-ui.test.ts tests/request-body.test.ts
```

<details>
<summary><strong>Optional live AI and voice verification</strong></summary>

These commands require an API key and incur provider usage. They operate on isolated drafts rather than modifying saved events.

```sh
pnpm exec tsx scripts/verify-ai.ts
pnpm exec tsx scripts/verify-voice.ts path/to/synthetic-fixture.wav
```

For the voice check, supply a synthetic recording saying **“Increase the guest count to 350.”** The script does not access your microphone.

</details>

Mocked agent tests do not establish live model availability. Browser voice mocks do not verify a physical microphone or speaker. No passing CI status or coverage percentage is claimed by this README.

## 🗂 Project structure

```text
EventIQ/
├── app/
│   ├── page.tsx                 # Landing page
│   ├── [section]/page.tsx       # Workspace sections
│   ├── events/new/page.tsx      # Event creation route
│   ├── api/[...path]/route.ts   # Validated API entry point
│   └── *.css                   # Layout, theme, appearance, clock
├── components/                 # Workspace, creation, guests, expenses, voice
├── lib/
│   ├── agent/                  # Extraction, tool loop, offline parser
│   ├── browser-store.ts        # Browser persistence, validation, backups and proposals
│   ├── server/                 # Stateless demo API and optional database API
│   ├── db/                     # Optional Prisma repositories
│   ├── tools/                  # Typed helpers and vendor-provider interface
│   ├── engines.ts              # Budgets, tasks, services, timeline, risks
│   ├── validation.ts           # Domain and request schemas
│   ├── changes.ts              # Human-readable plan differences
│   └── auth.ts                 # Replaceable identity adapter
├── prisma/
│   ├── schema.prisma           # Relational data model
│   ├── migrations/             # Versioned schema changes
│   └── seed.ts                 # Idempotent demo seed
├── scripts/                    # Local database and optional live checks
├── tests/                      # Domain, agent, API, and UI suites
├── docs/                       # Diagram sources and published screenshots
├── .env.example                # Safe configuration template
└── docker-compose.yml          # Alternative local PostgreSQL service
```

## 🔌 API overview

**Public browser mode:** only GET /api/health and POST /api/demo/extract, /api/demo/plan, /api/demo/transcribe are server endpoints. Event/guest/expense CRUD below is implemented locally by the browser adapter. These REST routes are server-backed only in the optional database edition.

All routes below are prefixed with `/api`. In the database edition, resource access is scoped through the current-user adapter. JSON is used for ordinary mutation bodies; transcription accepts multipart form data.

| Method               | Path                                                             | Purpose                                              |
| -------------------- | ---------------------------------------------------------------- | ---------------------------------------------------- |
| GET                  | `/health`                                                        | Runtime planner mode; not a database readiness probe |
| POST                 | `/extract`                                                       | Extract a reviewable event brief                     |
| GET / POST           | `/events`                                                        | List / create events                                 |
| GET / PATCH / DELETE | `/events/:id`                                                    | Read / edit and replan / delete                      |
| POST                 | `/events/:id/chat`                                               | Send a message and optionally stage a proposal       |
| POST                 | `/events/:id/plan`                                               | Propose plan personalization                         |
| GET                  | `/events/:id/budget`                                             | Allocations, estimates, and contingency              |
| POST                 | `/events/:id/budget/rebalance`                                   | Propose budget rebalancing                           |
| GET                  | `/events/:id/timeline`, `/events/:id/ideas`, `/events/:id/risks` | Read planning outputs                                |
| GET / POST           | `/events/:id/tasks`                                              | List / add tasks                                     |
| PATCH / DELETE       | `/tasks/:id`                                                     | Edit / delete a task                                 |
| GET / POST           | `/events/:id/vendors`                                            | List / add service requirements                      |
| PATCH                | `/vendors/:id`                                                   | Update service status, notes, or estimate            |
| GET / POST           | `/events/:id/guests`                                             | List / add guests                                    |
| PATCH / DELETE       | `/events/:id/guests/:guestId`                                    | Edit / delete a guest                                |
| GET / POST           | `/events/:id/expenses`                                           | List / add expenses                                  |
| PATCH / DELETE       | `/events/:id/expenses/:expenseId`                                | Edit / delete an expense                             |
| POST                 | `/events/:id/expenses/:expenseId/payments`                       | Record a payment                                     |
| DELETE               | `/events/:id/expenses/:expenseId/payments/:paymentId`            | Remove a payment record                              |
| GET                  | `/events/:id/changes`                                            | 20 local previews; 50 in database edition                         |
| POST                 | `/events/:id/changes/:changeId/{apply,discard,undo}`             | Resolve a proposal; choose one action                |
| POST                 | `/events/:id/transcribe`                                         | Transcribe an `audio` upload                         |

Typical responses include **400** invalid input, **401** missing authentication adapter, **403** rejected origin, **404** missing/unowned resource, **409** conflict, **413** oversized request, **415** unsupported audio, **422** unusable transcript, **429** throttling, and **503** unavailable service.

<a id="demo"></a>

## 🎬 Demo flow

A short walkthrough for a hackathon pitch or portfolio review:

| Scene           | Action                                                                       | What to highlight                                   |
| --------------- | ---------------------------------------------------------------------------- | --------------------------------------------------- |
| **1 · Brief**   | Enter “Wedding in Delhi, February 2027, 250 guests, ₹12 lakh budget.”        | Structured extraction and reviewable assumptions    |
| **2 · Plan**    | Create the event and open Overview, Budget, and Tasks                        | Connected planning outputs from one brief           |
| **3 · Change**  | Ask “Reduce my budget to ₹10 lakh.”                                          | The saved plan stays unchanged during review        |
| **4 · Approve** | Inspect the differences and apply                                            | Explicit approval and persistent state              |
| **5 · Adapt**   | Ask for 350 guests, then eco-friendly planning; review and apply each        | Dependent costs, tasks, and risks update            |
| **6 · Undo**    | Undo the latest applied proposal before making another edit                  | Version-checked recovery with conversation retained |
| **7 · Execute** | Add an accepted guest with a plus-one; add a confirmed expense and a deposit | RSVP party counts and a real persisted ledger       |
| **8 · Verify**  | Refresh the page                                                             | Data survives reloads                               |

Use offline mode for a key-free walkthrough of these supported commands. With connected AI, show voice input by recording, stopping, reviewing the transcript, and pressing **Send**. Transcription alone never changes the event.

## 🔐 Security notes and current boundaries

- **Public demo:** no sign-in. Anyone sharing a browser profile can access its locally saved records. Clearing site data removes them. Export a backup to preserve or transfer plans. Optional database deployments retain Google sign-in.
- **Server-side credentials:** AI keys stay on the server. `.env`, local database data, dependencies, and build outputs are excluded from Git. Example database credentials are development-only.
- **Request controls:** stateless demo endpoints check the origin, bound input sizes, validate submitted plans, and apply a per-instance IP burst limit. These limits reset on cold starts; they are not a distributed quota. Database-mode handlers retain ownership checks and database throttling.
- **Change safety:** proposals use local snapshots and version checks in browser mode; apply and undo reject stale proposals. This does not provide full stale-browser-form protection for manual edits.
- **AI data boundary:** planning state and conversation can be sent to the provider. Guest contact records and the expense ledger are not included in the dedicated planning state, but any sensitive information typed into chat is still chat content.
- **Voice privacy:** recording starts only on request, stops automatically after 60 seconds, and uploads are limited to 4 MiB. EventIQ does not persist raw audio; submitted transcript text becomes ordinary conversation data. Provider data handling still applies.
- **Planning limits:** cost estimates are illustrative heuristics, not supplier quotes or live currency conversions. Amounts use whole currency units. No invitations, bookings, or payments are sent.
- **Operational limits:** the public AI endpoints are anonymous. Set provider budgets and Vercel firewall controls for wider use; the burst limit is not a spending cap. Browser storage has finite space and is not encrypted by EventIQ. Web Locks serialize same-origin writes where supported; older browsers only serialize writes within one tab. Calendar planning uses UTC-based “today”.

## 🛣 Future roadmap

These are proposed improvements, not currently shipped capabilities.

- [x] Ship a public browser-storage demo with backup export/import.
- [x] Retain Google sign-in and separate workspaces in the optional database edition.
- [ ] Extend client-version checks to manual edits and guard against late event-switch responses.
- [ ] Make event-date and payment-date rules explicitly time-zone-aware.
- [x] Add shared PostgreSQL request limits in the optional database edition.
- [ ] Add distributed abuse controls for anonymous AI without an event database.
- [ ] Add monitoring, backup procedures, and CI checks.
- [ ] Connect verified supplier discovery and quote comparison.
- [ ] Support multi-day events, reminders, and calendar exports.
- [ ] Add attachments, invoice workflows, and richer expense reporting.
- [ ] Expand browser, accessibility, and end-to-end coverage.
- [ ] Improve pagination and reduce full-plan rewrites as datasets grow.

## 🤝 Contributors

**[Vikas Gupta](https://github.com/vikasgupta37)** — project creator and maintainer.

Ideas, bug reports, and focused improvements are welcome through [GitHub Issues](https://github.com/vikasgupta37/EventIQ/issues) and pull requests. Include reproduction steps for bugs and run the relevant checks before proposing a change.

## 📄 License

EventIQ is released under the **[MIT License](LICENSE)**. Copyright © 2026 Vikas Gupta.

---

<div align="center">
  <strong>Plan the details. Enjoy the celebration.</strong><br />
  Built to make event planning clearer, more connected, and easier to act on.
</div>
