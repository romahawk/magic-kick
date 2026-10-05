import { addDays, format, parseISO } from "date-fns"
import type { ExecutionBlockTemplate, ModuleId, Project, ProjectStatus, SystemConfig, Task, TaskLane, WeeklyPlan } from "@/lib/types"
import { isDueToday, isDueThisWeek, isOverdue } from "@/lib/game-utils"
import { findWeeklyPlanForWeek, getCurrentWeekStartISO, selectWeekAwaitingReview } from "@/lib/weekly-plan"

const DEFAULT_EXECUTION_BLOCKS: ExecutionBlockTemplate[] = [
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

type LoadStatus = "Stable" | "Busy" | "Strained" | "Overloaded"
export const TASK_LANE_LABELS: Record<TaskLane, string> = {
  "daily-focus": "Daily Focus",
  backlog: "Backlog",
  "parking-lot": "Parking Lot",
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

function selectActiveProjects(projects: Project[]) {
  return projects.filter((project) => !project.deleted && getProjectStatus(project) === "active")
}

/**
 * This week's outcome per project, keyed by project id.
 *
 * The weekly outcome has one source: the current week's WeeklyPlan, written in the Command Center
 * Plan tab (ADR-022). `Project.weeklyOutcome` is legacy data and is not read.
 */
export function selectThisWeekOutcomes(weeklyPlans: WeeklyPlan[]): Map<string, string> {
  const outcomes = new Map<string, string>()
  for (const allocation of findWeeklyPlanForWeek(weeklyPlans)?.allocations ?? []) {
    const outcome = allocation.weeklyOutcome.trim()
    if (allocation.projectId && outcome) outcomes.set(allocation.projectId, outcome)
  }
  return outcomes
}

/** Active projects whose end date (`weekEndISO`) has passed. */
function selectProjectsPastEnd(projects: Project[]) {
  return selectActiveProjects(projects)
    .filter((project) => isOverdue(project.weekEndISO))
    .sort((a, b) => a.weekEndISO.localeCompare(b.weekEndISO))
}

export function selectDailyFocus(
  tasks: Task[],
  projects: Project[],
  config?: Partial<SystemConfig>,
  options?: { focusedProjectId?: string; weeklyPlans?: WeeklyPlan[] }
) {
  const rules = normalizeSystemConfig(config)
  const projectById = new Map(projects.filter((project) => !project.deleted).map((project) => [project.id, project]))
  const weekOutcomes = selectThisWeekOutcomes(options?.weeklyPlans ?? [])
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
        (linkedProject && weekOutcomes.has(linkedProject.id) ? 20 : 0) +
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
  const projectsPastEnd = selectProjectsPastEnd(input.projects).length

  let pressure = 0
  if (activeProjects > rules.maxActiveProjects) pressure += 2 + (activeProjects - rules.maxActiveProjects)
  if (scheduledToday > rules.dailyFocusLimit) pressure += 1 + (scheduledToday - rules.dailyFocusLimit)
  pressure += projectsPastEnd * 2

  const status: LoadStatus =
    pressure <= 1 ? "Stable" : pressure <= 3 ? "Busy" : pressure <= 5 ? "Strained" : "Overloaded"
  const overload = Math.max(0, activeProjects - rules.maxActiveProjects)
  const focusScore = Math.max(0, 100 - overload * 15 - projectsPastEnd * 10)

  return {
    status,
    activeProjects,
    scheduledToday,
    projectsPastEnd,
    focusScore,
    overload,
    overCapacity: overload > 0,
  }
}

/* ------------------------------------------------------------------ *
 * Attention — "what requires attention now?"
 *
 * One derivation, used by the Command Center's attention block. Every
 * item is a thing that is wrong or missing right now, never an FYI.
 * Each action carries its effect as data, so the block can run it
 * without knowing the item's kind (P3, ADR-028). Agent proposals will
 * arrive later as one more `kind` — the shape is provider-neutral.
 * ------------------------------------------------------------------ */

type AttentionKind = "project-past-end" | "week-unreviewed" | "task-overdue" | "plan-missing" | "outcome-missing" | "load"

export type AttentionEffect =
  | { type: "open-module"; module: ModuleId }
  | { type: "open-tab"; tab: "plan" | "review" }
  | { type: "update-project"; projectId: string; patch: Partial<Pick<Project, "status" | "weekEndISO">> }

export interface AttentionAction {
  label: string
  effect: AttentionEffect
}

export interface AttentionItem {
  id: string
  kind: AttentionKind
  severity: "high" | "medium"
  subject: string
  detail: string
  /** yyyy-MM-dd the item has been waiting since, when that is known. */
  since?: string
  actions: AttentionAction[]
}

const ATTENTION_LIMIT = 6

function selectOverdueTasks(tasks: Task[]) {
  return tasks
    .filter((task) => !task.deleted && !task.completed && isOverdue(task.dueDate))
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))
}

