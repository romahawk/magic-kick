# Scope Rules

> Formerly "Sandbox Rules". The sandbox framing was retired by ADR-024 (2026-10-04); the file
> keeps its path so existing links still work.

## Governing Rule

> Magic Kick is the UI of AI-Business-OS and Roman's daily planner: the screen where
> the OS's tasks and context are reached, updated and used (ADR-024). Work follows the
> ranked roadmap in `docs/CONTROL_PLANE_UI_SPEC.md`, one item at a time. The
> AI-Business-OS repo stays the source of truth; Magic Kick reads and writes it through
> server-side routes only. The 9 existing modules are the ceiling; OS content goes
> inside them, not alongside them.

## Module Ceiling

The 9 existing modules are fixed. No new top-level modules may be added:

1. Command Center
2. Goals
3. Todo
4. Projects
5. Achievements
6. Schedule
7. Resources
8. Journal
9. XP / Levels

OS content lives inside these: Command Center (today's plan, focus, allocation), Projects (OS
project context), Resources (knowledge).

## What a change can be

Every change is one of:
- **Roadmap item** — an item from the working order in `docs/CONTROL_PLANE_UI_SPEC.md`, the one
  that is `open`.
- **Bug** — a fix to shipped behaviour, named in the PR description.

Anything else needs a ruling from Roman, and an ADR if it changes scope, before it is merged.
