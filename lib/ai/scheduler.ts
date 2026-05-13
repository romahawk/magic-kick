import type { Goal, Project, Task } from "@/lib/types"
import { isDueToday, isDueThisWeek } from "@/lib/game-utils"

export interface ScoredTask {
  task: Task
  score: number
}

export function scoreTasks(
  tasks: Task[],
  goals: Goal[],
  projects: Project[],
  limit = 20
): ScoredTask[] {
  const goalById = new Map(goals.map((g) => [g.id, g]))
  const projectById = new Map(projects.map((p) => [p.id, p]))

  const active = tasks.filter((t) => !t.deleted && !t.completed)

  const scored: ScoredTask[] = active.map((task) => {
    const project = task.linkedProjectId ? projectById.get(task.linkedProjectId) : undefined
    const projectStatus = project?.status ?? "active"

    const urgency = isDueToday(task.dueDate) ? 50 : isDueThisWeek(task.dueDate) ? 25 : 0
    const impact =
      projectStatus === "active" ? 30 : projectStatus === "paused" ? 10 : 0
    const goalBonus = project?.objective ? 10 : 0
    const effortInverse = task.estimateMin ? Math.max(0, 30 - Math.min(30, task.estimateMin / 10)) : 15

    void goalById // available for future goal-priority weighting

    return { task, score: urgency + impact + goalBonus + effortInverse }
  })

  return scored.sort((a, b) => b.score - a.score).slice(0, limit)
}
