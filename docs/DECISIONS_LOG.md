# Decisions Log — Magic Kick

Architecture Decision Records (ADR-style). Each entry explains a real choice made in this codebase, why it was made, and what would trigger a revisit.

---

## ADR-001: Offline-First with Zustand + localStorage

**Date:** 2025 (initial build)
**Status:** Accepted

**Context:** The app must work without internet. Options: IndexedDB (complex), service worker cache (infrastructure overhead), or Zustand `persist` to localStorage (simple, synchronous).

**Decision:** Use Zustand `persist` middleware with localStorage as the local cache. All UI reads from the store. Firestore is the remote sync target, not the source of truth for the UI.

**Consequences:**
- Pro: Zero loading spinners for cached data; instant UI on return visits
- Pro: Simple implementation, easy to reason about
- Con: localStorage has a ~5MB limit — could be hit by power users with thousands of journal entries or tasks
- Con: Not shared across browser tabs (each tab has its own store hydration)

**Revisit trigger:** User data exceeds 2MB in localStorage, or multi-tab consistency bugs are reported.

---

## ADR-002: Firebase Auth Client-Only (No Server Session)

**Date:** 2025 (initial build)
**Status:** Accepted with known tradeoff

**Context:** Adding Firebase Admin SDK + session cookies requires server routes, middleware, and more complex deploy setup. For a solo-user V1 app, client-side auth is sufficient.

**Decision:** Use Firebase Auth client SDK only. Route protection is handled by `useRequireAuth` hook (client-side redirect). Firestore security rules enforce data isolation — even if a user reaches a protected page URL, they cannot read another user's data.

**Consequences:**
- Pro: No server infra, works on static/edge deploys
- Con: Server-rendered pages are not auth-protected at the HTTP level
- Con: `middleware.ts` is missing — SSR pages briefly render before redirect

**Revisit trigger:** Adding SSR data fetching, or security audit requires server-side session verification.

---

## ADR-003: Last-Write-Wins Conflict Resolution

**Date:** 2025 (sync engine design)
**Status:** Accepted

**Context:** Multi-device sync requires a conflict resolution strategy. Options: CRDTs (complex), operational transforms (very complex), last-write-wins by timestamp (simple and sufficient for single-user).

**Decision:** Conflicts resolved by comparing `clientUpdatedAt` (client-side timestamp in ms). Higher value wins. On tie, server `updatedAt` wins. Soft deletes (tombstones) are preserved across devices.

**Consequences:**
- Pro: Deterministic, easy to test, no merge complexity
- Con: If two devices edit the same entity with clock skew > sync interval (45s), one edit is silently dropped
- Con: Not suitable for collaborative/multi-user scenarios

**Revisit trigger:** Adding team/multi-user features, or users report lost edits.

---

## ADR-004: Hardcoded XP Category Base Values

**Date:** 2025 (xp-engine.ts)
**Status:** Superseded by ADR-029 (2026-10-09): every category has the same base XP (20).

**Context:** Task XP is calculated from a category baseline (`CATEGORY_BASE_XP` in `lib/xp-engine.ts`). The hardcoded categories (Learning, Sport, Family/Home, Hobby, Travel) match the default task categories, but users can add custom categories that fall back to `15 XP`.

**Decision:** Ship with hardcoded values to unblock the XP loop. User-configurable category XP is deferred.

**Consequences:**
- Pro: Simple, deterministic
- Con: User-created categories always get 15 XP regardless of effort level
- Con: Hardcoded list diverges from user's actual category set over time

**Revisit trigger:** When user-configurable categories are more than 2 weeks old in production. Fix: store category base XP in `profile.taskCategoryXP` map, default to 15 if absent.

---

## ADR-005: Retroactive AI Production OS Adoption

**Date:** 2026-03-02
**Status:** Adopted

**Context:** Repo was built as a technical prototype without product documentation, workflow templates, or deployment discipline. Transitioning to solo remote-first employment requires the repo to function as production-grade proof-of-work.

**Decision:** Adopt AI Production OS v1 framework retroactively. Add: PRD, ARCHITECTURE, ROADMAP, DECISIONS_LOG, GitHub issue/PR templates, CHANGELOG, updated README. Enforce Issue → PR → Deploy discipline going forward.

**Consequences:**
- Pro: Repo becomes demonstrable proof-of-work for engineering/product credibility
- Pro: Establishes governance before scope expands further
- Con: Short-term overhead (docs sprint before feature sprint)

**Revisit trigger:** Framework becomes obsolete or team grows beyond 1 person.

---

## ADR-006: Magic Kick Reframed as Personal Tool + AI-SDLC Sandbox

**Date:** 2026-06-23
**Status:** Accepted

**Context:** Product framing caused scope drift. AI routes were shipped against the Freeze List declared in ROADMAP.md. Phase 0 governance was abandoned mid-flight. The repo is not in the declared WIP-3 (AlphaRhythm, FlowLogix, LiveSurgery) and was effectively a 4th active project competing for limited solo build hours. Docs treated Magic Kick as a multi-phase product with sprints, a PRD, and a roadmap — none of which reflect the actual use of the tool.

**Decision:** Stop treating Magic Kick as a product. Adopt the governing rule now pinned in CLAUDE.md and README.md. Archive PRD, ROADMAP, SPRINT_BACKLOG, EXECUTION_OS_REFACTOR, and NEXT_SESSION_START. Cap surface area at the current 9 modules. AI routes remain behind feature flag; no new AI surface without a named, time-boxed experiment.

**Consequences:**
- No more phase plans or sprint backlogs.
- Future work is either personal-itch fixes or logged sandbox experiments.
- Existing AI code stays flagged; a separate ADR documenting the original out-of-scope AI ship is still required (track as follow-up issue).
- The WORKFLOW_AUTOMATION_PLAYBOOK.md is now the primary artifact — the app itself is the worked example.

**Revisit trigger:** Never, unless the project changes hands or purpose.

---

## ADR-007: Project data model — milestones only, sprint as separate object

**Date:** 2026-06-29
**Status:** Accepted

**Context:** The detail Sheet shows both "tasks" and "milestones" counts; the Edit modal shows neither, only a free-text "Weekly Outcome" field. Vocabulary is split across surfaces, blocking any coherent UI for progress tracking. The Edit modal conflated three cadences (identity, lifecycle, weekly operations) in one form, making every weekly edit scroll past rarely-changed identity fields.

