# Changelog

All notable changes to Magic Kick are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

---

## [Unreleased] - 2026-09-24 - Command Center attention block (P1)

### Added
- A "Now" block at the top of the Command Center, above the Week / Month / Quarter tabs: today's Focus tasks (up to the daily focus limit, completable in place) and a "Needs attention" list of overdue weekly outcomes, overdue tasks, active projects with no weekly outcome, and over-capacity load. Each row has one action that opens the module that resolves it; at most 6 rows are shown.

---

## [Unreleased] - 2026-08-10 - Firestore sync rules alignment

### Fixed
- Firestore rules now allow the existing weekly planning and execution sync collections: `weeklyPlans`, `timeBlocks`, `executionLogs`, and `weeklyReviews`.

---

## [Unreleased] - 2026-08-10 - Google Calendar metadata unfreeze

### Added
- Profile-level Google Calendar metadata fields and store actions for read-only connection state, selected calendars, sync token placeholders, status, errors, and display preference.
- Manual Calendar metadata dialog in the avatar menu for editing the read-only metadata fields without connecting to Google APIs.
- ADR-009 and a pure Google Calendar event mapper that converts documented event JSON into `ExternalCalendarBlock` objects without calling Google APIs.
- ADR-010, synced `externalCalendarBlocks`, and read-only Schedule rendering for already-present external calendar blocks.
- ADR-011 and external busy block projection for the existing AI schedule-suggest flow and client conflict detection.
- ADR-012 and read-only Google Calendar discovery from the metadata dialog using transient OAuth access only.
- ADR-013 and bounded manual read-only import of upcoming Google events into `externalCalendarBlocks`.
- ADR-015 and browser-only Calendar auto-sync while a transient access token remains live in memory.

### Changed
- ADR-008 unfreezes read-only Google Calendar metadata only, while keeping event ingestion, webhooks, connector runtimes, and calendar writes frozen.
- Schedule now starts at 05:00 instead of 06:00.
- Google Calendar API failures now surface the provider error message, and auth popups use a popup-friendly opener policy.
- Calendar discovery/import now request the unified Google Calendar read-only scope with explicit consent and show full multi-line errors.
- Calendar discovery/import now use Firebase Google provider tokens by default, with optional Google Identity Services fallback, keeping Calendar tokens transient and unstored.
- Manual import and auto-sync now share one reconciler that updates changed events and tombstones removed events in the selected 14-day window.

### Fixed
- Firestore sync writes now strip nested `undefined` values before batching, preventing Calendar metadata/import state from breaking sync.

---

## [Unreleased] - 2026-06-29 — Edit Project modal identity strip (session 1)

### Changed
- Edit Project modal stripped to identity-only fields: Title, Objective, Duration, Color, Status
- Weekly Outcome field removed from modal (field retained on type for session-2 migration)
- Links section removed from modal; moved to detail Sheet as inline-editable block
- Date pickers: native `<input type="date">` → shadcn `Calendar + Popover`, format `DD MMM YYYY`, end-date-after-start validation
- Color picker: hex input + native color input → row of 8 preset swatches with ring-on-active selection
- Status: `Select` dropdown → `ToggleGroup` segmented control (Active / Paused / Parked / Completed)
- Modal footer: sticky `Delete project` (muted red text) · `Cancel` · `Save`; Save disabled when pristine or invalid; Escape closes; Cmd/Ctrl+Enter saves

### Added
- ADR-007 in `docs/DECISIONS_LOG.md`: project data model decision (milestones-only, sprint as separate object)
- Links block on detail Sheet: `+ Add`, inline edit, inline delete confirm, URL tooltip on hover

---

## [Unreleased] - 2026-06-26 — Schedule block editor improvements

### Added
- Notes field on time blocks — freeform textarea persisted to `TimeBlock.notes`
- Category selector in the block edit panel when a task is linked — reads from `profile.taskCategories` with a built-in fallback list
- Metadata row in block edit panel showing linked task's category, lane, and due date at a glance
- × button on the due date chip — clears due date and time slot, moving the task back to the Unscheduled tasks list

---

## [Unreleased] - 2026-06-24 — Projects tab density redesign

