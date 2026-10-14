# Next Session Start

**Last updated:** 2026-10-14, second session (Execution sync bug fixed as #158; P18 "Daily Focus as the day plan" added, built and merged via #159 → #160; no roadmap item open)
**Resume on:** `main` after this `docs/session-close-2026-10-14-p18` PR and `fix/p18-carryover-button` merge. Start a new branch from `main` for any work.
**Build status:** passing as of 2026-10-14 — `npm run build` exit 0 by hand on `main` `847355a`, and by the P8 hook on `f9cf382` (`fix/p18-carryover-button`)
**Typecheck status:** passing as of 2026-10-14 — `npm run typecheck` exit 0 (same runs)
**Lint status:** passing as of 2026-10-14 — `npm run lint` exit 0 (same runs)
**Test status:** `npm test` is an alias for `typecheck`; there is no separate test suite
**Note:** one bug fix and one feature (P18). No data model, store action, Firestore rules or dependency change. New: `components/focus-carryover-dialog.tsx`, `hooks/use-plan-next-slot.ts`, shared selectors in `lib/weekly-plan.ts`.

---

## Start here

1. Run `/session-start`. It checks this note against git, runs the gates and asks for the roadmap item.
2. **Open the app on the real account** and check #158 and P18 on real data (only demo mode has
   been checked): Command Center's Daily Focus equals ToDo's Daily Focus column; the Today list
   equals Schedule's today column; the carry-over prompt on the first open of the day (after the
   first sync); Plan + Undo; the focus toggle in a Schedule block. Then P16 and P17 on Schedule
   (add, edit, delete + Undo, complete, next free slot + Undo, chips, inactive projects hidden).
3. **Still open from P14:** Goals → Categories on the real account: merge or map categories only
   tasks still use ("Trading", "Job / Career", "Self-performance").
4. **Working order:** P1 → P12 → P13 → P2 → P3 → P14 → P16 → P17 → P18 → P7 → P11 → P15 → P8 → P6 → P10 → P9 → P4 → P5.
   Done: P1, P12, P13, P2, P3, P14, P16, P17, P18, P8, P6, P9, P4, P5.
   **P7:** `open` (2026-10-14). First slice, today's plan only, on `feat/p7-plan-feed` (ADR-030);
   current focus is a later slice. **P11:** `queued`, needs a write token (step 5). **P10, P15:**
   `gated` on P7.
5. **P7's first slice no longer needs these (ADR-030):** it reads the daily plan file with a read-only
   `AIOS_GITHUB_TOKEN`. P11 and P7's current-focus slice still need, as checked 2026-10-05:
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
8. **Stacked PRs:** retarget the stacked PR to `main` before merging it, after its base merges.
   #159 was merged into the already-merged #158 branch on 2026-10-14 and needed #160 to reach `main`.

---

## Where we left off (2026-10-14, second session) — Execution sync fix and P18

**Why:** Roman reported (screenshot) that tasks did not read the same across the Execution tabs:
Command Center's Daily Focus showed "0 of 3 chosen" plus three suggestions that ToDo never showed,
and ticking a suggestion completed the task. The fix went in as #158. Roman then asked for four UX
ideas from that review; they became P18 (added to the spec straight after P17). He chose: closing
the carry-over prompt keeps all tasks.