**Decision:**
- Project hierarchy: **Project → Milestones** (no tasks layer). A Milestone is a binary done/not-done outcome with an optional target date. Type: `{ id, title, done, targetDate?, completedAt? }`.
- Sprint is a **separate object**, soft-linked from sprint outcomes to milestones via optional `linked_milestone?: string`. Sprint data model and persistence are deferred to session 2; this session does not introduce it.
- "Tasks" vocabulary is removed from all UI surfaces targeting the projects domain. Existing fields that conceptually represent tasks are either renamed to milestones or left untouched pending session 3 (the milestones UI session).

**Consequences:**
- Session 1 (this session): removes Weekly Outcome from Edit modal, moves Links to the detail Sheet, strips Edit modal to identity-only fields (Title, Objective, Duration, Color, Status).
- Session 2: introduces Sprint type + persistence + Sheet block.
- Session 3: milestones UI overhaul + vocabulary cleanup across surfaces.

**Revisit trigger:** Sprint data model introduced in session 2 conflicts with this structure, or session 3 vocabulary cleanup reveals that the `Project → Milestones` hierarchy is insufficient for the actual tracking workflow.

---

## ADR-008: Unfreeze read-only Google Calendar metadata

**Date:** 2026-08-10
**Status:** Accepted

**Context:** Google Calendar remains the source of truth for time commitments, but the current freeze list blocks all external connector work until Track 7. The next integration step needs only local connection metadata so Magic Kick can model selected calendars, sync cursors, and connection status before any event ingestion, webhook, OAuth scope expansion, or calendar writes are introduced.

**Decision:** Unfreeze **read-only Google Calendar metadata only**. This permits data model and persistence work for calendar connection state, selected calendar identifiers, sync cursor/token placeholders, last-sync timestamps, status/error fields, and display preferences. It does not permit reading Google Calendar events, creating OAuth flows beyond what is required to store metadata placeholders, adding webhooks, adding n8n or connector runtimes, importing events, exporting Magic Kick blocks, or writing to Google Calendar.

**Consequences:**
- Magic Kick can prepare a narrow, reviewable data boundary for a future read-only Calendar integration.
- The general external connector freeze remains in force.
- Event ingestion remains blocked until a separate ADR or Track 7 decision explicitly unfreezes it.
- Calendar writes remain out of scope; Google Calendar continues to own time commitments.

**Revisit trigger:** Metadata needs real Google API access, event import, webhook renewal, OAuth refresh-token storage, or any write capability.

---

## ADR-009: Unfreeze Google event to external block mapper

**Date:** 2026-08-10
**Status:** Accepted

**Context:** The next Calendar integration step is to define how a Google Calendar event would be represented inside Magic Kick without yet reading from Google APIs or rendering imported events. The mapper can be developed and tested as pure local code using the documented Google Calendar Events resource shape.

**Decision:** Unfreeze a **pure Google event to external calendar block mapper only**. This permits local TypeScript types for the subset of Google event fields Magic Kick needs and a deterministic mapper into an external calendar block model. It does not permit OAuth, Google API calls, event import jobs, Firestore persistence of imported events, webhooks, rendering external blocks in Schedule, feeding imported blocks into AI routes, or writing to Google Calendar.

**Consequences:**
- Magic Kick gets a stable data boundary for future read-only event ingestion.
- The mapper can be verified independently before any connector code exists.
- Cancelled or malformed events can be handled consistently before they reach UI or sync.
- External event rendering and AI scheduling remain separate future steps.

**Revisit trigger:** The mapper needs real API access, stored imported events, Schedule rendering, conflict detection integration, or any write/export behavior.

---

## ADR-010: Unfreeze read-only external calendar block rendering

**Date:** 2026-08-10
**Status:** Accepted

**Context:** Magic Kick now has read-only Calendar metadata and a pure Google event mapper, but the Schedule view cannot yet display external calendar commitments. Rendering already-present external blocks is useful before implementing OAuth or import jobs because it proves the visual and state boundary between Calendar-owned commitments and Magic Kick-owned planning blocks.

**Decision:** Unfreeze **read-only Schedule rendering of already-present external calendar blocks only**. This permits an `externalCalendarBlocks` synced collection, store actions for adding or tombstoning external blocks, Firestore rules/shared collection definitions, and read-only display in `ScheduleModule`. It does not permit OAuth, Google API calls, event import jobs, webhooks, AI route integration, or writing/exporting to Google Calendar.

**Consequences:**
- External calendar commitments can be visually tested without connecting to Google.
- Google-owned blocks remain non-editable and visually distinct from Magic Kick planning blocks.
- Future import work has a persistence target and display path ready.
- AI scheduling and Google writes remain separate future decisions.

**Revisit trigger:** Rendering needs live Google API access, automatic import/sync, conflict-detection integration, AI route input, or any write/export capability.

---

## ADR-011: Unfreeze external busy blocks for schedule suggestions

**Date:** 2026-08-10
**Status:** Accepted

**Context:** External calendar blocks can now be represented and rendered read-only, but AI schedule suggestions still only consider Magic Kick `TimeBlock` records. To keep scheduling useful, already-present external blocks that actually block time should be projected into the existing busy-block input shape for the existing `/api/ai/schedule-suggest` route and client-side conflict detection.

**Decision:** Unfreeze **external busy block input for the existing schedule-suggest flow only**. This permits projecting already-present `externalCalendarBlocks` into the existing `existingBlocks` request payload and using the same projected list for client conflict detection. It does not permit new AI routes, prompt expansion beyond busy context, OAuth, Google API calls, import jobs, webhooks, or calendar writes.

**Consequences:**
- AI scheduling can avoid already-present Calendar-owned commitments.
- No new AI surface or Google integration is introduced.
- The route contract remains stable because external blocks are reduced to date/start/end busy intervals.
- Calendar-owned event details are not sent beyond what the scheduler needs.

**Revisit trigger:** AI needs event titles/details, live Google data, automatic imports, prompt changes beyond busy intervals, or write/export behavior.

---

## ADR-012: Unfreeze read-only Google Calendar discovery

**Date:** 2026-08-10
**Status:** Accepted

**Context:** Calendar metadata can be edited manually, but selecting real calendar IDs by hand is brittle. Google Calendar's CalendarList API can return the user's calendar list with a narrow read-only scope, and Google Identity Services can provide a transient browser access token for that scope from a user-triggered consent flow.

**Decision:** Unfreeze **read-only Google Calendar discovery only**. This permits requesting a Google Calendar read-only scope, using a transient access token in the browser to call CalendarList `list`, showing discovered calendars in the existing metadata dialog, and saving selected calendar IDs into existing profile metadata. It does not permit importing events during discovery, storing OAuth access or refresh tokens, webhooks, AI changes, or calendar writes.

**Consequences:**
- Calendar IDs can be selected from real Google Calendar data instead of typed manually.
- The app still stores only metadata, not OAuth tokens or event data.
- Event ingestion remains blocked until a separate ADR.
- Users may see a Google consent screen for calendar-list read-only access.

