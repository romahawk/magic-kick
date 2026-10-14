"use client"

import { useCallback } from "react"
import { format, parseISO } from "date-fns"
import { toast } from "sonner"
import { useAppStore } from "@/lib/store"
import { NEXT_SLOT_SEARCH_DAYS, findNextFreeSlot, selectTaskTimeSlots, taskDurationMin } from "@/lib/weekly-plan"
import type { Task } from "@/lib/types"

/**
 * Puts a task in the next free calendar slot with an Undo toast (P16, shared by P18).
 * Returns the slot's date, or null when nothing is free.
 */
export function usePlanInNextSlot() {
  const updateTask = useAppStore((s) => s.updateTask)

  return useCallback(
    (task: Task) => {
      const state = useAppStore.getState()
      const durationMin = taskDurationMin(task)
      const slot = findNextFreeSlot({
        durationMin,
        timeBlocks: state.timeBlocks,
        tasks: state.tasks,
        taskTimeSlots: selectTaskTimeSlots(state.schedule, state.timeBlocks),
        externalCalendarBlocks: state.externalCalendarBlocks,
      })
      if (!slot) {
        toast.error(`No free ${durationMin}-minute slot in the next ${NEXT_SLOT_SEARCH_DAYS} days`)
        return null
      }
      const previousDueDate = task.dueDate
      updateTask(task.id, { dueDate: slot.dateISO }, { startHHmm: slot.startTime, endHHmm: slot.endTime })
      toast.success(`Scheduled ${format(parseISO(`${slot.dateISO}T12:00:00`), "EEE, MMM d")} · ${slot.startTime}–${slot.endTime}`, {
        description: task.title,
        action: {
          label: "Undo",
          onClick: () => updateTask(task.id, { dueDate: previousDueDate }, { clearTimeSlot: true }),
        },
      })
      return slot.dateISO
    },
    [updateTask]
  )
}
