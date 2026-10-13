# Next Session Start

**Last updated:** 2026-10-13 (P16 "Schedule: unscheduled-tasks panel" added, built and merged as #154; no roadmap item open)
**Resume on:** `main` after this `docs/session-close-2026-10-13` PR merges. Start a new branch from `main` for any work.
**Build status:** passing as of 2026-10-13 — `npm run build` exit 0 on `148c983`, by hand and by the P8 hook; `main` `ae78927` (squash of #154) has the identical tree (`git diff 148c983 origin/main` empty)
**Typecheck status:** passing as of 2026-10-13 — `npm run typecheck` exit 0 (same run)
**Lint status:** passing as of 2026-10-13 — `npm run lint` exit 0 (same run)
**Test status:** `npm test` is an alias for `typecheck`; there is no separate test suite
**Note:** one feature session (P16) plus a bug fix (legacy project colors). No data model, Firestore rules or dependency change; one new `localStorage` key (`magic-kick-schedule-tasks-collapsed`).

---

## Start here

1. Run `/session-start`. It checks this note against git, runs the gates and asks for the roadmap item.
2. **Open the app on the real account → Schedule** and check P16 on real data: tasks of paused,
   parked or completed projects are gone from "Unscheduled tasks" (the count line at the bottom),
   the category chips, the clock button (next free slot) and both Undo buttons. Demo mode only so far.
3. **Still open from P14:** Goals → Categories on the real account: merge or map categories only
   tasks still use ("Trading", "Job / Career", "Self-performance").
4. **Working order:** P1 → P12 → P13 → P2 → P3 → P14 → P16 → P7 → P11 → P15 → P8 → P6 → P10 → P9 → P4 → P5.
   Done: P1, P12, P13, P2, P3, P14, P16, P8, P6, P9, P4, P5. **P7, P11:** `queued` but blocked (step 5).
   **P10, P15:** `gated` on P7. **No roadmap item is open and none is unblocked.**
   A session must name a bug from Open items or a new item Roman adds to the spec; otherwise it stops.
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

## Where we left off (2026-10-09) — P14 one category model

**Why:** task labels differed between ToDo, Schedule and Projects. Project and Schedule tasks always
got the first category ("Learning"), Schedule badges were grey, XP was keyed on five category names,
and categories still used by tasks had dropped out of the profile's list (the profile syncs as one
document, newest wins), so they could not be edited. Roman chose flexible Magic Kick categories with
an optional OS domain (ADR-029) over adopting the four OS domains only.

**What changed (squash `66c3bf6`, #152):**
- `docs/CONTROL_PLANE_UI_SPEC.md`: P14 (now `done`, 8 criteria) and P15 (`gated` on P7: read OS
  domains); working order. `docs/DECISIONS_LOG.md`: ADR-029; ADR-004 superseded.
- `lib/categories.ts` (new): defaults, colors, `categoryKey`/`findCategoryConflict`,
  `defaultTaskCategory`, `OS_DOMAINS` (hard-coded until P15), `withUsedCategories`.
- `components/category-badge.tsx`, `hooks/use-categories.ts` (new): the one badge and the full list.
- `lib/types.ts`: `OsDomain`; `Project.category` ("" = none); `Profile.taskCategoryDomains`
  ("" = unmapped, because the profile is written with `merge: true` and a removed key would not sync).
- `lib/store.ts`: category actions use the full list; rename onto an existing name merges; rename and
  delete skip deleted items (**they used to set `deleted: false`, resurrecting deleted tasks and
  goals**) and update projects; `setCategoryDomain`; Schedule block tasks take the project's category.
- `lib/xp-engine.ts`: base XP 20 for every category; a category change no longer recalculates XP.
- Projects dialog "Task category"; Goals → Categories: OS domain select, merge confirmation.
  ToDo, Schedule, Journal, Quick Add, onboarding use the shared list, badge and defaults.
- `CHANGELOG.md`: "One category model (P14)", dated 2026-10-09.

**Branch map:**
- `feat/categories-single-source` off `main` `45f25c9`, head `3bd2f34` (7 commits) → **#152 merged**
  (squash `66c3bf6`). Branch deleted on origin and locally on 2026-10-09.
- `docs/session-close-2026-10-09` off `main` `66c3bf6`: this handoff, PR #153. Not stacked.

**Branch cleanup (2026-10-09, confirmed):** deleted on origin and locally after checking each PR is
MERGED with the branch at the PR head: `feat/categories-single-source` (#152),
`fix/signup-hydration-to-main` (#150), `docs/session-close-2026-10-06d` (#151),
`fix/signup-hydration-mismatch` (#149, local only). `fix/login-hydration-mismatch` was at `3148374`
(#148 head plus the stray #149 merge); its tree equals `4a387e1` (#150), so nothing was lost.

**Verified (confirmed):**
- Gates exit 0 by hand on `3bd2f34` (typecheck, lint, build) and by the P8 hook on every commit;
  `git diff 3bd2f34 origin/main` is empty.
- Headless Edge on the dev server, demo mode, 1400 px, no page errors: badges colored in ToDo,
  Schedule, Goals; domain mapping survives a rename; "family-home" refused next to "Family/Home";
  project category Sport → roadmap task got Sport, XP 25; categories used only by demo tasks listed
  in the manager; rename Sales → "marketing" prompted and merged; a deleted task stayed deleted after
  its category was renamed.

**Not verified:**
- Anything on a real account: Firestore round-trip of the new fields, two devices syncing, the
  orphaned categories in Roman's data.
- A Schedule block linked to a project creating its task with the project's category (code only).
- 375 px, light theme, keyboard use of the new selects. No screenshots in #152.

**Process notes:**
- The dev server rewrites `next-env.d.ts` (`.next/dev/types`); it was restored before the push.
- Stopping `next dev` by killing the parent left the `start-server.js` child on :3001; stop the
  process that owns the port.

---

## Open items

- **Real-data check of P16** (Start here, step 2): inactive-project tasks hidden, chips, next free
  slot, both Undo buttons, collapse rail; also light theme and a narrow window.
- **Real-data check of P14** (Start here, step 3): orphaned categories listed, merged or mapped;
  then confirm the new fields round-trip through Firestore on a second device.
- **Pick the next piece of work (Roman).** The roadmap has nothing open or unblocked (again, after P16). Candidates:
  the dev/preview login failure (worth re-testing after the auth-button fix), the overdue ranking in
  derived focus, or a new spec item.
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
  projects (left out of P16 on purpose). Roman to decide whether it should use the same filter.
- **P7 / P11 blockers:** the OS context feed (OS session) and the GitHub PAT in Vercel (Roman).
  See Start here, step 5.
- **OS session** (prompt drafted 2026-10-04; Roman holds it). Deliverables: decision-template field
  "Repo decisions affected"; one generic `repo-sync` skill with the old sync skills as aliases; an
  amendment line on `DEC-2026-10-03-001` (MK ADR-023 superseded); an OS decision removing the
  2026-10-21 revert (ADR-024 §8); `source-of-truth-map.md` and `02_PROJECTS/magic-kick/context.md`
  recording that MK writes to the OS repo (ADR-024 §5); the context feed (P7 path step 2).
  The OS `current-focus.md` still says "P7 next, then P8" and the OS MK `context.md` still says P1
  is open (both stale; MK sessions do not edit them).
- **Allocation reverts to `limited` on 2026-10-21** until that OS decision lands.
- **P1 small-phone ruling** (360×800 shows focus + about 2½ attention rows), Roman. Carried by ADR-027.
- **UI finding from the P1 check, still open:** the "Friday with zero done" text (not in any
  component; most likely the parked AI coaching route). (`/login` hydration fixed 2026-10-06.)
- **Journal header still shows a streak** (left by P6; Journal is a reference module). Roman to decide.
- **`SystemConfig.weeklyOutcomeLimit`** is no longer read after P2 (ADR-022); left in the config.
- **Dev and preview logins** (reported failing 2026-09-24) still not investigated. Production login works.
- **Positioning docs** `docs/PUBLIC_PRESENTATION.md` and `docs/WORKFLOW_AUTOMATION_PLAYBOOK.md` still use
  the sandbox wording (left on purpose by ADR-024).
- **The `roadmap` label** in `.github/ISSUE_TEMPLATE/feature.md` may not exist on GitHub.
- **Merged branches safe to delete (confirmed 2026-10-13):** `feat/schedule-unscheduled-panel`
  (#154) and `docs/session-close-2026-10-09` (#153, tree equals `a80a14d`), local and origin.
- **Older branches.** Local `dev` is merged into `origin/main` (confirmed 2026-10-06) and can be
  deleted. Not confirmed merged: local `ai-control-tower` (origin gone),
  `feat/projects-tab-density-redesign`, `feat/schedule-block-editor-improvements`,
  `feature/resource-reorder-and-milestone-schedule`, `fix/close-phase-1-adrs`,
  `fix/sync-existing-profile-on-new-domain`; on origin, 16 besides `main` (`git branch -r`). Check
  each one's work reached `main` before deleting.
- **MK-DEC-006**, cited by P7, is not in this repo's log; assumed to live in the OS repo.
- **ADR numbering:** ADR-022 (2026-10-05) sits after ADR-027; ADR-016…019 are dated 2026-08-09 but
  follow ADR-015. Cosmetic.
- **Track 2 (from ADR-017):** validate state server-side in the existing AI routes.
