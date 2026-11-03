"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import type { CommitmentsFeedResult, DatedCommitment } from "@/lib/commitments"

const REFETCH_AFTER_MS = 5 * 60 * 1000
const NONE: DatedCommitment[] = []

// One fetch per app load is shared by every surface that shows commitments (Schedule, Daily Focus);
// the module resets on a reload, which is the "refresh on app load". Never written to the store.
let shared: { at: number; commitments: DatedCommitment[] } | null = null
let inFlight: Promise<DatedCommitment[]> | null = null

async function load(getToken: () => Promise<string>, force: boolean): Promise<DatedCommitment[]> {
  if (!force && shared && Date.now() - shared.at < REFETCH_AFTER_MS) return shared.commitments
  if (inFlight) return inFlight
  inFlight = (async () => {
    try {
      const response = await fetch("/api/os/commitments", { headers: { Authorization: `Bearer ${await getToken()}` } })
      if (!response.ok) return shared?.commitments ?? NONE
      const next = (await response.json()) as CommitmentsFeedResult
      if (next.status === "not-configured" && process.env.NODE_ENV === "development") {
        console.info("[os-feed] AIOS_GITHUB_TOKEN is not set; dated commitments are not shown.")
      }
      shared = { at: Date.now(), commitments: next.commitments ?? NONE }
      return shared.commitments
    } catch {
      // Offline or the route is unreachable: keep what is on screen, show nothing if nothing was loaded.
      return shared?.commitments ?? NONE
    } finally {
      inFlight = null
    }
  })()
  return inFlight
}

/**
 * P30: dated commitments from AI-Business-OS, for display only (ADR-036). Component state, never the
 * store, so nothing from the OS reaches Firestore. Empty until the first answer, when signed out, when
 * the file is missing, and when it fails to load.
 */
export function useOsCommitments(): DatedCommitment[] {
  const { user } = useAuth()
  const [commitments, setCommitments] = useState<DatedCommitment[]>(shared?.commitments ?? NONE)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    const getToken = () => user.getIdToken()

    function run(force: boolean) {
      void load(getToken, force).then((next) => {
        if (!cancelled) setCommitments(next)
      })
    }
    function onVisible() {
      if (document.visibilityState === "visible" && (!shared || Date.now() - shared.at > REFETCH_AFTER_MS)) run(false)
    }

    run(false)
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      cancelled = true
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [user])

  return user ? commitments : NONE
}
