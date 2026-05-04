import { endOfMonth, endOfWeek, format, isWithinInterval, parseISO, startOfMonth, startOfWeek } from "date-fns"
import type { Goal, Project, Task } from "@/lib/types"

export interface CompletedMilestoneRecord {
  projectId: string
  projectTitle: string
  milestoneId: string
  title: string
  completedAt: string
}

export interface RetrospectiveSummary {
  completedTasks: Task[]
  completedGoals: Goal[]
  completedMilestones: CompletedMilestoneRecord[]
  tasksByCategory: Array<{ category: string; count: number }>
  tasksByProject: Array<{ projectId: string; projectTitle: string; count: number }>
  milestonesByProject: Array<{ projectId: string; projectTitle: string; count: number }>
  goalsByCategory: Array<{ category: string; count: number }>
}

function sortCounts<T extends { count: number }>(items: T[]) {
  return [...items].sort((a, b) => b.count - a.count)
}

function groupCounts(values: string[]) {
  const counts = new Map<string, number>()
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return Array.from(counts.entries()).map(([label, count]) => ({ label, count }))
}

function isDateISOInRange(dateISO: string | undefined, startISO: string, endISO: string) {
  if (!dateISO) return false
  return isWithinInterval(parseISO(dateISO), {
    start: parseISO(startISO),
    end: parseISO(endISO),
  })
}

export function buildRetrospectiveSummary(tasks: Task[], goals: Goal[], projects: Project[], startISO: string, endISO: string): RetrospectiveSummary {
  const visibleProjects = projects.filter((project) => !project.deleted)
  const projectById = new Map(visibleProjects.map((project) => [project.id, project]))

  const completedTasks = tasks.filter(
    (task) => !task.deleted && task.completed && isDateISOInRange(task.completedAt, startISO, endISO)
  )
  const completedGoals = goals.filter(
    (goal) => !goal.deleted && goal.status === "completed" && isDateISOInRange(goal.completedAt, startISO, endISO)
  )
  const completedMilestones = visibleProjects.flatMap((project) =>
    (project.milestones ?? [])
      .filter((milestone) => milestone.completed && isDateISOInRange(milestone.completedAt, startISO, endISO))
      .map((milestone) => ({
        projectId: project.id,
        projectTitle: project.title,
        milestoneId: milestone.id,
        title: milestone.title,
        completedAt: milestone.completedAt!,
      }))
  )

  const tasksByCategory = sortCounts(
    groupCounts(completedTasks.map((task) => task.category)).map(({ label, count }) => ({
      category: label,
      count,
    }))
  )
  const tasksByProject = sortCounts(
    groupCounts(
      completedTasks
        .filter((task) => task.linkedProjectId)
        .map((task) => task.linkedProjectId!)
    ).map(({ label, count }) => ({
      projectId: label,
      projectTitle: projectById.get(label)?.title ?? "Unassigned project",
      count,
    }))
  )
  const milestonesByProject = sortCounts(
    groupCounts(completedMilestones.map((milestone) => milestone.projectId)).map(({ label, count }) => ({
      projectId: label,
      projectTitle: projectById.get(label)?.title ?? "Unknown project",
      count,
    }))
  )
  const goalsByCategory = sortCounts(
    groupCounts(completedGoals.map((goal) => goal.category)).map(({ label, count }) => ({
      category: label,
      count,
    }))
  )

  return {
    completedTasks,
    completedGoals,
    completedMilestones,
    tasksByCategory,
    tasksByProject,
    milestonesByProject,
    goalsByCategory,
  }
}

export function buildCurrentWeekRetrospective(tasks: Task[], goals: Goal[], projects: Project[], date = new Date()) {
  const startISO = format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd")
  const endISO = format(endOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd")
  return buildRetrospectiveSummary(tasks, goals, projects, startISO, endISO)
}

export function buildCurrentMonthRetrospective(tasks: Task[], goals: Goal[], projects: Project[], date = new Date()) {
  const startISO = format(startOfMonth(date), "yyyy-MM-dd")
  const endISO = format(endOfMonth(date), "yyyy-MM-dd")
  return buildRetrospectiveSummary(tasks, goals, projects, startISO, endISO)
}
