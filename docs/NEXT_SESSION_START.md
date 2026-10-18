# Next Session Start

**Last updated:** 2026-10-18 (P20 fully on `main`: CC-2 and CC-3 landed by #172 as `45ef659`. P21 "Schedule block card in a dialog" (#173) and P22 "Schedule blocks show their category" (#174, stacked on #173) open, not merged)
**Resume on:** `feat/schedule-category-edge` (stacked on `feat/schedule-block-dialog`, off `main` `9fb4e6a`) until #173 and #174 merge, then `main`.
**Build status:** passing as of 2026-10-18 — `npm run build` exit 0 on `feat/schedule-category-edge` (commit hook, `2817945`)
**Typecheck status:** passing as of 2026-10-18 — `npm run typecheck` exit 0 (same hook run, and inside `npm test`)
**Lint status:** passing as of 2026-10-18 — `npm run lint` exit 0 (same hook run)
**Test status:** passing as of 2026-10-18 — `npm test` (typecheck + `vitest run`) exit 0, 60 tests in 6 files on the P21/P22 branches (they are off `9fb4e6a`, before CC-2's tests); 64 in 7 on `fix/land-p20-on-main`
**Note:** P21 and P22 are UI only (no store, type, rules or data change). #173 conflicts with `main` in `CHANGELOG.md` only (one hunk, since #172 merged).

---

## Start here

1. Run `/session-start`. It checks this note against git, runs the gates and asks for the roadmap item.
2. **Land P21 and P22 (Roman decides how):** #173 conflicts with `main` in `CHANGELOG.md`. Fix by
   merging `origin/main` into `feat/schedule-block-dialog` (no force-push), push, merge #173; then
   **retarget #174 to `main`** (step 11), merge `main` into it if GitHub asks, and merge. Then
   Roman checks both on real data (his categories and colours) → P21, P22 `done`.
3. **P20:** all three slices are on `main` (#169, #172). Roman checks it on real data → P20 `done`.
   The stale `feat/p20-*` branches can be deleted (remote: cc1, cc2, cc3; local `feat/p20-cc3-semantics`
   carries an unpushed handoff commit `1597229`, superseded by this note).
   **P11 is `decision`:** its next slice (strategy files through an OS PR) waits on Roman's scope
   ruling and the write token's **Pull requests** permission. Next by rank: P19 (its own ADR first;
   `ANTHROPIC_API_KEY` must be set in Vercel).
4. **Roman to decide:** the dark-theme `--destructive` token fails AA (3.02 on the dialog
   background, "Remove from schedule"); attention rows are not sorted by severity (from P20); a
   category on plain time blocks (a data change, deferred from P22).
5. **Close day follow-ups (Roman to choose):** field labels follow Roman's canon text for the
   daily-close workflow (still to come). Feeding unticked items into tomorrow's P18 carry-over is a
   later slice with its own ADR (ADR-034, Consequences).
6. **Open the app on the real account** and check #158 and P18 on real data (only demo mode has
   been checked), then P16 and P17 on Schedule.
7. **Still open from P14:** Goals → Categories on the real account: merge or map categories only
   tasks still use ("Trading", "Job / Career", "Self-performance"). This now shows on Schedule too:
   P22 colours each block's edge by category.
8. **Working order:** P1 → P12 → P13 → P2 → P3 → P14 → P16 → P17 → P18 → P7 → P11 → P20 → P21 → P22 → P19 → P15 → P8 → P6 → P10 → P9 → P4 → P5.
   Done: P1, P12, P13, P2, P3, P14, P16, P17, P18, P7, P8, P6, P9, P4, P5.
   **P11:** `decision`. **P20:** `open` (on `main`, waiting on Roman's check). **P21, P22:** `open`
   (2026-10-18, Roman's exception to WIP = 1). **P19:** `queued`, gated on its own ADR. **P10, P15:**
   `gated` on P7 in the spec; P7 is done, so their gates need re-checking.
9. **Vercel variables (names checked 2026-10-17, values never read):** `AIOS_GITHUB_TOKEN`,
   `AIOS_GITHUB_WRITE_TOKEN`, `AIOS_WRITER_UID`, `FIREBASE_ADMIN_*`. `ANTHROPIC_API_KEY` is **not**
   set, so the AI routes cannot work in production.
10. **Preview logins fail with `auth/unauthorized-domain`**: add the preview URL in Firebase →
   Authentication → Authorized domains, or test signed-in features on production after merge.
11. **Stacked PRs:** retarget the stacked PR to `main` before merging it, after its base merges.
   It happened again on 2026-10-18: #170 and #171 merged into their base branches and needed #172.
12. **Commit gate (P8):** the hook checks `git commit` and `git commit-tree` (needs `Verified:` and
   `Not verified:`); `git cherry-pick` is not checked, so run the gates by hand after one.

---

## Where we left off (2026-10-18) — P20 landed, P21 dialog, P22 category edge

**Why:** #170 and #171 had merged into their base branches, so `main` had only CC-1. Roman asked for
the Schedule block card in a modal dialog, so the side column stops jumping (P21), then for blocks
coloured by category as well as project (P22). He approved both as roadmap items alongside P20.

**What changed:**
- **#172 (merged, `45ef659`):** cherry-picks of CC-2 `3c6a7b7` and CC-3 `bb8d1cc` onto `main`; tree
  identical to the reviewed CC-3 head.
- **#173 P21** `components/modules/schedule-module.tsx`: EditPanel in `components/ui/dialog.tsx`
  (same props); side column only depends on `tasksPanelCollapsed`; DialogTitle + sr-only description;
  focus returns to the block (or the grid); blocks focusable with Enter/Space; a >4 px move
  suppresses the click (there was no click-vs-drag guard); EditPanel labels linked (`useId`).
- **#174 P22** same file: `blockStyle(projectColor?, edgeColor?)` — fill = project tint or
  `var(--muted)`, left edge = `categoryColor()` of the linked task, slate without one, text in the
  foreground colour; category in the aria-label.
- Docs: spec P21 and P22 (rank, exception, acceptance criteria); CHANGELOG entries.

**Branch map (2026-10-18):**
- `fix/land-p20-on-main` off `main` `9fb4e6a` → **#172 merged** as `45ef659`. Branch can be deleted.
- `feat/schedule-block-dialog` off `main` `9fb4e6a`, head `a8f6f62`, pushed → **#173** → `main`
  (CHANGELOG conflict since #172).
- `feat/schedule-category-edge` on `feat/schedule-block-dialog`, head `2817945` + this handoff →
  **#174** → `feat/schedule-block-dialog`. Retarget to `main` after #173 merges.
- Screenshots: tags `pr-p21-screenshots`, `pr-p22-screenshots` (assets only, no branch).
- `chore/tailwind-canonical-classes` (`b5d97e2`) still **local only**.

**Verified (confirmed):** gates as in the header. Headless Edge, demo mode, `next start`, 1366×768
and 390 px. **P21:** side column and grid rects identical on open, expanded or collapsed (on `main`
the collapsed rail grew 44 → 320 px); Esc, overlay and Close return focus to the block; Enter and
Space open; Project and Repeat selects open above the dialog; description edit and focus toggle work;
drag and resize still work and never open it; Remove closes it, focus to the grid; dialog fits and
scrolls inside; no console errors. **P22:** project fill + category edge, neutral fill without a
project, slate edge without a task; axe on the grid: colour-contrast 7 nodes → 0.

**Not verified:** real account data; light theme; Safari, Firefox; Delete, Done and Mark done
clicked inside the dialog (handlers unchanged); the drop preview from Unscheduled tasks in a browser.
axe with the dialog open still flags the red "Remove from schedule" text (theme token, deferred).

**Found, not changed:** at 390 px with the tasks panel expanded the grid is 22 px wide; a block
scrolled under the sticky day header paints over it (both `z-20`); in demo data Marketing and Health
have nearly the same cyan.

---

## Where we left off (2026-10-17, evening) — P20 Command Center UX v2

**Why:** Roman's audit of the Command Center on real data (17 Oct 13:44, local
`Claude outputs/command-center-ux-v2.md`) found blocks listed twice, past blocks reading "planned",
four attention rows with one cause, a static canon block in prime space, "Free" read as a bug, and
semantics gaps. He made it P20 and ruled "flag only" for past blocks (Close day stays the one place
that resolves a day).

**What changed (now all on `main`: #169, and #170 + #171 via #172):**
- CC-1: `selectAttentionItems` groups 2+ missing outcomes into one row (3 titles, "+N more",
  "Open Plan"); one keeps its row ("Set outcome"). Spec: P20 added, P11 → `decision`.
- CC-2: Week-tab Today column removed; today's agenda shows in Daily Focus as "Also scheduled";
  "past" label via `lib/time-blocks.ts` `isPast`; status badge only when not "planned"; canon in
  `<details>`; "Unallocated"; "Plan week"; "Set weekly plan" bug fixed.
- CC-3: `aria-labelledby` region, `role="list"`, sr-only action context, `aria-current="date"`,
  focus rings, `@container` rows, view transition, reduced-motion CSS, Plan/Review labels linked.

**Verified (confirmed):** typecheck, lint, `npm test` and build exit 0 on each head; headless Edge,
demo mode, 360/768/1280 px; axe-core 4.10.2 on `<main>`: 0 violations on Week, Plan and Review.

**Not verified:** real account data; canon disclosure in a browser; the visual cross-fade; Safari
and Firefox; light theme; axe outside `<main>`.
