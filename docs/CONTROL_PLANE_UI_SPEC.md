# Control-Plane UI — Audit and Work Queue

**Date:** 2026-09-23
**Status:** spec, not implemented
**Authority:** ADR-020 (control-plane role), ADR-021 (scoped active build), OS `DEC-2026-09-23-001`
**Governing constraints:** `CLAUDE.md` — no new top-level modules, the 9 existing modules are the
ceiling; one experiment at a time; `npm run build` + `npm run lint` + `npm run typecheck` before any commit.

This is the queue a Claude Code session works from. Items are ranked. Do not reorder without a note here.

---

## The question the UI must answer

A control plane answers two questions on open:

> **What requires attention now?** · **What should a human or agent do next?**

Everything else — planning, reviewing, browsing — is secondary. The audit below is measured against
that standard, not against general UI quality.

## Audit findings (verified against the code, 2026-09-23)

| # | Finding | Evidence |
|---|---|---|
| F1 | Command Center is **planning-first, not attention-first**. Its three tabs are Week / Plan / Review; the first thing on screen is weekly capacity and allocation, not what is wrong or what is next. | `components/modules/command-center.tsx` |
| F2 | **Two parallel planning layers.** `lib/weekly-plan.ts` drives the UI; `lib/execution-os.ts` holds `selectDailyFocus`, `selectWeeklyOutcomes`, `TASK_LANE_LABELS` — **not referenced by any component**. Only `calculateCognitiveLoad` is used, and only by `lib/ai/insights.ts`. `docs/ARCHITECTURE.md` migration step 5 ("move Command Center onto the selector layer") never happened. | grep across `components/`, `app/`, `hooks/` |
| F3 | **"What next" is one click away and never derived.** The Daily Focus lane exists only inside the ToDo module's board; Command Center never shows it. | `components/modules/todo-module.tsx` |
| F4 | **No "waiting on you" surface.** Nothing aggregates overdue weekly outcomes, stalled active projects, or an unreviewed finished week. Approvals have no home — and approvals are the control plane's core loop (ADR-018: "AI proposes, never silently commits"). | no such component |
| F5 | **No provenance on items.** ADR-018 adopted "every item has a source" and `source + sourceId` idempotency. `Task` / `Project` in `lib/types.ts` carry no source fields, so an agent result could not be distinguished from something typed by hand. | `lib/types.ts` |
| F6 | **Navigation is a filing cabinet, not an attention model.** Eight equal-weight nouns (Command Center, Schedule, Goals, ToDo, Projects, Resources, Journal, Achievements). Reference surfaces sit at the same level as execution surfaces. | `components/sidebar.tsx` |
| F7 | **Gamification is the most prominent persistent UI.** Level, XP bar and streak occupy the sidebar profile card above navigation. This contradicts the OS anti-abandonment rule "no streaks, no scores, no guilt mechanics" (`lifeos-architecture.md` §0). Product decision, not a bug. | `components/sidebar.tsx` |
| F8 | **OS context is invisible.** The tool that allocates attention cannot show current focus, lane allocation or why a project is primary. Reading it needs the GitHub API path (MK-DEC-006) — real work, correctly deferred, but the gap should be named. | — |

---

## Work queue

Each item is independently shippable. Effort: S ≈ one session, M ≈ two, L ≈ more.

### P1 — Attention block at the top of Command Center · M

**Why:** F1, F3. The control plane's first answer must be on screen without a click.

A single block above the existing tabs, composed from data that already exists:

- Daily Focus (up to `dailyFocusLimit`) via `selectDailyFocus` — explicit lane first, derived fill after.
- Attention items: overdue weekly outcomes, active projects with no weekly outcome
  (`selectActiveProjectsMissingWeeklyOutcome`), tasks overdue today, load status when not `Stable`.
- Each row: one line, one primary action, links to its owning module.

**Acceptance criteria**

1. Opening Magic Kick shows focus + attention above the fold on desktop and mobile, with no tab interaction.
2. The block reads from `lib/execution-os.ts` selectors — no new selector logic in the component.
3. Empty state is a single calm line ("Nothing needs attention"), not an empty card grid.
4. Zero new top-level modules; zero new store collections.
5. `npm run build`, `lint`, `typecheck` pass.

