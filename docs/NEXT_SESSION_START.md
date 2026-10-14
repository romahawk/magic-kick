# Next Session Start

**Last updated:** 2026-10-14 (P17 "Schedule: task CRUD in the unscheduled-tasks panel" added, built and merged as #156; no roadmap item open)
**Resume on:** `main` after this `docs/session-close-2026-10-14` PR merges. Start a new branch from `main` for any work.
**Build status:** passing as of 2026-10-14 — `npm run build` exit 0 on `8c46eb5` (by the P8 hook; by hand on the same code before a whitespace-only fix); `main` `8554cef` (squash of #156) has the identical code tree
**Typecheck status:** passing as of 2026-10-14 — `npm run typecheck` exit 0 (same runs)
**Lint status:** passing as of 2026-10-14 — `npm run lint` exit 0 (same runs)
**Test status:** `npm test` is an alias for `typecheck`; there is no separate test suite
**Note:** one feature session (P17) plus a store fix (`clearTimeSlot`). No data model, Firestore rules or dependency change; one new store action (`restoreTask`) and one new component (`components/task-detail-sheet.tsx`).

---

## Start here

1. Run `/session-start`. It checks this note against git, runs the gates and asks for the roadmap item.
2. **Open the app on the real account → Schedule** and check P16 and P17 on real data: add a task
   with a project, open and edit a card, delete and Undo, Mark Complete, next free slot and its Undo,
   the category chips, and that tasks of paused, parked or completed projects are hidden. So far
   only demo mode has been checked.
3. **Still open from P14:** Goals → Categories on the real account: merge or map categories only
   tasks still use ("Trading", "Job / Career", "Self-performance").
4. **Working order:** P1 → P12 → P13 → P2 → P3 → P14 → P16 → P17 → P7 → P11 → P15 → P8 → P6 → P10 → P9 → P4 → P5.
   Done: P1, P12, P13, P2, P3, P14, P16, P17, P8, P6, P9, P4, P5.
   **P7, P11:** `queued` but blocked (step 5). **P10, P15:** `gated` on P7. **No roadmap item
   is open and none is unblocked.** A session must name a bug from Open items or a new item Roman
   adds to the spec; otherwise it stops.
5. **P7 and P11 still need two things from outside this repo** (checked 2026-10-05):
   - The OS context feed: no feed script in `AI-Business-OS/10_AUTOMATION/scripts/` and no feed-shape
     document. An OS session owns it (OS `current-focus.md`, P7 path step 2).
   - A GitHub fine-grained PAT, `romahawk/AI-Business-OS` only, `Contents` + `Pull requests`
     read/write, stored in Vercel as a server-only variable (suggested name `OS_GITHUB_TOKEN`, never
     `NEXT_PUBLIC_…`). On 2026-10-05 the Vercel project had only the seven Firebase variables.
6. Read ADR-024, ADR-027, ADR-028 and ADR-029 before any control-plane, category or scope decision.
7. **Commit gate (P8):** every `git commit` from Claude Code goes through
   `.claude/hooks/commit-gate.mjs`. It blocks unless the message has `Verified:` and `Not verified:`
   lines and typecheck, lint and build pass. Commits typed in a terminal are not checked, and
   neither is `git cherry-pick`: run the gates by hand after one.

---

## Where we left off (2026-10-14) — P17 task CRUD in the unscheduled panel

**Why:** the unscheduled-tasks panel (P16) could only list and place tasks; adding, editing,
completing or deleting one meant going to ToDo. Roman asked for CRUD there (screenshot), added it as
P17 straight after P16, and chose: ToDo's task sheet shared by both modules, delete with an Undo
toast, a quick add form (title, project, category, estimate), complete from the sheet only.

**What changed (squash `8554cef`, #156; commit `8c46eb5`):**
- `components/task-detail-sheet.tsx` (new): ToDo's task sheet as one component; reads the task live
  from the store (a save shows at once); `onDeleted` hook for Undo.
- `components/modules/todo-module.tsx`: uses the shared sheet; inline sheet and edit state removed.
- `components/modules/unscheduled-tasks-panel.tsx`: "+" opens an inline add form (project sets the
  category, P14; no date or time, so the task lands in the list); card click or Enter on the title
  opens the sheet; the clock button no longer bubbles to the card.
- `components/modules/schedule-module.tsx`: renders the sheet; delete → "Task deleted" toast with Undo.
- `lib/store.ts`: `restoreTask` (restores the task and the schedule items deleted with it, matched
  by the delete timestamp). **Fix (P17 criterion 6):** `updateTask` with `clearTimeSlot` kept the old
  explicit time, so P16's Undo after "next free slot" left the task on the calendar on its old due
  date, and clearing both times in the ToDo sheet did nothing.
- `docs/CONTROL_PLANE_UI_SPEC.md`: P17 (now `done`, 7 criteria), working order. `CHANGELOG.md`: P17
  entry dated 2026-10-14 (Added, Changed, Fixed).

**Branch map:**
- `feat/p17-unscheduled-task-crud` off `main` `fe587fb`: `8c46eb5` (P17) → **#156 merged** (squash
  `8554cef`). A handoff commit `6aa2c89` was pushed to the branch but GitHub had not registered it
  when #156 was merged, so it is not on `main`; `docs/session-close-2026-10-14` carries it. Remote and local
  branch still exist; safe to delete (its P17 code equals `8554cef`).
- `docs/session-close-2026-10-14` off `main` `8554cef`: this handoff and P17 → `done`. Not stacked.
- Deleted on 2026-10-14, local and origin, after checking each tree equals its squash commit:
  `feat/schedule-unscheduled-panel` (#154), `docs/session-close-2026-10-13` (#155),
  `docs/session-close-2026-10-09` (#153).

**Verified (confirmed):**
- Gates exit 0 on `8c46eb5` (P8 hook) and by hand on the same code before a whitespace-only fix.
- Headless Edge (playwright-core from an earlier session's scratchpad) against Roman's dev server on
  :3000, demo mode, 1600×900, no page or console errors: add with project and 40 min (8 → 9 cards,
  project name and 40m on the card), form stays open, Escape closes; clock click does not open the
  sheet and **its Undo now returns the task to the list** (schedule item `hasExplicitTime: false`,
  due date kept); card click opens the sheet, title and estimate edit shows in sheet and panel;
  delete → toast → Undo restores; Enter on the title opens; Mark Complete removes the card; ToDo
  sheet opens and loads the edit form; clearing both times in ToDo keeps the due date and drops the
  time block.
- Found during the check: the add form's estimate field had `min=1 step=5`, so 40 failed browser
  validation and the form silently did not submit. Removed `step`.

**Not verified:**
- Real account data; Firestore round-trip of a restored task, including Undo after the delete has
  already synced to another device.
- Light theme; 375 px or other narrow widths; keyboard use of the add form's selects. No
  screenshots in #156.
- Undo of a drag-to-unschedule (P16) — not clicked in either session.

**Process notes:**
- Gates ran with Roman's `next dev` on :3000 still up (Next 16 keeps dev output in `.next/dev`);
  build passed without stopping it.
- `node -e '…'` and heredocs with nested quotes failed silently through the Bash tool here; scripts
  written to the scratchpad with the Write tool worked.
- After a push, check the PR shows the new head (`gh api repos/romahawk/magic-kick/pulls/<n> -q .head.sha`)
  before merging. #156 was merged while GitHub still showed the old head.

---

## Where we left off (2026-10-13) — P16 unscheduled-tasks panel

**Why:** Roman asked (with a screenshot) for a category filter on Schedule's "Unscheduled tasks", a
close option like the left sidebar, no tasks from inactive projects, and other UX polish. Nothing was
open or unblocked, so Roman added it as P16, ranked straight after P14, and chose four extras:
search and sort, project accent and overdue, one-click next free slot, drag preview and drop-back.

**What changed (squash `ae78927`, #154; two commits `cea24be`, `148c983`):**
- `components/modules/unscheduled-tasks-panel.tsx` (new): category chips with counts, search, sort
  (due / project / shortest), project color bar and name, "Overdue", next-free-slot button, drop
  zone, hidden-task count, hide button.
- `components/modules/schedule-module.tsx`: lists only tasks with no project or an active one; side
  column collapses to a count rail (`localStorage`); next free slot 08:00–20:00, from now, 14 days,
  task length = estimate or 60 min (same as a drop), Undo toast (first use of `sonner` in a module);
  ghost block while dragging a task; dragging a task block onto the panel or rail unschedules it
  (same as "Remove from schedule", which also clears `repeat`), with Undo.
- **Bug fix (P16 criterion 9):** `lib/project-colors.ts` (new) holds the legacy `bg-chart-1…5` → hex
  map and `normalizeProjectColor`. Schedule parsed class-name colors as hex (NaN), so those projects'
  blocks were nearly invisible. Now used by Schedule, the panel, Projects, the timeline chart,
  `lib/roadmap.ts` (Resources backlinks) and `PredictionDashboard`; the two local copies are gone.
  Stored colors are not rewritten.
- `docs/CONTROL_PLANE_UI_SPEC.md`: P16 (now `done`, 9 criteria), working order. `CHANGELOG.md`: P16 entry
  dated 2026-10-13 (Added, Changed, Fixed).

**Branch map:**
- `feat/schedule-unscheduled-panel` off `main` `a80a14d`, head `148c983` (2 commits) → **#154 merged**
  (squash `ae78927`). Remote and local branches still exist; safe to delete.
- `docs/session-close-2026-10-13` off `main` `ae78927`: this handoff and P16 → `done`. Not stacked.
- `docs/session-close-2026-10-09` (local and origin, head `811df50`): #153 merged; its tree equals
  `a80a14d`. Safe to delete.

**Verified (confirmed):**
- Gates exit 0 on `cea24be` and `148c983` (by hand and by the P8 hook); `main` tree identical.
- Headless Edge (playwright-core in the session scratchpad) against Roman's dev server on :3000,
  demo mode, 1600×900, no page or console errors: search "stripe" 8 → 1; one category chip 8 → 2;
  sort "Shortest first"; next free slot placed a task today 13:00–13:25 with an Undo toast; drag
  ghost shown and the drop scheduled the task; a block dragged onto the panel showed "Drop here to
  unschedule" and was unscheduled; hide → rail (7) → expand, `localStorage` set; project p1 paused in
  stored state: 7 → 3 cards, "4 tasks … hidden"; "SaaS MVP Launch" (`bg-chart-1`) blocks render blue.

**Not verified:**
- Real account data; clicking either Undo button.
- Light theme; 375 px or other narrow widths; keyboard-only use. No screenshots in #154.
- Resources backlink dots and the AI prediction list in a browser (code changed, screens not opened).
- A production build (`next start`) or Vercel preview in a browser.

**Process notes:**
- Roman's dev server already held `.next/dev/lock`, so a second `next dev` on :3001 refused to start;
  the check ran against :3000 (reach it as `127.0.0.1`, not `localhost`, from curl).
- `python` on this machine is the Windows Store stub; use Node for scripts.

---

## Open items

- **Real-data check of P16 and P17** (Start here, step 2): add, edit, delete + Undo, complete, next
  free slot + Undo, chips, inactive-project tasks hidden, collapse rail; also light theme and a
  narrow window.
- **Real-data check of P14** (Start here, step 3): orphaned categories listed, merged or mapped;
  then confirm the new fields round-trip through Firestore on a second device.
- **Pick the next piece of work (Roman).** After P17 the roadmap has nothing open or unblocked. Candidates:
  the dev/preview login failure (worth re-testing after the auth-button fix), the overdue ranking in
  derived focus, or a new spec item.
- **P17 leftovers (out of scope on purpose):** the task sheet has no project field (a task's project
  can only be set when it is created from the panel or a roadmap); ToDo's Delete still has no Undo.
- **ADR-029 in the OS:** Magic Kick categories may map to OS domains, and P15 will read the domain
  list from the OS. Not recorded in the OS decision log (MK sessions do not edit it); raise it in the
  next OS session.
- **Category leftovers from P14:** Quick Add's category manager has no OS domain select and refuses
  (does not merge) a rename onto an existing name; an unused category can still drop out of the list
  when an older profile wins a sync; resource categories are a separate list on purpose.
- **Confirm the #145 rule** (an overdue task in Daily Focus is not repeated in Needs attention), Roman.
- **Derived Daily Focus ranks overdue tasks below anything due this week:** once past due a task gets
  no due-date score (`selectDailyFocus`). Found 2026-10-06; Roman to decide whether overdue tasks
  should be suggested first.
- **AI Suggest in Schedule still sends every task**, including tasks of paused, parked or completed
  projects (left out of P16 and P17 on purpose). Roman to decide whether it should use the same filter.
- **P7 / P11 blockers:** the OS context feed (OS session) and the GitHub PAT in Vercel (Roman).
  See Start here, step 5.
- **OS session** (prompt drafted 2026-10-04; Roman holds it). Deliverables: decision-template field
  "Repo decisions affected"; one generic `repo-sync` skill with the old sync skills as aliases; an
  amendment line on `DEC-2026-10-03-001` (MK ADR-023 superseded); an OS decision removing the
  2026-10-21 revert (ADR-024 §8); `source-of-truth-map.md` and `02_PROJECTS/magic-kick/context.md`
  recording that MK writes to the OS repo (ADR-024 §5); the context feed (P7 path step 2).
  The OS `current-focus.md` (reconciled 2026-10-02) still says "P7 next, then P8" and the OS MK
  `context.md` still says P1 is open (both stale; MK sessions do not edit them).
- **Allocation reverts to `limited` on 2026-10-21** until that OS decision lands (7 days from 2026-10-14).
- **P1 small-phone ruling** (360×800 shows focus + about 2½ attention rows), Roman. Carried by ADR-027.
- **UI finding from the P1 check, still open:** the "Friday with zero done" text (not in any
  component; most likely the parked AI coaching route). (`/login` hydration fixed 2026-10-06.)
- **Journal header still shows a streak** (left by P6; Journal is a reference module). Roman to decide.
- **`SystemConfig.weeklyOutcomeLimit`** is no longer read after P2 (ADR-022); left in the config.
- **Dev and preview logins** (reported failing 2026-09-24) still not investigated. Production login works.
- **Positioning docs** `docs/PUBLIC_PRESENTATION.md` and `docs/WORKFLOW_AUTOMATION_PLAYBOOK.md` still use
  the sandbox wording (left on purpose by ADR-024).
- **The `roadmap` label** in `.github/ISSUE_TEMPLATE/feature.md` may not exist on GitHub.
- **Merged branch safe to delete:** `feat/p17-unscheduled-task-crud` (#156), local and origin. Its
  extra commit `6aa2c89` is this handoff's earlier draft; nothing else is lost.
- **Older branches.** Local `dev` is merged into `origin/main` (confirmed 2026-10-14) and can be
  deleted. Not confirmed merged: local `ai-control-tower` (origin gone),
  `feat/projects-tab-density-redesign`, `feat/schedule-block-editor-improvements`,
  `feature/resource-reorder-and-milestone-schedule`, `fix/close-phase-1-adrs`,
  `fix/sync-existing-profile-on-new-domain`; on origin, more besides `main` (`git branch -r`). Check
  each one's work reached `main` before deleting.
- **MK-DEC-006**, cited by P7, is not in this repo's log; assumed to live in the OS repo.
- **ADR numbering:** ADR-022 (2026-10-05) sits after ADR-027; ADR-016…019 are dated 2026-08-09 but
  follow ADR-015. Cosmetic.
- **Track 2 (from ADR-017):** validate state server-side in the existing AI routes.
