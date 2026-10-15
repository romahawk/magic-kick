# Next Session Start

**Last updated:** 2026-10-15 (P7 rescope merged as #163 and checked on production, P7 `done`; Schedule block category fix merged as #164; P19 "AI Suggest proposes Daily Focus from canon" added to the spec as `queued`)
**Resume on:** `main`. Start a new branch from `main` for any work.
**Build status:** passing as of 2026-10-15 — `npm run build` exit 0 by hand on `main` `d81feda`
**Typecheck status:** passing as of 2026-10-15 — `npm run typecheck` exit 0 (same run)
**Lint status:** passing as of 2026-10-15 — `npm run lint` exit 0 (same run)
**Test status:** passing as of 2026-10-15 — `npm test` (typecheck + `vitest run`) exit 0, 9 tests in `lib/os-feed/canon-parser.test.ts`
**Note:** P7 code (#163) and one bug fix (#164) on `main`; this handoff and the P19 spec item are docs only.

---

## Start here

1. Run `/session-start`. It checks this note against git, runs the gates and asks for the roadmap item.
2. **Next by rank: P11, then P19.** P11's first slice needs a ruling from Roman before any code: the
   written slice ("check off items in today's plan") depends on plan files that stay local in the
   OS. Roman named it "Close day"; a candidate is the OS `daily-close` workflow (writes
   `06_REVIEWS/daily/YYYY-MM-DD.md`). Not confirmed.
3. **Open the app on the real account** and check #158 and P18 on real data (only demo mode has
   been checked): Command Center's Daily Focus equals ToDo's Daily Focus column; the Today list
   equals Schedule's today column; the carry-over prompt on the first open of the day (after the
   first sync); Plan + Undo; the focus toggle in a Schedule block. Then P16 and P17 on Schedule
   (add, edit, delete + Undo, complete, next free slot + Undo, chips, inactive projects hidden).
4. **Still open from P14:** Goals → Categories on the real account: merge or map categories only
   tasks still use ("Trading", "Job / Career", "Self-performance").
5. **Working order:** P1 → P12 → P13 → P2 → P3 → P14 → P16 → P17 → P18 → P7 → P11 → P19 → P15 → P8 → P6 → P10 → P9 → P4 → P5.
   Done: P1, P12, P13, P2, P3, P14, P16, P17, P18, P7, P8, P6, P9, P4, P5.
   **P7:** `done` (2026-10-15), checked by Roman on production. **P11:** `queued`, next by rank; needs
   a write token (step 6) and a rescoped first slice (step 2). **P19:** `queued` (2026-10-15), gated
   on its own ADR (the AI route freeze, ADR-017). **P10, P15:** still `gated` on P7 in the spec; P7
   is now done, so their gates need re-checking when they come up.
6. **P7 needs no OS feed script (ADR-031):** it reads `01_CONTEXT/current-focus.md` and the
   `00_HOME/context-pack.md` front matter with a read-only `AIOS_GITHUB_TOKEN`. Vercel now has it and
  the three `FIREBASE_ADMIN_*` variables (added 2026-10-15; without them every signed-in route
  answered 401). `ANTHROPIC_API_KEY` is still not set, so the AI routes cannot work in production.
  P11 still needs:
   - A GitHub fine-grained PAT, `romahawk/AI-Business-OS` only, `Contents` + `Pull requests`
     read/write, stored in Vercel as a server-only variable (suggested name `OS_GITHUB_TOKEN`, never
     `NEXT_PUBLIC_…`). On 2026-10-05 the Vercel project had only the seven Firebase variables.
7. Read ADR-024, ADR-027, ADR-028 and ADR-029 before any control-plane, category or scope decision.
8. **Commit gate (P8):** every `git commit` from Claude Code goes through
   `.claude/hooks/commit-gate.mjs`. It blocks unless the message has `Verified:` and `Not verified:`
   lines and typecheck, lint and build pass. Commits typed in a terminal are not checked, and
   neither is `git cherry-pick`: run the gates by hand after one.
9. **Stacked PRs:** retarget the stacked PR to `main` before merging it, after its base merges.
   #159 was merged into the already-merged #158 branch on 2026-10-14 and needed #160 to reach `main`.

---

## Where we left off (2026-10-15) — #163 and #164 merged, P19 specified

