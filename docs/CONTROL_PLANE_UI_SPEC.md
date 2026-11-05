# Control-Plane UI — Audit and Work Queue

**Date:** 2026-09-23
**Status:** spec, not implemented
**Authority:** ADR-020 (control-plane role), ADR-021 (scoped active build), ADR-024 (UI of AI-Business-OS),
OS `DEC-2026-09-23-001`, OS `DEC-2026-10-03-001`
**Governing constraints:** `CLAUDE.md` — no new top-level modules, the 9 existing modules are the
ceiling; one roadmap item open at a time; `npm run build` + `npm run lint` + `npm run typecheck` before any commit.

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

**Working order (ADR-024, ADR-025, ADR-027, ADR-028, ADR-029, ADR-035, ADR-036, ADR-037, OS `DEC-2026-10-03-001`):** P1 → P12 → P13 → P2 → P3 → P14 → P16 → P17 → P18 → P7 → P11 → P20 → P21 → P22 → P23 → P24 → P26 → P27 → P25 → P28 → P29 → P30 → P31 → BUG (Schedule header) → P32 → P33 → P19 → P15 → P8 → P6 → P10 → P9 → P4 → P5.
Numbers are identifiers, not rank; this line is the rank. One item is `open` at a time.
ADR-023's exception (P8 before P7 while P7 is blocked) is superseded by ADR-024.
P13 was added on 2026-10-05 by Roman, ranked straight after P1. On 2026-10-05 Roman moved P2 ahead of
P7, P11, P8, P6 and P10 (ADR-027), and P3 the same way after P2 (ADR-028). P14 and P15 were added on
2026-10-09 by Roman (ADR-029): P14 straight after P3, P15 after P11 because it reads through P7.
P16 was added on 2026-10-13 by Roman, ranked straight after P14 (nothing else was unblocked).
P17 was added on 2026-10-14 by Roman, ranked straight after P16 (nothing else was unblocked).
P18 was added on 2026-10-14 by Roman, ranked straight after P17 (nothing else was unblocked).
P19 was added on 2026-10-15 by Roman, ranked after P11: it starts only after P7 is `done`, and P11 goes first.
P20 was added on 2026-10-17 by Roman, ranked now, after P11 and before P19: P11's next slice waits on
his strategy-file ruling (`decision`), and P20 is presentation only.
P21 was added on 2026-10-18 by Roman, ranked after P20, and opened while P20 waits only on its
landing PR (#172) and his real-data check: an exception to WIP = 1 he approved for one UI-only PR.
P22 was added on 2026-10-18 by Roman, straight after P21 and stacked on it (same file).
P27 was added on 2026-10-19 by Roman and opened straight away, ranked before P25 (nothing was `open`).
P31 was added on 2026-11-04 by Roman, ranked ahead of P19 on purpose (ADR-037): P19 stays next after it.
The Schedule header BUG, P32 and P33 were queued on 2026-11-04 by Roman and he opened them the same day,
ahead of P19, in that order. All three are `done`; P19 was opened afterwards (2026-11-04), gated on its ADR.

**Status line — the machine-readable field.** Every item carries `**Status:** <value>` from this
vocabulary, and it is the only thing to edit when an item moves:

| Value | Meaning |
|---|---|
| `open` | Being worked now. **At most one item may be `open`** (DEC-2026-09-24-001, WIP = 1). |
| `queued` | Ranked, not started. |
| `done` | Shipped and merged. |
| `gated` | Cannot start until its stated gate clears. |
| `decision` | Blocked on a ruling from Roman, not on work. |

`10_AUTOMATION/scripts/generate-roadmap-view.js` in the OS repo reads these lines; the generated
view is wrong the moment one is stale.

### P1 — Attention block at the top of Command Center · M

**Status:** done

**Note:** closed by Roman on 2026-10-05, the last day of the usage window, without the usage count
being taken (ADR-027). Criterion 6 is recorded as not measured. The small-phone question on
criterion 1 (360×800 shows focus and about 2½ attention rows) is still open.

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
6. **Usage gate, measurement only (ADR-024 §7).** Window 2026-09-29 → 2026-10-05. **Pass = opened on
   5 of 7 days AND at least one task changed state on each of those days**, counted from task
   `completedAt` dates. The verdict is recorded in `docs/DECISIONS_LOG.md` on 2026-10-06 and taken to
   the weekly review. A fail no longer stops the build (it did until ADR-024). P1 is `done` once the
   verdict is recorded.
7. **Spec gap — settled 2026-09-29 by widening the code.** `selectAttentionItems` used to emit a
   load item only when active projects exceeded `maxActiveProjects`. It now emits one whenever load
   is not `Stable` and names the cause (PR #123, `d910882` on `main`; branch commit `e0349f0`).

**Reference mock (2026-09-24):** a design canvas with three artboards — desktop Command Center with
the block above the tabs, mobile, and the clear state: https://claude.ai/artifact/TTUFxXzG7RZa4TomcpU1dN
It settles layout, copy and row anatomy. It is a reference, not a spec change — where the mock and the
acceptance criteria above disagree, the criteria win.

**Out of scope:** AI, agents, new data model, redesigning the Week/Plan/Review tabs.

---

### P2 — Resolve the duplicate planning layer · M

**Status:** done

**Why:** F2. Two sources of the same derivation is the "no duplicate state" anti-goal inside one repo.

**Rescoped 2026-10-05 (Roman, ADR-022).** P1 already wired the selectors into the attention block;
what is left of F2 is that the weekly outcome itself is stored twice and never synced:

- `WeeklyPlan.allocations[].weeklyOutcome` is written by the Command Center Plan tab.
- `Project.weeklyOutcome` has no editor. A store migration copies `objective` into it. It feeds the
  attention block, the load status and the Projects panel's "This week" lines.

So "No weekly outcome" can never be cleared for a new project, never fires for an old one, and
"Weekly outcome overdue" really checks the project's end date (`weekEndISO`).

**Decision:** this week's `WeeklyPlan` is the only source of a weekly outcome.

**Acceptance criteria**

1. Attention, load, Daily Focus scoring and the Projects panel read weekly outcomes only from the
   current week's plan. No app code reads `Project.weeklyOutcome` (the stored data is left alone).
2. The attention row that checked `weekEndISO` is named for what it checks: an active project past its
   end date. The load status and the parked AI insight count the same thing under the same name.
3. With no plan for the current week, attention shows one "No plan for this week" row. With a plan,
   each active project without an outcome in it shows "No weekly outcome". Both open the Command
   Center Plan tab.
4. No exported selector in `lib/execution-os.ts` is unreferenced by app code.
5. `docs/ARCHITECTURE.md` migration list reflects reality (step 5 marked done or dropped).
6. ADR-022 records the source decision, what was wired, what was deleted, and why.
7. No data model change, no store migration, no Firestore rules change.

---

### P3 — "Waiting on you" queue · M

**Status:** done

**Why:** F4. The approval loop is the control plane's core, and it can be proven with today's data —
before any agent exists.

**Rescoped 2026-10-05 (Roman, ADR-028).** The original shape was a separate "Waiting on you" section.
After P1 and P2, two of its three row types (a project past its end date, a project over
`maxActiveProjects`) are already attention rows, so a second list would show the same project twice.
P3 instead turns attention rows into decisions, in the attention block.

- **Project past its end date:** Complete, Park, or Extend (end date moves to 7 days from today).
- **Last week not reviewed** (new row): last week's plan has allocations and is not `reviewed`.
  "Review" opens the Review tab on that week, which can now review it after the week has ended.
- **Other rows** keep their single action (open the owning module or tab).

**Acceptance criteria**

1. The three decisions above act in place; resolving a row removes it.
2. Each row that is waiting on something shows since when: the end date, the due date, or the start of
   the week.
3. The block renders items of shape `{id, kind, subject, detail, since, actions}`, and each action
   carries its effect as data (open a module or tab, update a project). An agent proposal can then be
   added as one more `kind` without changing the component.
4. The Review tab reviews last week's plan while it is unreviewed, then the current week's.
5. No new modules, no schema change, no store migration, no Firestore rules change.

**Out of scope:** agent jobs, notifications, anything requiring a server; decisions on overdue tasks
(they stay "Open"); per-project parking from the over-capacity row.

---

### P4 — Provenance fields on Task and Project · S

**Status:** done

**Why:** F5. Prerequisite for any agent result ever landing in Magic Kick, and cheap now.

Optional `source` (`"manual" | "agent" | "import"`) and `sourceId` on `Task` and `Project`, defaulting
to `"manual"` in the store migration. Surface as a small label only where non-manual.

**Acceptance criteria**

1. Existing data migrates with no loss; untagged items read as `manual`.
2. `source + sourceId` is unique-checked on write (idempotency, ADR-018).
3. No UI change for manual items.

**Gate:** do not extend this into an `AgentJob` table — that is AOS-4/AOS-6, still behind ADR-018's Inbox gate.

**As built (2026-10-05):** `ItemSource` and an optional `Provenance { source, sourceId }` on `Task` and
`Project` (`lib/types.ts`); helpers in `lib/provenance.ts`. **No store migration:** untagged items read
as `manual` through `sourceOf()` instead of a v12 → v13 version bump, which meets criterion 1 without
rewriting stored data and avoids the version-mismatch rollback hazard noted in ADR-025. `addTask` and
`addProject` skip a write whose `source + sourceId` already exists, deleted items included, so an
agent or import cannot bring back something the user deleted; manual items and items without a
`sourceId` are never deduplicated. A small "Agent" / "Import" label (tooltip: `sourceId`) shows on the
ToDo task card and the Projects list row and detail header, only for non-manual items. No Firestore
rules change (the generic sync rule checks only `deleted` and `clientUpdatedAt`). Nothing in the app
writes a non-manual item yet.

---

### P5 — Navigation weight · S

**Status:** done

**Why:** F6. Reference surfaces should not compete with execution surfaces.

Group the existing eight items: **Execution** (Command Center, Schedule, ToDo, Projects) and
**Reference** (Goals, Resources, Journal, Achievements), reference visually secondary. No renames,
no new modules, no routing change. Mobile bottom nav keeps its five, ordered by the same logic.

**Acceptance criteria**

1. Same eight destinations, same `ModuleId` values, same deep links.
2. Group headings are visible when the sidebar is expanded, and collapse cleanly at `w-20`.
3. Keyboard navigation and `aria-label`s unchanged or improved.

**As built (2026-10-05):** `NAV_GROUPS` in `components/sidebar.tsx` holds both groups and is shared with
the mobile menu (`mobile-nav.tsx`, which had its own differently ordered copy of the list). Reference
items use a smaller, dimmer style; collapsed, a divider replaces the headings. Each group is a list with
an `aria-label`, and the active item has `aria-current="page"`; buttons and their `aria-label`s are
unchanged. The bottom bar keeps its five, reordered: Home, Schedule, ToDo, Projects, Journal.
Checked in headless Edge against the dev server in demo mode: expanded and collapsed sidebar at
1280×800, mobile menu and bottom bar at 375×812.

---

### P6 — Gamification placement · S

**Status:** done

**Decided 2026-09-27 (OS `DEC-2026-09-27-001`): demote.** Progress on the daily surface measures
evidence shipped, not activity logged. `lifeos-architecture.md` §0 rule 5 stands — no streaks, no
scores, no guilt mechanics where you look every day.

**Acceptance criteria**

1. The sidebar profile card shows name only.
2. XP, level and streak remain reachable in Achievements and the avatar menu.
3. No store, XP-engine or achievement logic changes — this is placement, not removal.
4. Nothing on the Command Center counts days in a row.

**As built (2026-10-05):** the sidebar card shows the avatar initial and the name. The avatar menu shows
level, XP this week and streak; the Achievements header shows level, total XP and streak. Criterion 4
already held in the components: no streak or day count is rendered on the Command Center. The
"Friday with zero done" text noted in the P1 check is not in any component; it most likely comes from
the parked AI coaching route (feature flag, default off) and is out of P6's scope. The Journal header
still shows a streak; Journal is a reference module, not the daily surface.

---

### P12 — Project roadmap inside Projects · M

**Status:** done

**Note:** built while P1 was open and merged on 2026-10-05 before P1 closed, by Roman's explicit
exception to WIP = 1 (ADR-025). The planned condition was to merge only after P1 is `done`.

**Why:** a project's objective has no visible path to it. Milestones were a flat checklist and project
tasks a separate list, so "what is the next outcome and what moves it" took reading two lists and
ToDo. Ranked before P7 because P7 is blocked on the OS feed and the PAT.

**Shape.** One Roadmap section in the project detail Sheet (no new module, no tab): milestones in
order on a timeline rail, each with a target date, a definition of done, its tasks and its linked
Resources; a "No milestone" group for the project's other tasks. Data per ADR-025: milestones stay
embedded in the Project; `Task.milestoneId`; `resourceIds` on Project and milestone.

**Acceptance criteria**

1. Milestones: create (title, target date, definition of done, resources), edit, complete and reopen,
   move up / down, delete with confirmation. Deleting moves its tasks to "No milestone".
2. Tasks: add inline under a milestone or under "No milestone" (Enter adds and keeps focus), rename,
   move to another milestone, complete, delete with confirmation. They show in ToDo as before.
3. Resources: link and unlink from the project and from each milestone through a searchable picker;
   a linked chip opens the resource's first URL. The Resource card lists where it is linked from.
4. The next open milestone is marked; target dates show as overdue (red), due within 7 days (amber),
   or neutral. A segmented strip shows per-milestone progress.
5. Esc inside an inline editor cancels the edit and does not close the Sheet.
6. Legacy milestones keep their order after the v12 migration; a new milestone is added last.
7. No new collection, no Firestore rules change, no new module.

---

### P13 — ToDo toolbar and Done view · S

**Status:** done

**Note:** built on 2026-10-05 while P1 was open, by Roman's explicit exception to WIP = 1 (ADR-026).
Merged on 2026-10-05 (#134), the day P1 was closed (ADR-027).

**Why:** the ToDo toolbar has a control that barely does anything, and finished tasks pile up in one
long list. Verified in `components/modules/todo-module.tsx` on 2026-10-05:

- The status Select ("Open + Archive" / "Open" / "Completed") only shows or hides the Archive card,
  and "Completed" hides the board. Its trigger is too narrow, so the label shows as "Open + Arc".
- The Archive is one flat list of every completed task (190 on 2026-10-05). It is sorted by the
  board's sort setting (due date), not by when a task was finished, and has no grouping or limit.
- `Task.completedAt` (`yyyy-MM-dd`) already exists, so the list can be grouped by completion date
  without changing the data.

**Shape.** The toolbar keeps search, category and sort, and a **Done (n)** toggle replaces the status
Select. The board shows open tasks only. When Done is on, the Done view takes the board's place, so
only one view is on screen at a time (design principle 1). Completed tasks stay in the data: they
feed `lib/retrospective.ts` and coaching.

**Acceptance criteria**

1. The status Select is removed. The toolbar has search, category, sort and a Done toggle showing the
   number of completed tasks that match the current search and category.
2. No toolbar label is cut off at desktop or mobile widths. When a category is chosen, its trigger
   shows the category and a control that clears it.
3. Turning Done on replaces the board with the Done view, and turning it off brings the board back.
   The Archive card at the bottom of the page is removed.
4. The Done view groups tasks by `completedAt`, newest first: Today, Yesterday, This week, Earlier
   this month, then one group per month. Tasks with no `completedAt` go in a last "Undated" group.
5. Groups up to and including "This week" open expanded. Older groups load only when asked
   ("Show earlier"), so the view never lists every completed task by default.
6. Search and the category filter apply to the Done view the same way they apply to the board.
7. Each row can be reopened (untick, so it goes back to its lane) and opens the same detail Sheet.
8. Empty states: no completed tasks at all, and none matching the filters, each show a single line.
9. No data model change, no new store collection, no Firestore rules change, no new module.

**Out of scope:** deleting or purging completed tasks; bulk actions; any count or streak above the
board (P6, P10); the three lane summary cards (whether to remove them is a separate decision for
Roman).

---

### P14 — One category model across modules · M

**Status:** done

**Note:** merged on 2026-10-09 (#152, `66c3bf6`). Criterion 8 was added during the build.

**Why:** the same task shows different labels, colors and XP depending on where it was made and
which module shows it. Verified in the code on 2026-10-09:

- The default category list is copied in five files (`lib/store.ts`, `todo-module.tsx`,
  `schedule-module.tsx`, `goals-module.tsx`, `quick-add-dialog.tsx`).
- Tasks made from a project roadmap (`project-roadmap.tsx`) or a new Schedule block (`lib/store.ts`
  `upsertTimeBlock`) silently get the first category in the list; onboarding hard-codes "Learning".
  That is why project work shows as "Learning".
- Schedule shows category badges in grey; ToDo and Goals use the category color.
- `lib/xp-engine.ts` keys base XP on five category names, so every custom category is worth less.
- Names are only compared case-insensitively, so "Job / Career" and "Career-&-Business" coexist.

**Shape (ADR-029).** Categories stay defined in Magic Kick. Each one may map to an OS domain (Work,
Learning, Admin, Life) or stay unmapped; unmapped is a normal state, not an error. A project may
carry a category, and tasks made from that project inherit it.

**Acceptance criteria**

1. `lib/categories.ts` is the only place that holds the default categories, their colors, the
   color lookup and name normalization. No module declares its own default list.
2. One `CategoryBadge` component renders a category everywhere a task or goal category is shown
   (ToDo, Schedule, Goals, Journal, Command Center), in the category's color.
3. `Project` has an optional `category`, editable in the project form. A task made from a project
   roadmap or from a Schedule block linked to a project takes the project's category; otherwise it
   takes the first category, as today. Onboarding uses the first category, not a literal.
4. The profile has `taskCategoryDomains: Record<string, OsDomain>`. The category manager lets each
   category be mapped to Work, Learning, Admin or Life, or left unmapped. Rename carries the mapping;
   delete removes it. A missing entry means unmapped, so existing data needs no migration.
5. A new category is refused if it equals an existing one after normalization (case, spaces, `&`,
   `/`, `-` and `_` ignored). In the Categories manager, renaming onto an existing category merges
   into it after a confirmation; Quick Add refuses it.
6. Base XP no longer depends on the category name: every category gets the same base. XP already
   stored on tasks is not recalculated.
7. No new module, no new store collection, no Firestore rules change. Old clients keep working:
   the new fields are optional.
8. The category list shown everywhere is the profile's list plus every category a live task, goal
   or project uses (added 2026-10-09). The profile syncs as one document and the newest copy wins,
   so its list could lose names that tasks still carry; those names were then not editable.
   Renaming or deleting a category leaves deleted tasks, goals and projects untouched.

**Out of scope:** reading the domain list from the OS (P15); bulk re-categorising existing tasks;
labels with more than one category per task.

---

### P15 — Read OS domains for category mapping · S

**Status:** gated

**Gate:** P7 (the server-side OS read path exists).

**Why:** P14 hard-codes the four OS domains. When the OS adds a domain, Magic Kick should offer it
without a code change, and show which Magic Kick categories have no domain yet so they can be
raised at the next OS review.

**Acceptance criteria**

1. The domain list is read from the OS through the P7 server route; the hard-coded list from P14 is
   the fallback when the OS cannot be reached.
2. Settings lists unmapped categories with their open-task count.
3. Magic Kick never creates or proposes an OS domain by itself (OS `AGENTS.md` rule 9).

---

### P16 — Schedule: unscheduled-tasks panel · S

**Status:** done

**Note:** merged on 2026-10-13 (#154, `ae78927`). Criterion 9 (legacy project colors) was added during the build.

**Why:** Schedule's "Unscheduled tasks" list shows every open task without a time slot, including
tasks of paused, parked and completed projects. It has no filter, always takes 320 px next to the
calendar, and placing a task needs a drag. Roman asked for a category filter, a close option like
the left sidebar, no tasks from inactive projects, and a more polished planning flow (2026-10-13).

**Acceptance criteria**

1. Tasks linked to a project that is not `active` (paused, parked, completed or deleted) are not
   listed. The panel says how many were left out. Tasks without a project are still listed.
2. Category chips filter the list (several can be selected; "All" clears). Only categories with an
   unscheduled task are offered, with their count, in the shared list's order (P14).
3. A search field matches task and project titles. Sort by due date (default), project, or shortest
   estimate first.
4. The panel can be hidden into a narrow rail showing the task count, like the left sidebar. The
   choice is kept per browser (`localStorage`). Opening a calendar block still shows its edit panel.
5. Each card shows its project's color and name; a due date before today shows as "Overdue".
6. A card button puts the task into the next free slot that fits its length (estimate, else 60 min,
   the same as a drop) between 08:00 and 20:00, today from now on, searching up to 14 days. Busy
   time is blocks, recurring tasks and busy calendar events. A toast confirms it, with Undo.
7. Dragging a task over the calendar shows a ghost block of its length at the drop position.
   Dragging a task block onto the panel (or the rail) removes it from the schedule, the same as
   "Remove from schedule", with Undo.
8. No new module, store collection, data field or Firestore rules change.
9. Project colors saved as a legacy class name (`bg-chart-1` … `bg-chart-5`) are drawn in their hex
   equivalent everywhere, through one helper (`lib/project-colors.ts`). Schedule drew them as
   invalid colors, so those blocks were almost invisible (added 2026-10-13). Stored values are not
   rewritten; saving the project in Projects already stores hex.

**Out of scope:** the AI Suggest request (still sends every task).

---

### P17 — Schedule: task CRUD in the unscheduled-tasks panel · S

**Status:** done

**Note:** merged on 2026-10-14 (#156, `8554cef`). Criterion 6 (clearing a time slot) was added during the build.

**Why:** the unscheduled-tasks panel (P16) only lists and places tasks. Adding, editing, completing
or deleting one means leaving Schedule for ToDo. Roman asked for CRUD in the panel (2026-10-14) and
chose: the ToDo task sheet shared by both modules, delete with Undo, a quick add form with title,
category, project and estimate, and completing from the sheet only.

**Acceptance criteria**

1. A "+" button in the panel header opens an inline form: title (required), project (optional,
   active projects only), category, estimate in minutes. Choosing a project sets its task category
   (P14). The task is created with no date or time, so it appears in the list. The form stays open
   for the next task; Escape or Cancel closes it.
2. Clicking a card, or Enter on its title, opens the task sheet. The clock button and dragging do
   not open it.
3. ToDo's task sheet is one shared component used by ToDo and Schedule, with the same fields and
   rules as before (Daily Focus limit, start before end). It reads the task live, so a save shows
   at once.
4. Mark Complete in the sheet removes the task from the panel.
5. Delete in the sheet removes the task and shows a toast with Undo, which brings the task back
   with the schedule items deleted with it.
6. Clearing a task's time slot keeps its due date and drops the time (added 2026-10-14: the store
   kept the old time, so Undo after "next free slot" left the task scheduled on its old due date,
   and clearing the start and end time in the ToDo sheet did nothing).
7. No new module, store collection, data field or Firestore rules change.

**Out of scope:** a project field in the task sheet; Undo for delete in ToDo; AI Suggest.

---

### P18 — Daily Focus as the day plan · S

**Status:** done

**Note:** merged on 2026-10-14. #159 merged into the already-merged #158 branch, so it reached
`main` through #160 (`847355a`). The carry-over prompt's single-button follow-up
(`fix/p18-carryover-button`) missed #159's squash and goes in separately.

**Why:** after the Execution sync fix (#158), Daily Focus means one thing everywhere, but it is
still a flat list: the tasks with a time today are not in time order, a focus task cannot be put
on the calendar from the Command Center, nothing asks whether yesterday's focus still applies, and
Schedule does not show whether a block's task is in Daily Focus. Roman asked for all four
(2026-10-14) and chose: a dismissed carry-over prompt keeps the tasks.

**Acceptance criteria**

1. **Order by time.** Daily Focus lists chosen tasks with a time today first, earliest start
   first, then the rest in manual order. The ordering is one shared selector, used by the Command
   Center and by ToDo's Daily Focus column when ToDo's sort is "Manual order".
2. **Shared focus list.** The Command Center's Daily Focus is one component: chosen rows, then
   the "Suggested" list (#158). Chosen rows without a time today can be dragged to reorder them
   (the same `order` ToDo uses). Chosen rows with no time at all have a "Plan" button that puts the
   task in the next free slot on the calendar (the P16 rule, now one shared function, also used by
   Schedule) with an Undo toast. ToDo keeps its kanban cards, because moving tasks between lanes
   happens there.
3. **Carry-over prompt.** The first time the app opens on a new day, if the Daily Focus lane has
   open tasks, a dialog lists them, each ticked "keep". Applying sends unticked tasks to Backlog.
   Closing the dialog without applying keeps them all. It shows at most once per day per device
   (local storage, not a data field) and waits until the first sync has finished.
4. **Focus on Schedule.** The edit panel of a calendar block linked to a task shows whether the
   task is in Daily Focus, with a button to add it (refused with a message at the limit) or send
   it back to Backlog.
5. No new module, store collection, data field or Firestore rules change.

**Out of scope:** a Daily Focus history; cross-device "prompt already shown"; AI-ranked
suggestions; changing ToDo's kanban cards.

---

### P7 — Read the OS context feed · M

**Status:** done

**Closed 2026-10-15:** checked by Roman on production (`main` `d81feda`), signed in, with
`AIOS_GITHUB_TOKEN` and the `FIREBASE_ADMIN_*` variables set in Vercel: "From canon" shows the three
primary outcomes, the `primary` and `protected` lanes, and "Canon as of 2026-10-15 08:21
Europe/Berlin, reconciled 2026-10-02". The "missing" state was also seen on the way (token without
repository access → GitHub 404 → "Current focus not found in canon").

**First slice, rescoped 2026-10-14 (ADR-031, supersedes ADR-030; OS `DEC-2026-10-14-003`):** current
focus from tracked canon on OS `main`: the primary outcomes and the `primary` and `protected` lanes
from `01_CONTEXT/current-focus.md`, dated by the `generated` front matter of `00_HOME/context-pack.md`.
Shown read-only in Command Center under Daily Focus as "From canon". Token: `AIOS_GITHUB_TOKEN`,
`Contents: read`. The plan-file slice (ADR-030) is paused and its code removed: the plan files stay
local in the OS, and Daily Focus (P18) is the day plan, so criterion 2's "today's plan" is Daily
Focus itself. Criterion 5: the files are canon, documented in the OS; there is no separate feed.

**Why:** the brain is invisible from the deployed app. Everything Magic Kick shows today is what was
typed into Magic Kick. Until it can read OS context, "accessible everywhere on any device" gets you a
task app with your own data in it, and goal 1's LLM-agnostic claim is true only for a session with
disk access.

**Shape.** The OS generates a versioned, read-only **context feed** (a script, same pattern as
`generate-roadmap-view.js` — no new state store there, no duplicate state here). Magic Kick reads it
server-side through the GitHub API per MK-DEC-006, with a fine-grained PAT in a Vercel env var,
caches it, and renders it read-only. Writing back is P11, not P7.

**First slice:** today's plan and current focus. Nothing else until those two are on screen.

**Acceptance criteria**

1. A server route fetches the feed; the token never reaches the browser.
2. The deployed app shows today's plan and current allocation without the laptop being involved.
3. Stale or unreachable feed renders as a dated "last known" state, never as blank or as fresh.
4. No feed content is written into Firestore — render only.
5. The feed's shape is documented in the OS repo, not here.

**Depends on:** the OS side of the feed (OS `DEC-2026-10-03-001` step 2) and a PAT (Roman). The
route unfreeze is ADR-024 §6.

---

### P11 — Write back to the OS · M

**Status:** decision (2026-10-17: criterion 2, strategy-file edits through an OS PR, waits on Roman's
scope ruling). First slice (Close day) **done** 2026-10-17; second slice (Close day UX, ADR-034)
merged as #168 2026-10-17.

**First slice done 2026-10-17:** Close day shipped as #166 (ADR-032) and #167 (missed days,
ADR-033). Checked on production by Roman: the form opened (2026-10-16), and closing 16 Oct produced
OS commit `7634893` (`daily-close: 2026-10-16 (Magic Kick)`, one file
`06_REVIEWS/daily/2026-10-16.md`, with the written-on line). P11 stays open for criterion 2
(strategy-file edits through a PR), which needs a scope ruling from Roman.

**Why:** ADR-024. Reading the OS (P7) makes Magic Kick a window onto it; a usable UI also has to change
it. Without write-back, every update still needs a laptop session with the repo checked out.

**Shape.** Server-side routes write to the AI-Business-OS repo through the GitHub API, with a write
PAT separate from P7's read-only one (`Contents` read/write, plus `Pull requests` when the strategy
slice needs it; that repo only; ADR-032). The OS repo stays the source of
truth; nothing written through these routes is kept in Firestore.

- **Tasks and day-to-day context:** committed directly to the OS `main`. The commit message names
  Magic Kick and the file.
- **Strategy files** (focus, allocation, decisions): the edit opens a pull request and Magic Kick shows
  its link. Nothing changes on the OS `main` until Roman merges it.
- **Writable paths** are an explicit list, kept in one place in code and documented here before the
  first route ships. Anything not on the list is refused. When in doubt, a path goes through a PR.

**First slice, rescoped 2026-10-15 (ADR-032): Close day.** The old first slice ("check off and
re-date items in today's plan") is dropped: the plan files stay local in the OS (OS
`DEC-2026-10-14-003`), and Daily Focus (P18) is the day plan. Close day is the Magic Kick side of
the OS `daily-close` workflow (`03_WORKFLOWS/planning/daily-close.md`, job contract
`10_AUTOMATION/jobs/daily-close.yaml`): it writes today's daily review to the OS.

- **Where:** a "Close day" action on the Command Center (no new module). It opens a dialog.
- **Fields:** the sections of the OS `09_TEMPLATES/daily-review-template.md`, in its order: Primary
  Outcome, Completed, Meaningful Progress, Blockers, **Decisions** (written as "Decisions Made"),
  Captured Learning, Carry Forward, Stop / Avoid. Completed is prefilled with today's completed
  tasks and Carry Forward with the open Daily Focus tasks; both stay editable. Exact wording follows
  the OS canon text for the workflow (Roman, pending).
- **Write:** one file, `06_REVIEWS/daily/YYYY-MM-DD.md` (today, Europe/Berlin), committed directly
  to the OS `main` with the message `daily-close: YYYY-MM-DD (Magic Kick)`. The server allows writes
  only under `06_REVIEWS/daily/`.
- **Token:** a separate `AIOS_GITHUB_WRITE_TOKEN`, `Contents` read/write on `romahawk/AI-Business-OS`
  only, with an expiry. The P7 read token stays read-only.

**Acceptance criteria (first slice)**

1. **Close day** shows the full file before anything is written; the commit happens only on an
   explicit "Commit to OS" click (the job contract's "ok on the shown diff"). Nothing is written on
   open, on typing, or on cancel.
2. The commit lands on OS `main` as `06_REVIEWS/daily/<today>.md` with the message
   `daily-close: <today> (Magic Kick)`, and the dialog shows the commit link.
3. **Decisions** typed in the dialog appear under "## Decisions Made" in the same file, the same day.
4. If today's file already exists on OS `main` (written from the laptop, or an earlier Close day),
   the dialog says so, shows a link to it, and does not overwrite it. A file created between opening
   the dialog and committing is refused by GitHub (create without `sha`) and reported, not
   overwritten.
5. The server refuses any path outside `06_REVIEWS/daily/YYYY-MM-DD.md` (one check, one place in
   code), any request not signed in as Roman (`AIOS_WRITER_UID`), and runs as "not configured" when
   the write token or the writer uid is missing. The token never reaches the browser.
6. Nothing from the dialog is kept in Firestore or the persisted store. (Amended by ADR-034: the
   review text still is not; the Daily Focus snapshots and saved chips are, on the profile.)
7. **Missed days (ADR-033, added 2026-10-17).** A day picker offers today and the 6 days before it
   (Europe/Berlin), each marked closed when its file exists. A missed day is written to its own
   `06_REVIEWS/daily/<date>.md` with the message `daily-close: <date> (Magic Kick)` and a line
   `_Written on <today> for <date>._` under the title. Completed is prefilled with that day's
   completed tasks; Carry Forward starts empty. The server refuses any other date. Criteria 1, 4, 5
   and 6 apply unchanged.

**Second slice, 2026-10-17 (ADR-034): Close day UX.** Roman's first real close was eight empty
fields, six of them ending "None.". The dialog now starts from the plan.

**Acceptance criteria (second slice)**

1. Today's dialog lists the Daily Focus tasks, the scheduled blocks and the tasks completed today as
   ticks; completed items are pre-ticked.
2. Ticking or unticking moves a line between Completed and Carry Forward in the preview; a note
   appears as `- <title>: <note>`. Every section keeps a free-text area after the prefill.
3. Chips insert text into the right section (Blockers; Carry Forward reasons, the blocker set plus
   "Moved on purpose"; Decisions and Learning starters). Saved custom chips persist across reload and
   devices (profile, existing sync).
4. Only the checklist, Blockers, Decisions and Carry forward show by default; "More" reveals Primary
   outcome, Meaningful progress, Captured learning and Stop / avoid. The file always has all 8
   headings in template order, "None." when empty.
5. Each day's Daily Focus list is saved by Berlin date (last write of the day wins, 7 days kept). A
   missed day with a snapshot gets the checklist and Carry Forward; one without behaves as in
   criterion 7 above and says so.
6. Ticking never changes a task in the store.
7. Path rule, date window, writer gate and no-overwrite behave exactly as before; existing tests stay
   green.
8. No AI route is called (ADR-017), and `.next/static` contains no `AIOS_GITHUB_TOKEN`,
   `AIOS_GITHUB_WRITE_TOKEN`, `AIOS_WRITER_UID` or `api.github.com`.

**Later slice (needs its own ADR):** feed unticked items into tomorrow's P18 carry-over.

**Acceptance criteria (P11 as a whole)**

1. Close day (first slice, above).
2. Editing a strategy file opens a PR in the OS repo; the OS `main` is unchanged until it is merged.
3. A write against a file that changed since it was read is refused and the view reloads; nothing is
   overwritten.
4. The token never reaches the browser; the routes reject any request not signed in as Roman.
5. A path outside the writable list is refused with a clear message.
6. The OS stays usable without Magic Kick: no state exists only in Magic Kick.

**Out of scope:** writing to any other repository, background jobs, webhooks, AI-generated edits.

**Depends on:** P7 (done 2026-10-15); `AIOS_GITHUB_WRITE_TOKEN` and `AIOS_WRITER_UID` in Vercel (Roman).

---

### P20 — Command Center UX v2 · M

**Status:** done (2026-10-18; CC-1 #169, CC-2 and CC-3 via #172. Roman's check on real data still to do)

**Why:** an audit of the Command Center on real data (17 Oct, 13:44)
(Roman's local `Claude outputs/command-center-ux-v2.md`, not in the repo)
found the same blocks listed twice (Daily Focus and the Week tab's Today column), past blocks
looking live, four "No weekly outcome" rows with one cause and one action, a static canon block in
prime space, a "planned" badge on every row, "Free 25h" next to "Today 3 blocks" reading as a
calculation bug, and headings, lists and landmarks that assistive tech cannot follow.

**Shape.** Presentation and pure selectors only: no Firestore schema, rules, store-action or
write-path change, no new dependency, route or collection. Three PRs, each revertable on its own:

- **CC-1:** one grouped "Week not planned" attention row when 2+ active projects lack a weekly
  outcome (`lib/execution-os.ts`); one missing outcome keeps its own row ("Set outcome").
- **CC-2:** Daily Focus is the one Today surface. The day's time blocks move into it as "Also
  scheduled" (minus blocks whose task the card already lists) and the Week tab's Today column goes,
  so no block shows twice and blocks without a task stay visible (the #158 list is kept, not
  dropped). Past rows are flagged "past" (flag only: Close day stays the one place that resolves a
  day; Roman, 2026-10-17). Status badges only when not "planned". Canon behind a disclosure.
  "Free" becomes "Unallocated" (same calculation). One "Plan week" button in the empty state.
- **CC-3:** headings and landmarks, `role="list"`, unique accessible names for attention actions,
  `aria-current="date"` on today's chip, focus rings, container queries on the Now cards, and a
  view transition on tab switches (instant under reduced motion or without support).

**Acceptance criteria**

1. With several active projects missing an outcome, Needs attention shows one row for them, naming
   up to three and "+N more", with one "Open Plan" action. One missing outcome keeps its own row.
2. No time block appears in two places on the page.
3. A block whose end time has passed renders "past" (re-checked every minute); no "planned" badge
   shows anywhere.
4. Canon is collapsed by default and opens with Enter or Space.
5. "Open Plan" from Needs attention switches the tab and moves focus to the Plan panel; arrow keys on
   the tab list keep focus on the trigger.
6. Tab switches animate where view transitions exist, and are instant elsewhere and under reduced
   motion, with no errors.
7. The Now cards reflow at 360, 768 and 1280 px.
8. axe finds 0 violations on the Command Center.
9. The diff has no new store write call; Firestore rules are untouched.
10. Unit tests cover the attention grouping and the past-block check.

**Out of scope (deferred):** Done / Skip / Carry-over on past blocks (writes; overlaps Close day and
the carry-over prompt); per-day load dots on the day chips; a scroll shadow on the chip row.

**Open question (Roman, DECISIONS_LOG, not UI):** canon lists 5 lanes and 3 outcomes while the load
row counts 4 active projects against a limit of 3; which list the WIP limit counts is unresolved.

---

### P21 — Schedule block card in a dialog · S

**Status:** done (2026-10-18, #173)

**Why:** clicking a Schedule block opened its card at the top of the side column, which expanded a
collapsed tasks panel and pushed Week allocation and Unscheduled tasks down, so the grid and the side
column changed size on every click.

**Shape.** UI only, in `components/modules/schedule-module.tsx`: no store, Firestore, rules or type
change, no new dependency. The card (EditPanel, same props and handlers) opens in the existing
`components/ui/dialog.tsx`. One PR, revertable on its own.

**Acceptance criteria:**
1. Clicking a block opens a centred dialog; the side column does not move, resize or reorder, and a
   collapsed tasks panel stays collapsed.
2. Esc, the overlay and the Close button close it, and focus returns to the block (to the grid when
   the block is gone, after Remove from schedule).
3. Every edit works as before; selects open above the dialog; at 1366×768 and 390 px the dialog fits
   and scrolls inside itself.
4. A drag or resize never opens the dialog; blocks still drag and resize.
5. Keyboard: Tab to a block, Enter or Space opens it, Esc closes it, focus comes back.
6. axe with the dialog open: no violations that this change adds (theme-colour contrast is deferred).

### P22 — Schedule blocks show their category · S

**Status:** done (2026-10-18, #174 merged into its base, landed by #176)

**Why:** a block's colour showed only its project, so a block without a project carried no colour
signal and the week's balance across life areas (categories) could not be read from the grid. The
project-coloured text also failed AA contrast on 11 grid labels (axe, P21).

**Shape.** UI only, in `components/modules/schedule-module.tsx`: fill = project tint (neutral without
a project); 3 px left edge = the task's category colour from `categoryColor` (the same colours as
the category chips; neutral when the block has no task); text in the foreground colour; the
category in the block's accessible name. No store, type or rules change. Plain time blocks have no
category field, so they keep a neutral edge (a category on time blocks would be a data change).

**Acceptance criteria:**
1. A task block's left edge has its category colour, with or without a project; the fill is the
   project tint, or neutral without one.
2. A plain time block has a neutral edge; Google Calendar blocks are unchanged.
3. The drag preview and the drop preview from Unscheduled tasks follow the same rule.
4. The block's accessible name includes the category; axe on the grid has no colour-contrast
   violations.

### P23 — Share a project roadmap · S

**Status:** done (2026-10-19, #179. Real print dialog, Share image on a phone, Safari/Firefox not checked)

**Why:** a roadmap could only be seen inside Roman's account. Sharing it with a collaborator, a mentor
or in a post meant screenshots of a dark side panel.

**Shape (ADR-035).** A Share button in the Roadmap section opens a dialog with a live preview, toggles
(tasks, definitions of done, resources) and three outputs: Download image (2x PNG; Share image on
phones), Save as PDF (vector, via print), Copy as Markdown. One pure renderer in
`lib/roadmap-share.ts`; generated on the device, nothing uploaded. No store, rules or route change.

**Acceptance criteria:**
1. The Share button appears when the roadmap has milestones or tasks; the dialog previews the card.
2. Download image saves `<project>-roadmap-<date>.png`, light theme, readable at phone size.
3. Save as PDF opens the print dialog with the card only; the saved PDF has selectable text.
4. Copy as Markdown puts headings, status lines, task checkboxes and resource links on the clipboard
   and confirms with "Copied".
5. Each toggle removes its content from the preview and from all three outputs.
6. Titles and text are escaped (no markup injection into the SVG or Markdown).

### P24 — Schedule shows this week's tasks, not every open task · S

**Status:** done (2026-10-19, #180. Roman's real data not checked)

**Why:** Schedule's Unscheduled tasks panel listed every open task without a time slot (73 on
Roman's account, 2026-10-19), most of them project tasks for later milestones. Planning the week
meant scrolling past work that belongs in the project roadmap. Roman chose the "focused list"
option on 2026-10-19.

**Shape.** UI only. The panel opens on **This week**: tasks in the Daily Focus lane, tasks due by the
end of the shown week (overdue too), and tasks in their active project's Next milestone (first open
milestone). **All open** shows the full list; search always covers all open tasks; a footer says
how many more there are. Tasks added from the panel or unscheduled from the grid stay in view for
the session. A roadmap task's menu gets **Schedule next free slot** (the panel's clock action), so
any project task reaches the calendar on request. Pure rule `isPlanningFocus` in `lib/roadmap.ts`.
No store, type or rules change.

**Acceptance criteria:**
1. The panel opens on This week with the three groups above; the collapsed rail counts the same.
2. All open lists every open, unscheduled task of active projects and none; the footer's "Show all"
   switches to it.
3. Search finds any open task in either view.
4. A task added from the panel, or dragged back from the grid, stays visible in This week.
5. A roadmap task without a time slot offers Schedule next free slot; it lands in the calendar with
   an Undo toast, and the action is gone once it has a slot.

### P26 — Week allocation as a project filter in Unscheduled tasks · S

**Status:** done (2026-10-19, #181. 7 rows visible at 1366×768, accepted by Roman; real data not checked)

**Why:** Schedule's side column stacked a "Week allocation" card above Unscheduled tasks, and the
panel's header (title, help text, switch, search, sort, category chips) took about 270 px before the
first 80 px task, so only about three tasks showed at 1366×768. Allocation and the task list answer
one question: what goes into the week for each project. Roman's brief, 2026-10-19.

**Shape.** UI only. The allocation card is gone; its bars live in a project filter inside the panel
(`role="radiogroup"`): All projects, each allocated project in plan order with "planned/allocated h"
and a thin bar (every active project with tasks when there is no plan), then Other projects and No
project when they have tasks. Counts follow scope, search and category; the project filter applies
last. More than five rows show four and "+N more". The header is one title row ("Unscheduled · n"),
one control row (This week / All, a search button that opens inline, a Filters popover with sort
and categories) and the project list. Rows are two lines (about 46 px). The filter is kept in
`localStorage` (`magic-kick-schedule-project-filter`) and falls back to All when the project is no
longer listed. Pure helpers in `lib/unscheduled-filter.ts`. No store, type or rules change.

**Acceptance criteria:**
1. No separate Week allocation card; allocation bars appear in the project filter rows.
2. Clicking a project shows only its unscheduled tasks; the counts match the list, together with
   This week / All, search and categories.
3. At 1366×768 the first task starts within about 240 px of the panel top.
4. Drag to calendar, drop back to unschedule, schedule next and open task work, filtered or not.
5. The filter survives a reload; a project no longer listed falls back to All.
6. Keyboard: arrows move between project rows, Space/Enter selects; the Filters popover closes
   with Esc and returns focus.
7. Without a plan, project rows show without bars and the filter works.
8. axe on Schedule: 0 violations.

**Deferred:** bulk-select a project's tasks and auto-schedule them into free slots (bulk writes and
an approval step); a "fill the allocation gap" suggestion per project (overlaps AI Suggest).

### P27 — Close day writes a card to the Journal · S

**Status:** done (2026-10-19, #183. A real commit creating a card and the earlier-closed-days list not checked: demo mode cannot commit or sign in; real data not checked)

**Why:** Close day (P11) commits the day's review to the OS but leaves no trace in Magic Kick, and the
Journal held manual mood/highlights entries unrelated to it. Roman asked on 2026-10-19 that each
closed day appears as a card in the Journal, and that the Journal's logic and UI follow. His
choices: a new item opened now; old entries removed, recoverable; no import of days closed before;
the Journal shows closed days only.

**Shape.** When the commit to the OS succeeds, Close day saves a `journal` entry of type `close`
with the sections as committed, the done/open counts and the links to the OS file and commit
(`lib/close-day.ts` `closeDayJournalEntry`). One card per date; closing a date again updates its
card. The OS file stays the source of truth; the card is a record that links to it. The Journal
lists the cards newest first (filled sections only, "Open in OS"), has a Close day button that
opens the same dialog, and lists days closed in the OS without a card (the last 7 days the route
already returns) as links. Old manual entries are hidden; "Clear old entries" tombstones them
(`deleted: true`, restorable from Firestore). Mood, gratitude, the streak badge, New Entry, the
AI Draft button and Quick Add's Journal tab go; the Weekly tab keeps the retrospectives, and its
Markdown export reads the week's closed days. Firestore rules check only the sync fields of
`journal` documents, so no rules change.

**Acceptance criteria:**
1. After a successful Close day commit the Journal shows that day's card; a failed or refused
   commit adds none.
2. Closing the same date again leaves one card for it, with the latest text.
3. The card shows only filled sections, the done/open counts and a working "Open in OS" link.
4. Old entries are not listed; "Clear old entries" asks first, marks them deleted and syncs.
5. Days closed in the OS without a card are listed with their OS link.
6. Quick Add has no Journal tab; the Journal has no New Entry.

### P25 — Select several roadmap tasks at once · S

**Status:** done (2026-10-21, #185. Real data, keyboard-only ranges, light theme, Safari/Firefox and touch not checked)

**Why:** a project with many tasks (Job-Search: 23 under "No milestone", most done) can only be
changed one task at a time. Roman asked for multi-select with delete, archive and "Move to
milestone" on 2026-10-19; he chose "hide done tasks" over a new Archived state.

**Shape (opened 2026-10-21 as written).** In a project's roadmap: a Select mode with checkboxes, shift-click
for ranges and a sticky action bar: Complete, Move to milestone, Delete (with Undo). Done tasks fold
under "Done (n)" in each group, collapsed by default. No new task state, no data change.
A range covers the rows shown between the last click and the shift-click (`lib/roadmap.ts`
`selectTasks`); rows in collapsed milestones or folded Done groups are skipped. "Select shown"
selects every shown row. Each action shows a toast with Undo, and the selection clears.

**Acceptance criteria:**
1. Each group (milestone or "No milestone") lists open tasks, then "Done (n)" collapsed.
2. Select replaces the complete checkboxes with select checkboxes and hides row menus and Add task.
3. Shift-click selects the shown range; a range never deselects.
4. Complete, Move to and Delete act on every selected task, and Undo reverts each.
5. Undo is clickable while the project sheet is open, and clicking it does not close the sheet.
6. The action bar fits at 390 px with no horizontal page scroll.

### P28 — ToDo with Schedule's filter sidebar · S

**Status:** done (2026-10-21, #187 sidebar and rows, #188 allocation bar)

**Why:** ToDo said everything twice (three summary cards repeated each lane's name, description and
count above the lanes), had a full-width toolbar with no project filter, and showed every open task
as an 80 px card, so a 92-task Backlog showed four or five tasks a screen. Roman asked on 2026-10-21
for ToDo to use the logic of Schedule's side panel (filters, categories, projects) with minimal
cognitive load, and chose: open on This week, share the code with Schedule, two-line rows.

**Shape.** UI only. The summary cards, toolbar and subtitle are gone; lane headers are one line
("Backlog 24", "Daily Focus 1/3"), the description in a tooltip. A right sidebar (`w-72`, above the
board below `xl`, collapsible to a rail, kept in `localStorage`) holds: "Tasks · n", search, a
Filters popover (sort, category chips), a This week / All / Done switch and the project filter with
the week's allocation bars (P26). This week uses P24's `isPlanningFocus` (Daily Focus, due by Sunday
or overdue, the project's Next milestone); search covers every open task; each lane says how many
more wait in All. Done replaces the board, as the old Done button did. Tasks of paused or parked
projects count under Other projects. Rows are two lines: title (up to two lines), then a category
dot, due date and time (both still click-to-edit), estimate, repeat, source and project; a project
task has its colour on the left edge; XP moves to the task sheet. The filter controls of Schedule's
panel move to `components/modules/task-filters.tsx` and are used by both tabs; `buildProjectRows`
and `countCategories` join `lib/unscheduled-filter.ts`. No store, type or rules change.

**Allocation bar, aligned (added 2026-10-21, Roman's ruling: planned + done).** Schedule's project rows
showed planned/allocated from the calendar; the Command Center's "Committed this week" showed
logged/allocated from execution logs, in a different bar. One helper, `selectAllocationProgress`
(`lib/weekly-plan.ts`), now gives the week's planned and done hours per allocated project: the blocks
Schedule draws (saved blocks, recurring-task occurrences), done = their actual hours (what the
execution logs add up). One `AllocationBar` draws it on Schedule, ToDo and the Command Center: the
track is the allocation, a light fill the planned hours, a solid fill the done hours, in the project's
colour; the text reads "4/6h", then "✓1.5 · 4/6h". The Review tab keeps reading execution logs.

**Acceptance criteria:**
1. No summary cards or toolbar; each lane header is one line with its count (Daily Focus n/limit).
2. ToDo opens on This week; All and Done are one click away; search finds any open task.
3. Clicking a project shows only its tasks; the counts match the board with scope, search and
   categories; the choice survives a reload.
4. Drag between lanes, the Daily Focus limit, Suggested "Add", complete, and the inline date and
   time edits work as before; Enter on a task title opens the task sheet.
5. Schedule's Unscheduled panel looks and works as before (P24, P26).
6. No horizontal page scroll at 1366 and 390 px; axe adds no violation beyond the dark
   `--destructive` contrast and the demo banner already open.
7. For the same week, Schedule, ToDo and the Command Center show the same planned and done hours
   per allocated project, with the same bar.

### P29 — Resources as a scannable list · S

**Status:** done (2026-11-02, #190)

**Why:** Resources hid what it exists for. A card showed only a title until expanded, so the links
sat two clicks away; edit and delete were faint hover icons; and the category and tag filters used
two different chip styles. Roman asked on 2026-11-02 to restyle the Reference tabs, starting with
Resources, to the app's design system. After the first pass he asked for cards closed by default and
for colours that read on both themes (the saved dark fills hid titles in the light theme).
Goals, Journal and Achievements follow as their own items.

**Shape.** UI only; no store, type or rules change. Each resource is a compact row (two across from
`lg`): grip, title with a link count, one-line description; closed by default. Expanding shows the
links (buttons that open in a new tab), the full description, tags and "Linked from"; "Expand all /
Collapse all" sits in the filter row. A card colour is drawn as a soft gradient of an accent into
the card colour with a tinted border, so text keeps the theme's foreground in light and dark; the
stored values are unchanged (a map turns each old fill into its accent). The dialogs pick the colour
from 13 accents, a custom colour or "Match category"; the category from the task categories
(`withUsedCategories`, with their colours) or a new one; tags from chips (existing tags and a short
starter list) or typed. Tasks have no tags, so tags stay resource-only. Edit and Delete
move into one row menu. Search, categories and tags sit in one filter block with one chip style;
the header counts resources. Card colours stay as the row tint. Link order is changed in the Edit
dialog only (the drag inside the expanded card is gone).

**Acceptance criteria:**
1. Cards are closed by default; one click on a card opens its links, one on "Expand all" opens all.
2. Expanding shows description, tags and backlinks; the row menu edits and deletes (delete still asks).
3. Search, category and tag filters work as before and share one chip style.
4. Drag between rows still reorders; the Add and Edit dialogs are unchanged.
5. Titles and links are readable on every card colour in the light and the dark theme.
6. No horizontal page scroll at 1366 and 390 px.

### P30 — Schedule reads dated commitments from AIOS · S

**Status:** done (2026-11-03, #191; #192 fixed orphaned blocks after a task delete)

**Why:** Calls and deadlines the team already knows about (OS `01_CONTEXT/dated-commitments.md`,
kept by Vincent) had to be typed into Schedule by hand. Roman asked on 2026-11-03 for Magic Kick to
show them without entry. See ADR-036.

**Shape.** Read-only; the file is the only source and Magic Kick never writes it. `lib/commitments.ts`
parses the table `date | start | end | title | link | lane` (bad rows skipped with a warning).
`fetchDatedCommitments()` reads it like P7's canon (same `AIOS_GITHUB_TOKEN`, 5-minute cache) behind
`GET /api/os/commitments`; `useOsCommitments` fetches once per app load. No store, Firestore, token or
calendar change. Schedule draws timed rows as fixed "from AIOS" blocks (time, title, link, new tab),
all-day rows as a chip under the date; tasks cannot be dropped over them. Daily Focus's "Also
scheduled" lists today's rows as `HH:MM title` with the link. Missing or failing file: nothing shown.

**Acceptance criteria:**
1. With `2026-11-04 | 11:00 | 12:00 | Isis call, Lucas Peiffer | <link> | Medintegro` on OS `main`,
   Schedule shows a fixed block on 4 Nov 11:00-12:00 and Daily Focus's "Also scheduled" lists it on
   4 Nov; neither shows it on any other day.
2. The block's link opens in a new tab; the block cannot be dragged, resized, opened or edited.
3. Dropping a task, or moving or resizing a block, over a timed row is refused with a notice.
4. An all-day row shows under its date and blocks no time. A row with no end counts as 30 minutes.
5. A bad row is skipped with a warning; an empty table, a missing file, a missing token or a GitHub
   failure shows nothing and does not crash.
6. Parser tests cover valid, all-day, missing end, bad date, empty table and missing file; `npm test`,
   lint and build pass.

### P31 — Top bar UX v2 · S

**Status:** done (2026-11-04, #194 theme toggle and sync status, #195 split Quick Add with a Resource tab)

**Why:** The top bar's sync button says "idle" and does nothing a person can read; the theme control
sits inside the avatar menu and compares `theme` (which can be `"system"`) instead of the rendered
scheme, so it can flip to the colour already shown; and Quick Add cannot add a Resource without
leaving the dialog's two tabs. Roman asked on 2026-11-04 for a v2 that supersedes the §4 note in
`components/top-bar.tsx`. See ADR-037.

**Shape.** UI only: no schema, store, rules or sync-engine change, no new dependency; shadcn
primitives already in `components/ui`; `next-themes` stays.
1. **Theme toggle** between sync and avatar: an icon button showing the rendered scheme
   (`resolvedTheme`: Sun in light, Moon in dark), aria-label and Tooltip "Switch to dark theme" /
   "Switch to light theme". Click sets `target = resolvedTheme === "dark" ? "light" : "dark"`, then
   `setTheme(target === systemTheme ? "system" : target)`; it never compares against `theme`. A
   same-size placeholder renders until mounted (no hydration mismatch). The avatar menu gets a
   "Theme" radio group: System ("· currently light/dark") / Light / Dark.
2. **Sync status** replaces the "idle" button (same ghost icon button, still `syncNow(user.uid)`):
   idle = CloudCheck icon, Tooltip "All changes saved · <relative lastSyncedAt> · Click to sync now"
   (or "Not synced yet · Click to sync"); syncing = spinning RefreshCcw (`motion-safe:animate-spin`)
   and "Syncing…" from `sm`; error = CloudAlert in `text-destructive` and a "Retry" label, always
   visible. aria-label mirrors the tooltip. One visually hidden `aria-live="polite"` span announces
   only transitions into "error" and back to "saved". The relative time refreshes every 60 s only
   while the tooltip is open or the button is focused or hovered; no always-on interval.
3. **Quick Add as a split button:** the primary "+ Quick Add" opens the dialog on Task; an attached
   chevron (aria-label "Choose what to add") opens a menu Task / Goal / Resource that opens the dialog
   on that tab. The dialog's Tabs become controlled. A new Resource tab: Title (required), URL
   (optional, `type="url"`, validated on submit), Category (existing resource categories, default the
   first); it calls `store.addResource` with the defaults the Resources module uses; Enter submits,
   toast "Resource added", the dialog closes and the fields reset, as Task and Goal do. The two buttons are joined
   (shared radius, 1 px divider) and are separate Tab stops. Below `sm` only the "+" icon shows
   (aria-label "Quick add task"); the chevron stays.
4. **Avatar menu order:** email, Level/XP/streak, separator, "Calendar settings" (renamed from
   "Calendar metadata"), the Theme radio group, separator, Log out (destructive). The header comment
   of `top-bar.tsx` describes the new layout.

The theme-toggle bug (comparing `theme`, not `resolvedTheme`) is fixed here, not as a separate item.
Optional, stated in the PR body: `app/layout.tsx` `defaultTheme` "dark" → "system".

**Acceptance criteria:**
1. With the OS in dark and no stored choice the bar shows a Moon; one click gives light; a second click
   returns to `system` (localStorage `theme` is `system`), not `dark`.
2. The theme menu checks the right item and shows "currently <scheme>" for System.
3. No hydration warning in the console on a hard reload, in either theme.
4. Sync: saved shows the icon only; syncing shows text; error shows a red "Retry"; a click calls
   `syncNow`; a screen reader hears error and recovered once each.
5. Quick Add: the main button opens Task; chevron then Resource opens the Resource tab; a saved
   resource appears in Resources without a reload.
6. Keyboard: Tab order is sync, theme, avatar, Quick Add, chevron; Esc closes menus and returns focus
   to the trigger; every icon button has an accessible name.
7. At 390 px the bar fits on one row with no overflow.
8. axe: 0 violations with menus closed; with a menu open, only Radix's `aria-hidden-focus` on the
   outside triggers is accepted (known upstream; menus stay modal, Roman's ruling 2026-11-04).
9. `npm test`, typecheck, lint and build pass; the feature PR diff is about 250 lines or less.

**Deferred:** "Note" in Quick Add becomes "Inbox item" once Stage 0 InboxItem ships; a global
keyboard shortcut for Quick Add (one that does not clash with Ctrl+B for the sidebar); the streak in
the top bar (only if it starts changing daily behaviour).

**Rollback:** revert the PR. No data impact.

---

### P19 — AI Suggest proposes Daily Focus from canon · M

**Status:** open (2026-11-04; ADR-038 accepted; branch `feat/p19-ai-suggest-canon`)

**Why:** Schedule's "AI Suggest" ranks tasks without knowing what the OS says matters, and it sends
every task, including tasks of paused, parked or completed projects (open item since 2026-10-06).
With P7, canon's primary outcomes and lanes are readable on the server, so suggestions can say
which outcome or lane they serve.

**Shape (ADR-038, accepted 2026-11-04).** A new route, `POST /api/ai/daily-focus`, calls
`fetchCanonFocus()` on the server (not through the client, not through `/api/os/canon`) and ranks open
tasks against the canon's primary outcomes. `schedule-suggest` is untouched; calendar placement stays
with it. The surface is the Command Center's Suggested list ("Rank with AI"), not a new list.

**Acceptance criteria**

1. **Gate: ADR-038**, accepted. It unfreezes only this route and fixes the flag, the key, the limits and
   what is sent to Anthropic.
2. **Gated on the server.** Flag off or `ANTHROPIC_API_KEY` missing: 404. No token: 401. The action is
   hidden unless `GET /api/ai/daily-focus` answers `{ available: true }`; nothing errors when hidden.
3. **Canon required.** `ok` runs; `stale` (the last known copy) runs and says "Based on canon from
   <fetchedAt>"; `missing`, `not-configured`, `error` without a stale copy, or no outcomes show "Canon
   unavailable" and make no model call.
4. **Inputs minimised.** Canon outcomes and, per task, id, title (120 chars), project name, due date and
   lane only; at most 60 candidates (not completed, active project or none, not already in Daily Focus;
   overdue first, then due date, then lane). No notes, descriptions, calendar or email. Only the count is
   logged.
5. **At most the free Daily Focus slots** (and 3), each an existing task id with a one-line reason tied
   to a canon outcome. No time blocks, no new tasks.
6. **Validated output.** zod; an unknown task id, unknown outcome id, duplicate, empty or over-long reason,
   or over-limit item is dropped, never repaired or shown. Nothing valid left: "No suggestion right now".
7. **Per-item accept, nothing on fetch.** The list is labelled "AI · from canon" and replaces the
   rule-based list while it shows; each row has a reason and Accept, which calls
   `moveTaskToLane(id, "daily-focus")`; "Back to default" restores the rule-based list. No accept-all.
8. **Limits.** `AI_DAILY_FOCUS_MODEL` (verified `claude-haiku-5-5`), `max_tokens` 600, timeout 15 s, one
   request in flight per user, a soft cap of 20 calls a day (in memory, resets on a cold start; the
   Anthropic console spend limit is the hard cap); on the client one request at a time and the action
   disabled for 30 s after a result.
9. **Tests (vitest):** the zod parse drops unknown ids; the input builder; the stale-canon path and the
   unavailable states; the route answers 404 when gated and 401 without a token.

**Out of scope:** other AI routes; server-side loading of tasks from Firestore (ADR-017 point 5
stays open); writing to the OS (P11).

**Depends on:** P7 `done` (canon read path checked on the deployed app); ADR-038 (accepted).

---

### BUG — Schedule day header misaligned with the hour grid · S

**Status:** done (2026-11-04, #196)

**Cause (confirmed in `schedule-module.tsx` ~L880–905):** the header cells are `flex-1` with the default
`min-width: auto`, so the all-day AIOS chip's long text widens its day (Fri) past the body columns.

**Fix.** One column template for both the header row and the body:
`grid-template-columns: 3.5rem repeat(<days>, minmax(0, 1fr))`. Add `min-w-0` and `truncate` on chips.
Both rows sit in the same scroll container, which already has `[scrollbar-gutter:stable]`, so the
gutter cannot cause drift.

**Acceptance criteria:** column borders line up at 1280, 1440 and 1920 px, in Week and Day views, with
and without chips.

---

### P32 — Page header in the top bar (all modules) · M

**Status:** done (2026-11-04, #197; the Goals, Journal, Projects, Resources and Schedule action rows stay, so those modules gain less than the 60 px criterion)

**Shape.**
- A PageHeader context (title, subtitle, optional help text) set by each module through
  `usePageHeader({...})`. `TopBar` renders the h1 and subtitle in its empty left area. Each module's own
  `<h1>` block is removed. Modules: Command Center, Schedule, ToDo, Projects, Goals, Resources, Journal,
  Achievements.
- Exactly one h1 per page (now in the top bar), and `document.title` is updated.
- Schedule: subtitle "Nov 2 – 8, 2026 · Week 45". The "Click a slot to add · drag to move…" hint
  moves into a (?) help-icon tooltip next to the title.
- The Schedule toolbar (prev/next, Today, AI Suggest, Week/Day, Edit plan) stays in the page as a
  single row.
- Mobile: the title replaces the "Magic Kick" mark; the subtitle is hidden below `sm`.

**Acceptance criteria:** no page-level header row remains; each module gains at least 60 px of vertical
space; no layout shift on module switch.

---

### P33 — AIOS commitments: all-day lane and a ToDo group · S

**Status:** done (2026-11-04, #196 the Schedule all-day lane, #198 the ToDo "Dated · from AIOS" group)

**Shape.**
- Schedule: all-day commitments move out of the day header into one fixed-height (28 px) "All-day" lane
  under the header, on the same grid template as the BUG fix. Each day shows at most 1 chip (truncated)
  plus "+N". Clicking opens a Popover with the full list, read-only, with the note "Change in AIOS:
  dated-commitments.md". The day header never grows.
- ToDo: a read-only "Dated · from AIOS" group, computed from `useOsCommitments()` (not stored), showing
  commitments from today through the end of the week. Badge "AIOS", no checkbox, no edit. Timed ones
  show their time.
- No writes: commitments stay canonical in AIOS (no duplicate data).

**Deferred:** a "Make task" action that turns a commitment into a Magic Kick task needs an
approval-flow decision first.

---

### P34 — Mark AIOS commitments Done · S

**Status:** queued (2026-11-05; ADR-039 Proposed; rank is Roman's call). Do not open before ADR-039 is Accepted.

**Why:** AIOS commitments (P30, P33) are read-only everywhere, so a finished one cannot be ticked off.
Roman asked for Done on 2026-11-05.

**Shape (from ADR-039).** A done-key list on the profile (not written to the OS file); a checkbox on the
ToDo "Dated · from AIOS" box, the Command Center "Also scheduled" rows and Schedule; a done commitment
stays in place, struck through and muted; un-tick removes it; no XP or Daily Focus effect.

**Acceptance criteria (draft, to be fixed with the ADR).**
1. Ticking a commitment marks it done on every surface that lists it; unticking restores it.
2. The mark survives a reload and syncs to another device through the profile.
3. `dated-commitments.md` is never written.
4. Reordering rows in the file keeps marks; retitling a row resets it.
5. Keys older than 90 days are dropped; at most 500 are kept.
6. Tests cover the key, the pruning and the toggle.

---

### P10 — Evidence-driven progress · M

**Status:** gated

**Gate (2026-10-05):** P7. Criterion 3 needs values from the OS context feed, which does not exist yet
(no feed script or feed-shape document in the OS repo, no GitHub token on Vercel). Building bars from
Magic Kick's own data instead was offered and not chosen.

**Why:** goal 2 asks for progress bars; the anti-abandonment rule forbids streaks. Evidence resolves
both — a bar that moves when something ships is worth showing in an interview; a bar that moves when
you tick a box is not.

Bars derive from the feed and from Git: AOS stages closed, queue items `done`, artifacts published,
opportunities qualified, betas released. No activity counters, no day streaks.

**Acceptance criteria**

1. Every bar traces to something that shipped, and the source is nameable per bar.
2. Nothing on the surface counts consecutive days or rewards mere presence.
3. Values come from the feed, not from hand-entered numbers.

**Depends on:** P7.
---

### P8 — Enforce the commit gates with a hook · S

**Status:** done

**As built (2026-10-05):** `.claude/hooks/commit-gate.mjs`, registered in `.claude/settings.json` for
the Bash and PowerShell tools with `if: "<Tool>(git commit*)"`, which per the official hooks docs
checks each part of a compound command. Measured gate time on 2026-10-05: typecheck 4 s, lint 14 s,
build 14 s (about 31 s together), so the hook runs all three, not only typecheck and lint.
`--no-edit` commits skip the message check (the message already exists). It covers commits made from
Claude Code only; a commit typed in a terminal is not checked.

**Why:** `CLAUDE.md` line 52 says no commit may be created if `npm run build` or `npm run lint` fails.
That rule is prose: an agent that skips it commits anyway, and this repo's own history (AI routes
shipped outside scope, governance files untracked across branches) is what an unenforced rule looks
like. A hook moves the rule from the prompt into the environment.

A `PreToolUse` hook in `.claude/settings.json` matching `Bash(git commit …)` that runs the gates and
blocks on a non-zero exit. Verify the event name and matcher syntax against the official Claude Code
docs before writing it — do not copy them from a third-party cheat sheet.

Per ADR-023 the same hook also rejects a commit message without the `Verified:` and `Not verified:`
lines required by root `CLAUDE.md` → "Commit, Push and PR Descriptions". One hook, two checks.

**Acceptance criteria**

1. A commit attempted with a failing `lint` or `build` is blocked, and the message names which gate failed.
2. A commit with both passing proceeds with no extra prompt.
3. The hook lives in `.claude/settings.json` (shared, committed), not `settings.local.json`.
4. Gate runtime is stated in `docs/NEXT_SESSION_START.md`; if the pair takes minutes, the hook runs
   `typecheck` + `lint` and the full build stays a pre-PR step, recorded here as the reason.
5. `CLAUDE.md` line 52 gains one line: the rule is now enforced by a hook, prose is the fallback.
6. A commit whose message lacks a `Verified:` or a `Not verified:` line is blocked, and the message
   names the missing line. This holds however the message is passed (`-m`, `-F <file>`, heredoc).

**Out of scope:** formatting hooks, `rm -rf` blocking, any other event. One hook, two checks
(gates, message lines); it checks that the lines exist, not that they are true.

---

### P9 — One governance file, not two · S

**Status:** done

**Why:** `CLAUDE.md` (102 lines) and `AGENTS.md` (57) carry the same governing rule, working
agreement and anti-pattern table with the agent's name swapped. Two copies of one rule set means the
next rule change updates one of them.

Keep `AGENTS.md` as the canonical text (it is the cross-tool file — Codex, Cursor and Copilot read it
too) and reduce `CLAUDE.md` to Claude-specific additions plus a pointer, or the reverse. Either
direction is fine; two full copies is not.

**Acceptance criteria**

1. A rule appears once. The other file points at it.
2. Both files still open with the governing rule, so a session that reads either one is governed.
3. No rule is lost in the merge — diff the two before collapsing.

**As built (2026-10-05):** `AGENTS.md` is the single copy, tool-neutral ("the agent"). It now also
holds "Commit, Push and PR Descriptions", which only `CLAUDE.md` had. `CLAUDE.md` keeps the governing
rule, imports `AGENTS.md` with `@AGENTS.md` (the pattern in the official Claude Code memory docs), and
adds only Claude Code specifics: the session skills, the P8 hook, a pointer to `docs/CLAUDE.md`.
References in `CONTRIBUTING.md`, the PR template, `docs/CLAUDE.md`, the session-close skill and the
commit-gate hook now point at `AGENTS.md`. A line-by-line check of both old files found nothing lost;
four `CLAUDE.md` lines were reworded, not dropped. `docs/CLAUDE.md` (session governance) is a separate
file and out of P9's scope.

---

---

## Explicitly not in this queue

New modules · agent runtime · connectors (Gmail, Calendar beyond what exists) · n8n · triage or
Today-brief automation (ADR-018 gate) · Grok-specific anything (ADR-020) · visual redesign of
modules that are not in the way of the two questions above.
