"use client"

import { useCallback, useEffect } from "react"
import { syncNow } from "@/lib/sync/engine"
import { useAppStore } from "@/lib/store"

const SYNC_INTERVAL_MS = 45_000

export function useSync(uid: string | null) {
  const status = useAppStore((s) => s.sync.status)

  const runSync = useCallback(async () => {
    if (!uid) return
    await syncNow(uid)
  }, [uid])

  useEffect(() => {
    if (!uid) return
    void runSync()

    const interval = window.setInterval(() => {
      void runSync()
    }, SYNC_INTERVAL_MS)

    const handleFocus = () => {
      void runSync()
    }

    window.addEventListener("focus", handleFocus)
    document.addEventListener("visibilitychange", handleFocus)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener("focus", handleFocus)
      document.removeEventListener("visibilitychange", handleFocus)
    }
  }, [uid, runSync])

  return {
    syncStatus: status,
    syncNow: runSync,
  }
}
