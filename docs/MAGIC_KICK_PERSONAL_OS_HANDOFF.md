# Magic Kick — Personal OS & Automation

Canonical handoff document for a dedicated ChatGPT Project.

Status: canonical planning context  
Scope: Magic Kick and Personal OS automation only  
Implementation repository: https://github.com/romahawk/magic-kick  
Live application: https://magic-kick-kfb8.vercel.app/

## 1. Project purpose

Magic Kick is an AI-augmented personal execution OS. Its purpose is to reduce the friction created by scattered information and competing priorities by converting incoming context into clear decisions and next actions.

The intended operating loop is:

```text
Context → Goal → Inputs → Analysis → Decision → Action → Review → Archive
```

The immediate product goal is not to organise every digital source or build a fully autonomous “life manager.” It is to create a reliable personal operating loop:

```text
One inbox → automatic triage → daily plan → weekly review
```

Magic Kick should become the personal control plane for priorities, active projects, tasks, approvals, daily planning, and weekly review. It should convert scattered information into decisions and next actions without trying to replace every source system.

## 2. Current Magic Kick product state

Magic Kick already functions primarily as a personal execution dashboard. It contains a meaningful foundation for planning and execution, but it does not yet implement the complete Personal OS automation loop.

### Existing capabilities

- Tasks, projects, goals, schedule, time blocks, weekly plans, and reviews.
- Command Center / execution dashboard.
- Existing limit of three active projects and three daily focus items.
- Offline-first/local persistence with Firestore synchronisation.
- AI-assisted planning, summaries, coaching, scheduling, and retrospective analysis.
- Human-controlled execution model: the system supports decisions but does not autonomously make high-impact changes.

### Existing AI routes identified in the repository

- `/api/ai/weekly-summary`
- `/api/ai/schedule-suggest`
- `/api/ai/coaching`
- `/api/ai/retro-summary`

### Existing AI utility areas identified

- Cognitive load.
- Task scoring.
- Conflict detection.
- Risk detection.
- Retrospective patterns.

### Current limitation

The repository currently implements mainly the “decision and execution” layer. It lacks the information-ingestion layer required to receive, classify, approve, and route incoming information from external sources.

The current product does not yet have first-class support for:

- A Personal Inbox.
- Inbox/source-item data modelling.
- AI triage proposals.
- Human approval queues.
- Waiting-for items as an explicit workflow.
- External connector abstractions.
- Scheduled automation runs and retry visibility.

The previous static audit found that runtime validation was not completed because dependency installation failed in a temporary clone. A clean local installation followed by lint, typecheck, and build verification is therefore an explicit early task.

## 3. Existing technical architecture

### Confirmed stack

- Next.js 16.
- React 19.
- TypeScript.
- Firebase Authentication.
- Firestore.
- Zustand.
- Local-storage-first/offline-first state persistence.
- AI API routes under `app/api/ai` or the repository’s corresponding API structure.

### Current conceptual architecture

```text
Next.js + React + TypeScript
            ↓
Zustand application state
            ↓
localStorage-first persistence
            ↓
Firestore synchronisation
            ↓
AI routes for planning, summaries and coaching
```

### Important architecture inconsistency

The documentation and implementation do not fully describe the same Firestore model:

- `docs/FIREBASE_ARCHITECTURE.md` describes a workspace-based model.
- The actual code uses user-scoped paths such as `users/{uid}/...`.
- Firestore rules were identified as allowing only a subset of collections, including goals, tasks, projects, achievements, schedule, resources, and journal.
- The code also reads or writes collections including `weeklyPlans`, `timeBlocks`, `executionLogs`, and `weeklyReviews`.

This must be reconciled before relying on the new automation in production. Shared collection definitions should be introduced instead of duplicating collection knowledge across `store.ts`, `lib/db/types.ts`, sync code, and Firestore rules.

### Relevant existing areas likely to change

- `firestore.rules`
- `lib/types.ts`
- `lib/db/types.ts`
- `lib/db/firestore.ts`
- `lib/store.ts`
- `lib/sync/*`
- `lib/execution-os.ts`
- `lib/weekly-plan.ts`
- `lib/ai/conflict.ts`
- `lib/ai/insights.ts`
- `components/app-shell.tsx`
- `components/sidebar.tsx`
- `components/mobile-nav.tsx`
- `components/quick-add-dialog.tsx`
- `docs/ARCHITECTURE.md`
- `docs/FIREBASE_ARCHITECTURE.md`

