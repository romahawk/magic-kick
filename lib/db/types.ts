import type {
  Achievement,
  ExecutionLog,
  Goal,
  JournalEntry,
  Profile,
  Project,
  Resource,
  ScheduleItem,
  Task,
  SyncCollection,
  TimeBlock,
  WeeklyPlan,
  WeeklyReview,
} from "@/lib/types"

export interface CollectionEntityMap {
  tasks: Task
  goals: Goal
  projects: Project
  achievements: Achievement
  schedule: ScheduleItem
  weeklyPlans: WeeklyPlan
  timeBlocks: TimeBlock
  executionLogs: ExecutionLog
  weeklyReviews: WeeklyReview
  resources: Resource
  journal: JournalEntry
}

export const ENTITY_COLLECTIONS: Array<Exclude<SyncCollection, "profile">> = [
  "tasks",
  "goals",
  "projects",
  "achievements",
  "schedule",
  "weeklyPlans",
  "timeBlocks",
  "executionLogs",
  "weeklyReviews",
  "resources",
  "journal",
]

export type EntityCollection = keyof CollectionEntityMap

export interface RemoteSnapshot {
  profile: Profile | null
  entities: {
    [K in EntityCollection]: CollectionEntityMap[K][]
  }
  cursor: number
}
