import { startOfWeek, endOfWeek, format, isToday, parseISO, isBefore, isAfter, addDays } from "date-fns"

export function getCurrentWeekRange() {
  const now = new Date()
  const start = startOfWeek(now, { weekStartsOn: 1 })
  const end = endOfWeek(now, { weekStartsOn: 1 })
  return {
    start,
    end,
    label: `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`,
  }
}

export function getWeekDays() {
  const start = startOfWeek(new Date(), { weekStartsOn: 1 })
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(start, i)
    return {
      date: d,
      label: format(d, "EEE"),
      short: format(d, "d"),
      iso: format(d, "yyyy-MM-dd"),
      isToday: isToday(d),
    }
  })
}

export function xpForLevel(level: number): number {
  return level * 100 + (level - 1) * 50
}

export function levelFromXP(xp: number): { level: number; current: number; needed: number; progress: number } {
  let level = 1
  let remaining = xp
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level)
    level++
  }
  const needed = xpForLevel(level)
  return { level, current: remaining, needed, progress: (remaining / needed) * 100 }
}

export function isDueToday(dueDate?: string): boolean {
  if (!dueDate) return false
  return isToday(parseISO(dueDate))
}

export function isOverdue(dueDate?: string): boolean {
  if (!dueDate) return false
  const d = parseISO(dueDate)
  return isBefore(d, new Date()) && !isToday(d)
}

export function isDueThisWeek(dueDate?: string): boolean {
  if (!dueDate) return false
  const d = parseISO(dueDate)
  const { start, end } = getCurrentWeekRange()
  return !isBefore(d, start) && !isAfter(d, end)
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11)
}

export const CATEGORY_COLORS: Record<string, string> = {
  Learning: "bg-chart-1 text-primary-foreground",
  Sport: "bg-chart-4 text-primary-foreground",
  "Family/Home": "bg-chart-3 text-primary-foreground",
  Hobby: "bg-chart-5 text-primary-foreground",
  Travel: "bg-chart-2 text-primary-foreground",
}

export const CATEGORY_BORDER_COLORS: Record<string, string> = {
  Learning: "border-chart-1",
  Sport: "border-chart-4",
  "Family/Home": "border-chart-3",
  Hobby: "border-chart-5",
  Travel: "border-chart-2",
}
