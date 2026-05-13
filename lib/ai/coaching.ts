import type { Task } from "@/lib/types"

export type CoachingTrigger = "kickoff" | "midweek" | "closing"

export interface CoachingContext {
  triggerType: CoachingTrigger
  dayOfWeek: number
  weekProgressPct: number
  completedToday: number
  pendingToday: number
}

export function getCoachingContext(
  tasks: Task[],
  now: Date = new Date()
): CoachingContext | null {
  const dow = now.getDay() // 0=Sun, 1=Mon ... 6=Sat
  if (dow === 0 || dow === 6) return null // no coaching on weekends by default

  const todayISO = now.toISOString().slice(0, 10)
  const activeTasks = tasks.filter((t) => !t.deleted)
  if (activeTasks.length < 3) return null // not enough context

  const completedToday = activeTasks.filter(
    (t) => t.completed && t.completedAt?.slice(0, 10) === todayISO
  ).length
  const pendingToday = activeTasks.filter(
    (t) => !t.completed && t.dueDate === todayISO
  ).length

  const totalThisWeek = activeTasks.filter((t) => !!t.dueDate && t.dueDate.slice(0, 10) >= todayISO.slice(0, 7)).length
  const doneThisWeek = activeTasks.filter((t) => t.completed && t.completedAt?.slice(0, 7) === todayISO.slice(0, 7)).length
  const weekProgressPct = totalThisWeek > 0 ? Math.round((doneThisWeek / totalThisWeek) * 100) : 0

  const triggerType: CoachingTrigger =
    dow <= 2 ? "kickoff" : dow <= 4 ? "midweek" : "closing"

  return { triggerType, dayOfWeek: dow, weekProgressPct, completedToday, pendingToday }
}
