# Next Session Start

**Last updated:** 2026-10-06 (session of 2026-10-06: #145 merged, two P1 UI bugs fixed; no roadmap item open)
**Resume on:** `main` (`4b2d4ef`, #145) after the `docs/session-close-2026-10-06b` PR merges. Start a new branch from `main` for any work.
**Build status:** passing as of 2026-10-06 — `npm run build` exit 0 on `a990cee` (#145 head; tree identical to `main` at `4b2d4ef`), run by the P8 commit-gate hook and again by hand (Next.js 16.1.6, Turbopack, Node 22.19.0)
**Typecheck status:** passing as of 2026-10-06 — `npm run typecheck` exit 0 (same runs)
**Lint status:** passing as of 2026-10-06 — `npm run lint` exit 0 (same runs)
**Test status:** `npm test` is an alias for `typecheck`; there is no separate test suite
**Note:** one bug-fix session on the Command Center "Now" block. No dependency, store, data-model or Firestore-rules change.

---

## Start here

1. Run `/session-start`. It checks this note against git, runs the gates and asks for the roadmap item.
2. **Working order:** P1 → P12 → P13 → P2 → P3 → P7 → P11 → P8 → P6 → P10 → P9 → P4 → P5.
   Done: P1, P12, P13, P2, P3, P8, P6, P9, P4, P5. **P7, P11:** `queued` but blocked (step 3).
   **P10:** `gated` on P7. **No roadmap item is open and none is unblocked.** A session must name a
   bug from Open items or a new item Roman adds to the spec; otherwise it stops.
3. **P7 and P11 still need two things from outside this repo** (checked 2026-10-05):
   - The OS context feed: no feed script in `AI-Business-OS/10_AUTOMATION/scripts/` and no feed-shape
     document. An OS session owns it (OS `current-focus.md`, P7 path step 2).
   - A GitHub fine-grained PAT, `romahawk/AI-Business-OS` only, `Contents` + `Pull requests`
     read/write, stored in Vercel as a server-only variable (suggested name `OS_GITHUB_TOKEN`, never
     `NEXT_PUBLIC_…`). On 2026-10-05 the Vercel project had only the seven Firebase variables.
4. Read ADR-024, ADR-027 and ADR-028 before any control-plane or scope decision.
5. **Commit gate (P8):** every `git commit` from Claude Code goes through
   `.claude/hooks/commit-gate.mjs`. It blocks unless the message has `Verified:` and `Not verified:`
   lines and typecheck, lint and build pass (about 31 s: typecheck 4 s, lint 14 s, build 14 s,
   measured 2026-10-05). Commits typed in a terminal are not checked.

---

## Where we left off (2026-10-06) — Daily Focus count and duplicate overdue rows fixed

**Merged to `main` (by Roman, on GitHub):**
- **#144** `7d15add` — the previous session-close handoff.
- **#145** `4b2d4ef` — bug fix from the P1 UI findings (branch `fix/daily-focus-overdue`, `a990cee`):
  - `lib/execution-os.ts`: `selectDailyFocus` marks each entry `chosen` (Daily Focus lane) or not
    (derived fill); `selectAttentionItems` skips overdue tasks already in today's focus.
  - `components/modules/attention-block.tsx`: header "n of limit chosen" (was "n of limit today",
    counting derived fill); derived rows say "suggested"; an overdue focus row says
    "overdue, due d MMM" in red; due date parsed with `parseISO` (was `new Date`, read as UTC).
  - `CHANGELOG.md`: Fixed entry dated 2026-10-06.

**Rule chosen in #145 (Roman to confirm; no ADR):** an overdue task in Daily Focus counts as being
dealt with, so Needs attention does not repeat it. The alternative was to keep the attention row and
stop the derived fill from picking overdue tasks.

**Branch map:** `fix/daily-focus-overdue` off `main` `7d15add`, not stacked, merged as #145. This close
is on `docs/session-close-2026-10-06b` off `main` `4b2d4ef`. Merged and still on origin, safe to
delete: `fix/daily-focus-overdue`, `docs/session-close-2026-10-06`, plus the previous session's list
below. Local `main` is behind `origin/main`; pull before branching.

**Verified (confirmed):**
- Session start: `origin/main` `7d15add` passed lint, typecheck, build (exit 0).
- #145: lint, typecheck, build exit 0 on `a990cee`, by the P8 hook and again by hand (output in the PR).
  `main` at `4b2d4ef` has the same tree (`git diff a990cee origin/main` empty).
- Selectors: the real `lib/execution-os.ts` under `node --experimental-strip-types` on 10 sample cases,
  all passing (none chosen → 3 suggested; derived overdue not duplicated; chosen overdue not
  duplicated; overdue outside focus and in the parking lot keep their row; 1 chosen + 2 suggested).
- Browser: headless Edge on the dev server in demo mode, 1280×800 and 375×812: "0 of 3 chosen" with
  suggested rows. With the demo store edited (one task overdue and in the Daily Focus lane, another
  overdue in the backlog): the first shows once, in focus, in red; the second keeps its attention row.
- The `@AGENTS.md` import works in a fresh Claude Code session: the AGENTS.md rules, including
  "Commit, Push and PR Descriptions", were in context at session start without opening the file.

**Not verified:**
- #145 on a real (non-demo) account; light theme; keyboard walk.
- Derived fill picking an overdue task, seen in a browser (selector cases only: in the demo data,
  tasks due today outrank overdue ones, because overdue tasks get no due-date score).
- No before screenshots in #145.
- Everything under the previous session's "Not verified" below, unchanged.

**Process notes:**
- The Node selector harness and playwright-core scripts were rebuilt in the session scratchpad. In the
  harness, absolute imports need `file:///D:/…` URLs and `date-fns` resolved from the repo's
  `node_modules`.
- The demo store is `localStorage["magic-kick-store"]` (`{ state, version }`); editing `state.tasks`
  and reloading sets up browser cases the demo data does not have.
- The Gmail and Google Calendar claude.ai connectors need authorizing in claude.ai settings. Advice
  given: connect Calendar; hold Gmail until a concrete job needs it. No repo change.

---

## Where we left off (2026-10-05, session 2) — ten roadmap items closed, rules in one file

**Merged to `main` (by Roman, on GitHub):**
- **#133** `17bc2e6` — spec: new **P13** "ToDo toolbar and Done view".
- **#134** `2e8ce85` — **P13**: `todo-module.tsx` drops the status filter and the Archive card; a
  "Done (n)" toggle swaps the board for a Done view grouped by `completedAt`; category clear button.
  ADR-026 (built while P1 was open).
- **#135** `d26c8d6` — **ADR-027**: P1 closed by Roman without the usage count (criterion 6 recorded
  as *not measured*); P13 done; P2 opened and moved up.
- **#136** `07d4c36` — **P2 / ADR-022**: this week's `WeeklyPlan` is the only source of a weekly
  outcome. `lib/execution-os.ts` `selectThisWeekOutcomes()`; attention rows "Past end date", "No plan
  for this week", "No weekly outcome"; load counts `projectsPastEnd`; dead selectors deleted;
  `Project.weeklyOutcome` no longer read (data kept). `attention-block`, `command-center` (controlled
  tabs), `projects-module`, `lib/ai/insights.ts`, `ARCHITECTURE.md`, `FIREBASE_ARCHITECTURE.md`.
- **#137** `f0dc643` — **P3 / ADR-028**: attention rows carry actions as data (`open-module`,
  `open-tab`, `update-project`); "Past end date" gets Complete / Park / Extend; new "Last week not
  reviewed" row; rows show "since"; the Review tab reviews last week while it is unreviewed
  (`WeeklyReviewCard`); `lib/weekly-plan.ts` `selectWeekAwaitingReview()`.
- **#138** `5a0655a` — **P8**: commit-gate hook (`.claude/hooks/commit-gate.mjs`,
  `.claude/settings.json` PreToolUse for Bash and PowerShell with `if: "<Tool>(git commit*)"`).
