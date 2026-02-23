import { updateRemoteSyncMeta } from "@/lib/db/firestore"
import { useAppStore } from "@/lib/store"
import { applyRemoteSnapshot } from "@/lib/sync/applyRemote"
import { pullRemote } from "@/lib/sync/pullRemote"
import { pushLocal } from "@/lib/sync/pushLocal"

let syncInFlight = false

export async function syncNow(uid: string) {
  if (syncInFlight) return
  syncInFlight = true
  const startedAt = Date.now()
  const store = useAppStore.getState()
  store.setSyncStatus("syncing")

  try {
    const snapshot = await pullRemote(uid, useAppStore.getState().sync.lastPulledAt)
    applyRemoteSnapshot(snapshot)
    const pushResult = await pushLocal(uid)
    const completedAt = Date.now()
    const nextCursor = Math.max(snapshot.cursor, completedAt)

    useAppStore.getState().setLastPulledAt(nextCursor)
    useAppStore.getState().setLastSyncedAt(completedAt)
    useAppStore.getState().setSyncStatus("idle")

    await updateRemoteSyncMeta(uid, {
      version: 1,
      deviceId: useAppStore.getState().sync.deviceId,
      lastSyncedAt: completedAt,
      lastSyncDurationMs: completedAt - startedAt,
      lastPushCount: pushResult.pushed,
      cursor: nextCursor,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed"
    useAppStore.getState().setSyncStatus("error", message)
  } finally {
    syncInFlight = false
  }
}
