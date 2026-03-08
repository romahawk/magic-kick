# MagicKick Firebase Architecture

**Version:** 1.0  
**Date:** 2026-03-08  
**Status:** Source of truth for backend architecture

## 1. Architecture Overview

MagicKick uses a workspace-based Firebase architecture so the same backend model can support:
- personal execution systems
- child or teen supervised environments
- family coordination
- team collaboration
- future SaaS workspace plans

The core decision is that operational data does not live directly under the user. It lives under a workspace. A user can belong to one or more workspaces through memberships, and each workspace represents an execution environment with its own rules, roles, and execution data.

This avoids a future rewrite from single-user storage to collaborative storage. A personal workspace is simply the smallest valid workspace.

### Why workspace-based architecture

- It supports personal and multi-user use cases with one model.
- It keeps execution data scoped to a clear boundary.
- It allows permissions, supervision, and billing to be applied at the workspace level.
- It enables future AI, analytics, and accountability features without moving core documents again.

### User interaction model

1. A user signs in and loads their memberships.
2. Memberships determine which workspaces they can enter.
3. The active workspace defines:
   - visible execution data
   - system rules
   - permissions
   - derived metrics

### Simple hierarchy diagram

```text
users/{userId}
  -> user identity and profile

memberships/{membershipId}
  -> link between user and workspace

workspaces/{workspaceId}
  -> execution environment
     -> systemConfigs/{configId}
     -> goals/{goalId}
     -> projects/{projectId}
     -> weeklyOutcomes/{weeklyOutcomeId}
     -> tasks/{taskId}
     -> scheduleItems/{scheduleItemId}
     -> journalEntries/{journalEntryId}
     -> resources/{resourceId}
     -> achievements/{achievementId}
     -> progressStats/{progressStatId}
```

## 2. Firestore Collection Structure

### Top-level collections

```text
users/{userId}
workspaces/{workspaceId}
memberships/{membershipId}
```

### Workspace subcollections

```text
workspaces/{workspaceId}/systemConfigs/{configId}
workspaces/{workspaceId}/goals/{goalId}
workspaces/{workspaceId}/projects/{projectId}
workspaces/{workspaceId}/weeklyOutcomes/{weeklyOutcomeId}
workspaces/{workspaceId}/tasks/{taskId}
workspaces/{workspaceId}/scheduleItems/{scheduleItemId}
workspaces/{workspaceId}/journalEntries/{journalEntryId}
workspaces/{workspaceId}/resources/{resourceId}
workspaces/{workspaceId}/achievements/{achievementId}
workspaces/{workspaceId}/progressStats/{progressStatId}
```

### Future workspace subcollections

```text
workspaces/{workspaceId}/relationships/{relationshipId}
workspaces/{workspaceId}/aiCoachThreads/{threadId}
```

### Recommended structure diagram

```text
users
  {userId}

memberships
  {membershipId}

workspaces
  {workspaceId}
    systemConfigs
      {configId}
    goals
      {goalId}
    projects
      {projectId}
    weeklyOutcomes
      {weeklyOutcomeId}
    tasks
      {taskId}
    scheduleItems
      {scheduleItemId}
    journalEntries
      {journalEntryId}
    resources
      {resourceId}
    achievements
      {achievementId}
    progressStats
      {progressStatId}
```

## 3. Collection Field Specifications

### `users`

| Field | Type | Description | Required | Example |
|---|---|---|---|---|
| `displayName` | string | User-facing name | Yes | `"Alex Rivera"` |
| `email` | string | Login identity email | Yes | `"alex@example.com"` |
| `photoURL` | string \| null | Avatar URL | No | `"https://..."` |
| `defaultWorkspaceId` | string | Preferred workspace on login | No | `"ws_personal_123"` |
| `status` | string | Account status | Yes | `"active"` |
| `createdAt` | timestamp | User creation time | Yes | `2026-03-08T09:00:00Z` |
| `updatedAt` | timestamp | Last update time | Yes | `2026-03-08T10:30:00Z` |

Example:

