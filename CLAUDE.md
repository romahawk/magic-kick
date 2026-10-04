# CLAUDE.md

## Governing Rule

> Magic Kick is the UI of AI-Business-OS and Roman's daily planner: the screen where
> the OS's tasks and context are reached, updated and used (ADR-024). Work follows the
> ranked roadmap in `docs/CONTROL_PLANE_UI_SPEC.md`, one item at a time. The
> AI-Business-OS repo stays the source of truth; Magic Kick reads and writes it through
> server-side routes only. The 9 existing modules are the ceiling; OS content goes
> inside them, not alongside them.

## Working Agreement

- One roadmap item open at a time (WIP = 1).
- No new top-level modules; the 9 existing modules are the ceiling.
- Keep net new files small; prefer refactors over additions.
- Every session must start by naming the roadmap item or the bug it works on.
  If neither can be named, stop.
- Start every session with `/session-start` and end it with `/session-close`
  (`.claude/skills/`). `docs/NEXT_SESSION_START.md` is the handoff between sessions.

---

## Role Boundary

Claude assists with implementation, debugging, documentation, and review work inside this repository.

Claude must not make unilateral decisions about:
- roadmap scope, order or direction
- governance or policy exceptions
- deleting major features or changing product direction

For those decisions, the user decides. Claude should surface tradeoffs and ask for direction before changing scope.

## Anti-Patterns Claude Must Refuse

| Anti-pattern | Required behavior |
|---|---|
| Editing `main` directly for feature work | Refuse and use a feature branch |
| Committing without passing gates | Refuse until `npm run build` and `npm run lint` pass |
| Merging unrelated changes into a scoped task | Refuse and keep the change set focused |
| Inventing production URLs, metrics, or issue references | Refuse and use verified values only |
| Adding a new top-level module | Refuse; the 9 existing modules are the ceiling |
| Skipping docs updates for workflow or governance changes | Refuse and update the relevant docs |

## Pre-Commit Gates

Before any commit:
1. Run `npm run build`
2. Run `npm run lint`
3. If the change is user-facing, update `CHANGELOG.md`

Claude must not create a commit if either `npm run build` or `npm run lint` fails.

## Working Rules

- Use small, scoped commits.
- Prefer one issue or one concern per PR.
- Include `Closes #<issue-number>` in commit bodies when an issue exists.
- Keep README and docs aligned with the shipped behavior.

## Commit, Push and PR Descriptions

Every commit, push and PR says what was done, why, and what was and was not verified. Write it from
the diff and the gate output, never from memory or intent. This section is the standard;
`docs/CLAUDE.md` §4, `CONTRIBUTING.md` and `.github/PULL_REQUEST_TEMPLATE.md` follow it.

**Commit message**

```
<type>(<scope>): <imperative summary, max 72 chars>

<Why: the problem or goal, 1–3 lines.>

<What changed, grouped by file or area, one line each.>

Verified: <gates run and their result; manual checks done>
Not verified: <anything unchecked, or "nothing outstanding">
Closes #<n>                         (when an issue exists)
```

- Types: `feat`, `fix`, `docs`, `refactor`, `chore`, `test`. The scope is the module or area.
- A body is required unless the subject says it all (for example a one-line typo fix).
- Commits written with Claude end with a `Co-Authored-By:` trailer.

**Push**

- Before pushing, state the branch, its base (and what it is stacked on), and the commits going up
  (`git log --oneline origin/<branch>..<branch>`, or `origin/main..` for a new branch).
- Never force-push without explicit approval for that push. When approved, use
  `--force-with-lease=<branch>:<expected-remote-sha>` and say why history was rewritten.
- After pushing, report what went up, where, and the PR link or next step.

**Pull request**

- Title: the same form as a commit subject.
- Body: fill in every section of `.github/PULL_REQUEST_TEMPLATE.md`. "N/A" is fine; deleting a
  section is not.
- Paste the real gate output (the last lines of each command with its exit code), not "passes".
- Say what is **not** verified. A UI change without screenshots says so.
- For stacked PRs, name the base PR and the merge order. After the base PR merges, delete its
  branch or retarget the stacked PRs to `main` **before** merging them. Otherwise they merge into
  the already-merged branch and never reach `main` (this happened with #118 and #120 on 2026-09-24).
