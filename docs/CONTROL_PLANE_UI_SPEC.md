# Control-Plane UI — Audit and Work Queue

**Date:** 2026-09-23
**Status:** spec, not implemented
**Authority:** ADR-020 (control-plane role), ADR-021 (scoped active build), OS `DEC-2026-09-23-001`
**Governing constraints:** `CLAUDE.md` — no new top-level modules, the 9 existing modules are the
ceiling; one experiment at a time; `npm run build` + `npm run lint` + `npm run typecheck` before any commit.

This is the queue a Claude Code session works from. Items are ranked. Do not reorder without a note here.

---

## The question the UI must answer

A control plane answers two questions on open:

> **What requires attention now?** · **What should a human or agent do next?**

Everything else — planning, reviewing, browsing — is secondary. The audit below is measured against
that standard, not against general UI quality.

## Audit findings (verified against the code, 2026-09-23)

| # | Finding | Evidence |
|---|---|---|
| F1 | Command Center is **planning-first, not attention-first**. Its three tabs are Week / Plan / Review; the first thing on screen is weekly capacity and allocation, not what is wrong or what is next. | `components/modules/command-center.tsx` |
| F2 | **Two parallel planning layers.** `lib/weekly-plan.ts` drives the UI; `lib/execution-os.ts` holds `selectDailyFocus`, `selectWeeklyOutcomes`, `TASK_LANE_LABELS` — **not referenced by any component**. Only `calculateCognitiveLoad` is used, and only by `lib/ai/insights.ts`. `docs/ARCHITECTURE.md` migration step 5 ("move Command Center onto the selector layer") never happened. | grep across `components/`, `app/`, `hooks/` |
| F3 | **"What next" is one click away and never derived.** The Daily Focus lane exists only inside the ToDo module's board; Command Center never shows it. | `components/modules/todo-module.tsx` |
| F4 | **No "waiting on you" surface.** Nothing aggregates overdue weekly outcomes, stalled active projects, or an unreviewed finished week. Approvals have no home — and approvals are the control plane's core loop (ADR-018: "AI proposes, never silently commits"). | no such component |
| F5 | **No provenance on items.** ADR-018 adopted "every item has a source" and `source + sourceId` idempotency. `Task` / `Project` in `lib/types.ts` carry no source fields, so an agent result could not be distinguished from something typed by hand. | `lib/types.ts` |
| F6 | **Navigation is a filing cabinet, not an attention model.** Eight equal-weight nouns (Command Center, Schedule, Goals, ToDo, Projects, Resources, Journal, Achievements). Reference surfaces sit at the same level as execution surfaces. | `components/sidebar.tsx` |
| F7 | **Gamification is the most prominent persistent UI.** Level, XP bar and streak occupy the sidebar profile card above navigation. This contradicts the OS anti-abandonment rule "no streaks, no scores, no guilt mechanics" (`lifeos-architecture.md` §0). Product decision, not a bug. | `components/sidebar.tsx` |
| F8 | **OS context is invisible.** The tool that allocates attention cannot show current focus, lane allocation or why a project is primary. Reading it needs the GitHub API path (MK-DEC-006) — real work, correctly deferred, but the gap should be named. | — |

---

## Work queue

Each item is independently shippable. Effort: S ≈ one session, M ≈ two, L ≈ more.

**Working order (OS `DEC-2026-09-27-001`):** P1 → P7 → P8 → P6 → P10 → P2 → P3 → P9 → P4 → P5.
Numbers are identifiers, not rank; this line is the rank. One item is `open` at a time.
**Exception (ADR-023):** while any of P7's three dependencies is missing (OS context feed, GitHub PAT,
an ADR unfreezing its GitHub API route), P8 takes P7's place; P7 follows once all three exist.

**Status line — the machine-readable field.** Every item carries `**Status:** <value>` from this
vocabulary, and it is the only thing to edit when an item moves:

| Value | Meaning |
|---|---|
| `open` | Being worked now. **At most one item may be `open`** (DEC-2026-09-24-001, WIP = 1). |
| `queued` | Ranked, not started. |
| `done` | Shipped and merged. |
| `gated` | Cannot start until its stated gate clears. |
| `decision` | Blocked on a ruling from Roman, not on work. |

`10_AUTOMATION/scripts/generate-roadmap-view.js` in the OS repo reads these lines; the generated
view is wrong the moment one is stale.

### P1 — Attention block at the top of Command Center · M

**Status:** open

**Note:** code complete; usage gate running 2026-09-29 → 2026-10-06.

**Why:** F1, F3. The control plane's first answer must be on screen without a click.

A single block above the existing tabs, composed from data that already exists:

- Daily Focus (up to `dailyFocusLimit`) via `selectDailyFocus` — explicit lane first, derived fill after.
- Attention items: overdue weekly outcomes, active projects with no weekly outcome
  (`selectActiveProjectsMissingWeeklyOutcome`), tasks overdue today, load status when not `Stable`.