The exact file paths must be confirmed against the current repository before implementation.

## 4. Intended Personal OS workflow

### Target flow

```text
External sources
      ↓
Ingestion adapters
      ↓
Personal Inbox
      ↓
AI triage
      ↓
Human approval
      ↓
Tasks / projects / waiting items / reference
      ↓
Today Command Brief
      ↓
Weekly Review
```

### Core workflows

#### 1. Inbox capture and triage

Incoming items are captured with their source, text, link, and timestamp. AI proposes a classification, summary, project link, next action, due date where explicit, confidence, and rationale. Important or uncertain changes remain pending human approval.

#### 2. Today Command Brief

Each day, Magic Kick should combine:

- Calendar commitments.
- The current weekly priorities.
- The top three tasks or focus items.
- Overdue tasks.
- Waiting-for items.
- Inbox items requiring approval.
- Risks and conflicts.
- One suggested deep-work block.
- Tasks that should be postponed when capacity is exceeded.

The user reviews and adjusts the plan in approximately five minutes.

#### 3. Weekly Strategist

Once per week, Magic Kick should prepare a review draft containing:

- What progressed.
- Stale tasks and projects.
- Unprocessed inbox items.
- Unresolved waiting-for items.
- Repeated friction.
- Calendar overload.
- Capacity violations.
- Suggested delete, delegate, postpone, or continue decisions.

The output is a draft for human review, not an autonomous reorganisation of the user’s life.

## 5. Source-of-truth hierarchy

| System | Source of truth / responsibility |
|---|---|
| Magic Kick | Priorities, active projects, execution tasks, approvals, daily planning, weekly review |
| Google Calendar | Time commitments and scheduled events |
| Gmail | Communication source and potential actionable inputs |
| Google Drive | Documents and files |
| GitHub | Code, issues, version history, implementation source of truth |
| n8n | External connectors, scheduled orchestration, normalisation, deduplication, retries and error logging |
| Long-term knowledge system | To be selected later; Notion and Obsidian should not both remain active execution systems |
| ChatGPT Project | Product strategy, decisions, audits, architecture, and implementation specifications |
| Claude Code | Primary local repository implementation and test execution |
| Codex | Independent repository review, debugging, security and architecture validation |

### Operating rules

- Calendar remains authoritative for time.
- Magic Kick remains authoritative for priorities and execution.
- Email and messengers remain communication channels, not task databases.
- Documents remain in Drive/local storage; Magic Kick stores structured decisions and links rather than every document.
- GitHub remains the implementation source of truth.

## 6. Confirmed product decisions

1. Magic Kick is the Personal OS control plane, not a universal repository for all information.
2. The first useful workflow is Inbox → AI triage → human approval → execution → Today brief → weekly review.
3. Automation should handle collection, classification, deduplication, summarisation, and preparation.
4. The user retains ownership of priorities and important decisions.
5. The first implementation should extend the current architecture incrementally rather than replace it.
6. The first prototype should be useful within three focused days.
7. The first complete pilot should be evaluated over fourteen calendar days.
8. The first external integrations should be controlled and limited:
   - Gmail through a dedicated label such as `Magic-Kick`.
   - Google Calendar read-only.
   - One selected Google Drive folder only if useful after the core loop works.
9. Trello and Notion should initially be frozen or treated as archival sources; only active items should be migrated.
10. AI must propose structured changes but must not silently create important commitments.
11. AI must not autonomously change the calendar, send messages, delete information, or make financial or major project decisions.
12. The user should begin with one orchestrator and three narrow workflows, not a complex multi-agent team.
13. No Mac mini or advanced personal infrastructure is required for the first pilot; the bottleneck is the source-of-truth design and workflow reliability.
14. The product should maintain a maximum of three active strategic initiatives.

## 7. Explicit constraints and exclusions

### Product constraints

- Keep the workflow calm, simple, and constrained.
- Every task should have a next action.
- Every captured item should have a source or context.
- Important decisions require human approval.
- Prefer reversible actions and visible audit trails.
- Preserve offline-first behaviour where practical.
- Avoid duplicate dashboards and parallel execution systems.

### Explicit exclusions for the initial phase

Do not build initially:

