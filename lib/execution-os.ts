import { isBefore, parseISO } from "date-fns"
import type { ExecutionBlockTemplate, ModuleId, Project, ProjectStatus, SystemConfig, Task, TaskLane } from "@/lib/types"
import { isDueToday, isDueThisWeek, isOverdue } from "@/lib/game-utils"

export const DEFAULT_EXECUTION_BLOCKS: ExecutionBlockTemplate[] = [
  {
    id: "deep-work-1",
    title: "Deep Work 1",
    purpose: "Primary execution",
    duration: 90,
  },
  {
    id: "deep-work-2",
    title: "Deep Work 2",
    purpose: "Secondary execution",
    duration: 90,
  },
  {
    id: "admin",
    title: "Admin Block",
    purpose: "Maintenance and logistics",
    duration: 45,
  },
  {
    id: "optional-build",
    title: "Optional Build",
    purpose: "Experiment or build time",
    duration: 60,
  },
]

export const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  maxActiveProjects: 3,
  dailyFocusLimit: 3,
  weeklyOutcomeLimit: 5,
  priorityTiers: ["Income", "Career", "Learning", "Health", "Personal"],
  executionBlocks: DEFAULT_EXECUTION_BLOCKS,
  xpMode: "standard",
}

export type LoadStatus = "Stable" | "Busy" | "Strained" | "Overloaded"
export const TASK_LANE_LABELS: Record<TaskLane, string> = {
  "daily-focus": "Daily Focus",
  backlog: "Backlog",
  "parking-lot": "Parking Lot",
}

export interface WeeklyOutcomeView {
  projectId: string
  projectTitle: string
  status: ProjectStatus
  title: string
  completed: boolean
  overdue: boolean
}

export function normalizeSystemConfig(config?: Partial<SystemConfig>): SystemConfig {
  const executionBlocks =
    config?.executionBlocks && config.executionBlocks.length > 0
      ? config.executionBlocks
          .map((block, index) => ({
            id: block.id?.trim() || `block-${index + 1}`,
            title: block.title?.trim() || DEFAULT_EXECUTION_BLOCKS[index]?.title || `Block ${index + 1}`,
            purpose: block.purpose?.trim() || DEFAULT_EXECUTION_BLOCKS[index]?.purpose || "Execution block",
            duration: Math.max(15, Math.min(240, Number(block.duration) || DEFAULT_EXECUTION_BLOCKS[index]?.duration || 60)),
          }))
          .slice(0, 6)
      : DEFAULT_EXECUTION_BLOCKS

  return {
    maxActiveProjects: Math.max(1, config?.maxActiveProjects ?? DEFAULT_SYSTEM_CONFIG.maxActiveProjects),
    dailyFocusLimit: Math.max(1, config?.dailyFocusLimit ?? DEFAULT_SYSTEM_CONFIG.dailyFocusLimit),
    weeklyOutcomeLimit: Math.max(1, config?.weeklyOutcomeLimit ?? DEFAULT_SYSTEM_CONFIG.weeklyOutcomeLimit),
    priorityTiers:
      config?.priorityTiers && config.priorityTiers.length > 0
        ? config.priorityTiers.filter(Boolean)
        : DEFAULT_SYSTEM_CONFIG.priorityTiers,
    executionBlocks,
    xpMode: "standard",
  }
}

export function getProjectStatus(project: Project): ProjectStatus {
  return project.status ?? "active"
}

export function selectActiveProjects(projects: Project[]) {
  return projects.filter((project) => !project.deleted && getProjectStatus(project) === "active")
}

export function hasDefinedWeeklyOutcome(project: Project) {
  return Boolean(project.weeklyOutcome?.trim())
}

export function selectActiveProjectsMissingWeeklyOutcome(projects: Project[]) {
  return selectActiveProjects(projects).filter((project) => !hasDefinedWeeklyOutcome(project))
}

