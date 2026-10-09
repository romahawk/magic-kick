export type TaskCategory = string
/** The OS life domains (OS lifeos-architecture.md §3). Lower-case, as in the OS dates.md tags. */
export type OsDomain = "work" | "learning" | "admin" | "life"
export type TaskLane = "daily-focus" | "backlog" | "parking-lot"
export type TaskRepeat = "none" | "daily" | "weekly" | "monthly" | "custom"

export interface SyncFields {
  deleted?: boolean
  clientUpdatedAt?: number
  createdAt?: number
  updatedAt?: number
}

/** Where an item came from (P4, ADR-018). Missing means "manual"; read it with `sourceOf()`. */
export type ItemSource = "manual" | "agent" | "import"

/** Provenance on Task and Project. `source + sourceId` is unique per collection (see lib/provenance.ts). */
export interface Provenance {
  source?: ItemSource
  /** The id in the system that produced the item (agent run, import file row). Unused for manual items. */
  sourceId?: string
}

export interface Task extends SyncFields, Provenance {
  id: string
  title: string
  category: TaskCategory
  lane?: TaskLane
  order?: number
  dueDate?: string
  repeat?: TaskRepeat
  recurrenceDays?: number[]
  recurrenceCompletedDates?: string[]
  estimateMin?: number
  pomodorosPlanned?: number
  completed: boolean
  completedAt?: string
  linkedProjectId?: string
  /** Roadmap grouping (ADR-025): id of a milestone embedded in the linked project. "" = unassigned. */
  milestoneId?: string
  xpValue: number
  notes?: string
}

export interface Goal extends SyncFields {
  id: string
  title: string
  horizon: "mid" | "long"
  category: string
  order?: number
  targetDate?: string
  priority: "high" | "medium" | "low"
  notes: string
  status: "active" | "completed" | "wishlist"
  progress: number
  completedAt?: string
}

export interface ProjectMilestone {
  id: string
  title: string
  /** Legacy weekday index (0–6) from the weekly checklist model. Kept for old data; the roadmap orders by `order`. */
  dayIndex: number
  completed: boolean
  completedAt?: string
  /** Roadmap position, ascending (ADR-025). Missing on legacy data and on milestones from older clients. */
  order?: number
  /** Target date, yyyy-MM-dd. Empty or missing = no target. */
  targetDate?: string
  note?: string
  /** Cross-links to Resources by id. Ids of deleted resources are ignored when rendering. */
  resourceIds?: string[]
}

export type ProjectStatus = "active" | "paused" | "parked" | "completed"
export type ProjectPriority = "P1" | "P2" | "P3"
export type WeeklyPlanStatus = "draft" | "active" | "reviewed"
export type TimeBlockStatus = "planned" | "done" | "missed"
export type ReviewDecision = "continue" | "adjust" | "remove"

export interface ExecutionBlockTemplate {
  id: string
  title: string
  purpose: string
  duration: number
}

export interface SystemConfig {
  maxActiveProjects: number
  dailyFocusLimit: number
  weeklyOutcomeLimit: number
  priorityTiers: string[]
  executionBlocks: ExecutionBlockTemplate[]
  xpMode: "standard"
}

export interface Project extends SyncFields, Provenance {
  id: string
  title: string
  objective: string
  status?: ProjectStatus
  showOnTimeline?: boolean
  weeklyOutcome?: string
  weekStartISO: string
  weekEndISO: string
  milestones: ProjectMilestone[]
  color: string
  /** Default category for tasks made from this project (P14). "" = none; tasks get the first category. */
  category?: string
  url?: string
  links?: Array<{
    label: string
    url: string
  }>
  /** Cross-links to Resources by id (ADR-025). */
  resourceIds?: string[]
}

export interface WeeklyAllocation {
  projectId: string
  hoursAllocated: number
  priority: ProjectPriority
  weeklyOutcome: string
}

export interface WeeklyPlan extends SyncFields {
  id: string
  weekStartISO: string
  totalCapacityHours: number
  allocations: WeeklyAllocation[]
  status: WeeklyPlanStatus
  reviewedAt?: string
}

export interface TimeBlock extends SyncFields {
  id: string
  weekPlanId: string
  projectId?: string
  dateISO: string
  startTime: string
  endTime: string
  taskDescription: string
  plannedHours: number
  actualHours?: number
  status: TimeBlockStatus
  linkedTaskId?: string
  notes?: string
}