**Revisit trigger:** Discovery needs event reads, token persistence/refresh, server-side OAuth, imports, webhooks, or write/export behavior.

---

## ADR-013: Unfreeze bounded read-only Google event import

**Date:** 2026-08-10
**Status:** Accepted

**Context:** Magic Kick can discover calendar IDs and can render/schedule around already-present external calendar blocks, but there is still no manual path to populate those blocks from real Google events. The next useful step is a bounded, user-triggered import that reads upcoming events from selected calendars, maps them through the existing pure mapper, and stores them as `externalCalendarBlocks`.

**Decision:** Unfreeze **bounded manual read-only Google event import only**. This permits requesting a Google Calendar read-only scope, using a transient browser access token to call Events `list` for selected calendars, importing a fixed upcoming window, mapping events into `ExternalCalendarBlock`, saving them locally/Firestore via the existing collection, and updating metadata status/last sync/error fields. It does not permit background sync, token storage/refresh, webhooks, incremental sync automation, AI prompt changes, or calendar writes.

**Consequences:**
- The full read-only path can be tested manually end to end.
- Imported Google commitments appear in Schedule and are considered by schedule suggestions through existing external busy projection.
- OAuth tokens remain transient and are not persisted.
- Stale imported events may remain until the next manual bounded import; background sync is still a separate decision.

**Revisit trigger:** The import needs background scheduling, token refresh, webhook renewal, deletion reconciliation beyond the bounded window, AI detail prompts, or write/export behavior.

---

## ADR-014: Use Google Identity Services for Calendar read tokens

**Date:** 2026-08-10
**Status:** Accepted

**Context:** Firebase Auth sign-in can authenticate the user but did not reliably return a Google Calendar OAuth access token after redirect/popup flows in the local browser. Discovery and manual import need a short-lived Calendar API bearer token, not another Firebase identity session.

**Decision:** Use Firebase's existing Google provider as the primary transient access-token source for Calendar discovery and manual event import, and allow Google Identity Services' browser token client as an optional fallback when `NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID` is configured. Both paths request only `https://www.googleapis.com/auth/calendar.readonly` from a user-triggered button click, use the returned token immediately for Calendar REST calls, and never store the token.

**Consequences:**
- Calendar discovery/import use the existing Firebase Google sign-in configuration by default.
- A separate Google OAuth Web Client ID with the local origin configured can be added as a fallback, but is not required for the default path.
- Tokens remain transient; the integration is still manual and read-only.
- Google app verification may still show a warning until the OAuth consent screen is verified or the account is added as a test user.

**Revisit trigger:** The integration needs server-side OAuth, refresh tokens, background sync, webhooks, or any Calendar write/export capability.

---

## ADR-015: Browser-only Calendar auto-sync while token is live

**Date:** 2026-08-10
**Status:** Accepted

**Context:** Manual event import proves the read-only Calendar path, but Google Calendar edits are stale in Magic Kick until the user clicks Import again. Full automatic sync would normally require stored refresh tokens, a server-side OAuth flow, and/or Google push notification channels, which is beyond the current read-only browser integration.

**Decision:** Add browser-only Calendar auto-sync for the existing bounded import window. After a successful user-triggered Calendar authorization, Magic Kick caches the short-lived access token in memory only and uses it to poll selected calendars while Schedule is open. The same reconciler is used for manual Import and auto-sync: returned events are mapped/upserted, cancelled events are tombstoned, and previously imported Google blocks missing from the selected 14-day window are tombstoned. No token is persisted.

**Consequences:**
- Google Calendar edits can update Magic Kick automatically while the app is open and the access token remains valid.
- Auto-sync stops after page reload or token expiry until the user performs another Discover/Import action.
- No refresh tokens, background workers, webhooks, or Calendar writes are introduced.
- The imported window remains intentionally bounded to the next 14 days.

**Revisit trigger:** The user needs sync after page reload without interaction, long-running background sync, webhook latency, or one-way export/write behavior.

---

## ADR-016: Project → Tasks, with milestone as an optional grouping field

**Date:** 2026-08-09
**Status:** Accepted
**Blocks:** Edit Project modal, `InboxItem.projectId`, `InboxItem.suggestedTask`, Today Command Brief aggregation

### Context

Three candidate hierarchies were open:

- **A** — Project → Milestones
- **B** — Project → Milestones → Tasks
- **C** — Project → Tasks

This decision had been deferred while UI work proceeded, which blocked the Edit Project modal and would have forced a retrofit of any Inbox entity referencing a project.

Constraints that shaped the choice: a maximum of three active strategic initiatives; design principles favouring progressive disclosure and one control per row; a single user with no delegation needs; the product goal of reducing rather than adding structural overhead.

### Decision

Adopt **C — Project → Tasks**, flat. A task belongs directly to a project.

Add an **optional** `milestone` field on the task (string label, nullable). It is a grouping affordance, not an entity: no separate collection, no lifecycle, no completion state, no dedicated CRUD surface.

### Rationale

- Option B adds a mandatory intermediate level that must be created and maintained for every project. With three active projects this is overhead without payoff.
- Option A cannot represent atomic next actions, which the operating loop requires ("every task has a next action").
- Option C plus an optional label delivers the grouping benefit of B at near-zero maintenance cost.
- **Upgrade path preserved:** if milestone labels prove genuinely load-bearing after real use, they can be promoted to a first-class entity by migrating distinct label values into documents and converting the field to a foreign key. Choosing B now cannot be reversed as cheaply.

### Consequences

- Edit Project modal is unblocked; it edits project metadata and task membership only.
- `InboxItem.projectId` and `suggestedTask` map directly onto existing task creation with no intermediate resolution step.
- Milestone-level progress rollups are not available. Accepted — project-level progress is sufficient at this scale.
- If milestone labels are unused after 30 days of real use, remove the field.

### Alternatives rejected

- **B (three levels)** — rejected on maintenance cost and irreversibility.
- **A (milestones only)** — rejected; incompatible with the next-action requirement.

---

## ADR-017: Drifted AI routes: retained, parked behind feature flag, frozen

**Date:** 2026-08-09
**Status:** Accepted

### Context

Four AI API routes and supporting library modules were shipped outside the planned Phase 0 scope, which was governance and documentation only:

- `/api/ai/weekly-summary`
- `/api/ai/schedule-suggest`
- `/api/ai/coaching`
- `/api/ai/retro-summary`

Plus AI utility areas: cognitive load, task scoring, conflict detection, risk detection, retrospective patterns.

