import type { AppState } from "@/lib/store"
import type { SyncCollection } from "@/lib/types"
import type { PendingWrite } from "@/lib/db/firestore"
import type { EntityCollection } from "@/lib/db/types"

const ENTITY_COLLECTIONS: EntityCollection[] = [
  "tasks",
  "goals",
  "projects",
  "achievements",
  "schedule",
  "weeklyPlans",
  "timeBlocks",
  "externalCalendarBlocks",
  "executionLogs",
  "weeklyReviews",
  "resources",
  "journal",
]

function getEntityById(state: AppState, collection: EntityCollection, id: string) {
  return state[collection].find((item) => item.id === id)
}

/**
 * Task fields the app can clear. A push writes with `merge: true` and drops undefined values, so a field
 * that is simply missing would stay on the server and come back on the next pull (a removed due date
 * returned as overdue). Local storage also drops undefined keys, so absence has to count as "cleared".
 */
const CLEARABLE_TASK_FIELDS = [
  "dueDate",
  "completedAt",
  "estimateMin",
  "pomodorosPlanned",
  "linkedProjectId",
  "milestoneId",
  "notes",
  "recurrenceDays",
] as const

/** Fields to delete on the server: explicit undefined values, plus the clearable fields a task lacks. */
export function fieldsToClear(collection: EntityCollection | "profile", data: Record<string, unknown>): string[] {
  const keys = new Set(Object.keys(data).filter((key) => data[key] === undefined))
  if (collection === "tasks") {
    for (const key of CLEARABLE_TASK_FIELDS) {
      if (data[key] === undefined) keys.add(key)
    }
  }
  return Array.from(keys)
}

export function buildPendingWrites(state: AppState): PendingWrite[] {
  const writes: PendingWrite[] = []

  for (const [id] of Object.entries(state.sync.pending.profile)) {
    if (id !== "profile") continue
    writes.push({
      collection: "profile",
      id: "profile",
      data: {
        ...state.profile,
      },
      clear: fieldsToClear("profile", { ...state.profile }),
    })
  }

  for (const collection of ENTITY_COLLECTIONS) {
    const pending = state.sync.pending[collection]
    for (const [id] of Object.entries(pending)) {
      const item = getEntityById(state, collection, id)
      if (!item) continue
      writes.push({
        collection,
        id,
        data: {
          ...item,
        },
        clear: fieldsToClear(collection, { ...item }),
      })
    }
  }

  return writes
}

export function pendingWriteKeys(writes: PendingWrite[]): Array<{ collection: SyncCollection; id: string }> {
  return writes.map((item) => ({
    collection: item.collection,
    id: item.id,
  }))
}