```json
{
  "displayName": "Alex Rivera",
  "email": "alex@example.com",
  "photoURL": null,
  "defaultWorkspaceId": "ws_personal_123",
  "status": "active",
  "createdAt": "2026-03-08T09:00:00Z",
  "updatedAt": "2026-03-08T10:30:00Z"
}
```

### `workspaces`

| Field | Type | Description | Required | Example |
|---|---|---|---|---|
| `name` | string | Workspace name | Yes | `"Alex Personal OS"` |
| `type` | string | Workspace type | Yes | `"personal"` |
| `ownerUserId` | string | Primary owner user id | Yes | `"user_123"` |
| `status` | string | Workspace lifecycle status | Yes | `"active"` |
| `billingPlan` | string | SaaS plan tier | No | `"free"` |
| `timezone` | string | Workspace timezone | Yes | `"Europe/Berlin"` |
| `locale` | string | Default locale | No | `"en-US"` |
| `createdAt` | timestamp | Workspace creation time | Yes | `2026-03-08T09:00:00Z` |
| `updatedAt` | timestamp | Last update time | Yes | `2026-03-08T10:30:00Z` |

Example:

```json
{
  "name": "Alex Personal OS",
  "type": "personal",
  "ownerUserId": "user_123",
  "status": "active",
  "billingPlan": "free",
  "timezone": "Europe/Berlin",
  "locale": "en-US",
  "createdAt": "2026-03-08T09:00:00Z",
  "updatedAt": "2026-03-08T10:30:00Z"
}
```

### `memberships`

| Field | Type | Description | Required | Example |
|---|---|---|---|---|
| `userId` | string | Linked user id | Yes | `"user_123"` |
| `workspaceId` | string | Linked workspace id | Yes | `"ws_family_456"` |
| `role` | string | Permission role | Yes | `"member"` |
| `status` | string | Membership status | Yes | `"active"` |
| `permissions` | map | Optional explicit permissions | No | `{ "manageSettings": false }` |
| `joinedAt` | timestamp | Join time | Yes | `2026-03-08T09:00:00Z` |
| `createdAt` | timestamp | Creation time | Yes | `2026-03-08T09:00:00Z` |
| `updatedAt` | timestamp | Last update time | Yes | `2026-03-08T10:30:00Z` |

Example:

```json
{
  "userId": "user_123",
  "workspaceId": "ws_family_456",
  "role": "member",
  "status": "active",
  "permissions": {
    "manageSettings": false
  },
  "joinedAt": "2026-03-08T09:00:00Z",
  "createdAt": "2026-03-08T09:00:00Z",
  "updatedAt": "2026-03-08T10:30:00Z"
}
```

### `systemConfigs`

| Field | Type | Description | Required | Example |
|---|---|---|---|---|
| `name` | string | Config label | Yes | `"default"` |
| `isActive` | boolean | Active ruleset flag | Yes | `true` |
| `maxActiveProjects` | number | Project capacity limit | Yes | `3` |
| `dailyFocusLimit` | number | Max daily focus items | Yes | `3` |
| `weeklyOutcomeLimit` | number | Max tracked weekly outcomes | Yes | `5` |
| `priorityTiers` | array<string> | Priority categories | Yes | `["Income","Career","Learning"]` |
| `xpMode` | string | XP calculation mode | Yes | `"standard"` |
| `createdAt` | timestamp | Creation time | Yes | `2026-03-08T09:00:00Z` |
| `updatedAt` | timestamp | Last update time | Yes | `2026-03-08T10:30:00Z` |

Example:

```json
{
  "name": "default",
  "isActive": true,
  "maxActiveProjects": 3,
  "dailyFocusLimit": 3,
  "weeklyOutcomeLimit": 5,
  "priorityTiers": ["Income", "Career", "Learning", "Health", "Personal"],
  "xpMode": "standard",
  "createdAt": "2026-03-08T09:00:00Z",
  "updatedAt": "2026-03-08T10:30:00Z"
}
```

### `goals`