- Each row: one line, one primary action, links to its owning module.

**Acceptance criteria**

1. Opening Magic Kick shows focus + attention above the fold on desktop and mobile, with no tab interaction.
2. The block reads from `lib/execution-os.ts` selectors — no new selector logic in the component.
3. Empty state is a single calm line ("Nothing needs attention"), not an empty card grid.
4. Zero new top-level modules; zero new store collections.
5. `npm run build`, `lint`, `typecheck` pass.
6. **Usage gate (the real exit).** After the browser check, run Magic Kick on real projects, real
   tasks and real weekly outcomes for seven days. **Pass = opened on 5 of 7 days AND at least one
   task changed state on each of those days.** Fail = stop building Magic Kick, keep the files, and
   record the verdict in `docs/DECISIONS_LOG.md`. P1 is not `done` until this resolves either way.
7. **Spec gap — settled 2026-09-29 by widening the code.** `selectAttentionItems` used to emit a
   load item only when active projects exceeded `maxActiveProjects`. It now emits one whenever load
   is not `Stable` and names the cause (PR #123, `d910882` on `main`; branch commit `e0349f0`).

**Reference mock (2026-09-24):** a design canvas with three artboards — desktop Command Center with
the block above the tabs, mobile, and the clear state: https://claude.ai/artifact/TTUFxXzG7RZa4TomcpU1dN
It settles layout, copy and row anatomy. It is a reference, not a spec change — where the mock and the
acceptance criteria above disagree, the criteria win.

**Out of scope:** AI, agents, new data model, redesigning the Week/Plan/Review tabs.

---

### P2 — Resolve the duplicate planning layer · S

**Status:** queued

**Why:** F2. Two sources of the same derivation is the "no duplicate state" anti-goal inside one repo.

Decide per selector: wire it into P1, or delete it. `calculateCognitiveLoad` stays (used by insights).
Record the outcome as a one-paragraph ADR (ADR-022) — including anything deleted.

**Acceptance criteria**

1. No exported selector in `lib/execution-os.ts` is unreferenced by app code after this item.
2. `docs/ARCHITECTURE.md` migration list reflects reality (step 5 marked done or dropped).
3. ADR-022 records what was wired, what was deleted, and why.

---

### P3 — "Waiting on you" queue · M

**Status:** queued

**Why:** F4. The approval loop is the control plane's core, and it can be proven with today's data —
before any agent exists.

A named section (inside Command Center, not a new module) listing items that need a human decision:
unreviewed finished week, overdue outcome needing continue/adjust/remove, project over
`maxActiveProjects`. Each row: what is waiting, since when, and the decision control.

**Acceptance criteria**

1. Every row is an actual decision, not an FYI; resolving it removes the row.
2. "Since when" is shown for each row.
3. The component takes a list of `{id, kind, subject, since, actions}` — so an agent proposal can be
   added later as one more `kind` without touching the component.
4. No new modules; no schema change beyond what already exists.

**Out of scope:** agent jobs, notifications, anything requiring a server.

---

### P4 — Provenance fields on Task and Project · S

**Status:** queued

**Why:** F5. Prerequisite for any agent result ever landing in Magic Kick, and cheap now.

Optional `source` (`"manual" | "agent" | "import"`) and `sourceId` on `Task` and `Project`, defaulting
to `"manual"` in the store migration. Surface as a small label only where non-manual.

**Acceptance criteria**

1. Existing data migrates with no loss; untagged items read as `manual`.
2. `source + sourceId` is unique-checked on write (idempotency, ADR-018).
3. No UI change for manual items.

**Gate:** do not extend this into an `AgentJob` table — that is AOS-4/AOS-6, still behind ADR-018's Inbox gate.

---

### P5 — Navigation weight · S

**Status:** queued

**Why:** F6. Reference surfaces should not compete with execution surfaces.

Group the existing eight items: **Execution** (Command Center, Schedule, ToDo, Projects) and
**Reference** (Goals, Resources, Journal, Achievements), reference visually secondary. No renames,
no new modules, no routing change. Mobile bottom nav keeps its five, ordered by the same logic.

**Acceptance criteria**

1. Same eight destinations, same `ModuleId` values, same deep links.
2. Group headings are visible when the sidebar is expanded, and collapse cleanly at `w-20`.
3. Keyboard navigation and `aria-label`s unchanged or improved.

---

### P6 — Gamification placement · S

**Status:** queued

**Decided 2026-09-27 (OS `DEC-2026-09-27-001`): demote.** Progress on the daily surface measures
evidence shipped, not activity logged. `lifeos-architecture.md` §0 rule 5 stands — no streaks, no
scores, no guilt mechanics where you look every day.

**Acceptance criteria**

1. The sidebar profile card shows name only.
2. XP, level and streak remain reachable in Achievements and the avatar menu.
3. No store, XP-engine or achievement logic changes — this is placement, not removal.
4. Nothing on the Command Center counts days in a row.
---

### P7 — Read the OS context feed · M

**Status:** queued

**Why:** the brain is invisible from the deployed app. Everything Magic Kick shows today is what was
typed into Magic Kick. Until it can read OS context, "accessible everywhere on any device" gets you a
task app with your own data in it, and goal 1's LLM-agnostic claim is true only for a session with
disk access.

**Shape.** The OS generates a versioned, read-only **context feed** (a script, same pattern as
`generate-roadmap-view.js` — no new state store there, no duplicate state here). Magic Kick reads it
server-side through the GitHub API per MK-DEC-006, with a fine-grained PAT in a Vercel env var,
caches it, and renders it read-only. Never writes back.

**First slice:** today's plan and current focus. Nothing else until those two are on screen.

**Acceptance criteria**

1. A server route fetches the feed; the token never reaches the browser.
2. The deployed app shows today's plan and current allocation without the laptop being involved.
3. Stale or unreachable feed renders as a dated "last known" state, never as blank or as fresh.
4. No feed content is written into Firestore — render only.
5. The feed's shape is documented in the OS repo, not here.

**Depends on:** the OS side of the feed, and a PAT. Both are week-2 work in `DEC-2026-09-27-001`.

---

### P10 — Evidence-driven progress · M

**Status:** queued

**Why:** goal 2 asks for progress bars; the anti-abandonment rule forbids streaks. Evidence resolves
both — a bar that moves when something ships is worth showing in an interview; a bar that moves when
you tick a box is not.

Bars derive from the feed and from Git: AOS stages closed, queue items `done`, artifacts published,
opportunities qualified, betas released. No activity counters, no day streaks.

**Acceptance criteria**

1. Every bar traces to something that shipped, and the source is nameable per bar.
2. Nothing on the surface counts consecutive days or rewards mere presence.
3. Values come from the feed, not from hand-entered numbers.

**Depends on:** P7.
---

### P8 — Enforce the commit gates with a hook · S

**Status:** queued

**Why:** `CLAUDE.md` line 52 says no commit may be created if `npm run build` or `npm run lint` fails.
That rule is prose: an agent that skips it commits anyway, and this repo's own history (AI routes
shipped outside scope, governance files untracked across branches) is what an unenforced rule looks
like. A hook moves the rule from the prompt into the environment.