This code contradicts the Freeze List in `docs/ROADMAP.md`. A subsequent planning document treated these routes as baseline "existing capabilities", which would have laundered the drift into the foundation and made the next occurrence invisible.

A separate defect was identified: some AI routes accept application state from the browser rather than loading and validating authoritative state server-side.

### Decision

1. **Retain** the code. Deleting working code to satisfy a process rule is waste.
2. **Park** it behind its existing feature flag, **default off**.
3. **Freeze** it: the routes may be read and maintained, not extended. No new AI route until the Track 5 gate is passed.
4. **Record** the drift explicitly in `docs/ROADMAP.md` rather than silently reclassifying it as planned work.
5. **Defer** the server-side validation fix to Track 2 as its own issue. Acceptable risk for a single-user private prototype; not acceptable before any external ingestion endpoint exists.

### Rationale

Scope drift is a recurring failure mode on this project. The corrective pattern is to surface it explicitly and resolve it before proceeding, not to renegotiate the plan to match what was shipped. Parking behind a flag makes the drift visible and reversible without discarding effort.

### Consequences

- The Freeze List in `docs/ROADMAP.md` and `CLAUDE.md` §6 regain accuracy.
- AI features are unavailable by default until deliberately re-enabled.
- Track 2 gains one issue: server-side state validation for existing AI routes.

---

## ADR-018: Personal OS automation plan: partially adopted, phases 4–6 deferred

**Date:** 2026-08-09
**Status:** Accepted

### Context

A canonical handoff document (`MAGIC_KICK_PERSONAL_OS_HANDOFF.md`) proposed converting Magic Kick into a full ingestion, triage and orchestration platform across six phases, with a stated three-day prototype and fourteen-day pilot.

Assessment found the estimate understated by roughly an order of magnitude (realistically 5–6 weeks part-time), and found the plan conflicted with existing project state: it treated drifted AI routes as baseline, assumed a data hierarchy that had not been decided, introduced a fourth canonical planning surface, and did not account for in-flight redesign work.

### Decision

**Adopt:**
- The source-of-truth hierarchy (§5) and operating rules.
- The constraint set (§7), specifically: AI proposes, never silently commits; every item has a source; important decisions require human approval; prefer reversible actions and visible audit trails.
- The exclusion list (§7) in full.
- Idempotency via `source + sourceId`.
- Issue-based decomposition (§13) — no tool implements the whole loop in one operation.
- The `InboxItem` and `AutomationRun` shapes as starting points, subject to ADR-016.

**Reject:**
- The ChatGPT Project as canonical strategy surface. Superseded by Claude + `docs/DECISIONS_LOG.md` + GitHub Issues.
- The stated three-day and fourteen-day timelines.
- The ten-metric pilot measurement set — unresolved instrumentation, and manual tracking would add the friction the product exists to remove.

**Defer behind a usage gate:**
- AI triage and approval queue (Track 5).
- Today Command Brief (Track 6).
- n8n, Gmail label ingestion, read-only Calendar ingestion, Weekly Strategist (Track 7).

### Gate definition

A **dumb Inbox** ships first (Track 4): manual capture, list view, convert-to-task. No AI, no triage, no connectors, no approval state machine. It is used for 14 consecutive days.

- **Pass:** ~10 or more items captured per week without external prompting → proceed to Track 5.
- **Fail:** below that threshold → stop, reinstate the WIP limit, reassess. A triage layer cannot rescue an unused inbox; it only makes it more expensive.

### Rationale

The plan's core hypothesis is that centralised capture reduces planning friction. That hypothesis is testable without AI, connectors or orchestration. Testing it cheaply first avoids building a 5–6 week automation stack on an unvalidated premise.

### Consequences

- The handoff document is retained as reference, not as an execution plan.
- n8n is deliberately the last dependency added, not the fifth: it is a new runtime, new secret material and a new failure surface.

---

## ADR-019: WIP limit suspended until 2026-09-20

**Date:** 2026-08-09
**Status:** Accepted
**Expires:** 2026-09-20 (automatic)

### Context

The standing limit is three active projects: AlphaRhythm, FlowLogix, LiveSurgery POC. Magic Kick sat deliberately outside that limit as a personal tool and AI-SDLC sandbox.

Concentrating effort on Magic Kick workflow optimisation requires temporarily exceeding the limit. The original framing — "until all workflows are optimised" — had no exit condition and would in practice have deleted the limit rather than suspended it.

### Decision

Suspend the three-project WIP limit until **2026-09-20**.

- Dormant during suspension: **AlphaRhythm**, **FlowLogix**.
- Explicitly **not** dormant: **LiveSurgery POC** — external dependencies continue regardless.
- The expiry is a calendar deadline, not a conditional one. It does not extend because work is unfinished.
- On expiry the limit reinstates automatically and Magic Kick returns to sandbox status unless superseded by a new ADR.

### Rationale

Lifting the WIP limit buys throughput, not sequencing — it does not license skipping ADRs or reordering dependent tracks. An unbounded suspension for the one project with no commercial path would invert the priority order the limit exists to protect.

### Consequences

- Two projects go dormant for approximately six weeks. Cost accepted and recorded here rather than left implicit.
- 2026-09-20 coincides with the end of the Track 4 usage-gate window, so expiry and gate assessment happen together.

---

## ADR-020: Magic Kick is the execution control plane; agents arrive through a generic contract

**Date:** 2026-09-23
**Status:** Accepted

### Context

AI-Business-OS adopted a provider-agnostic operating architecture on 2026-09-22 (OS
`DEC-2026-09-22-001`): the OS owns strategy and decisions, Magic Kick owns execution state, and AI
vendors are interchangeable capability providers — reasoning (OpenAI, Anthropic), execution (Grok
Bots for computer/browser work, Claude Code for engineering), deterministic (APIs, MCP, scripts).
Magic Kick had no recorded position on that role, and the drifted `/api/ai/*` routes (ADR-017) are
the only agent-shaped code in the repo — close enough to be mistaken for the agent boundary.

### Decision

1. Magic Kick's architectural role is the **execution control plane**: tasks, agent jobs, approvals,
   execution results, operational state. Recorded in `docs/ARCHITECTURE.md`.
2. When agent execution is built, it arrives through the provider-neutral `AgentJob` / `AgentResult`
   contract specified in `AI-Business-OS/10_AUTOMATION/agent-job-contract.md`. No provider-specific
   fields in the domain model; provider code lives in `adapters/<provider>/` only.
3. The existing `/api/ai/*` routes remain what ADR-017 made them — an application feature behind a
   feature flag, frozen. They are not the agent boundary and are not extended to become one.
4. Strategy stays in the OS. Magic Kick reads goals, priorities and allocation; it never re-decides them.