export function selectWeeklyOutcomes(projects: Project[], config?: Partial<SystemConfig>): WeeklyOutcomeView[] {
  const rules = normalizeSystemConfig(config)
  return selectActiveProjects(projects)
    .filter((project) => hasDefinedWeeklyOutcome(project))
    .map((project) => {
      const completed = getProjectStatus(project) === "completed"
      const overdue = !completed && isBefore(parseISO(project.weekEndISO), new Date())
      return {
        projectId: project.id,
        projectTitle: project.title,
        status: getProjectStatus(project),
        title: project.weeklyOutcome!.trim(),
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

export function selectDailyFocus(
  tasks: Task[],
  projects: Project[],
  config?: Partial<SystemConfig>,
  options?: { focusedProjectId?: string }
) {
  const rules = normalizeSystemConfig(config)
  const projectById = new Map(projects.filter((project) => !project.deleted).map((project) => [project.id, project]))
  const explicitFocus = tasks
    .filter((task) => !task.deleted && !task.completed && task.lane === "daily-focus")
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .slice(0, rules.dailyFocusLimit)

  if (explicitFocus.length >= rules.dailyFocusLimit) {
    return explicitFocus.map((task) => ({
      task,
      linkedProject: task.linkedProjectId ? projectById.get(task.linkedProjectId) : undefined,
      score: Number.MAX_SAFE_INTEGER,
    }))
  }

  const derived = tasks
    .filter((task) => !task.deleted && !task.completed && task.lane !== "parking-lot" && task.lane !== "daily-focus")
    .map((task) => {
      const linkedProject = task.linkedProjectId ? projectById.get(task.linkedProjectId) : undefined
      const linkedStatus = linkedProject ? getProjectStatus(linkedProject) : undefined
      const score =
        (isDueToday(task.dueDate) ? 100 : 0) +
        (isDueThisWeek(task.dueDate) ? 40 : 0) +
        (task.linkedProjectId && task.linkedProjectId === options?.focusedProjectId ? 80 : 0) +
        (linkedStatus === "active" ? 35 : 0) +
        (linkedProject && hasDefinedWeeklyOutcome(linkedProject) ? 20 : 0) +
        Math.min(task.xpValue, 30)

      return {
        task,
        linkedProject,
        score,
      }
    })
    .sort((a, b) => b.score - a.score || a.task.title.localeCompare(b.task.title))
    .slice(0, Math.max(0, rules.dailyFocusLimit - explicitFocus.length))

  return [
    ...explicitFocus.map((task) => ({
      task,
      linkedProject: task.linkedProjectId ? projectById.get(task.linkedProjectId) : undefined,
      score: Number.MAX_SAFE_INTEGER,
    })),
    ...derived,
  ]
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

/* ------------------------------------------------------------------ *
 * Attention — "what requires attention now?"
 *
 * One derivation, used by the Command Center's attention block. Every
 * item is a thing that is wrong or missing right now, never an FYI, and
 * every item names the module that can resolve it. Agent proposals will
 * arrive later as one more `kind` (see CONTROL_PLANE_UI_SPEC P3) — the
 * shape is deliberately provider-neutral.
 * ------------------------------------------------------------------ */

export type AttentionKind = "outcome-overdue" | "task-overdue" | "outcome-missing" | "load"

export interface AttentionItem {
  id: string
  kind: AttentionKind
  severity: "high" | "medium"
  title: string
  detail: string
  module: ModuleId
  actionLabel: string
}

export const ATTENTION_LIMIT = 6

export function selectOverdueTasks(tasks: Task[]) {
  return tasks
    .filter((task) => !task.deleted && !task.completed && isOverdue(task.dueDate))
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))
}

function daysSince(dateISO?: string) {
  if (!dateISO) return 0
  const diff = Date.now() - parseISO(dateISO).getTime()
  return Math.max(0, Math.floor(diff / 86_400_000))
}

export function selectAttentionItems(input: {
  projects: Project[]
  tasks: Task[]
  config?: Partial<SystemConfig>
}): AttentionItem[] {
  const rules = normalizeSystemConfig(input.config)
  const items: AttentionItem[] = []

  for (const outcome of selectWeeklyOutcomes(input.projects, rules)) {
    if (!outcome.overdue || outcome.completed) continue
    items.push({
      id: "outcome-overdue:" + outcome.projectId,
      kind: "outcome-overdue",
      severity: "high",
      title: "Weekly outcome overdue — " + outcome.projectTitle,
      detail: outcome.title,
      module: "projects",
      actionLabel: "Decide",
    })
  }

  for (const task of selectOverdueTasks(input.tasks)) {
    const days = daysSince(task.dueDate)
    items.push({
      id: "task-overdue:" + task.id,
      kind: "task-overdue",
      severity: "high",
      title: "Task overdue — " + task.title,
      detail: days === 1 ? "1 day past due" : days + " days past due",
      module: "todo",
      actionLabel: "Open",
    })
  }

  for (const project of selectActiveProjectsMissingWeeklyOutcome(input.projects)) {
    items.push({
      id: "outcome-missing:" + project.id,
      kind: "outcome-missing",
      severity: "medium",
      title: "No weekly outcome — " + project.title,
      detail: "Active project with nothing to prove this week",
      module: "projects",
      actionLabel: "Set",
    })
  }

  const load = calculateCognitiveLoad({ projects: input.projects, tasks: input.tasks, config: rules })
  if (load.overCapacity) {
    items.push({
      id: "load:over-capacity",
      kind: "load",
      severity: "medium",
      title: "Over capacity — " + load.activeProjects + " active projects, limit " + rules.maxActiveProjects,
      detail: "Load: " + load.status,
      module: "projects",
      actionLabel: "Review",
    })
  }

  return items.slice(0, ATTENTION_LIMIT)
}