- **#139** `a332d76` — **P6**: sidebar profile card shows name only; avatar menu adds level;
  Achievements header adds streak.

- **#140** `c5cb0a7` — **P9**: `AGENTS.md` is the single rule set; `CLAUDE.md` imports it; references
  in `CONTRIBUTING.md`, PR template, `docs/CLAUDE.md`, session-close skill and the hook point at
  `AGENTS.md`; spec: P6 done, P9 open, P10 gated. P9 is set `done` by this close.
- **#141** `5c5ac71` — **P4**: optional `source` (`manual` | `agent` | `import`) and `sourceId` on Task
  and Project; `lib/provenance.ts` (`sourceOf`, `sourceLabel`, `findBySource`); `addTask` /
  `addProject` skip a duplicate `source + sourceId` (deleted items included); "Agent" / "Import" label
  on non-manual items in ToDo and Projects. No store migration: untagged reads as `manual`.
- **#142** `db72ad5` — session-close handoff; P9 and P4 set `done`.
- **#143** `7e6a3ad` — **P5**: `NAV_GROUPS` in `sidebar.tsx` (Execution: Command Center, Schedule,
  ToDo, Projects; Reference: Goals, Resources, Journal, Achievements, visually secondary; divider when
  collapsed; list `aria-label`s, `aria-current`); `mobile-nav.tsx` uses it; bottom bar reordered Home,
  Schedule, ToDo, Projects, Journal. P5 is set `done` by this close.