**Why:** #163 (P7 canon) merged on 2026-10-14 without its handoff commit (`6781a37` was pushed
after the merge), so `main`'s note still described the session before P7. Roman then reported that
new Schedule blocks always got "Learning" (#164), and asked for AI Suggest to read canon. That
request extends a frozen AI route (ADR-017, ADR-024 §6), so Roman chose to add it to the spec first.

**What changed:**
- #164 (`d81feda`), `fix/schedule-block-category`: the "New block" form has a Category select next
  to Project (follows the project's category, P14); `saveTimeBlock` takes an optional `category`
  for the new task only, not stored on the block. CHANGELOG entry 2026-10-15.
- This PR (`docs/session-close-2026-10-15`): this note (restored from `6781a37` and updated), and
  P19 in `docs/CONTROL_PLANE_UI_SPEC.md`: `queued`, ranked after P11, with the inactive-project
  filter and an ADR gate as criteria. Second commit: P7 → `done` after Roman's check on production.
- Vercel (Roman, 2026-10-15): `AIOS_GITHUB_TOKEN` and `FIREBASE_ADMIN_PROJECT_ID`, `_CLIENT_EMAIL`,
  `_PRIVATE_KEY` added for Production and Preview (sensitive). The first redeploy ran before the
  Firebase variables existed; a second one picked them up. The token first lacked repository
  access (GitHub 404 → "Current focus not found in canon"); fixed in its settings.

**Branch map:**
- `feat/p7-canon-feed`: #163 merged as `4981d89`. Its extra commit `6781a37` (handoff) is carried
  here instead. Safe to delete, local and origin.
- `fix/schedule-block-category`: #164 merged as `d81feda`. Safe to delete, local and origin.
- `docs/session-close-2026-10-15` off `main` `d81feda`: this PR. Not stacked.

**Verified (confirmed):**
- Gates on `main` `d81feda`: build, lint, `npm test` (typecheck + 9 tests) exit 0.
- #164: headless Edge on a production build, demo mode: picking "Sport" saved the task with
  category "Sport"; the stored time block has no `category`; no page errors.
- Vercel variable names and targets read through the Vercel connector (values not read).
- P7 on production, by Roman (screenshot): "From canon" lists the three outcomes (the second now
  "Ship the Rolevoice Capstone MVP", from OS commit `9060cb9`), lanes career, deutschon ai,
  alpharhythm, masters · protected, magic kick, and "Canon as of 2026-10-15 08:21 Europe/Berlin,
  reconciled 2026-10-02".

**Not verified:**
- #164 on the real account; picking a project that has a category (no demo project has one).
- P7's stale ("Last known") and error states on production; light theme; narrow widths.

---

## Where we left off (2026-10-14, third session) — P7 rescope: current focus from canon

**Why:** OS `DEC-2026-10-14-003` (OS `a5d9cfa`): Daily Focus (P18) is the day plan, and
`07_INBOX/agent/plans/` stays gitignored and local, so the file #162 (ADR-030) read never reaches OS
`main` and "From plan" always showed nothing. Roman's prompt for this session repointed P7 at tracked
canon.

**What changed (`233ec61`, PR #163, merged 2026-10-14 as `4981d89`):**
- `lib/os-feed/canon-parser.ts` (new): `parseCurrentFocus` (outcomes from `## Primary Outcomes`,
  bold title only; lanes from the `execution_allocation:` yaml block, comments stripped;
  `reconciled_with_git`; warnings, never throws) and `parseFrontMatterGenerated`.
- Removed: `lib/os-feed/plan-parser.ts` and its test, `app/api/os/plan`, `hooks/use-os-plan.ts`,
  `OsPlanList`/`OsPlanRow`. `berlinDateISO` went too (nothing else used it).
- `lib/os-feed/github.ts`: `fetchCanonFocus()`, two parallel GETs (current focus required, context
  pack optional), statuses `ok` / `not-configured` / `missing` / `error` (stale last good).
- `app/api/os/canon/route.ts`, `hooks/use-os-canon.ts`: same guard, caching and refetch as before.
- `components/modules/attention-block.tsx`: `CanonFocus`, "From canon", at the bottom of the Daily
  Focus card: outcomes, `primary`/`protected` lane badges, "Canon as of …, reconciled …".
- `lib/os-feed/canon-parser.test.ts`: 9 tests. Docs: ADR-031 (ADR-030 marked superseded), spec P7
  note (status stays `open`), README, CHANGELOG (Added + Removed), `.env.example` comment.

**Branch map:**
- `feat/p7-canon-feed` off `main` `984eb74`: `233ec61` → **#163 merged** (`4981d89`). The handoff
  commit `6781a37` missed the merge; the 2026-10-15 docs PR carries it.
- `feat/p7-plan-feed` (#162 merged as `984eb74`): local and origin copies can be deleted.
- `fix/p18-carryover-button` (`f9cf382`): **still local only, not pushed** (see Open items).

**Verified (confirmed):**
- Gates exit 0 on `233ec61` by hand (lint, typecheck, `npm test` with 9 tests, build listing
  `/api/os/canon`) and by the P8 hook.
- `.next/static` contains neither `AIOS_GITHUB_TOKEN` nor `api.github.com`.
- The parser run (Node 22 strip-types, scratchpad) on the real OS `main` files: 3 outcomes, 9 lanes,
  `reconciledWithGit` 2026-10-02, pack `generated` "2026-10-14 19:37 Europe/Berlin", no warnings.
- `package.json` unchanged, so `pnpm-lock.yaml` needs no update.

**Not verified:**
- The route against GitHub with a real token (no `AIOS_GITHUB_TOKEN` in `.env.local`): `ok`,
  `missing`, `error`/stale and pack-failure paths were not exercised.
- The block in a browser in any state; Vercel preview; light theme; 375 px. No screenshots in #163.

**Process notes:**
- After renaming a route, `tsc` failed on stale `.next/types` until `next build` regenerated them.
- `sed` replacement with `\\uFEFF` through the Bash tool dropped the backslash; fixed with Edit.

---

## Open items

- **Push and merge `fix/p18-carryover-button`** (`f9cf382`, local only): `main` still shows two
  buttons ("Keep all", "Keep these") in the carry-over prompt.
- **P11 first slice (Roman):** confirm what "Close day" means (Start here, step 2), then a spec
  change and an ADR rescoping P11's first slice, and a separate read/write token.
- **`ANTHROPIC_API_KEY` is not set in Vercel** (checked 2026-10-15), so AI Suggest and the other AI
  routes fail in production. Needed before P19 can be checked there.
- **Unused OS PAT "AI-Business-OS agent jobs"** (never used, expires 2026-10-22): Roman may delete
  it. The OS `current-focus.md` "Waiting #1" PAT entry is then stale (OS session).
- **Real-data check of #158 and P18** (Start here, step 3), then **P16 and P17**: add, edit,
  delete + Undo, complete, next free slot + Undo, chips, inactive-project tasks hidden, collapse
  rail; also light theme and a narrow window.
- **Real-data check of P14** (Start here, step 4): orphaned categories listed, merged or mapped;
  then confirm the new fields round-trip through Firestore on a second device.
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
- **AI Suggest:** now P19 in the spec (2026-10-15), including the inactive-project filter (Roman's
  ruling). Also open there: `isAiEnabled()` defaults on, while ADR-017 says default off; P19's ADR
  states which holds.
- **P11 blocker:** a read/write GitHub PAT in Vercel (Roman). See Start here, step 6. P7 no longer
  waits on an OS feed script (OS `DEC-2026-10-14-003`, ADR-031).
- **OS session** (prompt drafted 2026-10-04; Roman holds it). Deliverables: decision-template field
  "Repo decisions affected"; one generic `repo-sync` skill with the old sync skills as aliases; an
  amendment line on `DEC-2026-10-03-001` (MK ADR-023 superseded); an OS decision removing the
  2026-10-21 revert (ADR-024 §8); `source-of-truth-map.md` and `02_PROJECTS/magic-kick/context.md`
  recording that MK writes to the OS repo (ADR-024 §5). (The context feed, P7 path step 2, was
  dropped by OS `DEC-2026-10-14-003`.)
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
  `fix/execution-task-sync` (#158), `feat/p18-focus-day-plan` (#159), `fix/land-p18-on-main` (#160),
  `docs/session-close-2026-10-14-p18` (#161), `feat/p7-plan-feed` (#162), `feat/p7-canon-feed`
  (#163), `fix/schedule-block-category` (#164).
  Their work is on `main`. Commits not on `main`: `08f859d`, carried by `fix/p18-carryover-button`;
  `6781a37` (#163's handoff), carried by `docs/session-close-2026-10-15`.
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