### Not decided here

Timing. Building the approval / execution-result model stays behind ADR-018's Inbox usage gate and
the OS roadmap stages AOS-4 / AOS-6 / AOS-7. This ADR fixes the shape, not the schedule.

### Rationale

The cheapest moment to prevent vendor lock-in is before any adapter exists. Naming the contract now
costs one document; retrofitting it after a Grok-specific integration costs a rewrite of the core.

### Consequences

- A Grok (or any other) integration is refused unless it is an adapter behind the generic contract.
- `docs/ARCHITECTURE.md` gains a System Role section; `AI_OS_BRIDGE.md` narrows what is written back
  to the OS (build state stays in this repo).
- The 9-module ceiling in `CLAUDE.md` / `AGENTS.md` is unchanged: control-plane work happens inside
  existing modules.

**Revisit trigger:** the first real `AgentJob` execution, or a proposal to give any provider write
access to Magic Kick data.

---

## ADR-021: ADR-019 expiry recorded; Magic Kick raised to a scoped active build

**Date:** 2026-09-23
**Status:** Accepted
**Supersedes for this scope:** ADR-019 (expired 2026-09-20)

### Context

ADR-019 suspended the WIP limit until 2026-09-20 and returned Magic Kick to sandbox status on expiry.
The expiry passed with no outcome recorded, and the Track 4 Inbox usage gate (ADR-018), due for
assessment in the same window, was also left unrecorded. Meanwhile ADR-020 made Magic Kick the
control plane of the operating architecture, and four OS roadmap stages (AOS-2, AOS-4, AOS-6, AOS-7)
now run through this repo — none of which is possible at stabilize-only.

### Decision

1. **Record ADR-019's outcome:** it expired on schedule. The suspension is over and is not renewed.
2. **Record the Track 4 gate outcome: not assessed.** No Inbox was shipped in the window, so the gate
   never ran. It is *not* a pass. Triage, brief, connector and n8n work stay deferred under ADR-018
   until a dumb Inbox ships and is used for 14 consecutive days.
3. **Allocation:** per OS `DEC-2026-09-23-001`, Magic Kick moves from `limited` to an active build in
   the Infrastructure lane, **scoped to**: merging the Phase 1 close-out, the control-plane boundary
   docs (ADR-020), and UI work that adapts existing surfaces to the control-plane workflow
   (`docs/CONTROL_PLANE_UI_SPEC.md`). Reverts to `limited` when that scope is delivered or on
   2026-10-21, whichever comes first.

### Rationale

An expiry nobody records is how a limit quietly stops existing. Writing down "expired, and the gate
never ran" costs nothing now and prevents a later claim that the gate passed. The new allocation is
scoped and dated for the same reason.

### Consequences

- No new modules, connectors, agent runtime or n8n under this allocation — the 9-module ceiling holds.
- The next unscoped feature request is refused by default until the revert date passes or a new ADR lands.

**Revisit trigger:** 2026-10-21, or the control-plane scope being delivered, or a dumb Inbox shipping.

---

## ADR-023: Run P8 before P7 while P7 is blocked; P8 also checks commit messages

**Date:** proposed 2026-09-29, accepted 2026-10-02
**Status:** Accepted (Roman, 2026-10-02, both parts). Point 1 superseded by ADR-024 (2026-10-04);
point 2 stands. ADR-022 stays reserved for P2.

### Context

The working order (OS `DEC-2026-09-27-001`) is P1 → P7 → P8 → … and at most one item is `open`.
P1 stays `open` until its usage gate resolves on 2026-10-06, so the next item can start then, which
leaves 15 days before the allocation reverts to `limited` on 2026-10-21 (ADR-021).

P7 cannot start in this repo on 2026-10-06 unless three things outside it exist first:

1. The OS-side context feed. It is week-2 work in `DEC-2026-09-27-001`.
2. A GitHub fine-grained PAT, which is item 1 on the OS waiting list and still open.
3. An ADR that unfreezes a server route calling the GitHub API. `docs/CLAUDE.md` §6 freezes
   "any external connector" and P7's route is one.

P8 has no dependency and is size S.

Separately, the commit and PR standard in root `CLAUDE.md` is prose, and prose is skipped. On
2026-09-29, 13 of the last 15 non-merge commits on `main` had no `Verified:` / `Not verified:`
lines, and PRs #123 and #124 merged with the template left empty.

### Decision

1. **Order:** if on 2026-10-06 any of the three P7 dependencies is missing, P8 opens instead and P7
   follows as soon as they exist. If all three are in place, the order stays as it is.
2. **Scope of P8:** besides blocking a commit on failed gates, the same hook rejects a commit message
   without the `Verified:` and `Not verified:` lines. One hook, two checks.

### Tradeoffs

- For (1): the slot does not sit idle waiting on OS work and a token, and P8 makes every later
  commit safer, P7's included. Against: P7 is what makes the deployed app show OS state, the thing
  the allocation exists for; each day it slips shortens the time to use it before 2026-10-21.
- For (2): it enforces the standard that failed on #123 and #124. Against: it widens an item that
  was written as "one hook, one rule", and a format check can be satisfied with empty words.

### Consequences

- `docs/CONTROL_PLANE_UI_SPEC.md`: the working order line carries the P8/P7 condition; P8's scope and
  acceptance criteria include the commit-message check.
- On 2026-10-06, if P1 resolves as a pass, check P7's three dependencies; the result decides which
  item opens. The check and its outcome go in this log with the P1 verdict.
- The message check only proves the lines exist, not that they are true. Review still has to read them.

**Revisit trigger:** all three P7 dependencies existing (P7 then opens next), or 2026-10-21.

---

## ADR-024: Magic Kick is the UI of AI-Business-OS; limits lifted for that goal

**Date:** 2026-10-04
**Status:** Accepted (Roman, 2026-10-04)
**Supersedes:** ADR-023 point 1 (order); its point 2 (P8 also checks commit messages) stands. **Amends:** ADR-018 (connector freeze, for the OS repo only), ADR-021
(scope), P1 criterion 6, `docs/CLAUDE.md` §1, §3, §4, §5, §6, §7.
**Related:** OS `DEC-2026-10-03-001`, OS `DEC-2026-09-23-001`, OS `DEC-2026-09-24-001`.

### Context

OS `DEC-2026-10-03-001` (2026-10-03) made Magic Kick the main UI of AI-Business-OS, lifted the
freeze and put P7 first. It contradicted ADR-023, accepted the day before, because the OS session
did not read this log. The repo still described itself as "a personal planner and an AI-SDLC
sandbox" with "no roadmap and no backlog", where every change had to be an itch or an experiment.

