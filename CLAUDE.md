# CLAUDE.md

## Governing Rule

> Magic Kick is the UI of AI-Business-OS and Roman's daily planner: the screen where
> the OS's tasks and context are reached, updated and used (ADR-024). Work follows the
> ranked roadmap in `docs/CONTROL_PLANE_UI_SPEC.md`, one item at a time. The
> AI-Business-OS repo stays the source of truth; Magic Kick reads and writes it through
> server-side routes only. The 9 existing modules are the ceiling; OS content goes
> inside them, not alongside them.

## Shared rules

Every rule for agents in this repository is kept once, in `AGENTS.md` (P9): working agreement, role
boundary, anti-patterns, pre-commit gates, working rules, and commit, push and PR descriptions. It is
imported here, so it applies to Claude exactly as written there ("the agent" means Claude):

@AGENTS.md

## Claude Code additions

- Start every session with `/session-start` and end it with `/session-close` (`.claude/skills/`).
- The pre-commit gates are enforced by a hook (`.claude/hooks/commit-gate.mjs`, P8): a `git commit`
  from Claude Code is blocked unless typecheck, lint and build pass and the message has `Verified:`
  and `Not verified:` lines. The written rules in `AGENTS.md` are the fallback for anything the hook
  does not cover.
- Session governance (framing, scope, freeze list, review checklist) is in `docs/CLAUDE.md`.
