<div align="center">
  <img src="docs/assets/eventiq-logo.svg" alt="EventIQ logo" width="80" height="80" />
  <h1>EventIQ</h1>
  <p><strong>Smarter Planning. Better Celebrations.</strong></p>
  <p>Turn an event idea into a living plan—with budgets, tasks, guests,<br />and an AI planner whose changes stay in your control.</p>

  <p>
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-225447?style=flat-square" alt="License: MIT" /></a>
    <img src="https://img.shields.io/badge/Next.js-16-111827?style=flat-square&logo=nextdotjs" alt="Next.js 16" />
    <img src="https://img.shields.io/badge/React-19-149eca?style=flat-square&logo=react&logoColor=white" alt="React 19" />
    <img src="https://img.shields.io/badge/TypeScript-Strict-3178c6?style=flat-square&logo=typescript&logoColor=white" alt="Strict TypeScript" />
    <img src="https://img.shields.io/badge/PostgreSQL-Prisma-4169e1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL and Prisma" />
    <img src="https://img.shields.io/badge/Stage-Local_MVP-d4a74f?style=flat-square" alt="Stage: local MVP" />
  </p>

  <p>
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

| For visitors | What to explore |
| --- | --- |
| **Users** | One workspace for planning, RSVPs, costs, and next steps |
| **Hackathon judges** | A stateful agent with validated tools, reviewable changes, and undo |
| **Developers and recruiters** | Typed domain logic, relational persistence, transactional updates, and unit/UI/integration tests |

**Current scope:** a working local MVP. Offline demo mode needs no AI key. Connected AI and transcription are optional. Payment entries are records of money already paid; supplier search, booking, and payment processing are not connected.

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

| Feature | What it delivers |
| --- | --- |
| **Natural-language event creation** | Editable extraction with explicit assumptions before saving |
| **Connected AI planner** | Stateful conversation and validated tool calls against an isolated draft |
| **Review and undo** | Persisted proposals, readable differences, apply/discard, and version-checked undo |
| **Budget planning** | Ten allocation categories, approximately 10% contingency rounded to whole currency units, fixed photography allocations, and separate estimates |
| **Tasks and timeline** | Dependencies, priorities, owners, deadlines, progress, and preservation of customized tasks |
| **Service checklist** | Requirements, selection criteria, questions, notes, estimates, and user-managed booking statuses |
| **Guests and RSVPs** | Party counts, plus-ones, dietary preferences, seating groups, and explicit headcount synchronization |
| **Expenses and payments** | Quotes versus commitments, deposits, outstanding balances, and overpayment prevention |
| **Risk insights** | Budget overruns, preparation constraints, missing bookings, and capacity concerns |
| **Voice interaction** | On-demand recording, editable transcription, and optional browser-generated spoken replies |
| **Personal workspace** | Event switching, responsive layouts, light/dark/system appearance, and a time-zone-aware live clock |
| **Offline demo** | Supported planning commands work without an API key, clearly labeled as deterministic demo behavior |

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