### Changed
- Projects tab: 2-line header (title+CTA / filter+toggle), list rows ~44px with color dot · name · task count · days-left · progress · ⚠ risk, hover ⋯ dropdown (Edit/Pause/Park/Complete/Delete)
- Projects detail panel: header (● title · status/days · ⋯ · ✕), scrollable body (goal, progress bar, this-week bullets, milestones CRUD with +Add toggle, links), sticky footer (Mark complete/Reopen · Edit · Pause/Unpause)
- Projects timeline: replaced 52-week Gantt with month-axis bar chart (bars, milestone dots, today line, legend)
- Top bar: removed clock, week range, XP badge, streak badge; avatar dropdown now contains email, XP/streak, theme toggle, logout
## [Unreleased] - 2026-06-25 — Category color picker in Quick Add

### Added
- Color swatch in Quick Add category manager — click to open native `<input type="color">` picker; color persists per category in `profile.taskCategoryColors`

---

## [Unreleased] - 2026-06-23 — Reframe as personal tool + AI-SDLC sandbox

### Changed
- Reframed project as personal tool + AI-SDLC sandbox; governing rule pinned in `CLAUDE.md` and `README.md`
- Archived product-framing docs (`PRD.md`, `ROADMAP.md`, `SPRINT_BACKLOG.md`, `EXECUTION_OS_REFACTOR.md`, `NEXT_SESSION_START.md`) to `docs/_archive/`
- Removed `weekly-roadmap-sync.yml` GitHub Actions workflow
- Updated `policy-check.yml` to require `docs/SANDBOX_RULES.md` instead of archived planning files
- Updated issue template to itch/experiment model; removed "feature request" framing
- Updated `DAILY_CHECKLIST.md` to remove sprint backlog references
- Updated `WORKFLOW_AUTOMATION_PLAYBOOK.md` to reflect current two-workflow set
- Removed "Future Extension Compatibility" section from `ARCHITECTURE.md`

### Added
- `docs/SANDBOX_RULES.md`: governing rule + module ceiling (9 modules, no additions)
- ADR-006 in `docs/DECISIONS_LOG.md`: documents the reframe decision and its consequences

---

## [Unreleased]

### Added
- repository operating docs: `CLAUDE.md`, sprint backlog, daily checklist, next-session guide, and workflow automation playbook
- policy-check and weekly roadmap-sync GitHub Actions workflows
- Schedule → Todo auto-sync: creating a time block now automatically adds a linked task to the Todo backlog with matching title, due date, and estimated time
- Todo kanban board: three-column layout (Backlog · Daily Focus · Parking Lot) with summary cards in row 1 and task columns in row 2
- Bidirectional completion sync: marking a block "done" in Schedule completes the linked Todo task and vice versa
- Time slot badge on kanban task cards for schedule-linked tasks (e.g. "9:00 – 10:00")
- Overrun indicator: amber "+Xm over" badge on kanban cards and inside calendar blocks when actual hours exceed planned hours (only shown when status is "done")
- Journal retrospectives: weekly and monthly summary cards now roll up completed tasks, milestones, and goals by life category and project

### Changed
- completed tasks and goals now preserve `completedAt` metadata so review flows can use completion history instead of treating finished work as archive-only
- Command Center redesigned for single-viewport density: status strip replaces "Week Health" card, priority dots replace text badges, allocation rows use single progress bars, Plan tab shows capacity inline
- CI now runs lint before type-check and build on pull requests
- README reorganized around product status, setup, deployment status, and documentation links

### Fixed
- resource editor modal layout now handles long links without overlapping controls

---

## [0.1.1] - 2026-03-03

### Added
- milestone CRUD on projects with Quick Add day/time task scheduling
- project links and color-gradient cards
- editable resource cards with multi-link support
- orbit favicon variant
- task category color management

---

## [0.1.0] - 2026-01-01

### Added
- Firebase Auth (email/password + Google) with onboarding flow
- Cloud Firestore as remote database
- offline-first Zustand store with localStorage persistence
- custom sync engine: pull -> merge -> push with last-write-wins conflict resolution
- soft delete support with tombstone propagation
- XP engine: category base XP + estimate bonus + pomodoro bonus + project bonus
- achievement engine: rule-based badge/medal/diploma unlocks
- 8 modules: Command Center, Goals, Todo, Projects, Achievements, Schedule, Resources, Journal
- Firestore security rules with per-user isolation
- `.env.example` for Firebase config
- Firebase emulator support for local development
