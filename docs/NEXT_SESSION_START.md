# Next Session Start

**Last updated:** 2026-09-24 (session close, after all merges)
**Resume on:** `main` at `3a4e3c0` (PR #121). Start a new branch from `main` for any work.
**Build status:** passing as of 2026-09-24 — `npm run build` exit 0 (Next.js 16.1.6, Turbopack, Node 22.19.0)
**Typecheck status:** passing as of 2026-09-24 — `npm run typecheck` exit 0 (the build ignores type errors, so this gate is the one that catches them)
**Lint status:** passing as of 2026-09-24 — `npm run lint` exit 0
**Test status:** `npm test` is an alias for `typecheck`; there is no separate test suite
**Note:** the 2026-09-24 session shipped code (P1 attention block) and workflow tooling (session skills, description standard). No dependency changes.

---

## Start here

1. Run `/session-start`. It checks this note against git, runs the gates and asks for the experiment name.
2. Next item: **verify P1 in a browser**, then decide on the load-status gap (see Open items).
   `docs/CONTROL_PLANE_UI_SPEC.md` is the work queue; P1 is `open`.
3. Read ADR-020 and ADR-021 in `docs/DECISIONS_LOG.md` before any control-plane or scope decision.
4. `npm run build`, `npm run lint`, `npm run typecheck` must exit 0 before any commit.

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

- **Verify P1 in a browser** (desktop + ~390px mobile) and settle the load-status gap. #118 was
  merged before either was done. P1's Status line in `docs/CONTROL_PLANE_UI_SPEC.md` stays `open`
  until both are settled; marking it `done` is Roman's call.
- **Seed/test logins fail in dev and preview** (reported 2026-09-24, not investigated). The repo
  creates no accounts; auth is Firebase. Check which Firebase project each environment's
  `NEXT_PUBLIC_FIREBASE_*` points to, and the authorized domains for preview.
- **Branch naming:** `docs/CLAUDE.md` §4 requires `exp/…` or `fix/<issue>-…`, but most branches use
  `feat/` or `docs/`. Either the rule or the practice should change. This is Roman's call.
- **ADR-016…ADR-019 are dated 2026-08-09** but sit after ADR-015 (2026-08-10); the log is not in
  strict date order. Cosmetic; leave unless the log gets an index.
- **Track 2 (from ADR-017):** validate state server-side in the existing AI routes.
- **P6 in the UI spec needs a decision from Roman before code** (gamification placement).
- **Allocation reverts to `limited` on 2026-10-21** unless the control-plane scope is delivered
  first or a new ADR lands (ADR-021).
