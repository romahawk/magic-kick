# CLAUDE.md

## Governing Rule

> Magic Kick is a personal planner and an AI-SDLC sandbox. It has no users, no
> roadmap, and no backlog. Changes are either (a) self-scratching an itch, or
> (b) a named, time-boxed AI-workflow experiment with a stated learning goal.
> Anything else is scope drift. The 9 existing modules are the ceiling; new
> work happens inside them, not alongside them.

## Working Agreement

- One experiment at a time, named and time-boxed.
- No new top-level modules; the 9 existing modules are the ceiling.
- Net new files per experiment: keep small; prefer refactors over additions.
- Every session must start by naming the experiment or the itch.
  If neither can be named, stop and work on a different repo.

---

## Role Boundary

Claude assists with implementation, debugging, documentation, and review work inside this repository.

Claude must not make unilateral decisions about:
- experiment scope or direction
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
