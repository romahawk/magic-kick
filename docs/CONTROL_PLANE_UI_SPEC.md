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

**Working order (ADR-024, ADR-025, ADR-027, ADR-028, OS `DEC-2026-10-03-001`):** P1 → P12 → P13 → P2 → P3 → P7 → P11 → P8 → P6 → P10 → P9 → P4 → P5.
Numbers are identifiers, not rank; this line is the rank. One item is `open` at a time.
ADR-023's exception (P8 before P7 while P7 is blocked) is superseded by ADR-024.
P13 was added on 2026-10-05 by Roman, ranked straight after P1. On 2026-10-05 Roman moved P2 ahead of
P7, P11, P8, P6 and P10 (ADR-027), and P3 the same way after P2 (ADR-028).

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

**Status:** queued

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

**Status:** queued

**Why:** F6. Reference surfaces should not compete with execution surfaces.

Group the existing eight items: **Execution** (Command Center, Schedule, ToDo, Projects) and
**Reference** (Goals, Resources, Journal, Achievements), reference visually secondary. No renames,
no new modules, no routing change. Mobile bottom nav keeps its five, ordered by the same logic.

**Acceptance criteria**

1. Same eight destinations, same `ModuleId` values, same deep links.
2. Group headings are visible when the sidebar is expanded, and collapse cleanly at `w-20`.
3. Keyboard navigation and `aria-label`s unchanged or improved.

---

### P6 — Gamification placement · S

**Status:** open

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

### P7 — Read the OS context feed · M

**Status:** queued

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

**Status:** queued

**Why:** ADR-024. Reading the OS (P7) makes Magic Kick a window onto it; a usable UI also has to change
it. Without write-back, every update still needs a laptop session with the repo checked out.

**Shape.** Server-side routes write to the AI-Business-OS repo through the GitHub API, with the same
PAT as P7 (`Contents` and `Pull requests` read/write, that repo only). The OS repo stays the source of
truth; nothing written through these routes is kept in Firestore.

- **Tasks and day-to-day context:** committed directly to the OS `main`. The commit message names
  Magic Kick and the file.
- **Strategy files** (focus, allocation, decisions): the edit opens a pull request and Magic Kick shows
  its link. Nothing changes on the OS `main` until Roman merges it.
- **Writable paths** are an explicit list, kept in one place in code and documented here before the
  first route ships. Anything not on the list is refused. When in doubt, a path goes through a PR.

**First slice:** check off and re-date items in today's plan. The exact file and line format comes from
the feed-shape document P7 depends on.

**Acceptance criteria**

1. Checking off an item in Magic Kick produces a commit in the OS repo, and the change shows in the
   next feed read.
2. Editing a strategy file opens a PR in the OS repo; the OS `main` is unchanged until it is merged.
3. A write against a file that changed since it was read is refused and the view reloads; nothing is
   overwritten.
4. The token never reaches the browser; the routes reject any request not signed in as Roman.
5. A path outside the writable list is refused with a clear message.
6. The OS stays usable without Magic Kick: no state exists only in Magic Kick.

**Out of scope:** writing to any other repository, background jobs, webhooks, AI-generated edits.

**Depends on:** P7 (read path and feed shape).

---

### P10 — Evidence-driven progress · M

**Status:** queued

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

**Status:** queued

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

---

---

## Explicitly not in this queue

New modules · agent runtime · connectors (Gmail, Calendar beyond what exists) · n8n · triage or
Today-brief automation (ADR-018 gate) · Grok-specific anything (ADR-020) · visual redesign of
modules that are not in the way of the two questions above.
