---
id: os-bridge
type: os-connection
project: magic-kick
os_path: D:\MazurykOS\01_Projects\IT-Projects-dev\AI-Business-OS
status: active
---

# AI-Business-OS Connection — Magic Kick

This file connects this project's working thread to the AI-Business-OS strategic context store.
Read it at the start of every session, before any work begins.

---

## OS Location

```
D:\MazurykOS\01_Projects\IT-Projects-dev\AI-Business-OS
```

---

## Session Start Protocol

Read in this order before doing anything:

1. `AI-Business-OS/01_CONTEXT/current-focus.md` — confirm this project is active; check execution allocation
2. `AI-Business-OS/01_CONTEXT/decision-rules.md` — authority model and priority hierarchy
3. `AI-Business-OS/02_PROJECTS/magic-kick/context.md` — current state, blockers, next actions
4. `AI-Business-OS/06_REVIEWS/daily/` — check the most recent daily review for carry-forward items
5. `docs/NEXT_SESSION_START.md` (this repo) — last session hand-off note, if it exists

Do not start executing before steps 1–3 are read.

---

## Context Sync — What to Write Back and When

Update the OS after any session that produces meaningful output. Write the minimum useful set — do not over-document.

### After every session

Build state and the next-session queue are written **here**, in this repo: `docs/NEXT_SESSION_START.md`
and `docs/DECISIONS_LOG.md`. They are canonical here and are **not** copied into the OS
(`AI-Business-OS/00_HOME/source-of-truth-map.md`, OS `DEC-2026-09-22-001`).

Update `AI-Business-OS/02_PROJECTS/magic-kick/context.md` only when something **strategic** changed:
- a blocker that needs an OS-level ruling (priority, allocation, scope)
- a milestone that changes lifecycle / validation state
- a pointer that moved (branch, state-file path, repo path)

### When a decision is made

File: `AI-Business-OS/02_PROJECTS/magic-kick/decisions.md`
Also append to: `AI-Business-OS/04_DECISIONS/decision-log.md`

Use the template at `AI-Business-OS/09_TEMPLATES/decision-template.md`.

### When a milestone is cleared

File: `AI-Business-OS/02_PROJECTS/magic-kick/context.md`

Update:
- `lifecycle` / `validation_state` in frontmatter
- Current State narrative
- Next Milestone

### When work produces a daily-review-worthy output

Note it for the Daily Command Center. Do not write to `06_REVIEWS/daily/` directly — that is the Daily Close job (L1).

---

## Authority Model

This project session operates at **L2 — Execute within strategy**.

| Action | Level | What to do |
|--------|-------|------------|
| Update project context.md (state, blockers, next actions) | L2 | Do it |
| Record a decision in decisions.md | L2 | Do it |
| Update project roadmap | L2 | Do it |
| Pause or reactivate this project | L3 | Ask first — do not act |
| Change execution allocation or priority in current-focus.md | L4 | Human only |
| Change decision-rules.md | L4 | Human only |
| Delete files, push to main, financial or external actions | L5 | Human confirmation, always |

Full authority model: `AI-Business-OS/01_CONTEXT/decision-rules.md`

---

## What NOT to Do

- Do not modify `AI-Business-OS/01_CONTEXT/current-focus.md` unilaterally
- Do not activate or pause any other project
- Do not edit other projects' context files
- Do not invent metrics, dates, or commitments — use `TBD` when unknown
- Do not create new top-level OS categories
- Do not turn a project work session into an OS restructuring session
- Do not use evidence labels (FACT / ASSUMPTION / etc.) inconsistently — when in doubt, use them

---

## End of Session Protocol

1. Update `AI-Business-OS/02_PROJECTS/magic-kick/context.md` — state, blockers, next actions
2. Update `docs/NEXT_SESSION_START.md` in this repo — branch, last action, what is next
3. If code was changed: confirm `build` and `lint` pass before closing
4. Surface any carry-forward items that belong in the next Daily Command Center run

