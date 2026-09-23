# Claude Code — Session 0: Repo Truth

Paste the block below into Claude Code at the repository root.

---

## Experiment

**Name:** `exp/session-0-repo-truth`
**Learning question:** What is the actual, verified state of this repository — does it install, lint, typecheck and build, and where exactly does the Firestore data model diverge between code, rules and documentation?
**Time box:** 90 minutes. On expiry, write whatever the report contains so far, commit it, and report status. Do not extend.

## Framing

Read `CLAUDE.md` before starting. This session is **read-only verification**. The last audit of this repository was static — dependency installation failed in a temporary clone — so nothing about the current state is confirmed. Every downstream track depends on knowing whether `main` actually builds.

**This session produces a report, not fixes.**

## Deliverables

One file: `docs/audits/2026-08-09-session-0-repo-truth.md`

It must contain the following sections.

### 1. Build verification

Run, in order, and capture **actual terminal output** (not a summary, not a claim):

- clean dependency install
- lint
- typecheck
- tests, if a test script exists
- build

For each: the command run, exit code, and full error output if it failed. If a step fails, continue to the next step anyway and record it — do not stop at the first failure.

### 2. Runtime and dependency facts

- Node version, package manager and lockfile present.
- Next.js, React and TypeScript versions **as resolved in the lockfile**, not as declared in `package.json`.
- Any dependency that failed to install, and the reason.
- Any peer-dependency warnings.

### 3. Firestore collection inventory

Produce a single table with one row per collection, and these columns:

| Collection | Read in code (files) | Written in code (files) | Present in `firestore.rules` | Described in `docs/ARCHITECTURE.md` | Described in `docs/FIREBASE_ARCHITECTURE.md` |

Method: grep the codebase for every Firestore path and collection string literal. Include at minimum the collections previously identified — `goals`, `tasks`, `projects`, `achievements`, `schedule`, `resources`, `journal`, `weeklyPlans`, `timeBlocks`, `executionLogs`, `weeklyReviews` — but do not assume that list is complete. Find them yourself.

### 4. Path model divergence

- The actual path model used in code (expected: `users/{uid}/...` — confirm or correct).
- The path model described in `docs/FIREBASE_ARCHITECTURE.md` (expected: workspace-based — confirm or correct).
- Every location where collection names are hard-coded as string literals, with file and line. Specifically check `lib/store.ts`, `lib/db/types.ts`, `lib/db/firestore.ts`, `lib/sync/*`, `firestore.rules`.
- Whether a shared collection-definitions module already exists.

### 5. AI route inventory

- Every route under the AI API directory, with its path.
- For each: does it read authoritative state server-side, or accept application state from the request body?
- Whether a feature flag currently gates these routes, and what it is named.

### 6. Repo hygiene

- Current branch, whether the working tree is clean, whether `main` is ahead of or behind origin.
- Presence and content summary of: `docs/ROADMAP.md`, `docs/DECISIONS_LOG.md`, `docs/CONTROL_TOWER.md`, `CLAUDE.md`.
- Whether CI is configured, and what it runs.
- Whether any `.env` example file documents required environment variables.

### 7. Findings

A numbered list of concrete problems found. For each:

- Severity: **blocker** / **high** / **medium** / **low**
- One-line description
- Affected files
- Suggested issue title

Sort by severity.

### 8. Confirmed vs assumed

Two explicit lists. Anything not directly verified by running a command or reading a file goes in the **assumed** list. Do not blur the two.

## Out of scope

Explicitly **do not**:

- Fix anything. No code changes of any kind.
- Modify `firestore.rules`.
- Modify or create any source file outside `docs/audits/`.
- Install, upgrade, remove or pin any dependency beyond what a clean install of the existing lockfile does.
- Refactor, reorganise or rename anything.
- Open a GitHub issue.
- Start on any Track 2 work, however small or obvious the fix appears.

If you find a one-line fix that seems trivially safe: **record it in Findings and leave it alone.**

## Acceptance criteria

- [ ] `docs/audits/2026-08-09-session-0-repo-truth.md` exists and contains all eight sections.
- [ ] Section 1 contains real terminal output with exit codes, not paraphrase.
- [ ] Section 3 table has a row for every collection string found in the codebase.
- [ ] Section 7 findings each have severity, affected files and a suggested issue title.
- [ ] Section 8 separates confirmed from assumed with no overlap.
- [ ] `git diff --stat` shows exactly one file added, under `docs/audits/`.
- [ ] Branch is `exp/session-0-repo-truth`, one commit: `docs: session 0 repo truth audit`.
- [ ] PR opened against `main` with the findings summary in the description.

## Reporting

End with:

1. Does `main` build — yes or no.
2. Count of blocker-severity findings.
3. The three issues you would open first, in order.
4. Anything in this prompt that turned out to be factually wrong about the repository.