export function selectAttentionItems(input: {
  projects: Project[]
  tasks: Task[]
  weeklyPlans: WeeklyPlan[]
  config?: Partial<SystemConfig>
}): { items: AttentionItem[]; total: number } {
  const rules = normalizeSystemConfig(input.config)
  const items: AttentionItem[] = []
  const now = new Date()
  const weekStartISO = getCurrentWeekStartISO(now)

  for (const project of selectProjectsPastEnd(input.projects)) {
    items.push({
      id: "project-past-end:" + project.id,
      kind: "project-past-end",
      severity: "high",
      subject: "Past end date — " + project.title,
      detail: "Still active",
      since: project.weekEndISO,
      actions: [
        { label: "Complete", effect: { type: "update-project", projectId: project.id, patch: { status: "completed" } } },
        { label: "Park", effect: { type: "update-project", projectId: project.id, patch: { status: "parked" } } },
        { label: "Extend", effect: { type: "update-project", projectId: project.id, patch: { weekEndISO: format(addDays(now, 7), "yyyy-MM-dd") } } },
      ],
    })
  }

  const unreviewed = selectWeekAwaitingReview(input.weeklyPlans, now)
  if (unreviewed) {
    const count = unreviewed.allocations.length
    items.push({
      id: "week-unreviewed:" + unreviewed.id,
      kind: "week-unreviewed",
      severity: "medium",
      subject: "Last week not reviewed",
      detail: "Week of " + format(parseISO(unreviewed.weekStartISO), "d MMM") + " · " + count + (count === 1 ? " project" : " projects"),
      since: weekStartISO,
      actions: [{ label: "Review", effect: { type: "open-tab", tab: "review" } }],
    })
  }

  for (const task of selectOverdueTasks(input.tasks)) {
    items.push({
      id: "task-overdue:" + task.id,
      kind: "task-overdue",
      severity: "high",
      subject: "Task overdue — " + task.title,
      detail: "Past due",
      since: task.dueDate,
      actions: [{ label: "Open", effect: { type: "open-module", module: "todo" } }],
    })
  }

  // Weekly outcomes live in this week's plan (ADR-022), so both rows send you to the Plan tab.
  const activeProjects = selectActiveProjects(input.projects)
  if (activeProjects.length > 0 && !findWeeklyPlanForWeek(input.weeklyPlans)) {
    items.push({
      id: "plan-missing",
      kind: "plan-missing",
      severity: "medium",
      subject: "No plan for this week",
      detail: activeProjects.length === 1 ? "1 active project with no weekly outcome" : activeProjects.length + " active projects with no weekly outcome",
      since: weekStartISO,
      actions: [{ label: "Plan", effect: { type: "open-tab", tab: "plan" } }],
    })
  } else {
    const weekOutcomes = selectThisWeekOutcomes(input.weeklyPlans)
    for (const project of activeProjects.filter((p) => !weekOutcomes.has(p.id))) {
      items.push({
        id: "outcome-missing:" + project.id,
        kind: "outcome-missing",
        severity: "medium",
        subject: "No weekly outcome — " + project.title,
        detail: "Active project with no outcome in this week's plan",
        since: weekStartISO,
        actions: [{ label: "Set", effect: { type: "open-tab", tab: "plan" } }],
      })
    }
  }

  // Load: shown whenever status is not Stable (P1 spec), not only on project over-capacity.
  // Over capacity keeps its specific wording; any other pressure names its cause.
  const load = calculateCognitiveLoad({ projects: input.projects, tasks: input.tasks, config: rules })
  if (load.status !== "Stable") {
    const causes: string[] = []
    if (load.scheduledToday > rules.dailyFocusLimit) {
      causes.push(load.scheduledToday + " due today, focus limit " + rules.dailyFocusLimit)
    }
    if (load.projectsPastEnd > 0) {
      causes.push(load.projectsPastEnd + " project" + (load.projectsPastEnd === 1 ? "" : "s") + " past end date")
    }
    items.push({
      id: "load:" + (load.overCapacity ? "over-capacity" : "pressure"),
      kind: "load",
      severity: load.status === "Busy" ? "medium" : "high",
      subject: load.overCapacity
        ? "Over capacity — " + load.activeProjects + " active projects, limit " + rules.maxActiveProjects
        : "Load: " + load.status,
      detail: load.overCapacity ? "Load: " + load.status : causes.join(" · "),
      actions: [{ label: "Review", effect: { type: "open-module", module: load.overCapacity || load.projectsPastEnd > 0 ? "projects" : "todo" } }],
    })
  }

  // Cap the list, but never drop the load row: it is the one summary of everything else, so with
  // many overdue items it takes the last visible slot. `total` lets the block say what was cut.
  const total = items.length
  if (total <= ATTENTION_LIMIT) return { items, total }
  const loadItem = items.find((item) => item.kind === "load")
  const others = items.filter((item) => item.kind !== "load")
  const visible = loadItem ? [...others.slice(0, ATTENTION_LIMIT - 1), loadItem] : others.slice(0, ATTENTION_LIMIT)
  return { items: visible, total }
}
