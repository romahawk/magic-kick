# Next Session Start

**Last updated:** 2026-11-04, late (BUG, P32 and P33 `done` on `main`; **P19 is `open`**, at the ADR-draft stage)
**Resume on:** `main` (`b7c001e` plus this docs PR). Start new work on a branch from `origin/main`.
**Build status:** passing as of 2026-11-04 — `npm run build` exit 0 (run on this docs branch, whose code tree equals `main`)
**Typecheck status:** passing as of 2026-11-04 — `npm run typecheck` exit 0 (same run)
**Lint status:** passing as of 2026-11-04 — `npm run lint` exit 0 (same run)
**Test status:** passing as of 2026-11-04 — `npm test` exit 0, 144 tests in 18 files
**Note:** docs only. P19 has no feature code: its ADR draft is a separate, unmerged draft PR.
**Do not stack PRs** (step 3).

---

## Start here

1. Run `/session-start`. It checks this note against git, runs the gates and asks for the roadmap item.
2. **P19 (AI Suggest proposes Daily Focus from canon) is `open`** and is the only open item. **No feature
   code until Roman approves its ADR** (a draft PR adds it to `docs/DECISIONS_LOG.md` as "Proposed"). After
   approval: branch `feat/p19-ai-suggest-canon` from `origin/main`. `ANTHROPIC_API_KEY` is set by Roman in
   Vercel (Production + Preview) and in `.env.local` (presence in `.env.local` confirmed 2026-11-04; Vercel
   not checked; the value is never read or printed).