- A universal search engine across every file and service.
- Full ingestion of all messengers.
- Autonomous multi-agent life management.
- Automatic task creation from every email.
- Automatic calendar changes.
- Automatic sending of emails or messages.
- Complex personal analytics.
- Voice-controlled life management.
- A new knowledge-management system.
- Multi-user features.
- Marketplace or plugin systems.
- A broad second-brain product.
- A second platform or separate repository.
- New dashboard modules unrelated to the core operating loop.

Do not migrate the entire history from Trello, Notion, email, Drive, or local files. Import only active items and archive the rest.

## 8. Current gaps

### 8.1 Missing Personal Inbox

There is no first-class entity for incoming information from manual capture, Gmail, Calendar, Drive, webhooks, or other future adapters.

### 8.2 Missing triage state machine

The system needs explicit support for:

- New.
- Triaged.
- Awaiting approval.
- Approved.
- Archived.
- Rejected.

It also needs explicit classifications such as task, reference, waiting, idea, irrelevant, and calendar-related item.

### 8.3 Missing approval queue

AI suggestions currently need a controlled UI in which the user can inspect the proposal, edit it, approve it, reject it, or archive it before it changes execution data.

### 8.4 Missing connector layer

There are no confirmed Gmail, Google Calendar, Google Drive, Notion, or Trello ingestion adapters in the repository.

### 8.5 Missing orchestration and observability

There is no reliable scheduled mechanism for:

- Inbox polling.
- Daily brief preparation.
- Weekly review generation.
- Retry handling.
- Run status and error visibility.

### 8.6 Missing idempotency and deduplication

External items must be deduplicated using a stable source identity such as `source + sourceId`, or an equivalent idempotency key.

### 8.7 Firestore rules and schema mismatch

Existing collections used by the code must be reconciled with Firestore rules and documentation before adding new collections.

### 8.8 Server-side validation gap

Some AI routes accept application state from the browser rather than loading and validating the authoritative state server-side. This may be acceptable for a private prototype, but should be improved before exposing the workflow to other users or external systems.

## 9. Prioritized implementation roadmap

### Phase 0 — Stabilise the repository

1. Install dependencies cleanly.
2. Run lint, typecheck, tests if present, and build.
3. Fix Firestore rules for all collections actually used.
4. Reconcile workspace-based documentation with the user-scoped implementation.
5. Centralise collection definitions and shared data types.
6. Confirm current local persistence and Firestore sync behaviour.

### Phase 1 — Build the Personal Inbox

1. Add `InboxItem` types.
2. Add Firestore persistence and sync support.
3. Add Zustand state and actions.
4. Add manual quick capture.
5. Add an Inbox screen with filters and statuses.
6. Add convert-to-task, archive, reject, and reference actions.
7. Preserve source URL and notes.

### Phase 2 — Add AI triage with approval

1. Add deterministic preprocessing.
2. Add `POST /api/ai/inbox-triage`.
3. Require structured JSON output.
4. Display proposals in approval cards.
5. Allow edit, approve, reject, archive, and retry.
6. Record confidence, rationale, timestamps, and errors.

### Phase 3 — Add the Today Command Brief

1. Reuse existing execution and planning selectors.
2. Create one aggregation function such as:

```ts
buildDailyCommandBrief({
  profile,
  tasks,
  projects,
  schedule,
  inboxItems,
  weeklyPlan,
})
```

3. Show priorities, commitments, overdue work, waiting items, approval count, conflicts, and a deep-work suggestion.
4. Keep the final daily plan user-approved.

### Phase 4 — Add controlled external ingestion

1. Add `POST /api/integrations/inbox`.
2. Protect it with a shared secret or signed webhook.
3. Validate payloads and sources.
4. Add idempotency and source-based deduplication.
5. Start with Gmail label `Magic-Kick`.
6. Add read-only Google Calendar ingestion.
7. Use n8n for scheduling, normalisation, retries, and connector-specific logic.

### Phase 5 — Add the Weekly Strategist

1. Reuse the existing weekly review model.
2. Add stale projects, unprocessed inbox, waiting items, repeated friction, overload, and capacity signals.
3. Generate a review draft.
4. Keep all consequential changes behind explicit user approval.

### Phase 6 — Expand only after evidence

Consider Drive ingestion, deeper knowledge retrieval, messenger forwarding, more advanced agent coordination, or broader automation only after the first pilot demonstrates reduced planning friction and reliable triage.

## 10. Three-day prototype scope

The three-day prototype should establish a complete local loop without external connectors.

### Day 1 — Stabilise and create the Inbox foundation

