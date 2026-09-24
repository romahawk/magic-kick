# Next Session Start

**Last updated:** 2026-09-24 (session close)
**Resume on:** `main` once `fix/land-p1-and-skills-on-main` is merged (until then, that branch). P1 is in the code; visual verification is next.
**Build status:** passing as of 2026-09-24 on `fix/land-p1-and-skills-on-main` — `npm run build` exit 0 (Next.js 16.1.6, Turbopack, Node 22.19.0)
**Typecheck status:** passing as of 2026-09-24 — `npm run typecheck` exit 0 (the build ignores type errors, so this gate is the one that catches them)
**Lint status:** passing as of 2026-09-24 — `npm run lint` exit 0
**Test status:** `npm test` is an alias for `typecheck`; there is no separate test suite
**Note:** the 2026-09-24 session shipped code (P1) and workflow docs (session skills). No dependency changes.

---

## Start here

1. `git status`: note the branch and any uncommitted changes
2. Read `docs/CONTROL_PLANE_UI_SPEC.md` — it is the work queue; P1 is `open`
3. Read ADR-020 and ADR-021 in `docs/DECISIONS_LOG.md` before any control-plane or scope decision
4. `npm run build`, `npm run lint`, `npm run typecheck` must exit 0 before any commit
5. From the next session on, run `/session-start` and `/session-close` instead. They reach `main`
   with the landing PR (see branch map below)

---

## Where we left off (2026-09-24) — P1 committed, not yet seen in a browser

**Session summary:** P1 (attention block) passed the gates and was committed. The branches were split
so each PR carries one concern, and session start/close became project skills.

P1 changes (PR #118):
- `lib/execution-os.ts` — new `selectAttentionItems()` (+ `selectOverdueTasks`, `AttentionItem`,
  `AttentionKind`, `ATTENTION_LIMIT`). One derivation for "what is wrong now": overdue weekly
  outcomes, overdue tasks, active projects with no weekly outcome, over-capacity load. Each item
  carries `{id, kind, severity, title, detail, module, actionLabel}` — P3 adds agent proposals as
  one more `kind` without touching the component.
- `components/modules/attention-block.tsx` — new component, render only, no derivation.
- `components/modules/command-center.tsx` — two lines: import, and `<AttentionBlock />` above the tabs.
- `CHANGELOG.md` — entry for the attention block.

Session skills and description standard (PR #120):
- `.claude/skills/session-start/SKILL.md`, `.claude/skills/session-close/SKILL.md` — new project skills.
- `CLAUDE.md`, `AI_OS_BRIDGE.md`, `docs/DAILY_CHECKLIST.md` — point at the skills. The bridge's
  end-of-session OS update is now conditional ("only if strategic"), matching its own
  "After every session" rule. Previously the two contradicted each other.

**How it merged (2026-09-24, 22:15–22:16):** #119 was squash-merged into `main` as `bbcb477`.
Fifteen seconds later, #118 and #120 were squash-merged into their base,
`docs/control-plane-boundary`, as `bcd5aa1` and `8a87087`. That branch had already been merged and
was never deleted, so GitHub didn't move the two PRs onto `main`. **P1 and the skills were not on
`main`.**

**Recovery:** `fix/land-p1-and-skills-on-main` is cut from `main` at `bbcb477`. It cherry-picks
`bcd5aa1` (P1), `8a87087` (skills) and this handoff. It needs its own PR into `main`.

**Branch map** (after the landing PR merges, only `main` matters):

| Branch | State |
|---|---|
| `main` | `bbcb477`: has #119. P1 and the skills are missing until the landing PR merges. |
| `fix/land-p1-and-skills-on-main` | the landing PR into `main`: P1 + skills + handoff |
| `docs/control-plane-boundary`, `feat/attention-block`, `exp/session-handoff-skills` | fully merged or superseded. Safe to delete once the landing PR merges. |

**Lesson for stacked PRs:** after the base PR merges, delete its branch (or retarget the stacked
PRs to `main`) *before* merging anything else. Otherwise the stacked PRs merge into the dead
branch.

**Verified (confirmed):**
- typecheck, lint and build pass on `feat/attention-block` (2026-09-24).
- Lint and build pass on `exp/session-handoff-skills`.
- P1 criteria 2–5 are met by the code. The component only renders; derivation is in
  `lib/execution-os.ts`. The empty state is one line. No new modules or collections.

**Not verified:**
- **P1 criterion 1** — nobody has opened it in a browser, so "above the fold on desktop and mobile" is
  still unchecked. No login is needed: `npm run dev`, then **Try Demo** on `/login`. With demo data the
  attention list is empty ("Nothing needs attention."). Add an overdue task or a 4th active project to
  see rows.
- The session skills have not been run end to end yet. This close followed them by hand.

**Spec gap found:** the P1 spec says to show load status "when not `Stable`", but
`selectAttentionItems` only adds a load item when active projects exceed `maxActiveProjects`. The
`Busy`, `Strained` and `Overloaded` statuses never appear otherwise. Decide whether to fix the code
or narrow the spec before marking P1 `done`.

**Environment note:** `next build` failed once today with "JavaScript heap out of memory" at a
~26 MB heap. The cause was system commit memory running out (browser, VS Code, an idle WSL VM
holding 4 GB, `next dev`), not the code. Stop `next dev` before building.

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

- **Merge the landing PR** (`fix/land-p1-and-skills-on-main` → `main`). Until then `main` has
  neither P1 nor the session skills. Afterwards, delete the three merged branches.
- **Verify P1 in a browser** (desktop + ~390px mobile), and settle the load-status gap. #118 was
  merged before either was done, so both are now follow-ups on `main`. P1's Status line stays
  `open` until they're settled. It's Roman's call whether to mark it `done` once the landing PR
  merges. The landing PR's Vercel preview works for the check with **Try Demo**, even though
  preview logins are broken.
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
