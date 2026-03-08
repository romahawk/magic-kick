import { isBefore, parseISO } from "date-fns"
import type { Project, ProjectStatus, SystemConfig, Task } from "@/lib/types"
import { isDueToday, isDueThisWeek } from "@/lib/game-utils"

export const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  maxActiveProjects: 3,
  dailyFocusLimit: 3,
  weeklyOutcomeLimit: 5,
  priorityTiers: ["Income", "Career", "Learning", "Health", "Personal"],
  xpMode: "standard",
}

export type LoadStatus = "Stable" | "Busy" | "Strained" | "Overloaded"

export interface WeeklyOutcomeView {
  projectId: string
  projectTitle: string
  status: ProjectStatus
  title: string
  completed: boolean
  overdue: boolean
}

export function normalizeSystemConfig(config?: Partial<SystemConfig>): SystemConfig {
  return {
    maxActiveProjects: Math.max(1, config?.maxActiveProjects ?? DEFAULT_SYSTEM_CONFIG.maxActiveProjects),
    dailyFocusLimit: Math.max(1, config?.dailyFocusLimit ?? DEFAULT_SYSTEM_CONFIG.dailyFocusLimit),
    weeklyOutcomeLimit: Math.max(1, config?.weeklyOutcomeLimit ?? DEFAULT_SYSTEM_CONFIG.weeklyOutcomeLimit),
    priorityTiers:
      config?.priorityTiers && config.priorityTiers.length > 0
        ? config.priorityTiers.filter(Boolean)
        : DEFAULT_SYSTEM_CONFIG.priorityTiers,
    xpMode: "standard",
  }
}

export function getProjectStatus(project: Project): ProjectStatus {
  if (project.status) return project.status
  const hasMilestones = project.milestones.length > 0
  if (hasMilestones && project.milestones.every((milestone) => milestone.completed)) return "completed"
  return "active"
}

export function selectActiveProjects(projects: Project[]) {
  return projects.filter((project) => !project.deleted && getProjectStatus(project) === "active")
}

export function selectWeeklyOutcomes(projects: Project[], config?: Partial<SystemConfig>): WeeklyOutcomeView[] {
  const rules = normalizeSystemConfig(config)
  return projects
    .filter((project) => !project.deleted && getProjectStatus(project) !== "parked")
    .map((project) => {
      const completed = getProjectStatus(project) === "completed"
      const overdue = !completed && isBefore(parseISO(project.weekEndISO), new Date())
      return {
        projectId: project.id,
        projectTitle: project.title,
        status: getProjectStatus(project),
        title: project.weeklyOutcome?.trim() || project.objective,
        completed,
        overdue,
      }
    })
    .sort((a, b) => {
      if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed)
      if (a.overdue !== b.overdue) return Number(b.overdue) - Number(a.overdue)
      return a.projectTitle.localeCompare(b.projectTitle)
    })
    .slice(0, rules.weeklyOutcomeLimit)
}

export function selectDailyFocus(tasks: Task[], projects: Project[], config?: Partial<SystemConfig>) {
  const rules = normalizeSystemConfig(config)
  const projectById = new Map(projects.filter((project) => !project.deleted).map((project) => [project.id, project]))

  return tasks
    .filter((task) => !task.deleted && !task.completed)
    .map((task) => {
      const linkedProject = task.linkedProjectId ? projectById.get(task.linkedProjectId) : undefined
      const linkedStatus = linkedProject ? getProjectStatus(linkedProject) : undefined
      const score =
        (isDueToday(task.dueDate) ? 100 : 0) +
        (isDueThisWeek(task.dueDate) ? 40 : 0) +
        (linkedStatus === "active" ? 35 : 0) +
        (linkedProject?.weeklyOutcome ? 20 : 0) +
        Math.min(task.xpValue, 30)

      return {
        task,
        linkedProject,
        score,
      }
    })
    .sort((a, b) => b.score - a.score || a.task.title.localeCompare(b.task.title))
    .slice(0, rules.dailyFocusLimit)
}

export function calculateCognitiveLoad(input: {
  projects: Project[]
  tasks: Task[]
  config?: Partial<SystemConfig>
}) {
  const rules = normalizeSystemConfig(input.config)
  const activeProjects = selectActiveProjects(input.projects).length
  const scheduledToday = input.tasks.filter((task) => !task.deleted && !task.completed && isDueToday(task.dueDate)).length
  const missedWeeklyOutcomes = selectWeeklyOutcomes(input.projects, rules).filter((outcome) => outcome.overdue && !outcome.completed).length

  let pressure = 0
  if (activeProjects > rules.maxActiveProjects) pressure += 2 + (activeProjects - rules.maxActiveProjects)
  if (scheduledToday > rules.dailyFocusLimit) pressure += 1 + (scheduledToday - rules.dailyFocusLimit)
  pressure += missedWeeklyOutcomes * 2

  const status: LoadStatus =
    pressure <= 1 ? "Stable" : pressure <= 3 ? "Busy" : pressure <= 5 ? "Strained" : "Overloaded"
  const overload = Math.max(0, activeProjects - rules.maxActiveProjects)
  const focusScore = Math.max(0, 100 - overload * 15 - missedWeeklyOutcomes * 10)

  return {
    status,
    activeProjects,
    scheduledToday,
    missedWeeklyOutcomes,
    focusScore,
    overload,
    overCapacity: overload > 0,
  }
}
