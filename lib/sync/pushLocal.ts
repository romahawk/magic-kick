import { pushPendingWrites } from "@/lib/db/firestore"
import { useAppStore } from "@/lib/store"
import { buildPendingWrites, pendingWriteKeys } from "@/lib/sync/diff"

export async function pushLocal(uid: string) {
  const state = useAppStore.getState()
  const writes = buildPendingWrites(state)
  if (writes.length === 0) {
    return { pushed: 0 }
  }
  await pushPendingWrites(uid, writes)
  useAppStore.getState().clearPending(pendingWriteKeys(writes))
  return { pushed: writes.length }
}
