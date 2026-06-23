> ARCHIVED 2026-06-23: Magic Kick is not a product. Kept for history only. See README.md.

# Sprint Backlog

**Sprint window:** 2026-03-31 to 2026-04-13
**Status:** Planned
**Theme:** Weekly Execution OS - foundation and control layer

---

## Priority Order

1. Weekly allocation architecture
2. Weekly planning UI
3. Execution tracking foundation
4. Review loop scaffolding

---

## Planned Issues

### Issue #36 - Weekly Execution OS: add weekly execution domain models and store slice

**Outcome:** The app has first-class weekly execution entities in local state.

### Acceptance Criteria
- [ ] `WeeklyPlan`, `WeeklyAllocation`, `TimeBlock`, `ExecutionLog`, and `WeeklyReview` interfaces exist
- [ ] Zustand store supports CRUD operations for the new entities
- [ ] Store migration preserves existing user data safely
- [ ] New entities fit the current sync metadata pattern

---

### Issue #37 - Weekly Execution OS: extend Firestore sync schema for new execution entities

**Outcome:** Weekly execution data persists through the current offline-first sync layer.

### Acceptance Criteria
- [ ] Sync collection typing includes weekly plans, time blocks, execution logs, and weekly reviews
- [ ] Firestore adapters can pull and push the new collections
- [ ] Existing user-scoped storage shape remains intact for this phase
- [ ] New documents preserve created/updated timestamp behavior

---

### Issue #35 - Weekly Execution OS: build weekly planning constraints and selectors

**Outcome:** Allocation rules are enforced in code before UI polish.

### Acceptance Criteria
- [ ] Capacity cannot be exceeded
- [ ] No more than 3 projects can be active in a weekly plan
- [ ] Each allocated project requires hours, priority, and weekly outcome
- [ ] Derived totals exist for allocated, remaining, planned, and actual hours

---

### Issue #33 - Weekly Execution OS: build Weekly Plan screen with hard capacity guardrails

**Outcome:** Users can create a valid weekly plan without overcommitting.

### Acceptance Criteria
- [ ] Weekly Plan screen exists in the app shell
- [ ] UI shows total capacity, allocated hours, and remaining hours
- [ ] UI blocks invalid plans instead of merely warning
- [ ] Weekly outcome is assigned inside the weekly allocation workflow

---

### Issue #38 - Weekly Execution OS: refactor Command Center and Schedule around weekly allocation

**Outcome:** Daily execution surfaces reflect the active weekly plan.

### Acceptance Criteria
- [ ] Command Center reads from active weekly plan
- [ ] Schedule only creates blocks against allocated projects
- [ ] Per-project `allocated / planned / actual` status is visible
- [ ] Quick execution actions remain low-friction

---

### Issue #34 - Weekly Execution OS: build weekly review loop

**Outcome:** Every week ends with explicit project decisions.

### Acceptance Criteria
- [ ] Weekly review UI exists
- [ ] Each allocated project records outcome achieved yes/no
- [ ] Planned vs actual is visible during review
- [ ] Review requires continue, adjust, or remove decision