**Branch map:** all branches are off `main`, none stacked except #136 on #135 (both merged in order).
Merged and still on origin, safe to delete: `docs/p13-todo-done-view`, `feat/p13-todo-done-view`,
`docs/p1-done-p2-open`, `feat/p2-weekly-outcome-source`, `feat/p3-attention-decisions`,
`feat/p8-commit-gate-hook`, `feat/p6-gamification-placement`, `docs/p9-one-governance-file`,
`feat/p4-provenance-fields`, `docs/session-close-2026-10-05b`, `feat/p5-navigation-weight`,
`docs/session-close-2026-10-05`. Local copies also remain; the local `docs/p9-one-governance-file`
holds an unpushed first copy of this handoff (`89b3480`), superseded; delete it. This close is on
`docs/session-close-2026-10-06`.

**Verified (confirmed):**
- Gates exit 0 on every PR's head: run by hand for #133–#137, by the P8 hook for #138–#143.
- P4: the real `lib/provenance.ts` on 9 sample cases, all passing.
- P5 in a browser: headless Edge (playwright-core in the session scratchpad) on the dev server in demo
  mode; sidebar expanded and collapsed at 1280×800, mobile menu and bottom bar at 375×812; group
  lists read from the accessibility tree. Same eight `ModuleId`s before and after. The same
  screenshots show P6's name-only profile card, expanded and collapsed.
- P13 Done grouping, P2 selectors and P3 attention items: the real `lib/*.ts` code run under
  `node --experimental-strip-types` with sample data (cases listed in each PR).
- P8: pipe tests of the hook script; live probes via the Bash and PowerShell tools were blocked; the
  P8, P6 and P9 commits passed through it.
- P9: a line-by-line check found no rule lost from the old `CLAUDE.md` or `AGENTS.md`.
- `@AGENTS.md` import and hook format checked against the official Claude Code docs.

