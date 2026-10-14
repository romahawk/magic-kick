"use client"

import { useCallback, useEffect, useState } from "react"
import { format, parseISO } from "date-fns"
import { useAppStore } from "@/lib/store"
import { localDateISO } from "@/lib/weekly-plan"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// Per device on purpose (P18): no data field, so the prompt can show once on each device.
const LAST_PROMPT_KEY = "magic-kick-focus-carryover-date"

function readLastPromptDate() {
  try {
    return window.localStorage.getItem(LAST_PROMPT_KEY)
  } catch {
    return null
  }
}

function writeLastPromptDate(dateISO: string) {
  try {
    window.localStorage.setItem(LAST_PROMPT_KEY, dateISO)
  } catch {
    // Storage blocked: the prompt may show again, which is harmless.
  }
}

/**
 * P18 — the first time the app opens on a new day, ask which open Daily Focus tasks still belong
 * to today. Unticked tasks go back to Backlog; closing without applying keeps them all.
 */
export function FocusCarryoverDialog() {
  const tasks = useAppStore((s) => s.tasks)
  const moveTaskToLane = useAppStore((s) => s.moveTaskToLane)
  const isDemoMode = useAppStore((s) => s.isDemoMode)
  const syncStatus = useAppStore((s) => s.sync.status)
  const lastPulledAt = useAppStore((s) => s.sync.lastPulledAt)
  // Wait for the first pull, so the list is the account's, not a stale local copy.
  const ready = isDemoMode || (lastPulledAt !== null && syncStatus !== "syncing")

  const [taskIds, setTaskIds] = useState<string[]>([])
  const [keep, setKeep] = useState<Set<string>>(new Set())
  const open = taskIds.length > 0

  const check = useCallback(() => {
    const today = localDateISO()
    if (readLastPromptDate() === today) return
    writeLastPromptDate(today)
    const ids = useAppStore
      .getState()
      .tasks.filter((t) => !t.deleted && !t.completed && t.lane === "daily-focus")
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((t) => t.id)
    if (ids.length === 0) return
    setTaskIds(ids)
    setKeep(new Set(ids))
  }, [])

  useEffect(() => {
    if (!ready) return
    // Deferred so the dialog opens after the first paint of the app, not inside this effect.
    const timeoutId = window.setTimeout(check, 0)
    // The app can stay open overnight; check again when it comes back into view.
    const onVisible = () => {
      if (document.visibilityState === "visible") check()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      window.clearTimeout(timeoutId)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [ready, check])

  const listed = taskIds
    .map((id) => tasks.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t && !t.deleted && !t.completed && t.lane === "daily-focus"))

  function close() {
    setTaskIds([])
  }

  function apply() {
    for (const task of listed) {
      if (!keep.has(task.id)) moveTaskToLane(task.id, "backlog")
    }
    close()
  }

  function toggle(id: string) {
    setKeep((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const returning = listed.filter((t) => !keep.has(t.id)).length

  return (
    <Dialog open={open && listed.length > 0} onOpenChange={(next) => {
      if (!next) close()
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Still today&apos;s focus?</DialogTitle>
          <DialogDescription>
            These tasks are still in Daily Focus. Untick any that should go back to Backlog.
          </DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-2.5 py-1">
          {listed.map((task) => (
            <li key={task.id} className="flex items-start gap-3">
              <Checkbox
                id={`carryover-${task.id}`}
                checked={keep.has(task.id)}
                onCheckedChange={() => toggle(task.id)}
                className="mt-0.5"
                aria-label={`Keep ${task.title} in Daily Focus`}
              />
              <label htmlFor={`carryover-${task.id}`} className="min-w-0 flex-1 cursor-pointer">
                <span className="block text-sm font-medium leading-snug">{task.title}</span>
                {task.dueDate ? (
                  <span className="text-xs text-muted-foreground">due {format(parseISO(task.dueDate), "d MMM")}</span>
                ) : null}
              </label>
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button type="button" onClick={apply}>
            {returning > 0 ? `Return ${returning} to Backlog` : "Keep all"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
