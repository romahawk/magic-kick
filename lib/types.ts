export type TaskCategory = string
export type TaskLane = "daily-focus" | "backlog" | "parking-lot"

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
  estimateMin?: number
  pomodorosPlanned?: number
  completed: boolean
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
}

export interface ProjectMilestone {
  id: string
  title: string
  dayIndex: number
  completed: boolean
}

export type ProjectStatus = "active" | "paused" | "parked" | "completed"

export interface SystemConfig {
  maxActiveProjects: number
  dailyFocusLimit: number
  weeklyOutcomeLimit: number
  priorityTiers: string[]
  xpMode: "standard"
}

export interface Project extends SyncFields {
  id: string
  title: string
  objective: string
  status?: ProjectStatus
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
  linkedTaskId?: string
}

export interface Resource extends SyncFields {
  id: string
  category: string
  title: string
  url?: string
  links?: Array<{
    label: string
    url: string
  }>
  description: string
  tags: string[]
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
