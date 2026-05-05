import { differenceInCalendarDays, format, isBefore, parseISO } from "date-fns"
import type { Task, TaskRepeat } from "@/lib/types"

export const TASK_REPEAT_OPTIONS: Array<{ value: TaskRepeat; label: string }> = [
  { value: "none", label: "Does not repeat" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
]

function toDate(dateISO: string) {
  return parseISO(`${dateISO}T00:00:00`)
}

export function isRecurringTask(task: Pick<Task, "repeat" | "dueDate">) {
  return Boolean(task.dueDate && task.repeat && task.repeat !== "none")
}

export function taskRepeatsOnDate(task: Pick<Task, "dueDate" | "repeat">, dateISO: string) {
  if (!task.dueDate) return false

  const anchor = toDate(task.dueDate)
  const target = toDate(dateISO)
  if (isBefore(target, anchor)) return false

  switch (task.repeat ?? "none") {
    case "daily":
      return true
    case "weekly":
      return differenceInCalendarDays(target, anchor) % 7 === 0
    case "monthly":
      return anchor.getDate() === target.getDate()
    case "none":
    default:
      return format(anchor, "yyyy-MM-dd") === dateISO
  }
}

export function getTaskOccurrencesForDates(task: Pick<Task, "dueDate" | "repeat">, dateISOs: string[]) {
  return dateISOs.filter((dateISO) => taskRepeatsOnDate(task, dateISO))
}

export function isTaskOccurrenceComplete(task: Pick<Task, "recurrenceCompletedDates">, dateISO: string) {
  return Boolean(task.recurrenceCompletedDates?.includes(dateISO))
}

export function toggleTaskOccurrenceDate(dates: string[] | undefined, dateISO: string) {
  const current = new Set(dates ?? [])
  if (current.has(dateISO)) {
    current.delete(dateISO)
  } else {
    current.add(dateISO)
  }
  return Array.from(current).sort((a, b) => a.localeCompare(b))
}