**What changed — #158 (squash `142469b`), the bug fix:**
- `lib/weekly-plan.ts`: `localDateISO`, `selectTaskTimeSlots` (one "when is this task?" for every
  tab), `selectDayAgenda` (Schedule's day as a list: blocks of any week plan plus recurring tasks).
- `lib/execution-os.ts`: `selectDailyFocus` lists every chosen task, not only up to the limit.
- `components/modules/attention-block.tsx`: chosen and suggested tasks listed separately; a
  suggestion gets "Add" (moves it to the lane) instead of a complete checkbox; today's time shown.
- `components/modules/todo-module.tsx`: the same suggestions below the Daily Focus column.
- `components/modules/command-center.tsx`: Today list from `selectDayAgenda` with the local date
  (UTC showed yesterday between 00:00 and 02:00); empty state for "Committed this week".
- `lib/store.ts`: Coaching dismissal uses the local date.

**What changed — P18 (#159 → #160, squash `847355a`):**
- `lib/weekly-plan.ts`: `orderDailyFocusTasks` (today's timed tasks first); `findNextFreeSlot`,
  `taskDurationMin`, `externalBlockDateParts` moved here from Schedule.
- `hooks/use-plan-next-slot.ts` (new): next free slot + Undo toast for Schedule and Command Center.
- `components/modules/attention-block.tsx`: `DailyFocusCard`: drag to reorder untimed tasks,
  "Plan" on tasks with no time.
- `components/focus-carryover-dialog.tsx` (new), `components/app-shell.tsx`: once-a-day prompt
  per device (`localStorage` key `magic-kick-focus-carryover-date`); waits for the first pull.
- `components/modules/schedule-module.tsx`: shared next-slot hook; block panel focus toggle.
- `components/modules/todo-module.tsx`: Daily Focus column uses the shared order under "Manual order".
- `docs/CONTROL_PLANE_UI_SPEC.md`: P18 (now `done`, 5 criteria), working order. `CHANGELOG.md`: two entries.

**Branch map:**
- `fix/execution-task-sync` off `main` `45aaa58`: `7a8414c` → **#158 merged** (squash `142469b`).
  After that, #159 merged into it (`89cfab5`), so origin's copy carries P18 too. Safe to delete.
- `feat/p18-focus-day-plan` stacked on the above: `d1151cb`, `08f859d` → **#159 merged into
  `fix/execution-task-sync`, not `main`**. Safe to delete.
- `fix/land-p18-on-main` off `main` `142469b`: `932de06` (cherry-pick of `89cfab5`, identical tree)
  → **#160 merged** (`847355a`). Safe to delete.
- `fix/p18-carryover-button` off `main` `847355a`: `f9cf382`. Same change as `08f859d` (one button
  in the prompt), which missed #159's squash, plus a CHANGELOG line. **Local only, not pushed.**
- `docs/session-close-2026-10-14-p18` off `main` `847355a`: this handoff and P18 → `done`. Not stacked.
- `docs/session-close-2026-10-14` (#157) merged; local and origin copies can be deleted.

**Verified (confirmed):**
- Gates exit 0 on `7a8414c`, `d1151cb`, `08f859d` (P8 hook), on `932de06` and `main` `847355a`
  (by hand), and on `f9cf382` (P8 hook).
- Headless Edge (playwright-core in this session's scratchpad) against Roman's dev server on :3000,
  demo mode, 1440×1000, no page errors: Add on 3 suggestions → "3 of 3 chosen"; drag row 3 onto
  row 1 reorders; Plan on the last row → toast "Scheduled … 14:00–14:30", row moves first, shows
  "today 14:00–14:30", Plan and drag handle gone; Undo restores; ToDo "Manual order" matches
  Command Center; carry-over prompt (last date set to yesterday) lists 3 ticked tasks, untick one →
  "Return 1 to Backlog" → "2 of 3 chosen", no prompt on the next reload, × keeps all; Schedule block
  panel "In Daily Focus" ↔ "Add to focus" changes Command Center's count; Schedule next free slot
  → 15:00–16:30 block, Undo removes it.

**Not verified:**
- Real account (Firestore sync, the prompt waiting for the first pull, a second device).
- 375 px or other narrow widths; light theme; keyboard drag. No screenshots attached to the PRs.
- ToDo's default sort ("Date: earliest") groups by date, so its Daily Focus order can differ from
  Command Center's (by design, P18 criterion 1). Roman to confirm.

**Process notes:**
- `node -e "…"` through the Bash tool exits silently without running (noted on 2026-10-14 for P17
  too). A CHANGELOG edit made that way never happened, and its commit message claimed it had
  (caught before push, amended into `f9cf382`). Use the Edit tool, or a script file in the
  scratchpad.
- A follow-up commit pushed while a PR is being merged can miss the squash: check
  `gh pr view <n> --json headRefOid` against the branch before merging.

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

## Open items

- **Push and merge `fix/p18-carryover-button`** (`f9cf382`, local only): `main` still shows two
  buttons ("Keep all", "Keep these") in the carry-over prompt.
- **Real-data check of #158 and P18** (Start here, step 2), then **P16 and P17**: add, edit,
  delete + Undo, complete, next free slot + Undo, chips, inactive-project tasks hidden, collapse
  rail; also light theme and a narrow window.
- **Real-data check of P14** (Start here, step 3): orphaned categories listed, merged or mapped;
  then confirm the new fields round-trip through Firestore on a second device.
- **Pick the next piece of work (Roman).** After P18 the roadmap has nothing open or unblocked. Candidates:
  the two bugs below, the dev/preview login failure, the overdue ranking in derived focus, or a new
  spec item.
- **Bug (found 2026-10-14):** Command Center with no weekly plan shows "Set weekly plan", which
  calls `setActiveModule("command-center")`, the module already open, so it does nothing. It
  should open the Plan tab.
- **Bug (found 2026-10-14):** in demo mode a loading skeleton stays under the Week tab
  (probably `coachingLoading` never cleared when AI is off or there is no auth token). Not investigated.
- **P18 follow-ups (Roman to decide):** ToDo's default "Date: earliest" sort orders Daily Focus
  differently from Command Center; the carry-over prompt is per device, so it can show on each device.
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
- **Merged branches safe to delete**, local and origin: `feat/p17-unscheduled-task-crud` (#156; its
  extra commit `6aa2c89` is an earlier handoff draft), `docs/session-close-2026-10-14` (#157),
  `fix/execution-task-sync` (#158), `feat/p18-focus-day-plan` (#159), `fix/land-p18-on-main` (#160).
  Their work is on `main`; the only commit not on `main` is `08f859d`, carried by `fix/p18-carryover-button`.
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
