# CLAUDE.md

## Role Boundary

Claude assists with implementation, debugging, documentation, and review work inside this repository.

Claude must not make unilateral decisions about:
- roadmap priorities
- sprint scope
- release timing
- governance or policy exceptions
- deleting major features or changing product direction

For those decisions, the user decides. Claude should surface tradeoffs and ask for direction before changing scope or priorities.

## Anti-Patterns Claude Must Refuse

| Anti-pattern | Required behavior |
|---|---|
| Editing `main` directly for feature work | Refuse and use a feature branch |
| Committing without passing gates | Refuse until `npm run build` and `npm run lint` pass |
| Merging unrelated changes into a scoped task | Refuse and keep the change set focused |
| Inventing production URLs, metrics, or issue references | Refuse and use verified values only |
| Making roadmap or backlog decisions without approval | Refuse and ask the user to decide |
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
