"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import type { PlanFeedResult } from "@/lib/os-feed/plan-parser"

const REFETCH_AFTER_MS = 5 * 60 * 1000

/**
 * P7: today's plan from AI-Business-OS, for display only. Kept in component state, never in the
 * store, so nothing from the plan reaches Firestore. Null until the first answer, and when signed out.
 */
export function useOsPlan(): PlanFeedResult | null {
  const { user } = useAuth()
  const [plan, setPlan] = useState<PlanFeedResult | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    let lastFetch = 0

    async function load() {
      lastFetch = Date.now()
      try {
        const token = await user!.getIdToken()
        const response = await fetch("/api/os/plan", { headers: { Authorization: `Bearer ${token}` } })
        if (!response.ok) return
        const next = (await response.json()) as PlanFeedResult
        if (cancelled) return
        if (next.status === "not-configured" && process.env.NODE_ENV === "development") {
          console.info("[os-feed] AIOS_GITHUB_TOKEN is not set; the OS plan is not shown.")
        }
        setPlan(next)
      } catch {
        // Offline or the route is unreachable: keep what is on screen.
      }
    }

    function onVisible() {
      if (document.visibilityState === "visible" && Date.now() - lastFetch > REFETCH_AFTER_MS) void load()
    }

    void load()
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      cancelled = true
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [user])

  return user ? plan : null
}