A `PreToolUse` hook in `.claude/settings.json` matching `Bash(git commit …)` that runs the gates and
blocks on a non-zero exit. Verify the event name and matcher syntax against the official Claude Code
docs before writing it — do not copy them from a third-party cheat sheet.

Per ADR-023 the same hook also rejects a commit message without the `Verified:` and `Not verified:`
lines required by root `CLAUDE.md` → "Commit, Push and PR Descriptions". One hook, two checks.

**Acceptance criteria**

1. A commit attempted with a failing `lint` or `build` is blocked, and the message names which gate failed.
2. A commit with both passing proceeds with no extra prompt.
3. The hook lives in `.claude/settings.json` (shared, committed), not `settings.local.json`.
4. Gate runtime is stated in `docs/NEXT_SESSION_START.md`; if the pair takes minutes, the hook runs
   `typecheck` + `lint` and the full build stays a pre-PR step, recorded here as the reason.
5. `CLAUDE.md` line 52 gains one line: the rule is now enforced by a hook, prose is the fallback.
6. A commit whose message lacks a `Verified:` or a `Not verified:` line is blocked, and the message
   names the missing line. This holds however the message is passed (`-m`, `-F <file>`, heredoc).

**Out of scope:** formatting hooks, `rm -rf` blocking, any other event. One hook, two checks
(gates, message lines); it checks that the lines exist, not that they are true.

---

### P9 — One governance file, not two · S

**Status:** queued

**Why:** `CLAUDE.md` (102 lines) and `AGENTS.md` (57) carry the same governing rule, working
agreement and anti-pattern table with the agent's name swapped. Two copies of one rule set means the
next rule change updates one of them.

Keep `AGENTS.md` as the canonical text (it is the cross-tool file — Codex, Cursor and Copilot read it
too) and reduce `CLAUDE.md` to Claude-specific additions plus a pointer, or the reverse. Either
direction is fine; two full copies is not.

**Acceptance criteria**

1. A rule appears once. The other file points at it.
2. Both files still open with the governing rule, so a session that reads either one is governed.
3. No rule is lost in the merge — diff the two before collapsing.

---

---

## Explicitly not in this queue

New modules · agent runtime · connectors (Gmail, Calendar beyond what exists) · n8n · triage or
Today-brief automation (ADR-018 gate) · Grok-specific anything (ADR-020) · visual redesign of
modules that are not in the way of the two questions above.
