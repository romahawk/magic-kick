import { format, isSameDay, parseISO, startOfWeek, subDays } from "date-fns"
import type { Profile, Task } from "@/lib/types"
import { levelFromXP } from "@/lib/game-utils"

// The same base for every category (ADR-029): categories are user-defined, so a name must not set XP.
// 20 is roughly the mean of the old per-name values (14–24), so typical XP stays about the same.
const BASE_TASK_XP = 20

export function getWeekKey(inputDate: Date) {
  return format(startOfWeek(inputDate, { weekStartsOn: 1 }), "yyyy-MM-dd")
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function roundTo5(value: number) {
  return Math.round(value / 5) * 5
}

export function calculateTaskXP(task: Pick<Task, "estimateMin" | "pomodorosPlanned" | "linkedProjectId">) {
  const base = BASE_TASK_XP
  const estimateBonus = clamp(Math.floor((task.estimateMin ?? 0) / 15) * 2, 0, 18)
  const pomodoroBonus = clamp((task.pomodorosPlanned ?? 0) * 4, 0, 20)
  const projectBonus = task.linkedProjectId ? 6 : 0
  const raw = base + estimateBonus + pomodoroBonus + projectBonus
  return clamp(roundTo5(raw), 10, 100)
}

export function applyTaskCompletionXP(profile: Profile, taskXP: number, completedAt: Date) {
  const weekKey = getWeekKey(completedAt)
  const isSameTrackedWeek = profile.xpWeekKey === weekKey
  const weekXP = isSameTrackedWeek ? profile.xpThisWeek : 0

  const todayIso = format(completedAt, "yyyy-MM-dd")
  const yesterdayIso = format(subDays(completedAt, 1), "yyyy-MM-dd")

  let streakDays = profile.streakDays
  if (!profile.lastActiveDateISO) {
    streakDays = 1
  } else if (profile.lastActiveDateISO === todayIso) {
    streakDays = profile.streakDays
  } else if (profile.lastActiveDateISO === yesterdayIso) {
    streakDays = profile.streakDays + 1
  } else {
    streakDays = 1
  }

  const streakBonus = clamp((streakDays - 1) * 2, 0, 20)
  const xpGain = taskXP + streakBonus
  const xpTotal = profile.xpTotal + xpGain
  const level = levelFromXP(xpTotal).level

  return {
    ...profile,
    xpTotal,
    xpThisWeek: weekXP + xpGain,
    level,
    streakDays,
    lastActiveDateISO: todayIso,
    xpWeekKey: weekKey,
  }
}

export function rollbackTaskXP(profile: Profile, taskXP: number, eventDate: Date) {
  const weekKey = getWeekKey(eventDate)
  const sameWeek = profile.xpWeekKey === weekKey
  const xpTotal = Math.max(0, profile.xpTotal - taskXP)
  const xpThisWeek = sameWeek ? Math.max(0, profile.xpThisWeek - taskXP) : profile.xpThisWeek
  const level = levelFromXP(xpTotal).level
  return {
    ...profile,
    xpTotal,
    xpThisWeek,
    level,
  }
}

export function normalizeProfileForToday(profile: Profile, nowDate: Date) {
  const weekKey = getWeekKey(nowDate)
  if (profile.xpWeekKey === weekKey) return profile
  return {
    ...profile,
    xpThisWeek: 0,
    xpWeekKey: weekKey,
  }
}

export function isActiveToday(profile: Profile, nowDate: Date) {
  if (!profile.lastActiveDateISO) return false
  return isSameDay(parseISO(profile.lastActiveDateISO), nowDate)
}
