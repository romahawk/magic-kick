import { differenceInCalendarDays, format, isBefore, parseISO } from "date-fns"
import type { Task, TaskRepeat } from "@/lib/types"

export const TASK_REPEAT_OPTIONS: Array<{ value: TaskRepeat; label: string }> = [
  { value: "none", label: "Does not repeat" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "custom", label: "Custom days…" },
]

export const WEEK_DAYS: Array<{ value: number; short: string }> = [
  { value: 1, short: "Mo" },
  { value: 2, short: "Tu" },
  { value: 3, short: "We" },
  { value: 4, short: "Th" },
  { value: 5, short: "Fr" },
  { value: 6, short: "Sa" },
  { value: 0, short: "Su" },
]

export function formatRecurrenceDays(days: number[] | undefined): string {
  if (!days || days.length === 0) return "—"
  const order = [1, 2, 3, 4, 5, 6, 0]
  const sorted = [...days].sort((a, b) => order.indexOf(a) - order.indexOf(b))
  return sorted.map((d) => WEEK_DAYS.find((w) => w.value === d)?.short ?? "").filter(Boolean).join(" ")
}

function toDate(dateISO: string) {
  return parseISO(`${dateISO}T00:00:00`)
}

export function isRecurringTask(task: Pick<Task, "repeat" | "dueDate" | "recurrenceDays">) {
  if (!task.dueDate || !task.repeat || task.repeat === "none") return false
  if (task.repeat === "custom") return Boolean(task.recurrenceDays?.length)
  return true
}

export function taskRepeatsOnDate(task: Pick<Task, "dueDate" | "repeat" | "recurrenceDays">, dateISO: string) {
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
    case "custom":
      if (!task.recurrenceDays || task.recurrenceDays.length === 0) return false
      return task.recurrenceDays.includes(target.getDay())
    case "none":
    default:
      return format(anchor, "yyyy-MM-dd") === dateISO
  }
}

export function getTaskOccurrencesForDates(task: Pick<Task, "dueDate" | "repeat" | "recurrenceDays">, dateISOs: string[]) {
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
