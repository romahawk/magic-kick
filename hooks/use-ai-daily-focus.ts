"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import type { Project, Task } from "@/lib/types"

/** The button stays disabled this long after a result (ADR-038, client guard). */
export const COOLDOWN_MS = 30_000

export interface AiFocusSuggestion {
  taskId: string
  outcomeId: string
  outcomeTitle: string
  reason: string
}

export type AiFocusState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "no-canon" }
  | { status: "none" } // no suggestion right now: empty answer, timeout, invalid output or a limit
  | { status: "done"; suggestions: AiFocusSuggestion[]; stale: boolean; fetchedAt: string | null }

/**
 * P19 (ADR-038): "Rank with AI" for the Command Center's Suggested list. Available only when
 * GET /api/ai/daily-focus answers 200, so with the flag off or no key the button never shows and
 * nothing errors. One request in flight; disabled for 30 s after an answer. Writes nothing: the
 * caller accepts a row through moveTaskToLane. State stays in the component, never in the store.
 */
export function useAiDailyFocus(tasks: Task[], projects: Project[], dailyFocusLimit: number) {
  const { user } = useAuth()
  const [available, setAvailable] = useState(false)
  const [state, setState] = useState<AiFocusState>({ status: "idle" })
  const [cooling, setCooling] = useState(false)
  const inFlight = useRef(false)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    void (async () => {
      try {
        const token = await user.getIdToken()
        const res = await fetch("/api/ai/daily-focus", { headers: { Authorization: `Bearer ${token}` } })
        if (!cancelled) setAvailable(res.status === 200)
      } catch {
        // Offline: stay hidden.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user])

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
    },
    []
  )

  const rank = useCallback(async () => {
    if (!user || inFlight.current || cooling) return
    inFlight.current = true
    setState({ status: "loading" })
    let next: AiFocusState = { status: "none" }
    try {
      const token = await user.getIdToken()
      const res = await fetch("/api/ai/daily-focus", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        // Only the fields the route reads; notes and descriptions never leave the browser.
        body: JSON.stringify({
          dailyFocusLimit,
          tasks: tasks.map((t) => ({
            id: t.id,
            title: t.title,
            dueDate: t.dueDate,
            lane: t.lane,
            completed: t.completed,
            deleted: t.deleted,
            linkedProjectId: t.linkedProjectId,
          })),
          projects: projects.map((p) => ({ id: p.id, title: p.title, status: p.status, deleted: p.deleted })),
        }),
      })
      const data = res.ok ? await res.json() : null
      if (data?.ok && data.canonUsed === false) next = { status: "no-canon" }
      else if (data?.ok && Array.isArray(data.suggestions) && data.suggestions.length > 0) {
        next = { status: "done", suggestions: data.suggestions, stale: Boolean(data.stale), fetchedAt: data.fetchedAt ?? null }
      }
    } catch {
      // Falls through to "No suggestion right now"; nothing changes.
    } finally {
      inFlight.current = false
    }
    setState(next)
    setCooling(true)
    timer.current = window.setTimeout(() => setCooling(false), COOLDOWN_MS)
  }, [user, cooling, tasks, projects, dailyFocusLimit])

  const reset = useCallback(() => setState({ status: "idle" }), [])

  return { available, state, cooling, rank, reset }
}
