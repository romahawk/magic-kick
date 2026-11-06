import { pushPendingWrites } from "@/lib/db/firestore"
import { useAppStore } from "@/lib/store"
import { buildPendingWrites, pendingWriteKeys } from "@/lib/sync/diff"

export async function pushLocal(uid: string) {
  const state = useAppStore.getState()
  const writes = buildPendingWrites(state)
  if (writes.length === 0) {
    return { pushed: 0 }
  }
  // Clear only what was pushed: a change made while the push ran (a delete, say) has a newer stamp and stays pending.
  const stamps = state.sync.pending
  await pushPendingWrites(uid, writes)
  useAppStore.getState().clearPending(pendingWriteKeys(writes).map((key) => ({ ...key, stamp: stamps[key.collection][key.id] })))
  return { pushed: writes.length }
}
