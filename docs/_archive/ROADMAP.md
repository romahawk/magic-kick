> ARCHIVED 2026-06-23: Magic Kick is not a product. Kept for history only. See README.md.

# Roadmap - Magic Kick

**Last updated:** 2026-03-31
**Product direction:** Weekly Execution OS
**Model:** Constraint-driven weekly shipping increments

---

## Product Focus

Magic Kick is no longer just a project tracker.

The next product phase is:

> A Weekly Execution OS that allocates time across projects and enforces delivery.

Core operating rule:
- time is the primary constraint
- weekly allocation decides what gets worked on
- no more than 3 active projects per week
- total allocated time must stay within weekly capacity

---

## Freeze List

Do not prioritize these until the Weekly Execution OS loop is shipped end-to-end:

- Resource-library expansion
- Social or sharing features
- AI task suggestions
- Native mobile app
- New gamification layers beyond current XP and achievements
- Task recurrence
- General calendar polish not tied to weekly allocation or execution

---

## Current Build Gap

Current strengths:
- project creation exists
- weekly outcomes exist at the project layer
- schedule and execution-block UI already exist
- command center already frames daily execution

Current missing system layer:
- no weekly capacity model
- no hard allocation across projects
- no direct link from allocation -> blocks -> actual hours -> review decisions
- no forced trade-off when weekly demand exceeds capacity

---

## Phase 1: Weekly Allocation Architecture

**Outcome:** The app has a new source of truth for weekly execution commitment.

### Scope
- Add `WeeklyPlan`, `WeeklyAllocation`, `TimeBlock`, `ExecutionLog`, and `WeeklyReview` models
- Extend Zustand store and sync collections
- Add selector and validation layer for capacity, allocation totals, active-project limit, and review summaries
- Keep Firestore on the current `users/{uid}` model for this phase

### GitHub Issues
1. `#36` Weekly Execution OS: add weekly execution domain models and store slice
2. `#37` Weekly Execution OS: extend Firestore sync schema for new execution entities
3. `#35` Weekly Execution OS: build weekly planning constraints and selectors

### Definition of Done
- [ ] One weekly plan can be created for a given week
- [ ] Capacity and allocation totals are validated in code
- [ ] More than 3 active projects is blocked
- [ ] New entities sync with the existing offline-first store

---

## Phase 2: Weekly Allocation UI

**Outcome:** The user can explicitly choose what gets time this week and how much.

### Scope
- Add a dedicated Weekly Plan screen
- Show capacity, allocated hours, remaining hours, and overload state
- Allow selecting up to 3 active projects
- Require each allocated project to have hours and one weekly outcome
- Connect project workflow to weekly allocation instead of treating project status as the execution decision

### GitHub Issues
1. `#33` Weekly Execution OS: build Weekly Plan screen with hard capacity guardrails
2. `#38` Weekly Execution OS: refactor Command Center and Schedule around weekly allocation

### Definition of Done
- [ ] The user can create and edit a weekly plan in under 3 minutes
- [ ] Over-capacity allocation is blocked in UI and logic
- [ ] Every allocated project shows priority, hours, and weekly outcome
- [ ] Command Center reflects the current weekly plan instead of generic project state

---

## Phase 3: Execution Layer

**Outcome:** Allocated hours turn into daily blocks and measurable execution.

### Scope
- Add lightweight time-block UI linked to the weekly plan
- Track planned vs actual hours by block and aggregate by project/day
- Keep the interaction fast: quick-create, drag-adjust, low-friction completion
- Show per-project `allocated / planned / actual` progress

### GitHub Issues
1. `#38` Weekly Execution OS: refactor Command Center and Schedule around weekly allocation

### Definition of Done
- [ ] Blocks can only be created against allocated projects
- [ ] Planned hours cannot silently exceed project allocation
- [ ] Actual hours are captured from execution flow, not invented in review
- [ ] Daily execution can be run without opening a heavy planning surface

---

## Phase 4: Weekly Review System

**Outcome:** Every week ends with a decision, not drift.

### Scope
- Add weekly review UI for each allocated project
- Show outcome achieved yes/no, planned vs actual hours, and decision
- Require one of: continue, adjust allocation, remove
- Feed review output into next week's planning flow

### GitHub Issues
1. `#34` Weekly Execution OS: build weekly review loop

### Definition of Done
- [ ] Each allocated project gets a review decision
- [ ] Planned vs actual is visible per project
- [ ] Outcome completion is explicit and reviewable
- [ ] Next week planning can reuse reviewed project context without copying noise

---

## Release Path

| Version | Description |
|---|---|
| v0.2.0 | Weekly allocation architecture and data model shipped |
| v0.3.0 | Weekly planning UI and Command Center integration shipped |
| v0.4.0 | Execution tracking and lightweight time blocking shipped |
| v0.5.0 | Weekly review loop shipped end-to-end |

---

## What Success Looks Like

The product is successful in this phase when a user can:

1. Set weekly capacity once
2. Allocate that capacity across no more than 3 projects
3. Turn allocation into daily time blocks
4. Compare planned vs actual hours
5. End the week with explicit continue / adjust / remove decisions

If a feature does not strengthen that loop, it is not on the critical path.