- Run clean install, lint, typecheck, and build.
- Fix blocking Firestore permission issues.
- Add the `InboxItem` data model.
- Add Firestore and sync support.
- Add manual quick capture.
- Add an Inbox screen.

### Day 2 — Add AI triage and approval

- Add `/api/ai/inbox-triage`.
- Return validated structured JSON.
- Add proposal cards with summary, classification, next action, project suggestion, due date, confidence, and rationale.
- Add approve, edit, reject, archive, and retry actions.
- Convert approved task proposals into existing task entities.

### Day 3 — Add the Today view

- Add the daily command-brief aggregation.
- Show top priorities, calendar preview if available, overdue tasks, waiting items, and inbox approvals.
- Add basic loading, empty, error, and retry states.
- Add enough observability to identify failed triage or sync operations.

### Prototype acceptance criteria

- A new item can be captured without re-entering it into a task form.
- A captured item can become a task, reference, waiting item, idea, or archive item.
- AI proposals are visible before execution changes occur.
- The user can approve or reject every AI proposal.
- The Today view reflects current execution state and pending approvals.
- No external connector is required for the prototype.

## 11. Fourteen-day pilot scope

The fourteen-day pilot begins only after the three-day prototype is usable.

### Pilot sequence

1. Use manual capture and AI triage in real daily work.
2. Connect Gmail through a dedicated `Magic-Kick` label.
3. Connect Google Calendar read-only.
4. Add n8n webhook ingestion.
5. Add deduplication and automation-run logging.
6. Generate a daily command brief.
7. Generate a weekly strategist draft.
8. Review errors, friction, and false positives.
9. Decide whether to simplify, fix, or expand.

### Suggested data model additions

```ts
interface InboxItem {
  id: string
  source: "manual" | "gmail" | "calendar" | "drive" | "webhook"
  sourceId?: string
  sourceUrl?: string
  title: string
  rawText?: string
  summary?: string
  receivedAt: string

  status: "new" | "triaged" | "approved" | "archived" | "rejected"
  classification?:
    | "task"
    | "reference"
    | "waiting"
    | "calendar"
    | "idea"
    | "irrelevant"
  projectId?: string
  suggestedTask?: {
    title: string
    dueDate?: string
    notes?: string
  }

  confidence?: number
  requiresApproval: boolean
  triagedAt?: string
  approvedAt?: string
}

interface AutomationRun {
  id: string
  type: "ingestion" | "triage" | "daily-brief" | "weekly-review"
  status: "running" | "completed" | "failed"
  startedAt: string
  completedAt?: string
  processedCount: number
  error?: string
}
```

### Pilot success criteria

Target outcomes:

- At least 70% of new actionable information enters through the central inbox.
- Morning brief preparation takes under two minutes.
- Daily planning takes under five minutes.
- Weekly review takes under thirty minutes.
- Triage accuracy is good enough that the user trusts the proposals after review.
- Duplicate active tasks are rare and visible.
- No important task is created without source or context.
- No autonomous calendar or messaging actions occur.
- Fewer competing active systems are used for execution.

### Pilot metrics

Track only metrics that support decisions:

- Number of items entering through the central inbox.
- Percentage requiring manual re-entry.
- Triage acceptance, correction, rejection, and archive rates.
- Duplicate rate.
- Time spent on daily planning.
- Time spent on weekly review.
- Number of unprocessed inbox items.
- Number of tasks created without source context.
- Accuracy and usefulness of the morning brief.
- Number of failed automation runs and retries.

## 12. Open decisions

These decisions should be made during implementation rather than assumed prematurely:

1. The final canonical Firestore path model: current `users/{uid}/...` or a workspace model.
2. Whether `InboxItem` is stored in a top-level user subcollection or another consistent user-scoped location.
3. Whether “waiting-for” should be a classification of InboxItem, a first-class entity, or both.
4. The exact state-machine transitions and whether triaged items always require approval.
5. The validation library and schema strategy for API payloads and AI responses.
6. The AI provider/model and cost limits for triage and summaries.
7. Whether the first daily brief is generated on demand, by n8n, or by a scheduled backend job.
8. The exact authentication/signing method for the n8n webhook.
9. The final long-term knowledge system: Notion, Obsidian, or another tool. Do not activate multiple execution systems while deciding.
10. Whether the existing Magic Kick UI needs a dedicated Inbox navigation item or a Command Center panel first.
11. Whether Google Drive ingestion adds enough value after Gmail and Calendar are tested.
12. Which actions, if any, may later be automated without approval after sufficient trust and audit history.

