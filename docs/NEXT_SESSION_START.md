# Next Session Start

**Last updated:** 2026-10-09 (P14 "One category model across modules" built and merged as #152; no roadmap item open)
**Resume on:** `main` after this `docs/session-close-2026-10-09` PR merges. Start a new branch from `main` for any work.
**Build status:** passing as of 2026-10-09 — `npm run build` exit 0 on `3bd2f34`, run by hand; `main` `66c3bf6` has the identical tree (Next.js 16.1.6, Turbopack, Node 22.19.0). The P8 hook also passed on each of the 7 commits
**Typecheck status:** passing as of 2026-10-09 — `npm run typecheck` exit 0 (same run)
**Lint status:** passing as of 2026-10-09 — `npm run lint` exit 0 (same run)
**Test status:** `npm test` is an alias for `typecheck`; there is no separate test suite
**Note:** one feature session (P14). Data model change: optional `Project.category` and `Profile.taskCategoryDomains`; no migration, no Firestore rules change, no dependency change.

---

## Start here

1. Run `/session-start`. It checks this note against git, runs the gates and asks for the roadmap item.
2. **Open the app on the real account → Goals → Categories** and check that categories only tasks
   still used ("Trading", "Job / Career", "Self-performance") are listed. Merge or map them (rename
   onto an existing name merges after a confirm). This is the first real-data check of P14.
3. **Working order:** P1 → P12 → P13 → P2 → P3 → P14 → P7 → P11 → P15 → P8 → P6 → P10 → P9 → P4 → P5.
   Done: P1, P12, P13, P2, P3, P14, P8, P6, P9, P4, P5. **P7, P11:** `queued` but blocked (step 4).
   **P10, P15:** `gated` on P7. **No roadmap item is open and none is unblocked.**
   A session must name a bug from Open items or a new item Roman adds to the spec; otherwise it stops.
4. **P7 and P11 still need two things from outside this repo** (checked 2026-10-05):
   - The OS context feed: no feed script in `AI-Business-OS/10_AUTOMATION/scripts/` and no feed-shape
     document. An OS session owns it (OS `current-focus.md`, P7 path step 2).
   - A GitHub fine-grained PAT, `romahawk/AI-Business-OS` only, `Contents` + `Pull requests`
     read/write, stored in Vercel as a server-only variable (suggested name `OS_GITHUB_TOKEN`, never
     `NEXT_PUBLIC_…`). On 2026-10-05 the Vercel project had only the seven Firebase variables.
5. Read ADR-024, ADR-027, ADR-028 and ADR-029 before any control-plane, category or scope decision.
6. **Commit gate (P8):** every `git commit` from Claude Code goes through
   `.claude/hooks/commit-gate.mjs`. It blocks unless the message has `Verified:` and `Not verified:`
   lines and typecheck, lint and build pass. Commits typed in a terminal are not checked, and
   neither is `git cherry-pick`: run the gates by hand after one.

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
  (squash `66c3bf6`). Remote and local branch still exist; safe to delete.
- `docs/session-close-2026-10-09` off `main` `66c3bf6`: this handoff. Not stacked.

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

## Where we left off (2026-10-06, late morning) — login and signup buttons stuck disabled

**Bug:** `/login` logged a React hydration mismatch on `disabled` (open item from the P1 UI check).
Cause (confirmed): `lib/firebase/client.ts` creates `auth` only in the browser, so the server
rendered the auth buttons `disabled={… || !auth}` and the client rendered them enabled. React does
not patch mismatched attributes, so **the buttons stayed disabled after load**, on `/login` (Sign in,
Continue with Google) and `/signup` (Create account).

**What changed:**
- `app/login/page.tsx`, `app/signup/page.tsx`: `authReady = useSyncExternalStore(noop, () => auth !== null, () => false)`;
  the buttons use `!authReady`. Submit handlers still check `auth`.
- `CHANGELOG.md`: Fixed entry "Login and signup buttons after page load", dated 2026-10-06.

**Branch map:**
- `fix/login-hydration-mismatch` off `main` `f21f4c1`, head `97c9f21` → **#148 merged** into `main` as `5e49a90`.
- `fix/signup-hydration-mismatch` stacked on it, head `8d43bef` → **#149 merged into
  `fix/login-hydration-mismatch`, not `main`** (13 s after #148; its base was not retargeted). So
  `origin/fix/login-hydration-mismatch` is at `3148374` and the signup fix is **not on `main`**.
  Same trap as #118/#120. The remote `fix/signup-hydration-mismatch` was deleted on merge; the local
  copy remains.
- `fix/signup-hydration-to-main` off `main` `5e49a90`, head `4a387e1` = `8d43bef` cherry-picked;
  tree identical to `origin/fix/login-hydration-mismatch`. **Not pushed at close; PR to `main` pending.**
- `docs/session-close-2026-10-06d` off `main` `5e49a90`: this handoff. Not stacked.

**Verified (confirmed):**
- Session start: `main` `f21f4c1` passed lint, typecheck, build (exit 0).
- Gates exit 0 on `97c9f21` and `8d43bef` (P8 hook and by hand) and on `4a387e1` (by hand).
  One hook run on `8d43bef` failed first with build exit 134 / "memory allocation … failed" at
  1.2 GB free commit memory; it passed at 7.9 GB free. Not a code fault.
- Browser: headless Edge (playwright-core in the session scratchpad) on the dev server at :3001,
  1280×800, console and every button's `disabled` read 2 s after `networkidle`. With the fix stashed:
  1 hydration error on each page, the auth buttons `disabled=true`. With the fix: no console errors,
  `disabled=false`.

**Not verified:**
- A production build (`next start`) or Vercel preview in a browser.
- An actual sign-in (email or Google) or account creation with the now-enabled buttons.
- Whether this caused the reported dev/preview login failure (plausible: it would affect production
  too, yet production login was reported working, so likely not the whole story).
- 375 px; light theme; keyboard. No screenshots in #148/#149.

**Process notes:**
- The first blocked commit (memory) left the files unstaged; the retry found nothing to commit until
  they were re-added. Check `git status` after a blocked commit.
- Another project's dev server (DeutschOn-AI, :3000, ~1.3 GB) and Brave were the big memory users.

---

## Open items

- **Real-data check of P14** (Start here, step 2): orphaned categories listed, merged or mapped;
  then confirm the new fields round-trip through Firestore on a second device.
- **Delete merged branches** (signup fix merged as #150 on 2026-10-06; P14 as #152 on 2026-10-09):
  on origin `fix/login-hydration-mismatch` (holds only the stray #149 merge),
  `fix/signup-hydration-to-main`, `docs/session-close-2026-10-06d`, `feat/categories-single-source`;
  locally the same plus `fix/signup-hydration-mismatch`.
- **Pick the next piece of work (Roman).** The roadmap has nothing open or unblocked. Candidates:
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
- **P7 / P11 blockers:** the OS context feed (OS session) and the GitHub PAT in Vercel (Roman).
  See Start here, step 4.
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
