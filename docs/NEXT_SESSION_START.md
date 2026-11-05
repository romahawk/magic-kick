# Next Session Start

**Last updated:** 2026-11-05 (P19 `done` on `main` in #202 and #203; **no item is open**)
**Resume on:** `main` (`b93dcc5` plus this docs PR). Start new work on a branch from `origin/main`.
**Build status:** passing as of 2026-11-05 — `npm run build` exit 0 (run on this docs branch, whose code tree equals `main` at `b93dcc5`)
**Typecheck status:** passing as of 2026-11-05 — `npm run typecheck` exit 0 (same run)
**Lint status:** passing as of 2026-11-05 — `npm run lint` exit 0 (same run)
**Test status:** passing as of 2026-11-05 — `npm test` exit 0, 164 tests in 20 files
**Note:** docs only (spec P19 status, ADR-036 status line, this note).
**Do not stack PRs** (step 4).

---

## Start here

1. Run `/session-start`. It checks this note against git, runs the gates and asks for the roadmap item.
2. **Open item: none. Next by rank is P15 (gated); Roman to rule on scope (step 3).** Do not open P15 or
   anything else until Roman names it.
   **Bug named by Roman on 2026-11-05 (not a roadmap item):** no one-click way to clear a task's due date so it
   stays in the backlog undated (date set later). Work starts on its own branch from `main`. Also open:
   PR `fix/p19-thinking-block` (`callClaude` reads the text block, not `content[0]`; the live 401 was an
   invalid key, so this fix is unproven as a cause).
3. **Roman to decide (first):** **Magic Kick allocation.** `DEC-2026-09-23-001` reverts it to `limited`
   when the control-plane scope is delivered or on 2026-12-31. After P19 the remaining items are P15/P10
   (gated), P6, P4, P5 and P11 (`decision` since 2026-10-17). Rule: name the remaining scope, or revert now.
4. **Do not stack PRs.** Open each PR from `main`; if one depends on another, wait for the first to merge.
   Merge only when Roman says so.
5. **P19 real call: Roman confirmed it works locally on 2026-11-05** (after replacing an invalid
   `ANTHROPIC_API_KEY`: Anthropic had answered 401 `invalid x-api-key`; the new key and `claude-haiku-5-5`
   access were checked with a models-list call, status 200). Still to check: with
   `NEXT_PUBLIC_AI_FEATURES_ENABLED=true` and a signed-in (not demo) user, "Rank with AI" shows on the Command Center Suggested list when at least one
   task is suggested; it returns up to 3 rows with a reason; Accept moves the task to Daily Focus; "Back to
   default" restores the list; the button is disabled for 30 s after an answer; 375 px and 1280 px layouts.
   **Flag name:** the variable is
   `NEXT_PUBLIC_AI_FEATURES_ENABLED`; `AI_FEATURES_ENABLED` is ignored (`lib/ai/flags.ts`). Local
   `.env.local` was fixed on 2026-11-05 (names only: old line removed, new line added). **Vercel has not
   been checked** for `ANTHROPIC_API_KEY` or the flag; the flag is inlined at build time, so changing it
   there needs a redeploy. Turning the flag on also shows the other parked AI surfaces
   (`command-center.tsx`, `schedule-module.tsx`).
6. **Roman to check on real data (carried):** P31 (sync icon, tooltip time and "Retry" on a real sync; theme
   toggle in light; Quick Add → Resource shows in Resources), P28 (ToDo sidebar, This week scope), P29
   (Resources colours in both themes), P30 (a row in OS `01_CONTEXT/dated-commitments.md` shows on Schedule
   and in "Also scheduled"; needs `AIOS_GITHUB_TOKEN`), P33 (ToDo "Dated · from AIOS" box on real
   commitments), #192 (deleting a task removes its block). Earlier: P25, P27, P24, P26, P20–P23.
7. **P32 gap (Roman to decide):** modules that keep an action row (Goals, Journal, Projects, Resources,
   Schedule) gain less than the 60 px criterion; moving their buttons into the top bar is a possible
   follow-up.
8. **Cleanup PR (small):** `components/theme-toggle.tsx` is a dead file (nothing imports it) with the same
   `theme` bug P31 fixed: remove it. `components/modules/projects-module.tsx` has its own copy of
   `normalizeUrl`; `lib/url.ts` now holds the shared one.
9. **Roman to decide (carried):** the dark-theme `--destructive` token fails AA (3.02 on dialog
   background); attention rows not sorted by severity (P20); a category on plain time blocks; keyboard-only
   range selection in P25; Close day follow-ups (field labels, P18 carry-over needs its own ADR);
   `defaultTheme` "dark" → "system" in `app/layout.tsx` (deferred from P31); a global Quick Add shortcut
   that does not clash with Ctrl+B; streak in the top bar only if it changes daily behaviour; "Note" in
   Quick Add becomes "Inbox item" when Stage 0 InboxItem ships; whether the ToDo "Dated · from AIOS" box
   should follow the ToDo filters (it ignores them by design, unconfirmed).
10. **Follow-up outside this repo:** the OS `current-focus.md` was last reconciled 2026-10-18 (`9fb4e6a`)
    and still shows P20 in progress and P19 gated; the newest daily review is 2026-10-23. Fix in the OS
    repo; this session did not touch the OS.
11. **Working order:** P1 → P12 → P13 → P2 → P3 → P14 → P16 → P17 → P18 → P7 → P11 → P20 → P21 → P22 →
    P23 → P24 → P26 → P27 → P25 → P28 → P29 → P30 → P31 → BUG (Schedule header) → P32 → P33 → P19 → P15 →
    P8 → P6 → P10 → P9 → P4 → P5. Done through P19. **P11:** `decision` (waits on Roman's strategy-file
    scope ruling and the write token's Pull requests permission). **P10, P15:** `gated` on P7 in the spec;
    P7 is done, so their gates need re-checking. Magic Kick stays `primary` until 2026-12-31 (OS
    `DEC-2026-10-19-001`) unless Roman rules otherwise (step 3).
12. **Vercel variables (names checked 2026-10-17, values never read):** `AIOS_GITHUB_TOKEN`,
    `AIOS_GITHUB_WRITE_TOKEN`, `AIOS_WRITER_UID`, `FIREBASE_ADMIN_*`. `ANTHROPIC_API_KEY` and
    `NEXT_PUBLIC_AI_FEATURES_ENABLED`: not checked in Vercel.
13. **Preview logins fail with `auth/unauthorized-domain`**: add the preview URL in Firebase →
    Authentication → Authorized domains, or test signed-in features on production after merge.
14. **Commit gate (P8):** the hook checks `git commit` and `git commit-tree` (needs `Verified:` and
    `Not verified:`); `git cherry-pick` is not checked, so run the gates by hand after one.
15. **Local dev:** stop `next dev` before `next build`; the page file is fixed at 2 GB, which keeps free
    commit low (**Roman to decide:** let Windows manage it, or set ~16 GB; needs a reboot). If the browser
    shows old behaviour after an edit, hard-reload. **Headless check recipe used in P31:** system Edge
    with `--remote-debugging-port` driven by a small Node script (Node 22 has `WebSocket`); `axe-core` is
    in `node_modules`; Try Demo on `/login` enters demo mode (no Firebase user, so signed-in-only features
    such as "Rank with AI" do not show there; not confirmed).

---

## Where we left off (2026-11-05) — P19 done; session close

**What changed (all on `main`):**
- **#201** (`0947e4d`, 2026-11-04): ADR-038 accepted (AI ranks Daily Focus from canon).
- **#202** (`473d76b`, 2026-11-04): P19 part 1. `POST /api/ai/daily-focus` (404 when the flag is off or no
  key, 401 without a token; no model call when canon is unavailable; stale canon still runs; one request in
  flight and a soft 20-a-day cap per user; 15 s timeout; model from `AI_DAILY_FOCUS_MODEL`, default
  `claude-haiku-5-5`); `lib/ai/daily-focus.ts`; optional `effort` and `timeoutMs` on `callClaude`; 20 tests.
- **#203** (`b93dcc5`, 2026-11-05): P19 part 2. `hooks/use-ai-daily-focus.ts`; `SuggestedFocusList` takes
  optional `ai` props (ToDo unchanged); "Rank with AI", "AI · from canon" rows with reason, Accept via
  `moveTaskToLane`, "Back to default", 30 s disable; CHANGELOG entry.
- This docs PR: spec P19 → `done`; ADR-036 Status → Accepted (it was `Proposed` though merged with P30 in
  #191); this note.

**Branch map (2026-11-05):** `main` = `origin/main` = `b93dcc5` (this docs PR on top). `feat/p19-ai-suggest-canon`
and `feat/p19-rank-with-ai-ui` were squash-merged (#202, #203). The local `feat/p19-rank-with-ai-ui`
(`5f70d7b`) has no diff against `main` for its files. Other local branches: see step 4 of the close report.

**Verified (confirmed):** lint, typecheck, build and `npm test` on a clean checkout of `origin/main`
(`b93dcc5`) on 2026-11-05, all exit 0, 164 tests in 20 files; `b93dcc5` contains #201, #202 and #203; CI
passed on #202 and #203 before merge. #191 is the P30 PR.

**Not verified:** P19: Roman saw it work locally on 2026-11-05, but no 375 px or 1280 px layout check and no
Accept / "Back to default" walkthrough is recorded here; the 30 s disable and the stale-canon label were not seen; no unit test for the hook or the list; Vercel
`ANTHROPIC_API_KEY` (the local key was invalid until replaced) and flag not checked; real canon; real commitments from OS `main`; light theme for
P32/P33; Safari, Firefox.

**Previous session (2026-11-04, late):** BUG, P32, P33 done; P19 opened (#196–#200), see git history.
