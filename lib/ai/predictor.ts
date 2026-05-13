import type { ExecutionLog, Project, VelocitySnapshot } from "@/lib/types"

const MIN_WEEKS = 2

export function buildVelocitySnapshots(
  logs: ExecutionLog[],
  projectId?: string
): VelocitySnapshot[] {
  const filtered = projectId ? logs.filter((l) => l.projectId === projectId) : logs
  const byWeek = new Map<string, { hoursLogged: number }>()

  for (const log of filtered) {
    if (log.deleted) continue
    const week = log.dateISO.slice(0, 8) + "01" // approximate week key as month-start; real: use weekStartISO
    const entry = byWeek.get(log.weekPlanId) ?? { hoursLogged: 0 }
    entry.hoursLogged += log.actualHours
    byWeek.set(log.weekPlanId, entry)
  }

  return Array.from(byWeek.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([weekKey, data]) => ({
      weekStartISO: weekKey,
      tasksCompleted: 0,
      hoursLogged: data.hoursLogged,
    }))
}

export interface ProjectPrediction {
  projectId: string
  completionProbability: number
  daysRemaining: number | null
}

export function calcCompletionProbability(
  project: Project,
  snapshots: VelocitySnapshot[]
): ProjectPrediction | null {
  if (snapshots.length < MIN_WEEKS) return null

  const recent = snapshots.slice(-4)
  const avgHoursPerWeek =
    recent.reduce((sum, s) => sum + s.hoursLogged, 0) / recent.length

  const deadline = project.weekEndISO
  const now = new Date()
  const deadlineDate = new Date(deadline)
  const daysRemaining = Math.max(
    0,
    Math.ceil((deadlineDate.getTime() - now.getTime()) / 86400000)
  )

  if (avgHoursPerWeek <= 0) {
    return { projectId: project.id, completionProbability: 0.05, daysRemaining }
  }

  // Simple heuristic: probability rises with remaining time / recent velocity
  const weeksLeft = daysRemaining / 7
  const velocityScore = Math.min(1, avgHoursPerWeek / 10) // 10 h/week = "good"
  const timeScore = Math.min(1, weeksLeft / 4) // 4+ weeks = comfortable
  const probability = Math.min(0.95, velocityScore * 0.6 + timeScore * 0.4)

  return { projectId: project.id, completionProbability: probability, daysRemaining }
}