export interface ExecutionLog extends SyncFields {
  id: string
  weekPlanId: string
  projectId: string
  dateISO: string
  plannedHours: number
  actualHours: number
}

export interface ProjectWeeklyReview {
  projectId: string
  outcomePlanned: string
  outcomeAchieved: boolean
  plannedHours: number
  actualHours: number
  decision: ReviewDecision
  notes?: string
}

export interface WeeklyReview extends SyncFields {
  id: string
  weekPlanId: string
  weekStartISO: string
  summary: ProjectWeeklyReview[]
  nextWeekCapacityHours?: number
  completed: boolean
}

export interface Achievement extends SyncFields {
  id: string
  type: "badge" | "diploma" | "medal"
  title: string
  date: string
  description: string
  imageUrl?: string
  xpAwarded: number
  unlocked: boolean
}

export interface ScheduleItem extends SyncFields {
  id: string
  title: string
  type: string
  startISO: string
  endISO: string
  hasExplicitTime?: boolean
  color?: string
  blockTypeId?: string
  linkedTaskId?: string
  linkedProjectId?: string
  linkedMilestoneId?: string
}

export type ExternalCalendarSource = "google-calendar"
export type ExternalCalendarBlockStatus = "confirmed" | "tentative" | "cancelled"

export interface ExternalCalendarBlock extends SyncFields {
  id: string
  source: ExternalCalendarSource
  externalCalendarId: string
  externalEventId: string
  externalRecurringEventId?: string
  externalICalUID?: string
  externalEtag?: string
  title: string
  startISO?: string
  endISO?: string
  allDay: boolean
  blocksTime: boolean
  status: ExternalCalendarBlockStatus
  htmlLink?: string
  location?: string
}

export interface Resource extends SyncFields {
  id: string
  category: string
  title: string
  order?: number
  url?: string
  links?: Array<{
    label: string
    url: string
  }>
  description: string
  tags: string[]
  color?: string
}

export interface JournalEntry extends SyncFields {
  id: string
  dateISO: string
  type: "daily" | "weekly"
  mood: number
  highlights: string
  challenges: string
  nextSteps: string
  gratitude?: string
}

export type GoogleCalendarSyncStatus = "disconnected" | "connected" | "syncing" | "error"

export interface GoogleCalendarMetadata {
  enabled: boolean
  selectedCalendarIds: string[]
  syncTokenByCalendarId: Record<string, string>
  lastSyncedAt?: number
  status: GoogleCalendarSyncStatus
  lastError?: string
  displayExternalBlocks: boolean
}

export interface Profile extends SyncFields {
  name: string
  onboardingCompleted: boolean
  taskCategories?: string[]
  taskCategoryColors?: Record<string, string>
  /** OS domain per category (P14, ADR-029). Missing or "" = unmapped. "" is stored instead of deleting a key,
   *  because the profile is written with merge and a deleted map key would not reach Firestore. */
  taskCategoryDomains?: Record<string, OsDomain | "">
  focusedProjectId?: string
  systemConfig?: SystemConfig
  googleCalendar?: GoogleCalendarMetadata
  level: number
  xpTotal: number
  xpThisWeek: number
  streakDays: number
  lastActiveDateISO?: string
  xpWeekKey?: string
}

export type SyncCollection =
  | "goals"
  | "tasks"
  | "projects"
  | "achievements"
  | "schedule"
  | "weeklyPlans"
  | "timeBlocks"
  | "externalCalendarBlocks"
  | "executionLogs"
  | "weeklyReviews"
  | "resources"
  | "journal"
  | "profile"

export interface SyncState {
  deviceId: string
  currentUid: string | null
  status: "idle" | "syncing" | "error"
  lastError: string | null
  lastPulledAt: number | null
  lastSyncedAt: number | null
  pending: Record<SyncCollection, Record<string, number>>
}

export type ModuleId =
  | "command-center"
  | "goals"
  | "todo"
  | "projects"
  | "achievements"
  | "schedule"
  | "resources"
  | "journal"

export interface Insight {
  id: string
  type: "summary" | "warning" | "suggestion"
  title: string
  body: string
  createdAt: number
}

export interface CoachingMessage {
  tone: "encourage" | "correct"
  headline: string
  detail: string
  fetchedDateISO: string
}

export interface VelocitySnapshot {
  weekStartISO: string
  tasksCompleted: number
  hoursLogged: number
}

export interface ScheduleSuggestion {
  taskId: string
  taskTitle: string
  dayOfWeek: number
  startTime: string
  duration: number
  reasoning: string
}