| Field | Type | Description | Required | Example |
|---|---|---|---|---|
| `title` | string | Goal title | Yes | `"Launch consulting transition"` |
| `description` | string | Longer goal context | No | `"Move from full-time job to consulting"` |
| `category` | string | Goal category | Yes | `"Career"` |
| `priorityTier` | string | Configured tier | Yes | `"Career"` |
| `horizon` | string | Strategic horizon | Yes | `"mid"` |
| `status` | string | Goal status | Yes | `"active"` |
| `progressPercent` | number | Derived or maintained progress | No | `42` |
| `ownerUserId` | string | Goal owner | Yes | `"user_123"` |
| `targetDate` | timestamp | Goal target date | No | `2026-06-30T00:00:00Z` |
| `createdAt` | timestamp | Creation time | Yes | `2026-03-08T09:00:00Z` |
| `updatedAt` | timestamp | Last update time | Yes | `2026-03-08T10:30:00Z` |

### `projects`

| Field | Type | Description | Required | Example |
|---|---|---|---|---|
| `goalId` | string | Parent goal reference | No | `"goal_123"` |
| `title` | string | Project title | Yes | `"FlowLogix"` |
| `objective` | string | Project objective | Yes | `"Ship MVP architecture and onboarding"` |
| `status` | string | Project state | Yes | `"active"` |
| `priorityTier` | string | Tier used for ranking | No | `"Career"` |
| `ownerUserId` | string | Responsible user | Yes | `"user_123"` |
| `assigneeUserIds` | array<string> | Assigned members | No | `["user_123","user_456"]` |
| `currentWeeklyOutcomeId` | string | Active weekly outcome pointer | No | `"wo_123"` |
| `weekStartDate` | timestamp | Planning window start | No | `2026-03-09T00:00:00Z` |
| `weekEndDate` | timestamp | Planning window end | No | `2026-03-15T23:59:59Z` |
| `color` | string | UI color token or hex | No | `"#3b82f6"` |
| `archived` | boolean | Archive flag | Yes | `false` |
| `createdAt` | timestamp | Creation time | Yes | `2026-03-08T09:00:00Z` |
| `updatedAt` | timestamp | Last update time | Yes | `2026-03-08T10:30:00Z` |

### `weeklyOutcomes`

| Field | Type | Description | Required | Example |
|---|---|---|---|---|
| `goalId` | string | Optional goal reference | No | `"goal_123"` |
| `projectId` | string | Parent project reference | Yes | `"project_123"` |
| `title` | string | Weekly outcome statement | Yes | `"Finalize architecture diagram"` |
| `description` | string | Extra context | No | `"Must be ready for implementation handoff"` |
| `status` | string | Outcome status | Yes | `"active"` |
| `weekStartDate` | timestamp | Week start | Yes | `2026-03-09T00:00:00Z` |
| `weekEndDate` | timestamp | Week end | Yes | `2026-03-15T23:59:59Z` |
| `ownerUserId` | string | Responsible owner | Yes | `"user_123"` |
| `completionPercent` | number | Progress measure | No | `60` |
| `completedAt` | timestamp | Completion time | No | `null` |
| `createdAt` | timestamp | Creation time | Yes | `2026-03-08T09:00:00Z` |
| `updatedAt` | timestamp | Last update time | Yes | `2026-03-08T10:30:00Z` |

### `tasks`

| Field | Type | Description | Required | Example |
|---|---|---|---|---|
| `goalId` | string | Optional goal reference | No | `"goal_123"` |
| `projectId` | string | Optional project reference | No | `"project_123"` |
| `weeklyOutcomeId` | string | Parent weekly outcome reference | No | `"wo_123"` |
| `title` | string | Task title | Yes | `"Finalize Firestore schema doc"` |
| `description` | string | Task notes | No | `"Cover indexes and migration"` |
| `status` | string | Task lifecycle state | Yes | `"todo"` |
| `dailyFocusDate` | string | Date selected for focus | No | `"2026-03-10"` |
| `isDailyFocus` | boolean | Marked into focus set | Yes | `true` |
| `assignedUserId` | string | Assigned member | No | `"user_123"` |
| `dueDate` | timestamp | Due date/time | No | `2026-03-10T17:00:00Z` |
| `completedAt` | timestamp | Completion time | No | `null` |
| `estimateMin` | number | Estimated duration | No | `60` |
| `xpValue` | number | XP reward value | Yes | `40` |
| `sortOrder` | number | UI ordering field | No | `120` |
| `createdAt` | timestamp | Creation time | Yes | `2026-03-08T09:00:00Z` |
| `updatedAt` | timestamp | Last update time | Yes | `2026-03-08T10:30:00Z` |

