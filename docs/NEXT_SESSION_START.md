# Next Session Start

**Last updated:** 2026-10-05 (session 2026-10-02 → 10-05: #126–#131 merged; ADR-023, ADR-024, ADR-025; P12 and ToDo time groups shipped)
**Resume on:** `main` (`33fc3b7`, #131) after the `docs/session-close-2026-10-05` PR merges. Start a new branch from `main` for any work.
**Build status:** passing as of 2026-10-05 — `npm run build` exit 0 on `48a1144`, identical tree to `main` `33fc3b7` (Next.js 16.1.6, Turbopack, Node 22.19.0)
**Typecheck status:** passing as of 2026-10-05 — `npm run typecheck` exit 0 (the build ignores type errors, so this gate is the one that catches them)
**Lint status:** passing as of 2026-10-05 — `npm run lint` exit 0
**Test status:** `npm test` is an alias for `typecheck`; there is no separate test suite
**Note:** code and governance session. No dependency changes since 2026-09-24. P12 bumps the persisted store version from 11 to 12.

---

## Start here

1. Run `/session-start`. It checks this note against git, runs the gates and asks for the roadmap item.
2. **Read ADR-024 first.** Magic Kick is the UI of AI-Business-OS: no sandbox framing, a ranked roadmap,
   WIP = 1, the 9-module ceiling kept, the OS repo stays the source of truth and MK writes to it (tasks
   and context directly, strategy files through a PR). ADR-025 added P12 (now `done`).
3. **Working order:** P1 (`open`) → P12 (`done`) → P7 → P11 → P8 → P6 → P10 → P2 → P3 → P9 → P4 → P5.
4. **2026-10-06: record the P1 usage-gate verdict** in `docs/DECISIONS_LOG.md`: a date table and the
   result. Window 2026-09-29 → 2026-10-05; pass = 5 of 7 days with a task completed; measurement only
   (a fail is recorded and taken to the weekly review, it does not stop the build). Count with this in
   the browser console on the logged-in app:
   ```js
   const s = JSON.parse(localStorage.getItem("magic-kick-store")).state
   const days = new Set()
   for (const t of s.tasks) {
     if (t.deleted) continue
     if (t.completedAt) days.add(t.completedAt.slice(0, 10))
     for (const d of t.recurrenceCompletedDates ?? []) days.add(d.slice(0, 10))
   }
   console.log([...days].filter(d => d >= "2026-09-29" && d <= "2026-10-05").sort())
   ```
   Assumed, not checked: `completedAt` may be UTC, lane moves leave no timestamp, un-completing erases
   the date. Then set P1 to `done` and P7 to `open`.
5. **P7 still needs two things from outside this repo:** the OS context feed script plus its feed-shape
   document (an OS session), and a GitHub fine-grained PAT with `Contents` + `Pull requests` read/write
   on AI-Business-OS only (Roman). The route unfreeze is ADR-024 §6.
6. **OS session pending** (prompt drafted in this session; see Open items).
7. Read ADR-020, ADR-021, ADR-024 and ADR-025 before any control-plane or scope decision.
8. `npm run build`, `npm run lint`, `npm run typecheck` must exit 0 before any commit.

---

## Where we left off (2026-10-05) — Magic Kick became the OS UI; P1 fixed; P12 and ToDo shipped

**Merged to `main` (by Roman, on GitHub):**
- **#126** `d3535fe` — production URL docs: https://magic-kick.vercel.app/ is the single URL.
- **#127** `0be452d` — ADR-023 accepted: P8 before P7 while P7 is blocked; P8 also checks commit
  messages. Point 1 later superseded by ADR-024; point 2 stands.
- **#128** `d86197a` — P1 fix: `lib/execution-os.ts` `selectAttentionItems` returns `{ items, total }`,
  keeps the load row in the last slot when the list overflows; `attention-block.tsx` shows "6 of N".
- **#129** `6e528d5` — **ADR-024**: Magic Kick is the UI of AI-Business-OS. Rewrote the Governing Rule
  in `CLAUDE.md` and `AGENTS.md`; `docs/CLAUDE.md` §1/§3/§4/§5/§6/§7 (session frame is item + goal,
  branches `feat/`/`fix/`/`docs/`, Tracks 0–7 retired, GitHub API route unfrozen for the OS repo only,
  WIP section replaced); spec: P1 gate measurement-only, new **P11 "Write back to the OS"**;
  `docs/SANDBOX_RULES.md` rewritten as Scope Rules; README, checklist, issue template, session-start skill.
- **#130** `c84408a` — ToDo: with "Date: earliest", lanes are split into Overdue / Today / Tomorrow /
  Later / No date; same-day tasks are ordered by start time (`components/modules/todo-module.tsx`).
- **#131** `33fc3b7` — **P12 project roadmap** (built by a separate session in this checkout, rebased
  here onto `main`): `lib/roadmap.ts`, `components/modules/project-roadmap.tsx`, store v11 → v12,
  `projects-module.tsx`, `resources-module.tsx` backlinks; **ADR-025** accepted, merged before P1 closed
  by Roman's explicit exception to WIP = 1.

**Branch map:** every session branch is merged, and the local copies are deleted. Still on origin
(merged, safe to delete): `docs/adr-p8-before-p7`, `fix/p1-load-row-cutoff`, `docs/adr-024-os-ui`,
`feat/todo-time-groups`, `feat/p12-project-roadmap`. The worktree `magic-kick-wt-todo` is removed.
This close is on `docs/session-close-2026-10-05`.

**Verified (confirmed):**
- Gates: lint, typecheck and build exit 0 on `48a1144` (2026-10-05); `main` `33fc3b7` has an identical tree.
  CI green on #126–#131.
- P1 browser check (headless Edge, demo + seeded tasks): desktop 1280×800, the whole block is above the
  fold. Roman's real data: desktop shows "6 of 7" with the load row last; iPhone 16 Pro Max 440×956 all
  rows above the fold; Galaxy A55 360×800 focus + about 2½ attention rows (DevTools emulation).
- #128 in the browser: 7 items → "6 of 7" with the load row last; 2 items → "2".
- #130 in the browser: section order correct, Today ordered 09:00 → 15:00 → untimed, Manual order flat.
  Roman confirmed it displays correctly on Vercel.
- P12 after the rebase: the Projects panel shows the Roadmap, and ToDo shows the sections (demo, 1440×900).

**Not verified:**
- **The P12 store migration v11 → v12 on real localStorage data.** It runs on the first load after
  deploy. If Projects or ToDo look wrong, check this first.
- P12: Firestore sync of the new fields across two devices; light theme.
- #130: mobile widths; dragging between sections.
- P1 criterion 1 on small phones: 360×800 shows focus + about 2½ attention rows. **Roman's ruling pending.**
- The Next.js dev overlay showed "1 Issue" after the P12 rebase; not opened (probably the `/login`
  hydration warning below).

**Process notes:**
- **Shared checkout again (2026-10-05):** the P12 session committed in this checkout while this session
  was running. The ToDo change went through a separate worktree. In a worktree, Turbopack rejects a
  `node_modules` junction that points outside the root ("Symlink node_modules is invalid"): run `npm ci`
  in the worktree, or use `next dev --webpack` for a quick look.
- An OS decision (`DEC-2026-10-03-001`, OS commit `9712e0c`) contradicted ADR-023 one day after it was
  accepted, because no skill reads this log from an OS session. ADR-024 resolved it here; the OS-side
  fix is in the OS session prompt.
- `next dev` on port 3001 was started by Roman; sessions should not stop it. Driving the app headless:
  `playwright-core` + installed Edge (`C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`),
  **Try Demo**, seed via `localStorage["magic-kick-store"]`. Worth turning into a project skill
  (`/run-skill-generator`).

---

## Where we left off (2026-09-29) — P1 code complete, usage gate running

**Merged to `main` (by Roman, on GitHub):** #123 `d910882` (load row whenever status is not Stable;
settles P1 criterion 7) and #124 `5622c6d` (working order, P1 usage gate, P6 decided, P7 reshaped as
the OS feed reader, P8–P10 added). Branch `docs/p1-usage-gate` became #125.

