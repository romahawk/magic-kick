# Next Session Start

**Last updated:** 2026-10-02 (#126 merged; ADR-023 accepted: P8 before P7 while P7 is blocked)
**Resume on:** `main` after the `docs/adr-p8-before-p7` PR merges (until then, `main` at `d3535fe`, PR #126). Start a new branch from `main` for any work.
**Build status:** passing as of 2026-10-02 — `npm run build` exit 0 (Next.js 16.1.6, Turbopack, Node 22.19.0)
**Typecheck status:** passing as of 2026-10-02 — `npm run typecheck` exit 0 (the build ignores type errors, so this gate is the one that catches them)
**Lint status:** passing as of 2026-10-02 — `npm run lint` exit 0
**Test status:** `npm test` is an alias for `typecheck`; there is no separate test suite
**Note:** no dependency changes since 2026-09-24.

---

## Start here

1. Run `/session-start`. It checks this note against git, runs the gates and asks for the experiment name.
2. **P1 is `open` and in its usage gate, 2026-09-29 → 2026-10-06.** Use Magic Kick on real projects,
   tasks and weekly outcomes. Pass = opened on 5 of 7 days AND a task changed state on each of those
   days. Nothing else in the queue opens until the gate resolves (WIP = 1). The day count is kept by
   Roman; the repo does not record it.
3. On 2026-10-06: record the verdict in `docs/DECISIONS_LOG.md`. Pass → P1 `done`, then check P7's
   three dependencies (OS context feed, GitHub PAT, ADR unfreezing its GitHub API route): all present →
   P7 opens; any missing → P8 opens (ADR-023). Record which, and why. Fail → stop building Magic Kick
   (P1 criterion 6).
4. ADR-023 (accepted 2026-10-02) also widens P8: the hook checks gates **and** the `Verified:` /
   `Not verified:` commit-message lines. See P8 in `docs/CONTROL_PLANE_UI_SPEC.md`.
5. Read ADR-020 and ADR-021 before any control-plane or scope decision.
6. `npm run build`, `npm run lint`, `npm run typecheck` must exit 0 before any commit.

---

## Where we left off (2026-09-29) — P1 code complete, usage gate running

**Merged to `main` today (by Roman, on GitHub):**
- **#123** `fix(p1): show load in attention block whenever status is not Stable` (`d910882`) —
  `lib/execution-os.ts`, `CHANGELOG.md`. Settles P1 criterion 7 by widening the code.
- **#124** `Docs/queue p8 p9` (`5622c6d`) — `docs/CONTROL_PLANE_UI_SPEC.md`: working order
  P1 → P7 → P8 → P6 → P10 → P2 → P3 → P9 → P4 → P5 (OS `DEC-2026-09-27-001`), P1 usage gate
  (criterion 6), P6 decided, P7 reshaped as the OS context feed reader, P8, P9, P10 added.

**This branch (`docs/p1-usage-gate`):** P1 note "code complete; usage gate running
2026-09-29 → 2026-10-06"; criterion 7 recorded as settled; the Proposed decision entry; this note.

**Verified (confirmed):**
- lint, typecheck and build exit 0 on the tree that became #123 (run 2026-09-29).
- The load change cannot produce an empty detail line: `calculateCognitiveLoad` has three pressure
  sources, so any non-`Stable` status without over-capacity has a named cause.

**Not verified:**
- P1 in a browser by this session. Roman reported it working on 2026-09-29; devices and viewport
  were not stated, so criterion 1 (desktop + mobile above the fold) rests on that report.
- The load row with real pressure (tasks due today over the focus limit, or a missed outcome).

**Process notes:**
- A Cowork session and this Claude Code session shared one checkout on 2026-09-29, and the Cowork
  session committed on a branch under the other's feet. Roman confirmed it has stopped. One session
  per checkout; use a worktree if two must run.
- #123 and #124 merged with squash messages that lack `Verified:` / `Not verified:` and with PR
  bodies not filled in. The PR bodies were filled in after the merge; commit messages on `main`
  are not rewritten (that needs a force-push to `main`).
- Local branches `docs/queue-p8-p9` and `fix/p1-load-status` hold reworded copies of the same
  content as #123/#124 and can be deleted; the remote `fix/p1-load-status` and `docs/queue-p8-p9`
  branches are merged and can be deleted too.

---

## Where we left off (2026-09-24) — P1 and session skills on `main`, P1 not yet seen in a browser

**Session summary:** four PRs merged. #119 (control-plane docs) went to `main`. #118 (P1) and #120
(skills) merged into their already-merged base branch by mistake. #121 brought both onto `main`.
All session branches are deleted.

On `main` now:
- **P1 attention block** (#118, via #121):
  - `lib/execution-os.ts`: `selectAttentionItems()`, `selectOverdueTasks()`, `AttentionItem`,
    `AttentionKind`, `ATTENTION_LIMIT = 6`.
  - `components/modules/attention-block.tsx`: new, render only.
  - `components/modules/command-center.tsx`: mounts the block above the tabs.
  - `CHANGELOG.md`: entry.
- **Session tooling** (#120, via #121):
  - `.claude/skills/session-start` and `.claude/skills/session-close`.
  - `CLAUDE.md` → "Commit, Push and PR Descriptions", including the stacked-PR rule.
  - New `.github/PULL_REQUEST_TEMPLATE.md`.
  - Pointers in `AI_OS_BRIDGE.md`, `docs/CLAUDE.md`, `CONTRIBUTING.md` and `docs/DAILY_CHECKLIST.md`.
- **Control-plane docs** (#119): ADR-020/021, `docs/CONTROL_PLANE_UI_SPEC.md`, `AI_OS_BRIDGE.md`,
  `AGENTS.md` and the other governance files.
- **This close:** `session-close` step 4 now says that when "Resume on" is `main`, the handoff goes
  through a `docs/session-close-<date>` branch and PR, because `main` is never committed to directly.

**Branch map:** only `main` (`3a4e3c0`) remains from this session. `docs/control-plane-boundary`,
`feat/attention-block`, `exp/session-handoff-skills` and `fix/land-p1-and-skills-on-main` are
deleted locally and on origin. Their content was checked against `main` first. This close is on
`docs/session-close-2026-09-24`.

**Verified (confirmed):**
- typecheck, lint and build exit 0 on `62c964d`. `main` (`3a4e3c0`) has identical content.
- CI on #119 was green (lint/type-check/build, policy check, Vercel).
- P1 criteria 2–5 are met by the code. The component only renders; derivation is in
  `lib/execution-os.ts`. The empty state is one line. No new modules or collections.

**Not verified:**
- **P1 criterion 1:** nobody has opened it in a browser, so "above the fold on desktop and mobile"
  is still unchecked. No login is needed: `npm run dev`, then **Try Demo** on `/login`. With demo
  data the attention list is empty. Add an overdue task or a 4th active project to see rows.
- **The session skills have only been run once.** `/session-close` ran for this close;
  `/session-start` has never run.

**Spec gap:** the P1 spec shows load status "when not `Stable`", but `selectAttentionItems` only adds
a load item when active projects exceed `maxActiveProjects`. `Busy`, `Strained` and `Overloaded`
never appear on their own. Fix the code or narrow the spec before marking P1 `done`.

**Environment note:** `next build` failed once on 2026-09-24 with "JavaScript heap out of memory"
at a ~26 MB heap. The cause was system commit memory, not the code. Close heavy apps and idle WSL
(`wsl --shutdown`) if it recurs.

## Where we left off (2026-09-23)

**Session summary:** control-plane boundary documented. No code changed.

- `docs/ARCHITECTURE.md` — new **System Role** section: Magic Kick is the execution control plane;
  no vendor in the core; agents arrive through the generic `AgentJob` / `AgentResult` contract.
- `docs/DECISIONS_LOG.md` — **ADR-020** (control-plane role + agent boundary) and **ADR-021**
  (ADR-019 expiry recorded; Track 4 gate recorded as *not assessed*; scoped active build).
- `docs/CONTROL_PLANE_UI_SPEC.md` — audit of the current UI against the control-plane workflow plus a
  ranked work queue (P1–P7) with acceptance criteria.
- `AI_OS_BRIDGE.md` — write-back rule narrowed: build state stays in this repo; only strategic
  changes go to the OS.
- Previously untracked governance files committed: `AGENTS.md`, `AI_OS_BRIDGE.md`,
  `docs/OPERATING_CADENCE.md`, `docs/MAGIC_KICK_PERSONAL_OS_HANDOFF.md`, `docs/SESSION_0_PROMPT.md`,
  `.claude/settings.json`.

**OS side (AI-Business-OS repo, branch `docs/ai-operating-architecture`):**
`DEC-2026-09-22-001` (operating architecture), `DEC-2026-09-22-002` (Grok validated outside MK),
`DEC-2026-09-23-001` (this repo raised to a scoped active build).

---

## Open items

- **P1 usage gate** runs 2026-09-29 → 2026-10-06 (see Start here). The load-status gap is settled
  (#123). P1's Status stays `open` until the gate resolves; marking it `done` is Roman's call.
- **P7 has three outside dependencies:** the OS context feed, a GitHub fine-grained PAT, and an ADR
  unfreezing a GitHub API server route (`docs/CLAUDE.md` §6). MK-DEC-006, cited by P7, is not in
  this repo's `docs/DECISIONS_LOG.md`; assumed to live in the OS repo.
- **`docs/CLAUDE.md` §7** still describes the WIP suspension "until 2026-09-20". It expired and
  ADR-021 records that, but the section was never updated.
- **OS `current-focus.md`** lists no open magic-kick branches and does not mention the P1 usage gate.
  Write-back is Roman's call (AI_OS_BRIDGE: only strategic changes go to the OS).
- **Production login works** (Roman, 2026-09-29) on the single production URL
  https://magic-kick.vercel.app/. The old `magic-kick-kfb8.vercel.app` domain was removed and now
  returns 404. Production and `.env.local` both use Firebase project `magickick-78983` (confirmed
  from the deployed bundle). Dev and preview logins (reported failing 2026-09-24) are still not
  investigated; they do not block the usage gate.
- **Branch naming:** `docs/CLAUDE.md` §4 requires `exp/…` or `fix/<issue>-…`, but most branches use
  `feat/` or `docs/`. Either the rule or the practice should change. This is Roman's call.
- **ADR-016…ADR-019 are dated 2026-08-09** but sit after ADR-015 (2026-08-10); the log is not in
  strict date order. Cosmetic; leave unless the log gets an index.
- **Track 2 (from ADR-017):** validate state server-side in the existing AI routes.
- **Allocation reverts to `limited` on 2026-10-21** unless the control-plane scope is delivered
  first or a new ADR lands (ADR-021).