### `scheduleItems`

| Field | Type | Description | Required | Example |
|---|---|---|---|---|
| `taskId` | string | Linked task | No | `"task_123"` |
| `projectId` | string | Linked project | No | `"project_123"` |
| `title` | string | Schedule item title | Yes | `"Deep work block"` |
| `type` | string | Schedule type | Yes | `"focus_block"` |
| `assignedUserId` | string | Owner or participant | Yes | `"user_123"` |
| `startAt` | timestamp | Start time | Yes | `2026-03-10T08:00:00Z` |
| `endAt` | timestamp | End time | Yes | `2026-03-10T10:00:00Z` |
| `status` | string | Schedule status | Yes | `"scheduled"` |
| `createdAt` | timestamp | Creation time | Yes | `2026-03-08T09:00:00Z` |
| `updatedAt` | timestamp | Last update time | Yes | `2026-03-08T10:30:00Z` |

### `journalEntries`

| Field | Type | Description | Required | Example |
|---|---|---|---|---|
| `entryDate` | string | Journal day or week key | Yes | `"2026-03-10"` |
| `type` | string | Entry type | Yes | `"daily"` |
| `authorUserId` | string | Entry author | Yes | `"user_123"` |
| `mood` | number | Mood score | No | `4` |
| `highlights` | string | Wins and highlights | No | `"Completed the architecture draft"` |
| `challenges` | string | Obstacles | No | `"Too many active projects"` |
| `nextSteps` | string | Next intended actions | No | `"Reduce active scope tomorrow"` |
| `gratitude` | string | Optional gratitude | No | `"Clear progress after scoping down"` |
| `createdAt` | timestamp | Creation time | Yes | `2026-03-08T09:00:00Z` |
| `updatedAt` | timestamp | Last update time | Yes | `2026-03-08T10:30:00Z` |

### `resources`

| Field | Type | Description | Required | Example |
|---|---|---|---|---|
| `title` | string | Resource title | Yes | `"Firestore best practices"` |
| `category` | string | Resource category | Yes | `"Backend"` |
| `description` | string | Resource summary | No | `"Reference for schema and index design"` |
| `url` | string | Primary URL | No | `"https://firebase.google.com/docs/firestore"` |
| `tags` | array<string> | Search tags | No | `["firebase","architecture"]` |
| `ownerUserId` | string | Resource creator | Yes | `"user_123"` |
| `createdAt` | timestamp | Creation time | Yes | `2026-03-08T09:00:00Z` |
| `updatedAt` | timestamp | Last update time | Yes | `2026-03-08T10:30:00Z` |

### `achievements`

| Field | Type | Description | Required | Example |
|---|---|---|---|---|
| `userId` | string | User receiving achievement | Yes | `"user_123"` |
| `type` | string | Achievement type | Yes | `"badge"` |
| `title` | string | Achievement label | Yes | `"7-Day Streak"` |
| `description` | string | Achievement description | No | `"Showed up 7 days in a row"` |
| `status` | string | Achievement status | Yes | `"unlocked"` |
| `xpAwarded` | number | XP granted | Yes | `100` |
| `unlockedAt` | timestamp | Unlock time | No | `2026-03-10T18:00:00Z` |
| `createdAt` | timestamp | Creation time | Yes | `2026-03-08T09:00:00Z` |
| `updatedAt` | timestamp | Last update time | Yes | `2026-03-08T10:30:00Z` |

### `progressStats`