**Out of scope:** AI, agents, new data model, redesigning the Week/Plan/Review tabs.

---

### P2 — Resolve the duplicate planning layer · S

**Why:** F2. Two sources of the same derivation is the "no duplicate state" anti-goal inside one repo.

Decide per selector: wire it into P1, or delete it. `calculateCognitiveLoad` stays (used by insights).
Record the outcome as a one-paragraph ADR (ADR-022) — including anything deleted.

**Acceptance criteria**

1. No exported selector in `lib/execution-os.ts` is unreferenced by app code after this item.
2. `docs/ARCHITECTURE.md` migration list reflects reality (step 5 marked done or dropped).
3. ADR-022 records what was wired, what was deleted, and why.

---

### P3 — "Waiting on you" queue · M

**Why:** F4. The approval loop is the control plane's core, and it can be proven with today's data —
before any agent exists.

A named section (inside Command Center, not a new module) listing items that need a human decision:
unreviewed finished week, overdue outcome needing continue/adjust/remove, project over
`maxActiveProjects`. Each row: what is waiting, since when, and the decision control.

**Acceptance criteria**

1. Every row is an actual decision, not an FYI; resolving it removes the row.
2. "Since when" is shown for each row.
3. The component takes a list of `{id, kind, subject, since, actions}` — so an agent proposal can be
   added later as one more `kind` without touching the component.
4. No new modules; no schema change beyond what already exists.

**Out of scope:** agent jobs, notifications, anything requiring a server.

---

### P4 — Provenance fields on Task and Project · S

**Why:** F5. Prerequisite for any agent result ever landing in Magic Kick, and cheap now.

Optional `source` (`"manual" | "agent" | "import"`) and `sourceId` on `Task` and `Project`, defaulting
to `"manual"` in the store migration. Surface as a small label only where non-manual.

**Acceptance criteria**

1. Existing data migrates with no loss; untagged items read as `manual`.
2. `source + sourceId` is unique-checked on write (idempotency, ADR-018).
3. No UI change for manual items.

**Gate:** do not extend this into an `AgentJob` table — that is AOS-4/AOS-6, still behind ADR-018's Inbox gate.

---

### P5 — Navigation weight · S

**Why:** F6. Reference surfaces should not compete with execution surfaces.

Group the existing eight items: **Execution** (Command Center, Schedule, ToDo, Projects) and
**Reference** (Goals, Resources, Journal, Achievements), reference visually secondary. No renames,
no new modules, no routing change. Mobile bottom nav keeps its five, ordered by the same logic.

**Acceptance criteria**

1. Same eight destinations, same `ModuleId` values, same deep links.
2. Group headings are visible when the sidebar is expanded, and collapse cleanly at `w-20`.
3. Keyboard navigation and `aria-label`s unchanged or improved.

---

### P6 — Gamification placement · decision first, then S

**Why:** F7. Roman's OS explicitly rejects streak/score mechanics; Magic Kick puts them above navigation.

**Decision needed before code** (Roman, L4): keep as is · demote to the avatar dropdown and the
Achievements module · remove entirely. Recommendation: demote — the data stays, the daily prompt goes.

**Acceptance criteria (if demoted):** sidebar profile card shows name only; XP/level/streak remain
reachable in Achievements and the avatar menu; no store or XP-engine changes.

---

### P7 — OS context strip · L, gated

**Why:** F8. Showing current focus and allocation inside the control plane closes the loop between
"what to prioritize" and "what needs attention".

Read-only strip sourced from `AI-Business-OS/01_CONTEXT/current-focus.md` through the GitHub API
(MK-DEC-006), cached, never written back.

**Gate:** not started until P1–P3 ship and the OS confirms the read path (needs a token —
`current-focus.md` "Waiting / Dependencies" #1). Until then, this gap is named, not filled.

---

## Explicitly not in this queue

New modules · agent runtime · connectors (Gmail, Calendar beyond what exists) · n8n · triage or
Today-brief automation (ADR-018 gate) · Grok-specific anything (ADR-020) · visual redesign of
modules that are not in the way of the two questions above.