On 2026-10-04 Roman asked to remove those limits so that Magic Kick becomes a usable UI of the OS:
the place where the OS's tasks and context are reached, updated and used. He chose the options
below from a set of alternatives.

### Decision

1. **Framing.** Magic Kick is the UI of AI-Business-OS and Roman's daily planner: a personal
   product with a ranked roadmap (`docs/CONTROL_PLANE_UI_SPEC.md`, working order). The sandbox,
   itch and experiment framing is retired. A session names the roadmap item or the bug it works on.
2. **Order.** ADR-023's order rule is superseded. P7 (read the OS) comes right after P1, then the new P11
   (write back to the OS), then P8. Working order: P1 → P7 → P11 → P8 → P6 → P10 → P2 → P3 → P9 → P4 → P5.
3. **WIP stays 1.** One roadmap item is `open` at a time (OS `DEC-2026-09-24-001`).
4. **The 9-module ceiling stays.** OS content goes inside existing modules: Command Center
   (today's plan, focus, allocation), Projects (OS project context), Resources (knowledge).
5. **Write model.** The AI-Business-OS repo stays the source of truth. Magic Kick reads and writes
   it only through server-side routes that call the GitHub API with a fine-grained PAT held in a
   Vercel env var. The token never reaches the browser.
   - **Tasks and day-to-day context:** an edit in Magic Kick is committed directly to the OS repo.
   - **Strategy files** (focus, allocation, decisions): an edit opens a pull request; nothing
     changes on the OS `main` until Roman merges it.
   - A write against a file that changed since it was read is refused, never overwritten.
   - The exact list of writable paths, and which ones go through a PR, is set in P11. Anything
     not on the list is refused; when in doubt, a path goes through a PR.
6. **Freeze lifted for the OS repo only.** Server routes that read and write the AI-Business-OS
   repo through the GitHub API, as in point 5, are permitted. Still frozen until their own ADR:
   other connectors (Gmail, Calendar writes, Drive, Notion, webhooks), n8n or any other runtime,
   new AI routes, multi-user features.
7. **P1's usage gate is measurement only** (as in OS `DEC-2026-10-03-001`). The verdict is recorded
   on 2026-10-06 and taken to the weekly review. A fail no longer stops the build.
8. **Allocation revert.** Roman wants the 2026-10-21 revert to `limited` removed. That date is set
   by OS `DEC-2026-09-23-001`, so this repo cannot remove it; the request goes to an OS session.
   Until an OS decision lands, 2026-10-21 stands.
9. **Unchanged:** the build, lint and typecheck gates, feature branches and PRs, the commit and PR
   description standard, Firestore rules for every collection, no secrets in the browser.

### Rationale

The limits were written for a sandbox with no users and no direction. Magic Kick now has both: a
user (Roman, daily) and a direction set at OS level. Keeping the OS repo as the source of truth
means the OS still works if Magic Kick is down, which the OS's own architecture requires. Splitting
writes into direct commits and PRs gives a fast daily UI without letting a quick edit on a phone
rewrite strategy. Keeping the module ceiling and WIP 1 keeps the build focused.

### Consequences

- Governance docs updated in the same change: `CLAUDE.md`, `AGENTS.md`, `docs/CLAUDE.md`,
  `docs/SANDBOX_RULES.md`, `docs/CONTROL_PLANE_UI_SPEC.md`, `docs/DAILY_CHECKLIST.md`,
  `.github/ISSUE_TEMPLATE/feature.md`, `.claude/skills/session-start/SKILL.md`, `README.md`.
- P7's three dependencies shrink to two: the OS context feed and the PAT. This ADR is the third.
- The PAT needs `Contents` and `Pull requests` read/write on the AI-Business-OS repo only.
- OS side, for an OS session: record the revert request (point 8), and note in the source-of-truth
  map and `02_PROJECTS/magic-kick/context.md` that Magic Kick writes to the OS repo as in point 5.
- `docs/PUBLIC_PRESENTATION.md` and `docs/WORKFLOW_AUTOMATION_PLAYBOOK.md` still use the sandbox
  wording. They are positioning documents and are left for a separate pass.
- **Rollback:** revert the PR that adds this ADR.

**Revisit trigger:** P11 shipped (the write model in use), or an OS decision on the revert date.

---

## ADR-025: Project roadmap inside Projects (P12); amends ADR-016

**Date:** 2026-10-05
**Status:** Accepted (Roman, 2026-10-05). Merged before P1 was `done`, by Roman's explicit exception to
WIP = 1 on 2026-10-05; the original condition was to merge only after P1 closed.
**Amends:** ADR-016 (milestone as a label with no CRUD surface). **Relates to:** ADR-024 (queue, WIP = 1, 9-module ceiling).

### Context

Roman asked for a project roadmap inside the Projects module: create, edit and delete milestones and
tasks, and link Resources to them. Two things stood in the way.

- **ADR-016 vs the code.** ADR-016 chose Project → Tasks with an optional milestone *label* and no
  milestone CRUD. The label was never built. The code instead embeds `milestones[]` in the Project
  document as a checklist (title, done, completion date, a legacy 0–6 weekday index), with add,
  rename, toggle and delete already in the detail Sheet. Tasks join projects through
  `Task.linkedProjectId` only.
- **The queue.** The item is not in `CONTROL_PLANE_UI_SPEC.md`. P1 is `open` until its verdict on
  2026-10-06; P7 is next but blocked on the OS context feed and the PAT.

### Decision

1. **Data model: extend what exists, no new collection.**
   - `ProjectMilestone` gains optional `order`, `targetDate` (yyyy-MM-dd), `note` (definition of
     done) and `resourceIds`. It stays embedded in the Project document.
   - `Task` gains optional `milestoneId`, which points at a milestone of its `linkedProjectId`.
     `""` means unassigned. An empty string is used rather than `undefined` because writes go
     through `set(..., { merge: true })` with `undefined` stripped, so an unset field would never
     clear on the server.
   - `Project` gains optional `resourceIds`.
   - Firestore rules are unchanged; the generic sync rule already accepts these documents.
2. **Milestones get a CRUD surface** in the project detail Sheet: create and edit through a dialog,
   reorder (move up / down), complete and reopen, delete with confirmation. Deleting a milestone
   moves its tasks to "No milestone"; it never deletes tasks.
3. **Tasks get a CRUD surface inside the roadmap:** add inline under a milestone, rename, move between
   milestones, complete, delete with confirmation. They are ordinary `Task` documents and appear in
   ToDo as before.
4. **Resources are cross-linked by id**, from the project and from each milestone. A resource card
   shows where it is linked from. Ids of deleted resources are ignored when rendering, so deleting a
   resource needs no cascade.
5. **Queue.** The item becomes **P12**, ranked right after P1 because P7 is blocked. It is built on a
   feature branch now and merged only after P1 is set to `done`, so WIP = 1 holds at merge time.

### Rationale

- The embedded milestones already exist and sync; extending them is additive and reversible.
  A `milestones` collection would add rules, a registry entry, sync paths and a migration while the
  sync layer still has open correctness work.
- `Task.milestoneId` gives a real join (renaming a milestone does not touch its tasks), which
  ADR-016's free-text label could not.
- Last-write-wins is per document. Milestone edits rewrite the whole Project document, which is
  acceptable for a single user. Two devices editing different milestones of the same project
  offline can lose one edit; that risk exists today for every Project field.

### Consequences

- Persist version 11 → 12. `migrate` gives legacy milestones an `order` (their old weekday order)
  and keeps all other fields. New milestones are appended after renumbering, so legacy data never
  jumps above them.
- The detail Sheet widens from `max-w-md` to `max-w-xl`. The separate Milestones and Tasks sections
  and the duplicated Progress block are replaced by one Roadmap section.
- The list row's progress still counts completed milestones, as before.
- ADR-016's "remove the field after 30 days if unused" applies to `Task.milestoneId`: if no task
  carries one 30 days after P12 merges, remove the grouping and keep the checklist.
- **Not in scope:** milestone-level resources on tasks, drag-and-drop ordering, dependencies,
  a Gantt view, syncing roadmaps to the AI-Business-OS repo (P11 decides what MK writes there).
- **Rollback:** revert the P12 PR. Caveat: zustand runs `migrate` on any version mismatch, and the
  v11 `migrate` rebuilds each milestone from known fields, so on a device that ran v12 it drops
  `order`, `targetDate`, `note` and `resourceIds` from local state. The next edit to that project
  then writes the stripped milestones to Firestore. Before rolling back, export Firestore (or the
  `magic-kick-store` localStorage key) if roadmap data matters. Task `milestoneId` and project
  `resourceIds` survive, because v11 spreads tasks and projects.

### Alternatives rejected

- **Milestone collection (`users/{uid}/milestones`).** Cleaner model, but it adds sync and rules
  surface and a migration for the same user-visible result at this scale.
- **Literal ADR-016 label.** Renaming means relabelling every task, and there is nowhere for a
  target date, a definition of done or Resource links.
- **A Roadmap tab or module.** Breaks "one canonical active view" and the 9-module ceiling.

**Revisit trigger:** two devices losing milestone edits in practice, or more than ~20 milestones on a
project (time to move them into their own documents).

---

## ADR-026: Build P13 while P1 is open

**Date:** 2026-10-05
**Status:** Accepted (Roman, 2026-10-05).
**Relates to:** ADR-024 (WIP = 1), ADR-025 (the same exception for P12).

### Context

P13 (ToDo toolbar and Done view) was added to `CONTROL_PLANE_UI_SPEC.md` on 2026-10-05, ranked
straight after P1. P1 is `open` until its usage verdict is recorded on 2026-10-06. Roman asked to
start P13 now.

### Decision

1. P13 is built now on `feat/p13-todo-done-view`. P1 stays the only `open` item; P13 stays `queued`.
2. The P13 PR merges only after P1 is set to `done`, so WIP = 1 holds at merge time.

### Rationale

- P13 is small (S), touches only `components/modules/todo-module.tsx`, and has no data model, store
  or rules change, so it cannot interfere with P1's usage measurement.

### Consequences

- If P1's verdict leads to rework, that rework goes before the P13 merge.
- **Rollback:** revert the P13 PR. Nothing is migrated or stored.

**Revisit trigger:** a third exception to WIP = 1. At that point the rule, not the exceptions, needs
a decision.

---

## ADR-027: Close P1 without the usage count; move P2 up

**Date:** 2026-10-05
**Status:** Accepted (Roman, 2026-10-05).
**Relates to:** ADR-024 §7 (P1 usage gate is measurement only), ADR-026 (P13 merge condition).

### Context

P1's code was merged and checked in a browser (2026-10-02 → 10-03). Its last open criterion was the
usage-gate verdict for 2026-09-29 → 2026-10-05, due on 2026-10-06 and counted from task completion
dates in the browser's store. On 2026-10-05 Roman asked to mark P1 complete and start P2.

### Decision

1. **P1 is `done`.** The usage count was not taken, so criterion 6 is recorded as **not measured**,
   not as pass or fail. Under ADR-024 §7 the gate never stopped the build.
2. **P13 is `done`.** #134 merged on 2026-10-05, the day P1 closed, which meets ADR-026's condition.
3. **P2 is `open`** and moves ahead of P7, P11, P8, P6 and P10. New working order:
   P1 → P12 → P13 → P2 → P7 → P11 → P8 → P6 → P10 → P3 → P9 → P4 → P5.

### Rationale

- P7 and P11 are blocked on the OS context feed and the PAT, so they could not start anyway.
- P2 is small (S) and settles which planning selectors stay, before later items build on them.

### Consequences

- There is no usage evidence for P1. The weekly review gets "not measured" instead of a verdict.
  The count can still be taken later from task `completedAt` dates if needed
  (snippet in `docs/NEXT_SESSION_START.md`).
- The small-phone question on P1 criterion 1 (360×800) stays open as a follow-up, not a P1 blocker.
- The UI findings from the P1 check (overdue tasks in two places, "3 of 3 today" with none due,
  the Friday banner on Saturday) are not fixed by closing P1.

---

## ADR-022: The weekly plan is the only source of a weekly outcome (P2)

**Date:** 2026-10-05 (the number was reserved for P2 on 2026-09-23)
**Status:** Accepted (Roman, 2026-10-05).
**Relates to:** F2 in `CONTROL_PLANE_UI_SPEC.md`, ADR-024 (no duplicate state).

### Context

P2 asked to wire or delete each unused selector in `lib/execution-os.ts`. P1 had already wired them
into the attention block, so every unused export left was an internal helper. The duplication F2
named was in the data instead. A weekly outcome was stored in two places that never synced:

- `WeeklyPlan.allocations[].weeklyOutcome`, written in the Command Center Plan tab.
- `Project.weeklyOutcome`, with no editor. The store migration copies `objective` into it. It fed the
  attention block, the load status and the Projects panel.

Results: "No weekly outcome" could not be cleared for a project created after the migration (its
"Set" button opened Projects, which has no such field), never fired for older projects, and
"Weekly outcome overdue" really checked the project's end date (`weekEndISO`).

### Decision

1. **This week's `WeeklyPlan` is the only source.** `selectThisWeekOutcomes(weeklyPlans)` derives a
   project → outcome map from it. Attention, Daily Focus scoring (+20 for a project in this week's
   plan) and the Projects panel's "This week" lines all use it. No app code reads
   `Project.weeklyOutcome`. The store still carries the field through add, update and migration; the
   data is left alone.
2. **Attention rows, renamed for what they check:**
   - "Past end date — X": an active project whose `weekEndISO` has passed (was "Weekly outcome
     overdue"). Opens Projects.
   - "No plan for this week": there are active projects and no plan for the current week. One row.
   - "No weekly outcome — X": a plan exists, but this active project has no outcome in it.
   - The last two open the Command Center Plan tab, so its tabs are now controlled.
3. **Load:** `missedWeeklyOutcomes` becomes `projectsPastEnd`, the same count under its real name and
   with the same weight. The parked AI insight in `lib/ai/insights.ts` follows the rename.
4. **Deleted:** `selectWeeklyOutcomes`, `hasDefinedWeeklyOutcome`,
   `selectActiveProjectsMissingWeeklyOutcome` and the `WeeklyOutcomeView` type.
   **No longer exported (internal only):** `DEFAULT_EXECUTION_BLOCKS`, `selectActiveProjects`,
   `selectOverdueTasks`, `ATTENTION_LIMIT`, `LoadStatus` and `AttentionKind`.

### Rationale

- The weekly plan is where outcomes are actually written, it is scoped to a week, and it already
  carries hours and priority. The project field had no editor and a misleading default.
- Renaming instead of re-deriving "overdue outcome" keeps the load pressure numbers unchanged, so
  the change does not shift anyone's status by itself.

### Consequences

- Projects that were silently "covered" by their objective now show "No weekly outcome" or "No plan
  for this week" until a plan exists. That is the intended signal, but the attention list may get
  longer on first load.
- `SystemConfig.weeklyOutcomeLimit` is no longer read; the plan's own limit
  (`MAX_WEEKLY_PLAN_PROJECTS`) applies. It is left in the config to avoid a migration.
- **Rollback:** revert the P2 PR. No data was written or migrated.

**Revisit trigger:** a need to set outcomes without a weekly plan (for example from the OS feed, P7).

---

## ADR-028: P3 decisions live in the attention block; P3 moves up

**Date:** 2026-10-05
**Status:** Accepted (Roman, 2026-10-05).
**Relates to:** P1 (attention block), ADR-022 (P2), ADR-018 ("AI proposes, never silently commits").

### Context

P3 was specified on 2026-09-23 as a separate "Waiting on you" section with three row types: an
unreviewed finished week, an overdue outcome needing continue / adjust / remove, and a project over
`maxActiveProjects`. Since then P1 and P2 made the second and third attention rows ("Past end date",
"Over capacity"). A second list would show the same project twice on one screen. Separately, the
Review tab only reviewed the current week, so a finished week could never be reviewed once it ended.

### Decision

1. **Queue.** P2 is `done`. P3 is `open` and moves ahead of P7, P11, P8, P6 and P10.
2. **No second list.** Attention rows become decisions where a decision exists:
   - "Past end date — X": **Complete**, **Park** or **Extend** (end date set to 7 days from today).
   - "Last week not reviewed" (new): last week's plan has allocations and is not `reviewed`.
     **Review** opens the Review tab on that week.
   - Other rows keep one action that opens the owning module or tab.
3. **Item shape:** `{ id, kind, severity, subject, detail, since?, actions[] }`. Each action carries its
   effect as data (`open-module`, `open-tab`, `update-project`), and the block runs effects without
   knowing the kind. An agent proposal can be added as a new kind that reuses these effects; a
   genuinely new effect (for example "apply proposal") is one more branch in `runEffect`.
4. **"Since"** is shown when known: the project's end date, the task's due date, or the start of the
   current week for plan and review rows. The load row has none.
5. **Review tab:** it reviews last week's plan while that plan is unreviewed, then this week's. The
   review form moved into `WeeklyReviewCard`, keyed by the plan id so its draft resets when the target
   week changes. Saving a review already sets the plan to `reviewed`, which clears the row.

### Rationale

- One list answers "what needs me now"; decisions in place remove the round trip to another module.
- Effects as data keep the block generic, which is what P3's criterion 3 asked of the component.
- Only last week is offered for review. Older unreviewed weeks are stale, and an endless backlog of
  reviews would be guilt mechanics (`lifeos-architecture.md` §0 rule 5).

### Consequences

- Complete, Park and Extend write immediately with no confirmation, the same as the status menu in
  Projects. Undo is the reverse action in Projects.
- Overdue tasks and the over-capacity row are unchanged ("Open", "Review"). Per-project parking from
  the over-capacity row is out of scope.
- **Rollback:** revert the P3 PR. No data model change, migration or rules change.

**Revisit trigger:** the first agent proposal kind, or a need to review weeks older than last week.

---

## ADR-029: Categories stay in Magic Kick, with an optional OS domain (P14, P15)

**Date:** 2026-10-09
**Status:** Accepted (Roman, 2026-10-09).
**Relates to:** ADR-024 (the OS is the source of truth), ADR-004 (category base XP), OS
`DEC-2026-08-21-001` (four life domains).

### Context

Task labels are free-text categories kept on the profile. They are assigned differently by each
module, so the same work shows different labels and colors in ToDo, Schedule and Projects, and
custom categories earn less XP. The OS defines four life domains (Work, Learning, Admin, Life;
`10_AUTOMATION/lifeos-architecture.md` §3), but Roman needs categories the OS does not have yet.

### Decision

1. **Categories stay flexible and are defined in Magic Kick.** Each may map to one OS domain or stay
   unmapped. Unmapped means "Magic Kick only for now".
2. **Projects carry an optional category;** tasks made from a project inherit it.
3. **One module owns category rules** (`lib/categories.ts`) and one component renders them.
4. **Base XP is the same for every category** (supersedes ADR-004's per-name values).
5. **The OS link is read-only and one-way.** P15 reads the domain list from the OS once P7 exists.
   Magic Kick never adds an OS domain; new domains are an OS decision (OS `AGENTS.md` rule 9).

### Rationale

- Forcing the four OS domains would lose distinctions Roman uses today; a mapping keeps both.
- Inheriting from the project removes the main source of wrong labels without asking for input.
- Name-keyed XP penalises every custom category, which contradicts flexible categories.

### Consequences

- New optional fields: `Project.category`, `Profile.taskCategoryDomains`. No migration, no rules
  change.
- **Rollback:** revert the P14 PR. The optional fields are ignored by older code.

**Revisit trigger:** the OS adds a domain, or more than a few categories stay unmapped for a month.
