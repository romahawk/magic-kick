---
name: session-close
description: Close a Magic Kick work session — rebuild docs/NEXT_SESSION_START.md from actual git state, run the gates, check CHANGELOG, list what was not verified, and commit the handoff. Use on "/session-close", "close the session", "wrap up", "handoff", or when the user is ending a session in this repo.
---

# Session close

Goal: the next session can start from the handoff alone, and every line in it is true.
Write the handoff from what git and the gates show now — not from what the session intended.

Label claims **confirmed** (you ran or read it) or **assumed / not verified**.

## 1. Collect facts

```bash
git fetch --prune origin
git branch --show-current
git status --short
git log --oneline origin/main..HEAD
git status -sb | head -1                     # ahead/behind upstream
git log --since=midnight --all --oneline     # everything committed today, any branch
git branch --merged origin/main
```

Build a branch map of every branch touched this session: base, head commit, pushed or not,
PR state (`gh pr list --head <branch>` if `gh` is available), and merge order if stacked.

`.claude/settings.local.json` is local — never commit it. If `next-env.d.ts` differs only by the
`.next/dev/types` path, `git restore next-env.d.ts`.

## 2. Gates

If code changed since the gates last passed, stop `next dev` and run:

```bash
npm run lint
npm run typecheck
npm run build
```

Record real exit codes with today's date. If a gate fails, do not commit code; write the failure
into the handoff as the first open item.

## 3. CHANGELOG

If the session changed anything a user of the app can see, `CHANGELOG.md` needs an entry in
the existing format (`## [Unreleased] - YYYY-MM-DD - <title>`, then Added / Changed / Fixed).
Docs, governance and tooling-only sessions do not need one.

## 4. Rewrite docs/NEXT_SESSION_START.md

Update, do not append blindly:

- **Header** — `Last updated`, `Resume on` (the branch the next session should start from),
  lint / typecheck / build status with the date they were last run, and a one-line note on what
  kind of change the session made.
- **Start here** — keep it valid for the next session; point at the actual next item.
- **Where we left off (YYYY-MM-DD)** — new section at the top:
  - what changed, per file group, one line each
  - branch map (from step 1)
  - **verified** — what was actually run or looked at
  - **not verified** — acceptance criteria nobody checked (for example, anything visual
    nobody opened in a browser)
- Keep only the previous session's section below it; older sections are in git history.
- **Open items** — remove items that are done (check merged PRs), add new ones. Keep dates absolute.

The handoff is per branch. Commit it on the branch named in `Resume on`; if other branches carry
an older copy, say so in the report.

## 5. OS write-back

Per `AI_OS_BRIDGE.md`, update `AI-Business-OS/02_PROJECTS/magic-kick/context.md` only if
something strategic changed: a blocker needing an OS ruling, a milestone that changes lifecycle
or validation state, or a moved pointer (branch, state file, repo path). Otherwise do not touch
the OS. Decisions go to the OS `decisions.md` and `04_DECISIONS/decision-log.md` via the template.
Never edit `current-focus.md` or `decision-rules.md`.

## 6. Commit and report

Commit the handoff (and CHANGELOG, if changed) as `docs: session close YYYY-MM-DD`, only after
the gates pass. Stage files by name, never `git add -A`. Every commit, push and PR follows root
`CLAUDE.md` → "Commit, Push and PR Descriptions": the body says why, what changed, verified and
not verified. Pass multi-line messages with `git commit -F <file>`; PowerShell 5.1 breaks quotes
in `-m`.

Do not push without asking. When approved, list per branch the base and the commits going up
before pushing, and never force-push without explicit approval for that push. If a PR is
opened, fill every section of `.github/PULL_REQUEST_TEMPLATE.md` from the diff and the real gate
output (`gh pr create --body-file <file>`).

Report on one screen:

- what was committed where
- gates with exit codes
- not verified
- carry-forward items for the next Daily Command Center run
- branches waiting to be pushed, rebased or merged — and ask whether to push