**Try it locally:** follow the [setup guide](#setup), open [http://127.0.0.1:3000](http://127.0.0.1:3000), and run the [demo walkthrough](#demo). This repository does not currently advertise a hosted demo or a demo video.

## 🧭 How EventIQ works

| Step | User action | System behavior |
| --- | --- | --- |
| **1. Describe** | Enter the event type, location, date, guests, and budget | Extracts structured details and lists assumptions |
| **2. Review** | Correct the brief and create the event | Saves the initial plan with budgets, tasks, services, and risks |
| **3. Ask** | Request a change by text or reviewed voice transcript | Runs tools on a draft and recalculates affected sections |
| **4. Approve** | Inspect differences and select **Apply changes** | Checks the event version and commits the approved proposal transactionally |
| **5. Execute** | Update tasks, RSVPs, services, and expense records | Refreshes saved state and relevant planning summaries |

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

The frontend and backend run in the same Next.js application. PostgreSQL is the separate persistence service.

```mermaid
flowchart TB
    UI["Next.js + React workspace"]
    API["Route handlers /api/*"]
    GUARD["Identity, ownership, origin checks and Zod validation"]
    AGENT["Agent orchestrator"]
    AI["OpenAI Responses API"]
    DEMO["Offline demo parser"]
    ENGINE["Deterministic planning engines"]
    REVIEW["Proposal staging and apply / discard / undo"]
    REPO["Prisma repositories"]
    DB[("PostgreSQL")]
    UI --> API --> GUARD
    GUARD --> AGENT
    GUARD -->|"Manual edits and records"| REPO
    AGENT <-->|"Validated tool calls"| AI
    AGENT --> DEMO
    AGENT --> ENGINE
    DEMO --> ENGINE
    ENGINE -->|"Existing-event AI draft"| REVIEW
    REVIEW --> REPO
    REPO <--> DB
    REPO -->|"Saved state and proposal metadata"| UI
    classDef green fill:#e4f2eb,stroke:#225447,color:#163b31
    classDef gold fill:#fff3d6,stroke:#a77b30,color:#50390f
    class UI,API,GUARD,ENGINE,REPO green
    class AI,DEMO,REVIEW gold
```

Diagram source: [docs/architecture.mmd](docs/architecture.mmd).

### AI agent workflow

```mermaid
flowchart TD
    START["Typed request or reviewed voice transcript"]
    LOAD["Load owned event state"]
    MODE{"API key configured?"}
    MODEL["Model chooses a tool or returns an answer"]
    TOOL["Validate arguments and execute on isolated draft"]
    OFFLINE["Parse supported offline commands"]
    DIFF{"Plan differences?"}
    PROPOSAL["Persist proposal and conversation"]
    ANSWER["Persist conversation only"]
    CHOICE{"User reviews proposal"}
    APPLY["Check version and atomically apply"]
    DISCARD["Mark proposal discarded"]
    UNDO["Undo while applied version is still current"]
    START --> LOAD --> MODE
    MODE -->|Yes| MODEL
    MODE -->|No| OFFLINE
    MODEL -->|"Tool call"| TOOL
    TOOL -->|"Return tool result; bounded loop"| MODEL
    MODEL -->|"Final answer"| DIFF
    OFFLINE --> DIFF
    DIFF -->|Yes| PROPOSAL --> CHOICE
    DIFF -->|No| ANSWER
    CHOICE -->|Apply| APPLY --> UNDO
    CHOICE -->|Discard| DISCARD
    classDef green fill:#e4f2eb,stroke:#225447,color:#163b31
    classDef gold fill:#fff3d6,stroke:#a77b30,color:#50390f
    class START,LOAD,TOOL,APPLY,ANSWER green
    class MODE,DIFF,CHOICE,PROPOSAL gold
```

Diagram source: [docs/agent-workflow.mmd](docs/agent-workflow.mmd).

### System and data flow

This sequence follows an AI request through proposal review and persistence.

```mermaid
sequenceDiagram
    actor User
    participant Browser as React workspace
    participant API as Next.js API
    participant Agent as Planner + engines
    participant DB as PostgreSQL
    User->>Browser: Reduce the event budget
    Browser->>API: POST /events/:id/chat
    API->>DB: Read owned event and current version
    DB-->>API: EventState and conversation
    API->>Agent: Run against isolated draft
    Agent-->>API: Proposed state, explanation, actions
    API->>DB: Store proposal snapshots and messages
    API-->>Browser: Unchanged plan + proposal
    Browser-->>User: Show before / after differences
    User->>Browser: Apply changes
    Browser->>API: POST /events/:id/changes/:changeId/apply
    API->>DB: Check ownership, proposal status and version
    alt Version matches
        API->>DB: Transaction: save plan, increment version, mark applied
        DB-->>API: Updated state
        API-->>Browser: Refresh saved plan
    else Event changed
        API-->>Browser: HTTP 409; request a new proposal
    end
```

Diagram source: [docs/data-flow.mmd](docs/data-flow.mmd). See the [documentation asset guide](docs/README.md) for diagram and screenshot details.

## 🧠 Agent and tool architecture

[The orchestrator](lib/agent/orchestrator.ts) exposes four model-callable tools. Tool names describe capabilities; existing-event mutations run against an isolated in-memory draft.

| Model-callable tool | Responsibility | Boundary |
| --- | --- | --- |
| `get_event_state` | Read the current structured planning state | Guest contact records and the expense ledger are separate |
| `update_event_state` | Change supported event requirements and regenerate dependent sections | Arguments are validated; cannot mark a supplier booked |
| `create_event_plan` | Personalize category weights and ideas | Code performs allocation arithmetic and validates category uniqueness |
| `search_vendors` | Report supplier-search availability | Returns unavailable until a real provider is connected |

The connected loop uses the OpenAI Responses API, the latest 12 conversation messages, and up to six model iterations. Parallel tool calls are disabled. Unsupported tools and invalid arguments fail the turn; existing saved event state is not partially updated.

The broader [typed service surface](lib/tools/index.ts) includes extraction, budget calculation/rebalancing, task and timeline generation, service recommendations, ideas, risk identification, and a vendor-provider interface. These helpers are not all exposed as independent model tools.

**Offline mode:** a deterministic parser handles supported budget, guest, date, photography-allocation, sustainability, checklist, and advisory requests. It is not an LLM and does not promise arbitrary language understanding.

**Creation fallback:** if initial AI personalization fails, creation can save a rule-based draft and record the fallback in the activity log.

## 🧰 Tech stack

| Layer | Technology | Role |
| --- | --- | --- |
| Application | Next.js 16.4.3, React 19, TypeScript | App Router, route handlers, typed UI and domain code |
| Presentation | CSS, Lucide React, Recharts | Responsive styling, icons, and budget visualization |
| Validation | Zod 4 | Request schemas and model-tool argument validation |
| Persistence | PostgreSQL, Prisma 6.19 | Relational models, migrations, and transactions |
| AI | OpenAI SDK | Structured extraction, Responses tool calling, and transcription |
| Voice | MediaRecorder, browser speech synthesis | On-demand capture and optional spoken replies |
| Tests | Vitest, Testing Library, jsdom | Domain, mocked agent, UI, and API/database tests |
| Local tooling | pnpm, tsx, embedded-postgres or Docker Compose | Dependencies, scripts, and local PostgreSQL |

<a id="setup"></a>

## ⚡ Installation and local setup

### Prerequisites

- **Node.js 22+** and **pnpm** installed.
- A terminal with access to this repository.
- Choose **embedded PostgreSQL** or **Docker with Compose**. The documented local flow supports Windows x64.
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

Keep `OPENAI_API_KEY` empty for an offline first run. Generate the database client:

```sh
pnpm db:generate
```

### 2. Start the database

Choose one option. Both local options use port **54329**; do not run them together.

| Option | Command | Notes |
| --- | --- | --- |
| **Embedded PostgreSQL** | `pnpm db:local` | No Docker required; keep this terminal open |
| **Docker Compose** | `docker compose up -d` | PostgreSQL 17 with a named persistent volume |
| **Hosted PostgreSQL** | Set `DATABASE_URL` | Skip both local database commands; use a development database |

The embedded runner stores data in `.data/postgres/` and binds to loopback. Stop it gracefully with **Ctrl+C**. Do not launch a second embedded instance against the same data directory.

### 3. Apply migrations and seed

In another terminal, from the repository root:

```sh
pnpm db:migrate
pnpm db:seed
```

The seed creates the local demo user and **Delhi Modern Wedding** if that user has no events. Re-running it preserves existing events. If an AI key is configured, creating the seed event may invoke billable personalization.

### 4. Run the frontend and backend

```sh
pnpm dev
```

Open **[http://127.0.0.1:3000](http://127.0.0.1:3000)**. Use this exact origin to match `APP_ORIGIN`. Next.js serves both the UI and `/api/*`; there is no separate backend start command.

For a local production build:

```sh
pnpm build
pnpm start
```

Keep PostgreSQL running. Production output uses `.next-production/`; development uses `.next/`. The start script also binds to loopback. A production build does not add production authentication.

### Environment variables

| Variable | Example/default in this repository | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://eventiq:eventiq_local_only@127.0.0.1:54329/eventiq_utf8?schema=public` | Local development connection; replace for your database |
| `DEMO_MODE` | `true` | Enables the shared local demo identity |
| `APP_ORIGIN` | `http://127.0.0.1:3000` | Expected browser origin for mutations |
| `OPENAI_API_KEY` | Empty | Server-side key; empty enables offline planning |
| `OPENAI_MODEL` | `gpt-5.4-mini` | Configurable model name used for extraction and planning |
| `OPENAI_TRANSCRIBE_MODEL` | `gpt-transcribe` | Configurable transcription model name |

Model names above are repository configuration values, not a guarantee of account availability. Choose compatible models accessible to your account and restart the app after changing the environment. Never commit a populated `.env`.

### Database development

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

| Symptom | What to check |
| --- | --- |
| Database connection fails | PostgreSQL is running; `DATABASE_URL` matches the selected database |
| Port 54329 is occupied | Only one database option is running |
| Cross-origin write rejected | Browser URL and `APP_ORIGIN` match exactly, including hostname and port |
| AI or transcription is unavailable | Server key, configured model, account access, and connectivity |
| Dependencies fail after moving the project | Run `pnpm install` and `pnpm db:generate` on the target machine; do not reuse another machine's `node_modules` junctions |
| Microphone is unavailable | Use HTTPS or localhost, allow browser permission, or type the request instead |

## 🧪 Testing

Run the project checks from the repository root:

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

| Coverage area | Examples |
| --- | --- |
| Domain logic | Extraction, valid dates, allocation totals, fixed budgets, task preservation, risks |
| Agent behavior | Mocked tool selection, argument validation, and provider failures |
| API and database | Persistence, ownership, stale-state checks, guests, payments, proposal lifecycle |
| UI | Creation, chat approval, task actions, expenses, voice controls, appearance, and clock preferences |

**Integration prerequisites:** `pnpm test` includes PostgreSQL-backed tests. Provide `.env`, a running development database, and applied migrations. Integration tests create disposable events and clean up their own records; use a dedicated development/test database.

To run only the unit and mocked UI suites:

```sh
pnpm exec vitest run tests/engines.test.ts tests/agent.test.ts tests/frontend.test.ts tests/management-ui.test.ts tests/voice.test.ts tests/voice-ui.test.ts tests/appearance.test.ts tests/clock.test.ts
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
│   ├── db/                     # Prisma client and transactional repositories
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

All routes below are prefixed with `/api`. Resource access is scoped through the current-user adapter. JSON is used for ordinary mutation bodies; transcription accepts multipart form data.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Runtime planner mode; not a database readiness probe |
| POST | `/extract` | Extract a reviewable event brief |
| GET / POST | `/events` | List / create events |
| GET / PATCH / DELETE | `/events/:id` | Read / edit and replan / delete |
| POST | `/events/:id/chat` | Send a message and optionally stage a proposal |
| POST | `/events/:id/plan` | Propose plan personalization |
| GET | `/events/:id/budget` | Allocations, estimates, and contingency |
| POST | `/events/:id/budget/rebalance` | Propose budget rebalancing |
| GET | `/events/:id/timeline`, `/events/:id/ideas`, `/events/:id/risks` | Read planning outputs |
| GET / POST | `/events/:id/tasks` | List / add tasks |
| PATCH / DELETE | `/tasks/:id` | Edit / delete a task |
| GET / POST | `/events/:id/vendors` | List / add service requirements |
| PATCH | `/vendors/:id` | Update service status, notes, or estimate |
| GET / POST | `/events/:id/guests` | List / add guests |
| PATCH / DELETE | `/events/:id/guests/:guestId` | Edit / delete a guest |
| GET / POST | `/events/:id/expenses` | List / add expenses |
| PATCH / DELETE | `/events/:id/expenses/:expenseId` | Edit / delete an expense |
| POST | `/events/:id/expenses/:expenseId/payments` | Record a payment |
| DELETE | `/events/:id/expenses/:expenseId/payments/:paymentId` | Remove a payment record |
| GET | `/events/:id/changes` | Latest 50 proposal summaries |
| POST | `/events/:id/changes/:changeId/{apply,discard,undo}` | Resolve a proposal; choose one action |
| POST | `/events/:id/transcribe` | Transcribe an `audio` upload |

Typical responses include **400** invalid input, **401** missing authentication adapter, **403** rejected origin, **404** missing/unowned resource, **409** conflict, **413** oversized request, **415** unsupported audio, **422** unusable transcript, **429** throttling, and **503** unavailable service.

<a id="demo"></a>

## 🎬 Demo flow

A short walkthrough for a hackathon pitch or portfolio review:

| Scene | Action | What to highlight |
| --- | --- | --- |
| **1 · Brief** | Enter “Wedding in Delhi, February 2027, 250 guests, ₹12 lakh budget.” | Structured extraction and reviewable assumptions |
| **2 · Plan** | Create the event and open Overview, Budget, and Tasks | Connected planning outputs from one brief |
| **3 · Change** | Ask “Reduce my budget to ₹10 lakh.” | The saved plan stays unchanged during review |
| **4 · Approve** | Inspect the differences and apply | Explicit approval and persistent state |
| **5 · Adapt** | Ask for 350 guests, then eco-friendly planning; review and apply each | Dependent costs, tasks, and risks update |
| **6 · Undo** | Undo the latest applied proposal before making another edit | Version-checked recovery with conversation retained |
| **7 · Execute** | Add an accepted guest with a plus-one; add a confirmed expense and a deposit | RSVP party counts and a real persisted ledger |
| **8 · Verify** | Refresh the page | Data survives reloads |

Use offline mode for a key-free walkthrough of these supported commands. With connected AI, show voice input by recording, stopping, reviewing the transcript, and pressing **Send**. Transcription alone never changes the event.

## 🔐 Security notes and current boundaries

- **Local demo identity:** `DEMO_MODE=true` shares a demo user. Do not expose it publicly. Setting it to `false` fails closed until a verified session provider is integrated in [lib/auth.ts](lib/auth.ts).
- **Server-side credentials:** AI keys stay on the server. `.env`, local database data, dependencies, and build outputs are excluded from Git. Example database credentials are development-only.
- **Request controls:** handlers validate inputs, check ownership, reject mismatched supplied origins, and apply per-process mutation throttling. These controls are not a substitute for deployment hardening.
- **Change safety:** proposals use server-owned snapshots and version checks; apply and undo reject stale proposals. This does not provide full stale-browser-form protection for manual edits.
- **AI data boundary:** planning state and conversation can be sent to the provider. Guest contact records and the expense ledger are not included in the dedicated planning state, but any sensitive information typed into chat is still chat content.
- **Voice privacy:** recording starts only on request, stops automatically after 60 seconds, and uploads are limited to 8 MB. EventIQ does not persist raw audio; submitted transcript text becomes ordinary conversation data. Provider data handling still applies.
- **Planning limits:** cost estimates are illustrative heuristics, not supplier quotes or live currency conversions. Amounts use whole currency units. No invitations, bookings, or payments are sent.
- **Operational limits:** throttling resets on restart and is not distributed. Calendar planning currently uses UTC-based “today”; the header clock's selected zone affects only its display. Additional concurrency, accessibility, device, and load testing remains appropriate before public launch.

## 🛣 Future roadmap

These are proposed improvements, not currently shipped capabilities.

- [ ] Integrate verified authentication and multi-user workspaces.
- [ ] Extend client-version checks to manual edits and guard against late event-switch responses.
- [ ] Make event-date and payment-date rules explicitly time-zone-aware.
- [ ] Add distributed rate limiting, monitoring, backup procedures, and CI checks.
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
