import type {
  Achievement,
  Goal,
  JournalEntry,
  Profile,
  Project,
  Resource,
  ScheduleItem,
  Task,
  SyncCollection,
} from "@/lib/types"

export interface CollectionEntityMap {
  tasks: Task
  goals: Goal
  projects: Project
  achievements: Achievement
  schedule: ScheduleItem
  resources: Resource
  journal: JournalEntry
}

export const ENTITY_COLLECTIONS: Array<Exclude<SyncCollection, "profile">> = [
  "tasks",
  "goals",
  "projects",
  "achievements",
  "schedule",
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
