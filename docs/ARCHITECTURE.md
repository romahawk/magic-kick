# Architecture - Magic Kick Execution OS

**Version:** 1.1  
**Date:** 2026-03-08

## Execution OS Diagram

```text
Goals
  -> define strategic direction and priority tiers

Projects
  -> convert goals into bounded work areas
  -> each project carries status + weeklyOutcome

Weekly Outcomes
  -> weekly proof of progress across active projects
  -> limited by systemConfig.weeklyOutcomeLimit

Daily Focus
  -> selected from task backlog with project and due-date signals
  -> limited by systemConfig.dailyFocusLimit

Execution
  -> task completion, milestone completion, scheduled work blocks

Progress Feedback
  -> XP, streaks, achievements, cognitive load, reflection
```

## Product Architecture

Magic Kick remains an offline-first, module-based Next.js app. The change is architectural: the platform is now organized around a shared execution layer instead of a loose set of productivity features.

```text
Browser
  -> Next.js App Router
  -> Zustand store (source of truth)
  -> Execution OS selectors (lib/execution-os.ts)
  -> UI modules

Execution OS selector layer
  -> normalizeSystemConfig()
  -> selectActiveProjects()
  -> selectWeeklyOutcomes()
  -> selectDailyFocus()
  -> calculateCognitiveLoad()

Persistence
  -> localStorage via zustand/persist
  -> Firestore sync engine
```

## Refactored Module Relationships

| Existing Module | Execution OS Role | Notes |
|---|---|---|
| Goals | Strategic direction | Remains the highest planning layer |
| Projects | Active work areas | Now supports `status` and `weeklyOutcome` |
| ToDo | Backlog | Supplies Daily Focus instead of being the primary decision layer |
| Command Center | Daily execution surface | Shows Daily Focus, Weekly Outcomes, Focus Health, XP |
| Achievements | Motivation layer | Rewards completed execution |
| Schedule | Time allocation layer | Supports execution blocks |
| Journal | Reflection layer | Captures weekly and daily feedback |
| Resources | Knowledge base | Supports goals and projects |

## System Configuration Schema

Stored on `profile.systemConfig`.

```ts
interface SystemConfig {
  maxActiveProjects: number
  dailyFocusLimit: number
  weeklyOutcomeLimit: number
  priorityTiers: string[]
  xpMode: "standard"
}
```

Default values:

```json
{
  "maxActiveProjects": 3,
  "dailyFocusLimit": 3,
  "weeklyOutcomeLimit": 5,
  "priorityTiers": ["Income", "Career", "Learning", "Health", "Personal"],
  "xpMode": "standard"
}
```

## Cognitive Load Logic

Signals:
- active projects above `maxActiveProjects`
- tasks due today above `dailyFocusLimit`
- missed weekly outcomes

Formula:

```text
pressure = 0

if activeProjects > maxActiveProjects:
  pressure += 2 + (activeProjects - maxActiveProjects)

if tasksDueToday > dailyFocusLimit:
  pressure += 1 + (tasksDueToday - dailyFocusLimit)

pressure += missedWeeklyOutcomes * 2
```

Status mapping:

| Pressure | Status |
|---|---|
| 0-1 | Stable |
| 2-3 | Busy |
| 4-5 | Strained |
| 6+ | Overloaded |

Focus score:

```text
focusScore = 100
  - 15 * max(0, activeProjects - maxActiveProjects)
  - 10 * missedWeeklyOutcomes
```

## Dashboard Layout Proposal

Primary widgets:
- Daily Focus
- Weekly Outcomes
- Active Projects
- Focus Health
- XP Progress

Secondary widgets:
- Achievements
- Journal
- Schedule preview

Behavior rules:
- show only top `dailyFocusLimit` focus items
- show only top `weeklyOutcomeLimit` weekly outcomes
- exclude `parked` projects from active capacity
- show overload warning when active project capacity is exceeded

## Minimal Migration Strategy

1. Add `profile.systemConfig` with safe defaults in store migration.
2. Add `project.status`, defaulting to `active`.
3. Add `project.weeklyOutcome`, defaulting to the existing project objective.
4. Keep module navigation unchanged to avoid feature regressions.
5. Move Command Center and Projects onto the selector layer first.
6. Add `Settings -> System Rules` later as a thin editor for `profile.systemConfig`.

## Future Extension Compatibility

The current app remains single-user under `users/{uid}`. Future SaaS evolution should introduce a workspace layer, but the new rule engine is portable:

```text
workspaces/{workspaceId}
  members/{uid}
  profiles/{uid}
  rules/system
  goals/{id}
  projects/{id}
  tasks/{id}
```

That enables future family supervision, teams, AI coaching, analytics, and accountability features without rewriting the execution model.
