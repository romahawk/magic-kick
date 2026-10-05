# Next Session Start

**Last updated:** 2026-10-05 (second session of the day: #133–#139 merged, #140 open; P13, P1, P2, P3, P8, P6 closed; P9 built; P10 gated)
**Resume on:** `main` after #140 (`docs/p9-one-governance-file`, which carries this handoff) merges. `main` is `a332d76` (#139) until then. Start a new branch from `main` for any work.
**Build status:** passing as of 2026-10-05 — `npm run build` exit 0, run by the P8 commit-gate hook on `8b16115` (#140 head) (Next.js 16.1.6, Turbopack, Node 22.19.0)
**Typecheck status:** passing as of 2026-10-05 — `npm run typecheck` exit 0 (same run)
**Lint status:** passing as of 2026-10-05 — `npm run lint` exit 0 (same run)
**Test status:** `npm test` is an alias for `typecheck`; there is no separate test suite
**Note:** code, governance and tooling session. No dependency, store-version or Firestore-rules changes. A commit-gate hook now runs on every `git commit` from Claude Code.

---

## Start here

1. Run `/session-start`. It checks this note against git, runs the gates and asks for the roadmap item.
2. **Rules now live in `AGENTS.md`** (P9, #140). `CLAUDE.md` keeps the governing rule, imports
   `AGENTS.md` with `@AGENTS.md` and adds Claude Code specifics. Check at session start that the
   imported rules are in context (first session after the change; not verified yet).
3. **Working order:** P1 → P12 → P13 → P2 → P3 → P7 → P11 → P8 → P6 → P10 → P9 → P4 → P5.
   Done: P1, P12, P13, P2, P3, P8, P6. **P9:** set `done` once #140 merges. **P7, P11:** blocked
   (step 4). **P10:** `gated` on P7. **Next unblocked item: P4** (provenance fields on Task and
   Project, S), then P5 (navigation weight, S).
4. **P7 and P11 still need two things from outside this repo** (checked 2026-10-05):
   - The OS context feed: no feed script in `AI-Business-OS/10_AUTOMATION/scripts/` and no feed-shape
     document. An OS session owns it (OS `current-focus.md`, P7 path step 2).
   - A GitHub fine-grained PAT, `romahawk/AI-Business-OS` only, `Contents` + `Pull requests`
     read/write, stored in Vercel as a server-only variable (suggested name `OS_GITHUB_TOKEN`, never
     `NEXT_PUBLIC_…`). On 2026-10-05 the Vercel project had only the seven Firebase variables.
5. Read ADR-024, ADR-027 and ADR-028 before any control-plane or scope decision.
6. **Commit gate (P8):** every `git commit` from Claude Code goes through
   `.claude/hooks/commit-gate.mjs`. It blocks unless the message has `Verified:` and `Not verified:`
   lines and typecheck, lint and build pass (about 31 s: typecheck 4 s, lint 14 s, build 14 s,
   measured 2026-10-05). Commits typed in a terminal are not checked.

---

## Where we left off (2026-10-05, session 2) — seven roadmap items closed, rules in one file

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

**Open:** **#140** `8b16115` + this close — **P9**: `AGENTS.md` is the single rule set; `CLAUDE.md`
imports it; references in `CONTRIBUTING.md`, PR template, `docs/CLAUDE.md`, session-close skill and the
hook point at `AGENTS.md`; spec: P6 done, P9 open, P10 gated.

**Branch map:** all branches are off `main`, none stacked except #136 on #135 (both merged in order).
Merged and still on origin, safe to delete: `docs/p13-todo-done-view`, `feat/p13-todo-done-view`,
`docs/p1-done-p2-open`, `feat/p2-weekly-outcome-source`, `feat/p3-attention-decisions`,
`feat/p8-commit-gate-hook`, `feat/p6-gamification-placement`, `docs/session-close-2026-10-05`.
Open: `docs/p9-one-governance-file` (#140). Local copies of the merged branches also remain.

**Verified (confirmed):**
- Gates exit 0 on every PR's head: run by hand for #133–#137, by the P8 hook for #138–#140.
- P13 Done grouping, P2 selectors and P3 attention items: the real `lib/*.ts` code run under
  `node --experimental-strip-types` with sample data (cases listed in each PR).
- P8: pipe tests of the hook script; live probes via the Bash and PowerShell tools were blocked; the
  P8, P6 and P9 commits passed through it.
- P9: a line-by-line check found no rule lost from the old `CLAUDE.md` or `AGENTS.md`.
- `@AGENTS.md` import and hook format checked against the official Claude Code docs.

**Not verified:**
- **No UI change from this session was opened in a browser** (no screenshots): the ToDo Done view
  and toolbar (incl. 375 px), the P2/P3 attention rows and actions, the Plan/Review tab switch,
  reviewing last week end to end, three action buttons wrapping at 360 px, the name-only sidebar
  (expanded and collapsed), avatar menu and Achievements.
- After P2, projects that were covered by their objective now show "No plan for this week" or "No
  weekly outcome" until this week's plan exists. The attention list may be longer at first.
- Unticking a task in the Done view clears its `completedAt`; ticking it again stamps today.
- The `@AGENTS.md` import in a fresh session; Codex/Cursor/Copilot reading `AGENTS.md`.
- The hook's `--amend --no-edit` path; a gate failing on this repo's real code.
- Still open from the previous session: the P12 store migration v11 → v12 on real data; Firestore
  sync of the P12 fields across two devices.

**Process notes:**
- One session ran the whole day in this checkout; no parallel sessions this time.
- Node 22 can run the app's TypeScript selectors directly for checks: `node --experimental-strip-types
  --import <register.mjs>` with a resolver hook for the `@/` alias (built in the session scratchpad,
  not committed). Worth keeping if checks like this recur.
- On 2026-10-05 a `next build` crashed once with "JavaScript heap out of memory" while the machine had
  about 1.8 GB of commit memory free; it passed after memory was freed.

---

## Where we left off (2026-10-05, session 1) — Magic Kick became the OS UI; P1 fixed; P12 and ToDo shipped

**Merged to `main`:** #126 (production URL docs), #127 (ADR-023), #128 (P1 load row), #129 (ADR-024,
Magic Kick is the UI of AI-Business-OS; P11 added), #130 (ToDo time groups), #131 (P12 project
roadmap, ADR-025, store v11 → v12).

**Verified then:** gates on `48a1144`; P1, #128, #130 and P12 checked in a browser (headless Edge).

**Not verified then:** the P12 migration on real data; P12 sync across devices; #130 at mobile widths.

---

## Open items

- **Merge #140**, then set P9 `done` in the spec.
- **P7 / P11 blockers:** the OS context feed (OS session) and the GitHub PAT in Vercel (Roman).
  See Start here, step 4.
- **OS session** (prompt drafted 2026-10-04; Roman holds it). Deliverables: decision-template field
  "Repo decisions affected"; one generic `repo-sync` skill with the old sync skills as aliases; an
  amendment line on `DEC-2026-10-03-001` (MK ADR-023 superseded); an OS decision removing the
  2026-10-21 revert (ADR-024 §8); `source-of-truth-map.md` and `02_PROJECTS/magic-kick/context.md`
  recording that MK writes to the OS repo (ADR-024 §5); now also the context feed (P7 path step 2).
- **Allocation reverts to `limited` on 2026-10-21** until that OS decision lands.
- **P1 small-phone ruling** (360×800 shows focus + about 2½ attention rows), Roman. Carried by ADR-027.
- **UI findings from the P1 check, not fixed:** overdue tasks appear in both Daily Focus and Needs
  attention; Daily Focus says "3 of 3 today" when none is due today; the "Friday with zero done" text
  (not in any component; most likely the parked AI coaching route); `/login` logs a React hydration
  mismatch on the `disabled` attribute.
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
