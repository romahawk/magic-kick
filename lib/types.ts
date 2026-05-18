export type TaskCategory = string
export type TaskLane = "daily-focus" | "backlog" | "parking-lot"
export type TaskRepeat = "none" | "daily" | "weekly" | "monthly"

export interface SyncFields {
  deleted?: boolean
  clientUpdatedAt?: number
  createdAt?: number
  updatedAt?: number
}

export interface Task extends SyncFields {
  id: string
  title: string
  category: TaskCategory
  lane?: TaskLane
  order?: number
  dueDate?: string
  repeat?: TaskRepeat
  recurrenceCompletedDates?: string[]
  estimateMin?: number
  pomodorosPlanned?: number
  completed: boolean
  completedAt?: string
  linkedProjectId?: string
  xpValue: number
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
  dayIndex: number
  completed: boolean
  completedAt?: string
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

export interface Project extends SyncFields {
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
  url?: string
  links?: Array<{
    label: string
    url: string
  }>
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

export interface Profile extends SyncFields {
  name: string
  onboardingCompleted: boolean
  taskCategories?: string[]
  taskCategoryColors?: Record<string, string>
  focusedProjectId?: string
  systemConfig?: SystemConfig
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
