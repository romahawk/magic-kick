"use client"

import { useEffect } from "react"
import { useAppStore } from "@/lib/store"

/**
 * P11 Close day (ADR-034): keeps today's Daily Focus list on the profile, so a missed day can be
 * closed with its plan. Signed in, it waits for this session's first sync: a stale local profile
 * must not be stamped newer than the one on the server before it has been pulled.
 */
export function useDailyFocusSnapshot(uid: string | null) {
  const isDemoMode = useAppStore((s) => s.isDemoMode)

  useEffect(() => {
    if (!uid && !isDemoMode) return
    const startedAt = Date.now()
    let ready = isDemoMode
    if (ready) useAppStore.getState().saveDailyFocusSnapshot()
    return useAppStore.subscribe((state, previous) => {
      const firstSync = !ready && (state.sync.lastSyncedAt ?? 0) >= startedAt
      if (firstSync) ready = true
      // Saving changes only the profile, so it does not trigger itself again.
      if (ready && (firstSync || state.tasks !== previous.tasks)) state.saveDailyFocusSnapshot()
    })
  }, [uid, isDemoMode])
}