## 13. Recommended working method with ChatGPT, Claude Code, Codex, GitHub and n8n

### Division of labour

| Tool | Recommended responsibility |
|---|---|
| ChatGPT Project | Product strategy, scope decisions, architecture, audits, implementation specs, acceptance criteria, progress reviews |
| Claude Code | Primary local implementation, repository inspection, editing, tests, lint, typecheck, build, and commits |
| Codex | Independent code review, debugging, security review, architecture validation, and checking whether implementation matches the issue |
| GitHub | Implementation source of truth: code, branches, issues, pull requests, and history |
| n8n | External connectors, scheduled ingestion, normalisation, deduplication, retries, and error logging |

### Recommended issue-based workflow

1. Define one bounded implementation issue in the ChatGPT Project.
2. Include affected files, data model changes, acceptance criteria, security considerations, and rollback considerations.
3. Implement the issue with Claude Code in the local repository.
4. Run lint, typecheck, tests, and build.
5. Ask Codex to review the diff independently.
6. Open a GitHub pull request or otherwise record the change in Git history.
7. Inspect the deployed preview and test the user flow.
8. Update the canonical project context with the decision and evidence.
9. Move to the next small issue only after the previous issue is stable.

### Issue boundaries for the first implementation

Use separate issues for:

1. Repository and Firestore stabilisation.
2. `InboxItem` types and persistence.
3. Manual Inbox UI.
4. AI triage endpoint and schema validation.
5. Approval workflow.
6. Today Command Brief.
7. Automation run logging.
8. Protected n8n ingestion endpoint.
9. Gmail label ingestion.
10. Read-only Calendar ingestion.
11. Weekly Strategist draft.

Do not ask any tool to implement the entire Personal OS automation in one operation.

### n8n responsibilities

n8n should initially remain an orchestration layer outside Magic Kick. It should:

- Read only explicitly selected Gmail messages.
- Read upcoming Calendar events.
- Normalise source-specific payloads.
- Add source IDs and idempotency keys.
- POST validated payloads to Magic Kick.
- Retry transient failures.
- Record errors and run status.

Magic Kick should own the personal data model, approval UI, priorities, tasks, projects, and user-facing decisions.

## 14. Glossary of important terms

**Magic Kick** — The existing application being extended into a personal execution OS.

**Personal OS** — The operating layer that turns context and commitments into priorities, decisions, actions, and review.

**Control plane** — The place where priorities, approvals, execution state, and next actions are managed. Magic Kick is the control plane; external systems remain specialised sources.

**Personal Inbox** — A central capture queue for incoming information before it becomes a task, reference, waiting item, idea, or archive item.

**InboxItem** — The proposed structured data entity representing one captured incoming item.

**AI triage** — Structured AI analysis that classifies an InboxItem, summarises it, extracts a possible next action, suggests a project or due date, and reports confidence.

**Approval queue** — The human review surface where AI proposals are inspected, edited, approved, rejected, or archived.

**Waiting-for item** — A commitment or outcome that depends on another person, organisation, or external event.

**Today Command Brief** — A daily aggregation of calendar commitments, priorities, overdue work, waiting items, risks, conflicts, and pending approvals.

**Weekly Strategist** — A weekly review draft that identifies progress, stale work, overload, unresolved dependencies, and possible delete/delegate/postpone decisions.

**Source of truth** — The system that owns a particular category of information. For example, Calendar owns time commitments; Magic Kick owns priorities and execution.

**Ingestion adapter** — A connector that receives data from an external system and converts it into Magic Kick’s input format.

**Idempotency key** — A stable identifier that prevents the same external item from being ingested more than once.

**AutomationRun** — A record of an ingestion, triage, daily-brief, or weekly-review execution, including status, count, timestamps, and errors.

**Human-in-the-loop** — A design in which AI prepares or recommends an action while a person retains approval authority for important changes.

**n8n** — The proposed external orchestration layer for scheduled connectors, normalisation, retries, deduplication, and webhook delivery.

**Three-day prototype** — The first bounded implementation containing manual Inbox capture, AI triage with approval, and a basic Today view.

**Fourteen-day pilot** — The real-use evaluation period after the prototype, adding controlled Gmail and Calendar ingestion and measuring whether planning friction decreases.