**Verified:** lint, typecheck and build exit 0 on the tree that became #123.

**Not verified then, since checked:** P1 in a browser and the load row with real pressure (both
checked 2026-10-02 → 10-03, see above).

**Process notes:** a Cowork session and a Claude Code session shared one checkout; #123 and #124
merged with squash messages lacking `Verified:` / `Not verified:` (not rewritten on `main`).

---

## Open items

- **2026-10-06: P1 verdict** (Start here, step 4). Then P1 `done`, P7 `open`.
- **OS session** (prompt drafted 2026-10-04 in this session; Roman holds it). Deliverables:
  decision-template field "Repo decisions affected"; one generic `repo-sync` skill (magic-kick,
  alpharhythm, deutschon-ai) with the old sync skills as aliases; an amendment line on
  `DEC-2026-10-03-001` (MK ADR-023 superseded); an OS decision removing the 2026-10-21 revert (ADR-024 §8);
  `source-of-truth-map.md` and `02_PROJECTS/magic-kick/context.md` recording that MK writes to the OS repo
  (ADR-024 §5). The OS checkout had ~10 untracked daily-plan files and one deleted plan on `main` (2026-10-03).
- **Allocation reverts to `limited` on 2026-10-21** until that OS decision lands.
- **GitHub fine-grained PAT** for P7/P11: Roman.
- **P1 small-phone ruling** (360×800), Roman.
- **UI findings from the P1 check, not fixed:** overdue tasks appear in both Daily Focus and Needs
  attention; Daily Focus says "3 of 3 today" when none is due today; the "Friday with zero done" banner
  shows on Saturday; `/login` logs a React hydration mismatch on the `disabled` attribute.
- **Dev and preview logins** (reported failing 2026-09-24) still not investigated. Production login works.
- **Positioning docs** `docs/PUBLIC_PRESENTATION.md` and `docs/WORKFLOW_AUTOMATION_PLAYBOOK.md` still use
  the sandbox wording (left on purpose by ADR-024).
- **The `roadmap` label** in `.github/ISSUE_TEMPLATE/feature.md` may not exist on GitHub.
- **Merged remote branches** to delete (Branch map above), plus older local ones: `ai-control-tower`
  (upstream gone), `dev`, `feat/projects-tab-density-redesign`, `feat/schedule-block-editor-improvements`,
  `feature/resource-reorder-and-milestone-schedule`, `fix/close-phase-1-adrs`,
  `fix/sync-existing-profile-on-new-domain`. Check each before deleting.
- **MK-DEC-006**, cited by P7, is not in this repo's log; assumed to live in the OS repo.
- **ADR-016…ADR-019 are dated 2026-08-09** but sit after ADR-015 (2026-08-10). Cosmetic.
- **Track 2 (from ADR-017):** validate state server-side in the existing AI routes.
