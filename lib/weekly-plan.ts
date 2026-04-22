import { addDays, format, parseISO, startOfWeek } from "date-fns"
import type {
  ExecutionLog,
  Project,
  ProjectPriority,
  TimeBlock,
  WeeklyAllocation,
  WeeklyPlan,
  WeeklyReview,
} from "@/lib/types"

export const MAX_WEEKLY_PLAN_PROJECTS = 3
export const DEFAULT_WEEKLY_CAPACITY_HOURS = 25

export function getCurrentWeekStartISO(date = new Date()) {
  return format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd")
}

export function getWeekDates(weekStartISO: string) {
  const start = parseISO(weekStartISO)
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index)
    return {
      iso: format(date, "yyyy-MM-dd"),
      label: format(date, "EEE"),
      dayNumber: format(date, "d"),
    }
  })
}

export function findWeeklyPlanForWeek(plans: WeeklyPlan[], weekStartISO = getCurrentWeekStartISO()) {
  return plans.find((plan) => !plan.deleted && plan.weekStartISO === weekStartISO)
}

export function getActiveWeeklyPlan(plans: WeeklyPlan[], weekStartISO = getCurrentWeekStartISO()) {
  const weekPlan = findWeeklyPlanForWeek(plans, weekStartISO)
  if (!weekPlan) return undefined
  if (weekPlan.status === "reviewed") return weekPlan
  return weekPlan
}

export function sumAllocatedHours(allocations: WeeklyAllocation[]) {
  return allocations.reduce((total, allocation) => total + Math.max(0, allocation.hoursAllocated || 0), 0)
}

export function allocationProjectIds(plan?: WeeklyPlan) {
  return new Set(plan?.allocations.map((allocation) => allocation.projectId) ?? [])
}

export function validateWeeklyPlan(plan: WeeklyPlan, projects: Project[]) {
  const activeProjects = new Set(
    projects.filter((project) => !project.deleted && (project.status ?? "active") === "active").map((project) => project.id)
  )
  const errors: string[] = []
  const uniqueProjectIds = new Set<string>()

  if (plan.allocations.length === 0) {
    errors.push("Add at least one allocated project.")
  }
  if (plan.allocations.length > MAX_WEEKLY_PLAN_PROJECTS) {
    errors.push(`You can only allocate time across ${MAX_WEEKLY_PLAN_PROJECTS} projects.`)
  }

  for (const allocation of plan.allocations) {
    if (!allocation.projectId) {
      errors.push("Each allocation needs a project.")
      continue
    }
    if (uniqueProjectIds.has(allocation.projectId)) {
      errors.push("A project can only appear once in the weekly plan.")
    }
    uniqueProjectIds.add(allocation.projectId)
    if (!activeProjects.has(allocation.projectId)) {
      errors.push("Only active projects can be allocated in the weekly plan.")
    }
    if (!allocation.weeklyOutcome.trim()) {
      errors.push("Each allocated project needs one weekly outcome.")
    }
    if (allocation.hoursAllocated <= 0) {
      errors.push("Each allocated project needs hours greater than zero.")
    }
  }

  const allocatedHours = sumAllocatedHours(plan.allocations)
  if (allocatedHours > plan.totalCapacityHours) {
    errors.push("Allocated hours exceed weekly capacity.")
  }
  if (plan.totalCapacityHours <= 0) {
    errors.push("Weekly capacity must be greater than zero.")
  }

  return {
    isValid: errors.length === 0,
    errors,
    allocatedHours,
    remainingHours: Math.max(0, plan.totalCapacityHours - allocatedHours),
    isOverCapacity: allocatedHours > plan.totalCapacityHours,
  }
}

export function calculateTimeBlockHours(startTime: string, endTime: string) {
  const [startHour, startMinute] = startTime.split(":").map(Number)
  const [endHour, endMinute] = endTime.split(":").map(Number)
  const start = startHour * 60 + startMinute
  const end = endHour * 60 + endMinute
  const diff = Math.max(0, end - start)
  return Math.round((diff / 60) * 100) / 100
}

export function selectTimeBlocksForWeek(timeBlocks: TimeBlock[], weekPlanId?: string) {
  if (!weekPlanId) return []
  return timeBlocks.filter((block) => !block.deleted && block.weekPlanId === weekPlanId)
}

export function selectTimeBlocksForDates(timeBlocks: TimeBlock[], dayISOList: string[]) {
  const dates = new Set(dayISOList)
  return timeBlocks.filter((block) => !block.deleted && dates.has(block.dateISO))
}

export function selectTimeBlocksForDay(timeBlocks: TimeBlock[], dateISO: string, weekPlanId?: string) {
  return selectTimeBlocksForWeek(timeBlocks, weekPlanId)
    .filter((block) => block.dateISO === dateISO)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
}

export function selectProjectHours(plan: WeeklyPlan | undefined, timeBlocks: TimeBlock[], executionLogs: ExecutionLog[]) {
  if (!plan) return []
  const blocks = selectTimeBlocksForWeek(timeBlocks, plan.id)
  return plan.allocations.map((allocation) => {
    const plannedHours = blocks
      .filter((block) => block.projectId === allocation.projectId)
      .reduce((total, block) => total + block.plannedHours, 0)
    const actualHours = executionLogs
      .filter((log) => !log.deleted && log.weekPlanId === plan.id && log.projectId === allocation.projectId)
      .reduce((total, log) => total + log.actualHours, 0)
    return {
      projectId: allocation.projectId,
      priority: allocation.priority,
      weeklyOutcome: allocation.weeklyOutcome,
      allocatedHours: allocation.hoursAllocated,
      plannedHours,
      actualHours,
      remainingToPlanHours: Math.max(0, allocation.hoursAllocated - plannedHours),
      remainingToDeliverHours: Math.max(0, allocation.hoursAllocated - actualHours),
    }
  })
}

export function buildExecutionLogId(weekPlanId: string, projectId: string | undefined, dateISO: string) {
  return `${weekPlanId}:${projectId ?? ""}:${dateISO}`
}

export function buildExecutionLogFromBlocks(weekPlanId: string, projectId: string | undefined, dateISO: string, blocks: TimeBlock[]): ExecutionLog {
  const relevantBlocks = blocks.filter(
    (block) => !block.deleted && block.weekPlanId === weekPlanId && block.projectId === projectId && block.dateISO === dateISO
  )
  const plannedHours = relevantBlocks.reduce((total, block) => total + block.plannedHours, 0)
  const actualHours = relevantBlocks.reduce((total, block) => total + (block.actualHours ?? 0), 0)
  return {
    id: buildExecutionLogId(weekPlanId, projectId, dateISO),
    weekPlanId,
    projectId: projectId ?? "",
    dateISO,
    plannedHours,
    actualHours,
    deleted: plannedHours === 0 && actualHours === 0,
  }
}

export function emptyAllocation(priority: ProjectPriority = "P2"): WeeklyAllocation {
  return {
    projectId: "",
    hoursAllocated: 0,
    priority,
    weeklyOutcome: "",
  }
}

export function emptyWeeklyPlan(weekStartISO = getCurrentWeekStartISO()): WeeklyPlan {
  return {
    id: weekStartISO,
    weekStartISO,
    totalCapacityHours: DEFAULT_WEEKLY_CAPACITY_HOURS,
    allocations: [],
    status: "draft",
    deleted: false,
  }
}

export function getWeeklyReviewForPlan(reviews: WeeklyReview[], weekPlanId?: string) {
  if (!weekPlanId) return undefined
  return reviews.find((review) => !review.deleted && review.weekPlanId === weekPlanId)
}
