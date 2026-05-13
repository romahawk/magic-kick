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

## AI Layer

The AI layer sits on top of the Execution OS selectors and never writes directly to the Zustand store or Firestore. All AI calls are server-side.

### Module layout

```text
lib/ai/
  client.ts   — Anthropic SDK singleton (reads ANTHROPIC_API_KEY)
  flags.ts    — isAiEnabled() gate (reads AI_FEATURES_ENABLED)
  auth.ts     — verifyFirebaseToken() helper for API routes
  service.ts  — callClaude(systemPrompt, messages, options)

app/api/ai/
  ping/route.ts           — health check (GET)
  weekly-summary/route.ts — weekly execution summary (POST) [Phase 1]
  schedule-suggest/route.ts — scheduling suggestions (POST)  [Phase 2]
  coaching/route.ts       — daily coaching message (POST)    [Phase 3]
  retro-summary/route.ts  — retrospective draft (POST)       [Phase 5]

components/ai/
  AiErrorBoundary.tsx — class boundary + AiFallback for async AI sections
```

### Request flow

```text
Browser (React component)
  -> fetch /api/ai/<endpoint>  (Authorization: Bearer <Firebase ID token>)
  -> route.ts: isAiEnabled() check → verifyFirebaseToken() → business logic
  -> callClaude(systemPrompt, messages)
  -> Anthropic API (claude-sonnet-4-6, prompt caching enabled)
  <- { ok: true, data: {...} } | { ok: false, error: "..." }
  <- AiErrorBoundary / AiFallback on failure
```

### Prompt caching

Every `callClaude` call sets `cache_control: { type: "ephemeral" }` on the system prompt block. This caches the system prompt for 5 minutes across requests with the same prompt, reducing latency and token cost for repeated calls (e.g. weekly summary fetched multiple times in a session).

In development, cache hit/miss counts are logged to the console:
```
[AI] model=claude-sonnet-4-6 cache_hit=1024 cache_created=0
```

### Environment variables

| Variable | Required | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Server-side only. Never use `NEXT_PUBLIC_` prefix. |
| `AI_FEATURES_ENABLED` | No | Defaults to `true`. Set to `"false"` to disable all `/api/ai/*` routes without a deploy. |

### Error handling

- API routes return `{ ok: false, error: string }` with appropriate HTTP status codes (401, 503, 500).
- UI sections wrap AI content in `<AiErrorBoundary>` which renders `<AiFallback>` on React errors.
- Async HTTP errors (e.g. 500 from a route) should be caught by the caller and trigger `<AiFallback>` directly.
- `callClaude` retries once automatically on Anthropic 529 (overloaded) errors.

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
