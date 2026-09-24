---
name: session-start
description: Start a Magic Kick work session — check git reality against the last handoff in docs/NEXT_SESSION_START.md, run the gates, read the OS context, and get the experiment or itch named before any work. Use on "/session-start", "start session", "where did we leave off", or at the beginning of any session in this repo.
---

# Session start

Goal: begin from verified repo state, not from memory or a stale note. Report, then stop and
wait for the user to name the work. Do not edit files or write code in this skill.

Label every claim in the report as **confirmed** (you ran or read it) or **assumed**.

## 1. Git reality

Run and note the results:

```bash
git fetch --prune origin
git branch --show-current
git status --short
git log -5 --oneline
git log -5 --oneline origin/main
git status -sb | head -1          # ahead/behind upstream
git branch --merged origin/main   # branches already merged
```

Flag: being on `main`; uncommitted changes; branch not pushed or behind; branches that were
squash-merged into `main` but still carry the original commits (their PRs will show duplicate
history — they need a rebase onto `origin/main`).

Ignore `.claude/settings.local.json` (local only). If `next-env.d.ts` is modified only because
`next dev` switched it to `.next/dev/types`, it is generated noise — `git restore next-env.d.ts`.

## 2. Last handoff

Read `docs/NEXT_SESSION_START.md` on the current branch. The note is per branch: if its header
names a different "resume on" branch, read that branch's copy too
(`git show <branch>:docs/NEXT_SESSION_START.md`).

Compare the note with step 1. Any contradiction (wrong branch, "uncommitted" work that is
committed, "open" PRs already merged, stale gate dates) goes in the report. If the repository
state contradicts the plan, report it and stop — do not adapt the plan (`docs/CLAUDE.md` §3).

## 3. OS context

Per `AI_OS_BRIDGE.md`, read before any work:

1. `D:\MazurykOS\01_Projects\IT-Projects-dev\AI-Business-OS\01_CONTEXT\current-focus.md` — is Magic Kick active, what allocation
2. `...\AI-Business-OS\01_CONTEXT\decision-rules.md`
3. `...\AI-Business-OS\02_PROJECTS\magic-kick\context.md`
4. The newest file in `...\AI-Business-OS\06_REVIEWS\daily\` — carry-forward items only

If a file cannot be read, say so; do not guess its contents.

## 4. Gates

```bash
npm run lint
npm run typecheck
npm run build
```

Report the real exit codes. `next build` needs several GB of free commit memory on this
machine: if it dies with "JavaScript heap out of memory" at a small heap size, the cause is
system memory (stop `next dev`, close heavy apps), not the code — say so rather than raising
`--max-old-space-size`. Stop any running `next dev` first; both write to `.next/`.

## 5. Report and ask

Keep it to one screen:

- **Branch and state** — branch, ahead/behind, uncommitted, stacked or unmerged branches
- **Handoff vs reality** — each contradiction, or "matches"
- **Gates** — lint / typecheck / build, with exit codes
- **Carried over** — open items and unverified work from the handoff and the daily review
- **Suggested next** — the top item from the handoff's queue

Then ask the user to name the session, using the frame in `docs/CLAUDE.md` §3: experiment name
or itch, learning question, time box (default 90 min), deliverables, out of scope, acceptance
criteria. If neither an experiment nor an itch can be named, say so and stop (root `CLAUDE.md`).

If work needs a new branch, propose one from `origin/main` (or stacked on the branch it depends
on, stated explicitly). Never start feature work on `main`.