3. **Done on 2026-11-04:** the Schedule header BUG (#196), P32 page header in the top bar (#197), P33 all-day
   lane (#196) and ToDo "Dated · from AIOS" group (#198). **P32 gap:** modules that keep an action row
   (Goals, Journal, Projects, Resources, Schedule) gain less than the 60 px criterion; moving their buttons
   into the top bar is a possible follow-up (Roman to decide).
4. **Do not stack PRs.** Open each PR from `main`; if one depends on another, wait for the first to merge.
   Roman's standing rule for P31 (merge each part when all four gates and CI are green) ended with P31;
   ask again for the next item.
5. **Roman to check on real data:** P31 (sync icon, tooltip time and "Retry" on a real sync; theme toggle
   in light; Quick Add → Resource shows in Resources), P28 (ToDo sidebar, This week scope), P29
   (Resources colours in both themes), P30 (a row in OS `01_CONTEXT/dated-commitments.md` shows on
   Schedule and in "Also scheduled"; needs `AIOS_GITHUB_TOKEN`), #192 (deleting a task removes its
   block). Earlier: P25, P27, P24, P26, P20–P23.
6. **Cleanup PR (small):** `components/theme-toggle.tsx` is a dead file (nothing imports it) with the
   same `theme` bug P31 fixed: remove it. `components/modules/projects-module.tsx` has its own copy of
   `normalizeUrl`; `lib/url.ts` now holds the shared one.
7. **Roman to decide (carried):** the dark-theme `--destructive` token fails AA (3.02 on dialog
   background); attention rows not sorted by severity (P20); a category on plain time blocks; keyboard-only
   range selection in P25; Close day follow-ups (field labels, P18 carry-over needs its own ADR);
   `defaultTheme` "dark" → "system" in `app/layout.tsx` (deferred from P31); a global Quick Add shortcut
   that does not clash with Ctrl+B; streak in the top bar only if it changes daily behaviour; "Note" in
   Quick Add becomes "Inbox item" when Stage 0 InboxItem ships.
8. **Follow-up outside this repo:** the OS `current-focus.md` (last reconciled 2026-10-18, still lists
   Magic Kick's last commit as `9fb4e6a`) and the daily review (newest 2026-10-23) are stale. Fix in the
   OS repo.
9. **Working order:** P1 → P12 → P13 → P2 → P3 → P14 → P16 → P17 → P18 → P7 → P11 → P20 → P21 → P22 →
   P23 → P24 → P26 → P27 → P25 → P28 → P29 → P30 → P31 → BUG (Schedule header) → P32 → P33 → P19 → P15 →
   P8 → P6 → P10 → P9 → P4 → P5. **P11:** `decision` (waits on Roman's strategy-file scope ruling and the
   write token's Pull requests permission). **P19:** `open`, gated on its own ADR (draft first). **P10, P15:** `gated`
   on P7 in the spec; P7 is done, so their gates need re-checking. Magic Kick stays `primary` until
   2026-12-31 (OS `DEC-2026-10-19-001`).
10. **Vercel variables (names checked 2026-10-17, values never read):** `AIOS_GITHUB_TOKEN`,
   `AIOS_GITHUB_WRITE_TOKEN`, `AIOS_WRITER_UID`, `FIREBASE_ADMIN_*`. `ANTHROPIC_API_KEY`: Roman set it himself on 2026-11-04 (not checked in Vercel);
   the AI routes are parked by default (#189).
11. **Preview logins fail with `auth/unauthorized-domain`**: add the preview URL in Firebase →
   Authentication → Authorized domains, or test signed-in features on production after merge.
12. **Commit gate (P8):** the hook checks `git commit` and `git commit-tree` (needs `Verified:` and
   `Not verified:`); `git cherry-pick` is not checked, so run the gates by hand after one.
13. **Local dev:** stop `next dev` before `next build`; the page file is fixed at 2 GB, which keeps free
   commit low (**Roman to decide:** let Windows manage it, or set ~16 GB; needs a reboot). If the browser
   shows old behaviour after an edit, hard-reload. **Headless check recipe used in P31:** system Edge
   with `--remote-debugging-port` driven by a small Node script (Node 22 has `WebSocket`); `axe-core` is
   in `node_modules`; Try Demo on `/login` enters demo mode.

---

## Where we left off (2026-11-04, late) — BUG, P32, P33 done; P19 opened

**What changed (all on `main`):**
- **#196** (`5989251`): Schedule day header and hour grid share one column template; AIOS all-day items
  moved into a 28 px "All-day" lane (one chip, "+N", read-only popover). Columns matched within 1 px at
  1280, 1440 and 1920, Week and Day.
- **#197** (`7ba5a52`): P32. `lib/page-header.ts` (`usePageHeader`), `lib/date-range-label.ts` + tests, top bar
  shows the one h1, subtitle, (?) help and keeps `document.title`; the eight modules lost their title rows.
- **#198** (`533760d`): P33 part 2. `commitmentsInRange` + tests; ToDo "Dated · from AIOS" box (read-only,
  today through Sunday, hidden in Done).
- **#199** (`b7c001e`): the 2026-11-04 session-close docs (merged with P32 `open` and P33 `queued`; fixed in
  this docs PR).
- This docs PR: spec P32, P33 → `done`, P19 → `open`; this note.

**Branch map (2026-11-04):** `main` = `origin/main` = `b7c001e` (this docs PR on top). Merged feature
branches may still exist locally; see `git branch --merged origin/main`.

**Verified (confirmed):** the four gates as in the header; CI on #196–#199 merged by Roman. Headless Edge,
demo mode: one h1 per module, tab title per module (also on first load), header 56 px at 1280 and 375;
ToDo box rows, no checkbox, no horizontal scroll at 1280 and 375 (temporary fixture, reverted).

**Not verified:** real commitments from OS `main` (needs `AIOS_GITHUB_TOKEN` and a signed-in user); light
theme for P32/P33; screen reader on the (?) tooltip; mobile Goals, Resources, Achievements; Safari,
Firefox; screenshots are local only. The ToDo box ignores the ToDo filters by design (not confirmed).

**Previous session (2026-11-04, evening):** P31 top bar v2 (#193–#195), see git history.
