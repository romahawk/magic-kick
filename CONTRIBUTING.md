# Contributing — Magic Kick

Solo-founder project. This guide captures the workflow discipline used for Issue → PR → Deploy.

---

## Branch Naming

```
feat/<short-description>       # new feature
fix/<short-description>        # bug fix
chore/<short-description>      # maintenance, deps, config
docs/<short-description>       # documentation only
refactor/<short-description>   # code change with no behavior change
```

Examples:
- `feat/task-recurrence`
- `fix/sync-error-toast`
- `docs/update-architecture`

---

## Commit Message Format

```
type(scope): short description

Optional longer explanation (wrap at 72 chars).
Closes #<issue-number>
```

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`

Examples:
- `feat(todo): add task recurrence (daily/weekly)`
- `fix(sync): handle expired auth token in sync cycle`
- `chore(deps): move firebase-admin to devDependencies`

---

## PR Discipline

1. Every PR must close at least one issue (or explain why not)
2. Every PR must pass `npm run build` and `npm run lint`
3. UI changes require a screenshot or GIF in the PR description
4. Maximum 400 lines changed per PR (split larger work into smaller PRs)
5. Self-review before requesting merge — read your own diff first

---

## Release Notes Format

Add to `CHANGELOG.md` under `[Unreleased]` for every user-facing change:
- `Added:` new features
- `Changed:` modifications to existing behavior
- `Fixed:` bug fixes
- `Removed:` deleted features

Bump version in `package.json` when merging a release batch.

---

## Max Active Scope Rule

At most **3 open feature issues** at any time. Finish (or explicitly defer) before opening new ones. Prevents half-finished work accumulating in branches.

---

## Daily Loop (Solo)

1. Check open issues — pick one
2. Create branch from `main`
3. Implement with micro-scope (one concern per commit)
4. Self-review diff
5. Open PR with template filled out
6. Merge and delete branch
7. Update CHANGELOG if user-facing
8. Deploy if milestone complete
