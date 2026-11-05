# Next Session Start

**Last updated:** 2026-11-05, evening (P34 `done` on `main` in #206 and #208; **no item is open**)
**Resume on:** `main` (`181c441` plus this docs PR). Start new work on a branch from `origin/main`.
**Build status:** passing as of 2026-11-05 — `npm run build` exit 0 (re-run; the first attempt in the same session exited 127 with no cause found, see "Not verified")
**Typecheck status:** passing as of 2026-11-05 — `npm run typecheck` exit 0
**Lint status:** passing as of 2026-11-05 — `npm run lint` exit 0
**Test status:** passing as of 2026-11-05 — `npm test` exit 0, 177 tests in 23 files (the first run exited 1 with 163 tests in 22 files and did not repeat; cause not found)
**Note:** docs only (spec P34 status, this note). Gates were run on a clean checkout of `origin/main` (`181c441`).
**Do not stack PRs** (step 4).

---

## Start here

1. Run `/session-start`. It checks this note against git, runs the gates and asks for the roadmap item.
2. **Open item: none. Next by rank is P15 (gated); Roman to rule on scope (step 3).** Do not open P15 or
   anything else until Roman names it.
3. **Roman to decide (first):** **Magic Kick allocation.** `DEC-2026-09-23-001` reverts it to `limited`
   when the control-plane scope is delivered or on 2026-12-31. After P19 and P34 the remaining items are
   P15/P10 (gated), P6, P4, P5 and P11 (`decision` since 2026-10-17). Rule: name the remaining scope, or
   revert now.
4. **Do not stack PRs.** Open each PR from `main`; if one depends on another, wait for the first to merge.
   Merge only when Roman says so.
5. **Roman to check (carried, not yet confirmed):**
   - **P19 "Rank with AI"** (works locally per Roman on 2026-11-05): 375 px and 1280 px layouts; Accept and
     "Back to default"; the 30 s disable; the stale-canon label. **Flag name:** `NEXT_PUBLIC_AI_FEATURES_ENABLED`
     (`AI_FEATURES_ENABLED` is ignored). Local `.env.local` was fixed on 2026-11-05 (names only). **Vercel
     has not been checked** for `ANTHROPIC_API_KEY` or the flag (inlined at build time; a change needs a
     redeploy). The flag also shows the other parked AI surfaces (coaching, weekly summary).
   - **#207 one-click "×" on a ToDo due date** (task goes to the backlog undated, toast with Undo; repeat is
     reset to none, as in Schedule's "Remove from schedule"; Roman has not ruled on that): placement at 375 px
     and 1280 px, and a task that had a time block. The task sheet has no matching button.
   - **P34 "Done" on AIOS commitments** (#208): works locally per Roman; sync to a second device; 375 px and
     1280 px; the key against real rows in `dated-commitments.md`.
   - **Real data (older):** P31 (sync icon, tooltip time and "Retry" on a real sync; theme toggle in light;
     Quick Add → Resource shows in Resources), P28, P29, P30 (a row in OS `01_CONTEXT/dated-commitments.md`
     shows on Schedule and in "Also scheduled"; needs `AIOS_GITHUB_TOKEN`), P33, #192. Earlier: P25, P27,
     P24, P26, P20–P23.
6. **P32 gap (Roman to decide):** modules that keep an action row (Goals, Journal, Projects, Resources,
   Schedule) gain less than the 60 px criterion; moving their buttons into the top bar is a possible
   follow-up.
7. **Cleanup PR (small):** `components/theme-toggle.tsx` is a dead file (nothing imports it) with the same
   `theme` bug P31 fixed: remove it. `components/modules/projects-module.tsx` has its own copy of
   `normalizeUrl`; `lib/url.ts` now holds the shared one.
8. **Roman to decide (carried):** the dark-theme `--destructive` token fails AA (3.02 on dialog
   background); attention rows not sorted by severity (P20); a category on plain time blocks; keyboard-only
   range selection in P25; Close day follow-ups (field labels, P18 carry-over needs its own ADR);
   `defaultTheme` "dark" → "system" in `app/layout.tsx` (deferred from P31); a global Quick Add shortcut
   that does not clash with Ctrl+B; streak in the top bar only if it changes daily behaviour; "Note" in
   Quick Add becomes "Inbox item" when Stage 0 InboxItem ships; whether the ToDo "Dated · from AIOS" box
   should follow the ToDo filters (it ignores them by design, unconfirmed); the orange coaching banner on
   the Command Center said "Wednesday, zero done" on a Thursday (with the AI flag on; not investigated).
9. **Follow-up outside this repo:** the OS `current-focus.md` was last reconciled 2026-10-18 (`9fb4e6a`)
   and still shows P20 in progress and P19 gated; the newest daily review is 2026-10-23. Fix in the OS
   repo; this session did not touch the OS.
10. **Working order:** P1 → P12 → P13 → P2 → P3 → P14 → P16 → P17 → P18 → P7 → P11 → P20 → P21 → P22 →
    P23 → P24 → P26 → P27 → P25 → P28 → P29 → P30 → P31 → BUG (Schedule header) → P32 → P33 → P19 → P34 →
    P15 → P8 → P6 → P10 → P9 → P4 → P5. Done through P34 (P34 was added by Roman on 2026-11-05 and its rank
    was never set in the spec's working-order line; it ran next because Roman asked for it).
    **P11:** `decision` (waits on Roman's strategy-file scope ruling and the write token's Pull requests
    permission). **P10, P15:** `gated` on P7 in the spec; P7 is done, so their gates need re-checking.
    Magic Kick stays `primary` until 2026-12-31 (OS `DEC-2026-10-19-001`) unless Roman rules otherwise.
11. **Vercel variables (names checked 2026-10-17, values never read):** `AIOS_GITHUB_TOKEN`,
    `AIOS_GITHUB_WRITE_TOKEN`, `AIOS_WRITER_UID`, `FIREBASE_ADMIN_*`. `ANTHROPIC_API_KEY` and
    `NEXT_PUBLIC_AI_FEATURES_ENABLED`: not checked in Vercel.
12. **Preview logins fail with `auth/unauthorized-domain`**: add the preview URL in Firebase →
    Authentication → Authorized domains, or test signed-in features on production after merge.
13. **Commit gate (P8):** the hook checks `git commit` and `git commit-tree` (needs `Verified:` and
    `Not verified:`; the message file must be given by full path, not a shell variable); `git cherry-pick`
    is not checked, so run the gates by hand after one.
14. **Local dev:** stop `next dev` before `next build`; the page file is fixed at 2 GB, which keeps free
    commit low (**Roman to decide:** let Windows manage it, or set ~16 GB; needs a reboot). If the browser
    shows old behaviour after an edit, hard-reload. **Headless check recipe used in P31:** system Edge
    with `--remote-debugging-port` driven by a small Node script (Node 22 has `WebSocket`); `axe-core` is
    in `node_modules`; Try Demo on `/login` enters demo mode (no Firebase user, so signed-in-only features
    such as "Rank with AI" do not show there; not confirmed).

---

## Where we left off (2026-11-05, evening) — P34 done; due-date bug done

**What changed (all on `main`):**
- **#204** (`bf80c42`): session close: P19 `done`, ADR-036 Accepted, handoff.
- **#205** (`3fc5a72`): `callClaude` reads the text blocks, not `content[0]`; `daily-focus` logs the error
  name and message on a failed call. Hardening only: the real cause of "No suggestion right now" was an
  invalid `ANTHROPIC_API_KEY` (Anthropic answered 401 `invalid x-api-key`), replaced by Roman.
- **#206** (`7dfa1ab`): ADR-039 Accepted (done state kept in Magic Kick, key `date|start|title`, shown in
  place, Schedule in scope), P34 added.
- **#207** (`98f1e7c`): bug named by Roman: a "×" next to a ToDo due date clears it in one click; the task
  goes to the backlog undated, time and repeat cleared, toast with Undo; 3 store tests.
- **#208** (`181c441`): P34. Checkbox on AIOS commitments in ToDo "Dated · from AIOS", the Command Center
  "Also scheduled" list and Schedule (block and all-day popover); `profile.doneCommitments` (synced like
  `closeDayChips`), `commitmentDoneKey` and `toggleDoneKey` (90-day pruning, 500 keys); 7 tests. The OS file
  is never written. Firestore rules read: the profile rule allows an extra optional array.
- This docs PR: spec P34 → `done`; this note.

**Branch map (2026-11-05):** `main` = `origin/main` = `181c441` (this docs PR on top). No open PRs before this
one. #204–#208 were squash-merged; their local and remote branches may still exist (see the close report).

**Verified (confirmed):** lint, typecheck exit 0; `npm test` 177 passed (23 files) on re-run; `npm run build`
exit 0 on re-run, all on a clean checkout of `origin/main` (`181c441`) on 2026-11-05; CI passed on #202, #203
and #208 before merge. Roman reported that "Rank with AI" and the AIOS Done checkbox work locally; I did not see
them. He merged #207 (the due-date "×") but did not report checking it.

**Not verified:** the first `npm test` run of the close failed once (21 of 22 files, 163 tests, exit 1) and
the first `npm run build` exited 127; neither repeated and no cause was found (the working-directory path
changed case mid-session, which may be related). Browser layout at 375 px and 1280 px for P19, #207 and P34;
sync of the done mark to a second device; the done key against real `dated-commitments.md` rows; Vercel
`ANTHROPIC_API_KEY` and flag; real canon; light theme for P32/P33; Safari, Firefox.

**Previous session (2026-11-04, late):** BUG, P32, P33 done; P19 opened (#196–#200), see git history.