| Field | Type | Description | Required | Example |
|---|---|---|---|---|
| `scopeType` | string | Stats scope | Yes | `"user_week"` |
| `scopeId` | string | Scope identifier | Yes | `"user_123:2026-W11"` |
| `userId` | string | Related user | No | `"user_123"` |
| `weekKey` | string | ISO week key | No | `"2026-W11"` |
| `xpTotal` | number | Total XP in scope | Yes | `320` |
| `tasksCompleted` | number | Completed task count | Yes | `8` |
| `weeklyOutcomesCompleted` | number | Completed weekly outcomes | Yes | `2` |
| `streakDays` | number | Current streak | Yes | `12` |
| `activeProjects` | number | Active project count | Yes | `3` |
| `focusHealthScore` | number | Derived cognitive health score | Yes | `82` |
| `loadStatus` | string | Stable, Busy, Strained, Overloaded | Yes | `"Busy"` |
| `updatedAt` | timestamp | Last recompute time | Yes | `2026-03-08T10:30:00Z` |

## 4. Execution OS Data Relationships

The backend must preserve the Execution OS hierarchy:

```text
Goal
  -> Project
    -> WeeklyOutcome
      -> Task
        -> Execution
          -> Progress Feedback
```

### Relationship model

- A `goal` may have many `projects`.
- A `project` may have many `weeklyOutcomes`.
- A `weeklyOutcome` may have many `tasks`.
- A `task` may optionally be scheduled through `scheduleItems`.
- Completing tasks and outcomes updates `progressStats` and may create `achievements`.

### Goal -> Project

- `projects.goalId` links execution work to strategic intent.
- Not every project must have a goal in early migration, but new data should prefer this link.

### Project -> WeeklyOutcome

- `weeklyOutcomes.projectId` is required.
- `projects.currentWeeklyOutcomeId` can point to the currently active outcome.

### WeeklyOutcome -> Task

- `tasks.weeklyOutcomeId` creates the direct bridge from weekly planning to execution.
- This is the core link used to generate daily focus.

### Derived entities

#### Daily Focus

Daily Focus is not a permanent top-level collection in the recommended architecture. It is derived from:
- active workspace config
- active projects
- current-week weekly outcomes
- incomplete tasks
- due date and assignment filters

Tasks may store:
- `isDailyFocus`
- `dailyFocusDate`

This allows caching of user selection while keeping the source of truth in `tasks`.

#### XP rewards

XP is derived from execution events:
- task completion
- weekly outcome completion
- streak continuation

XP must not be awarded for passive object creation such as creating tasks or projects.

#### Progress stats

`progressStats` stores denormalized aggregates for:
- dashboard speed
- trend analysis
- future analytics
- workspace reporting

Recommended update model:
- lightweight synchronous update for user-facing counters
- background reconciliation job for weekly and historical aggregates

## 5. Cognitive Load and Execution Metrics

These metrics are workspace-scoped and user-aware.

### Active project count

Count projects where:
- `status == "active"`
- `archived == false`
- project belongs to the active workspace
- optionally assigned to the relevant user

Formula:

```text
activeProjectCount =
  count(projects where status = "active" and archived = false)
```

### Daily focus limits

The active `systemConfig` determines:

```text
dailyFocusLimit = systemConfig.dailyFocusLimit
```

Visible daily focus count:

```text
visibleDailyFocusCount =
  min(dailyFocusLimit, count(incomplete daily focus candidate tasks))
```

### Weekly outcome completion

Formula:

```text
weeklyOutcomeCompletionRate =
  completedWeeklyOutcomes / totalWeeklyOutcomesForWeek
```

### Focus health score

Recommended lightweight formula:

```text
pressure = 0

if activeProjectCount > maxActiveProjects:
  pressure += 2 + (activeProjectCount - maxActiveProjects)

if todayScheduledTaskCount > dailyFocusLimit:
  pressure += 1 + (todayScheduledTaskCount - dailyFocusLimit)

pressure += missedWeeklyOutcomes * 2

focusHealthScore =
  100
  - 15 * max(0, activeProjectCount - maxActiveProjects)
  - 10 * missedWeeklyOutcomes
```

Load status mapping:

| Pressure | Load Status |
|---|---|
| 0-1 | Stable |
| 2-3 | Busy |
| 4-5 | Strained |
| 6+ | Overloaded |

