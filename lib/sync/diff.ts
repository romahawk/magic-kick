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
  "executionLogs",
  "weeklyReviews",
  "resources",
  "journal",
]

function getEntityById(state: AppState, collection: EntityCollection, id: string) {
  return state[collection].find((item) => item.id === id)
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