**Not verified:**
- **Only P5 (and P6's profile card) was opened in a browser.** Not seen: the ToDo Done view and
  toolbar (incl. 375 px), the P2/P3 attention rows and actions, the Plan/Review tab switch, reviewing
  last week end to end, three action buttons wrapping at 360 px, the avatar menu and Achievements.
- P5: a keyboard-only walk through the nav; light theme; a real (non-demo) account.
- After P2, projects that were covered by their objective now show "No plan for this week" or "No
  weekly outcome" until this week's plan exists. The attention list may be longer at first.
- Unticking a task in the Done view clears its `completedAt`; ticking it again stamps today.
- The `@AGENTS.md` import in a fresh session; Codex/Cursor/Copilot reading `AGENTS.md`.
- The hook's `--amend --no-edit` path; a gate failing on this repo's real code.
- P4: the duplicate guards inside `addTask` / `addProject` (no store test harness); the
  "Agent" / "Import" label (nothing writes non-manual items yet); Firestore round-trip of `source` and
  `sourceId`.
- Still open from the previous session: the P12 store migration v11 → v12 on real data; Firestore
  sync of the P12 fields across two devices.

**Process notes:**
- One session ran the whole day in this checkout; no parallel sessions this time.
- Node 22 can run the app's TypeScript selectors directly for checks: `node --experimental-strip-types
  --import <register.mjs>` with a resolver hook for the `@/` alias (built in the session scratchpad,
  not committed). Worth keeping if checks like this recur.
- On 2026-10-05 a `next build` crashed once with "JavaScript heap out of memory" while the machine had
  about 1.8 GB of commit memory free; it passed after memory was freed.
- Browser checks without a repo dependency: `npm i playwright-core` in a scratch folder, launch the
  installed Edge (`C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`), open
  `http://localhost:3001`, click **Try Demo**, and use one browser context for every page so the demo
  session carries over. Used for P5 on 2026-10-05.
- The session ran past midnight; this close is dated 2026-10-06.

---

## Open items

- **Pick the next piece of work (Roman).** The roadmap has nothing open or unblocked. Candidates from
  this list: the `/login` hydration mismatch, the dev/preview login failure, the overdue ranking in
  derived focus, or a new spec item.
- **Confirm the #145 rule** (an overdue task in Daily Focus is not repeated in Needs attention), Roman.
- **Derived Daily Focus ranks overdue tasks below anything due this week:** once past due a task gets
  no due-date score (`selectDailyFocus`). Found 2026-10-06; Roman to decide whether overdue tasks
  should be suggested first.
- **P7 / P11 blockers:** the OS context feed (OS session) and the GitHub PAT in Vercel (Roman).
  See Start here, step 3.
- **OS session** (prompt drafted 2026-10-04; Roman holds it). Deliverables: decision-template field
  "Repo decisions affected"; one generic `repo-sync` skill with the old sync skills as aliases; an
  amendment line on `DEC-2026-10-03-001` (MK ADR-023 superseded); an OS decision removing the
  2026-10-21 revert (ADR-024 §8); `source-of-truth-map.md` and `02_PROJECTS/magic-kick/context.md`
  recording that MK writes to the OS repo (ADR-024 §5); now also the context feed (P7 path step 2).
  The OS `current-focus.md` still says "P7 next, then P8" (stale since 2026-10-05; MK sessions do
  not edit it).
- **Allocation reverts to `limited` on 2026-10-21** until that OS decision lands.
- **P1 small-phone ruling** (360×800 shows focus + about 2½ attention rows), Roman. Carried by ADR-027.
- **UI findings from the P1 check, still open:** the "Friday with zero done" text (not in any
  component; most likely the parked AI coaching route); `/login` logs a React hydration mismatch on
  the `disabled` attribute. (Overdue tasks in two places and "3 of 3 today" fixed in #145.)
- **Journal header still shows a streak** (left by P6; Journal is a reference module). Roman to decide.
- **`SystemConfig.weeklyOutcomeLimit`** is no longer read after P2 (ADR-022); left in the config.
- **Dev and preview logins** (reported failing 2026-09-24) still not investigated. Production login works.
- **Positioning docs** `docs/PUBLIC_PRESENTATION.md` and `docs/WORKFLOW_AUTOMATION_PLAYBOOK.md` still use
  the sandbox wording (left on purpose by ADR-024).
- **The `roadmap` label** in `.github/ISSUE_TEMPLATE/feature.md` may not exist on GitHub.
- **Merged remote branches** to delete (Branch map above; session 1's are already gone from origin),
  plus older local ones (`ai-control-tower`, `dev`,
  `feat/projects-tab-density-redesign`, `feat/schedule-block-editor-improvements`,
  `feature/resource-reorder-and-milestone-schedule`, `fix/close-phase-1-adrs`,
  `fix/sync-existing-profile-on-new-domain`). Check each before deleting.
- **MK-DEC-006**, cited by P7, is not in this repo's log; assumed to live in the OS repo.
- **ADR numbering:** ADR-022 (2026-10-05) sits after ADR-027 because the number was reserved for P2 in
  2026-09; ADR-016…019 are dated 2026-08-09 but follow ADR-015. Cosmetic.
- **Track 2 (from ADR-017):** validate state server-side in the existing AI routes.