## 6. Firestore Query Patterns

### Load user workspaces

1. Query `memberships` where:
   - `userId == currentUserId`
   - `status == "active"`
2. Read matching `workspaceId` values.
3. Fetch workspace documents by id.

### Fetch active projects

Path:

```text
workspaces/{workspaceId}/projects
```

Query:
- `where("status", "==", "active")`
- `where("archived", "==", false)`
- `orderBy("updatedAt", "desc")`

Optional:
- `where("ownerUserId", "==", currentUserId)` for personal responsibility view

### Fetch weekly outcomes for current week

Path:

```text
workspaces/{workspaceId}/weeklyOutcomes
```

Query:
- `where("weekStartDate", "==", currentWeekStart)`
- `orderBy("status")`
- `orderBy("updatedAt", "desc")`

Alternative range query:
- `where("weekStartDate", ">=", currentWeekStart)`
- `where("weekStartDate", "<=", currentWeekEnd)`

### Fetch daily focus tasks

Path:

```text
workspaces/{workspaceId}/tasks
```

Query:
- `where("assignedUserId", "==", currentUserId)`
- `where("status", "in", ["todo", "in_progress"])`
- `where("dailyFocusDate", "==", todayKey)`
- `orderBy("sortOrder")`

Fallback candidate query if focus is derived on read:
- `where("assignedUserId", "==", currentUserId)`
- `where("status", "in", ["todo", "in_progress"])`
- `where("dueDate", "<=", endOfToday)`
- `orderBy("dueDate")`

### Calculate progress metrics

Use `progressStats` for primary dashboard reads:

```text
workspaces/{workspaceId}/progressStats/{scopeId}
```

Examples:
- current user week stats
- workspace week stats
- monthly trend series

## 7. Indexing Strategy

Composite indexes should be created only for actual query shapes, but the following are expected immediately.

### `projects`

1. `status ASC, archived ASC, updatedAt DESC`
   - Needed for active project lists ordered by freshness.

2. `ownerUserId ASC, status ASC, archived ASC, updatedAt DESC`
   - Needed for per-user active project views inside shared workspaces.

### `weeklyOutcomes`

1. `weekStartDate ASC, status ASC, updatedAt DESC`
   - Needed for current-week outcome panels.

2. `projectId ASC, weekStartDate DESC`
   - Needed to load weekly outcomes for a project across weeks.

3. `ownerUserId ASC, weekStartDate ASC, status ASC`
   - Needed for per-user weekly execution views.

### `tasks`

1. `assignedUserId ASC, status ASC, dailyFocusDate ASC, sortOrder ASC`
   - Needed for daily focus task loading.

2. `weeklyOutcomeId ASC, status ASC, updatedAt DESC`
   - Needed to load outcome execution items.

3. `projectId ASC, status ASC, dueDate ASC`
   - Needed for project task views with due ordering.

4. `assignedUserId ASC, status ASC, dueDate ASC`
   - Needed for personal execution queues.

### `scheduleItems`

1. `assignedUserId ASC, startAt ASC`
   - Needed for user schedule timelines.

2. `projectId ASC, startAt ASC`
   - Needed for project-linked scheduling views.

3. `taskId ASC, startAt ASC`
   - Needed when reconstructing execution history for a task.

## 8. Security Rule Strategy

This section defines the architectural approach, not the full rule code.

### Core rule principles

1. A user must belong to a workspace to read or write workspace data.
2. Membership role determines allowed actions.
3. Owners and admins can manage workspace settings and memberships.
4. Members can only edit entities they own or are assigned, unless broader permissions are granted.

### Recommended role model

- `owner`
- `admin`
- `member`
- `viewer`
- future: `guardian`, `coach`

### High-level rule behavior

#### `users`
- users can read and update only their own user document

#### `memberships`
- users can read their own memberships
- workspace owners and admins can manage workspace memberships

#### `workspaces`
- readable by active members only
- writable by owner/admin depending on field set

#### `systemConfigs`
- readable by all active members
- writable by owner/admin only

