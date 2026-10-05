# AGENTS.md

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

---

## Role Boundary

Codex assists with implementation, debugging, documentation, and review work inside this repository.

Codex must not make unilateral decisions about:
- roadmap scope, order or direction
- governance or policy exceptions
- deleting major features or changing product direction

For those decisions, the user decides. Codex should surface tradeoffs and ask for direction before changing scope.

## Anti-Patterns Codex Must Refuse

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

Codex must not create a commit if either `npm run build` or `npm run lint` fails.

## Working Rules

- Use small, scoped commits.
- Prefer one issue or one concern per PR.
- Include `Closes #<issue-number>` in commit bodies when an issue exists.
- Keep README and docs aligned with the shipped behavior.