#### operational subcollections
- readable by active members
- writable only if user role and assignment permit it

### Assignment-based editing

For shared workspaces:
- project edit allowed if user is `ownerUserId`, in `assigneeUserIds`, or has admin role
- task edit allowed if user is `assignedUserId`, creator, or has admin role

### Security implementation note

Because Firestore rules cannot perform arbitrarily complex joins cheaply, membership lookup patterns should be normalized for rule efficiency. A common approach is:
- keep `workspaceId` in membership docs
- use predictable membership ids like `{workspaceId}_{userId}`
- read the membership doc directly in rules

## 9. Migration Strategy

MagicKick already exists with a user-scoped model. The migration must move to workspace scope without breaking existing users.

### Current state

Current documents are effectively stored under:

```text
users/{uid}/profile/profile
users/{uid}/goals/{id}
users/{uid}/tasks/{id}
users/{uid}/projects/{id}
users/{uid}/achievements/{id}
users/{uid}/schedule/{id}
users/{uid}/resources/{id}
users/{uid}/journal/{id}
```

### Target state

```text
users/{uid}
memberships/{workspaceId_uid}
workspaces/{workspaceId}/...
```

### Migration steps

#### 1. Create default personal workspace for each user

For every existing user:
- create `workspaces/{workspaceId}`
- set `type = "personal"`
- create `memberships/{workspaceId_uid}` with role `owner`
- create `users/{uid}` if needed with `defaultWorkspaceId`

#### 2. Migrate existing projects into workspace scope

Move:
- `users/{uid}/projects/*`
to:
- `workspaces/{workspaceId}/projects/*`

During migration:
- map current project fields to new schema
- default `status = "active"` when missing
- derive `currentWeeklyOutcomeId` later if not present

#### 3. Migrate tasks and outcomes

Move:
- tasks to `workspaces/{workspaceId}/tasks`
- goals to `workspaces/{workspaceId}/goals`
- schedule to `workspaces/{workspaceId}/scheduleItems`
- journal to `workspaces/{workspaceId}/journalEntries`
- resources to `workspaces/{workspaceId}/resources`
- achievements to `workspaces/{workspaceId}/achievements`

Also:
- create `systemConfigs/default`
- create initial `weeklyOutcomes` by mapping existing project `weeklyOutcome` fields where available

#### 4. Update queries

Application reads should shift in phases:

1. read membership and active workspace
2. load workspace-scoped collections
3. continue writing old model in parallel only during transition if required
4. remove legacy reads after validation

### Non-breaking migration approach

Recommended rollout:

1. Add workspace-aware code paths behind a feature flag.
2. Backfill personal workspaces for all users.
3. Dual-read:
   - prefer workspace data if present
   - fall back to legacy user-scoped data
4. Run one-time migration script per user.
5. Validate counts and references.
6. Switch writes fully to workspace model.
7. Retire legacy paths after a safe deprecation window.

## 10. Future Expansion Compatibility

### Family supervision

Supported by:
- shared family workspaces
- guardian/member roles
- future `relationships` subcollection
- assignment and visibility rules scoped by workspace

### Team collaboration

Supported by:
- shared workspaces
- multiple memberships
- per-project and per-task assignments
- role-based settings access

### AI coaching data

Supported by:
- future `aiCoachThreads`
- workspace-context execution history
- access to goals, projects, outcomes, tasks, journal, and progress stats

### SaaS billing tiers

Supported by:
- workspace-level `billingPlan`
- limits enforced by system config or backend policy
- future Stripe integration keyed by workspace

### Advanced analytics

Supported by:
- denormalized `progressStats`
- stable hierarchy across goals, projects, outcomes, and tasks
- workspace-level aggregation

### Public accountability

Supported by:
- workspace as a publishing boundary
- future public sharing documents linked to approved resources, outcomes, or stats
- no need to relocate core execution data

## Recommended Next Docs

Optional follow-up documents:
- `/docs/EXECUTION_OS_MODEL.md`
- `/docs/SECURITY_RULES.md`
- `/docs/FIRESTORE_INDEXES.md`

