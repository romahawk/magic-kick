import { addDays, format, parseISO, startOfWeek } from "date-fns"
import { isRecurringTask, isTaskOccurrenceComplete, taskRepeatsOnDate } from "@/lib/task-recurrence"
import type {
  ExecutionLog,
  ExternalCalendarBlock,
  Project,
  ProjectPriority,
  ScheduleItem,
  Task,
  TimeBlock,
  TimeBlockStatus,
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

/** Last week's plan while it still needs a review: it has allocations and is not `reviewed`. */
export function selectWeekAwaitingReview(plans: WeeklyPlan[], now = new Date()) {
  const plan = findWeeklyPlanForWeek(plans, getCurrentWeekStartISO(addDays(now, -7)))
  return plan && plan.allocations.length > 0 && plan.status !== "reviewed" ? plan : undefined
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

/** Today in local time. `toISOString()` is UTC and gives yesterday's date after midnight in Europe. */
export function localDateISO(date = new Date()) {
  return format(date, "yyyy-MM-dd")
}

export type TaskTimeSlot = {
  startTime: string
  endTime: string
  plannedHours: number
  actualHours?: number
  status: TimeBlockStatus
}

/**
 * The one answer to "when is this task?" for every Execution tab. A task's time block wins over
 * its schedule item, since the calendar draws the block.
 */
export function selectTaskTimeSlots(scheduleItems: ScheduleItem[], timeBlocks: TimeBlock[]) {
  const map: Record<string, TaskTimeSlot> = {}
  for (const item of scheduleItems) {
    if (!item.deleted && item.linkedTaskId && item.hasExplicitTime) {
      map[item.linkedTaskId] = {
        startTime: item.startISO.slice(11, 16),
        endTime: item.endISO.slice(11, 16),
        plannedHours: 0,
        status: "planned",
      }
    }
  }
  for (const block of timeBlocks) {
    if (!block.deleted && block.linkedTaskId) {
      map[block.linkedTaskId] = {
        startTime: block.startTime,
        endTime: block.endTime,
        plannedHours: block.plannedHours,
        actualHours: block.actualHours,
        status: block.status,
      }
    }
  }
  return map
}

export type DayAgendaEntry = {
  id: string
  linkedTaskId?: string
  projectId?: string
  startTime: string
  endTime: string
  title: string
  status: TimeBlockStatus
}

/**
 * What the Schedule calendar shows on one day, as a list: the day's time blocks (by date, whatever
 * week plan they belong to) and the occurrences of recurring tasks. A block of a recurring task is
 * skipped, because the occurrence stands for it, so a task is never listed twice.
 */
export function selectDayAgenda(input: {
  timeBlocks: TimeBlock[]
  tasks: Task[]
  taskTimeSlots: Record<string, TaskTimeSlot>
  dateISO: string
}): DayAgendaEntry[] {
  const taskById = new Map(input.tasks.filter((task) => !task.deleted).map((task) => [task.id, task]))
  const entries: DayAgendaEntry[] = []

  for (const block of input.timeBlocks) {
    if (block.deleted || block.dateISO !== input.dateISO) continue
    const task = block.linkedTaskId ? taskById.get(block.linkedTaskId) : undefined
    if (task && isRecurringTask(task)) continue
    entries.push({
      id: block.id,
      linkedTaskId: block.linkedTaskId,
      projectId: block.projectId,
      startTime: block.startTime,
      endTime: block.endTime,
      title: task?.title ?? block.taskDescription,
      status: block.status,
    })
  }

  for (const task of taskById.values()) {
    if (task.completed || !isRecurringTask(task) || !taskRepeatsOnDate(task, input.dateISO)) continue
    const slot = input.taskTimeSlots[task.id]
    if (!slot) continue
    entries.push({
      id: `recurring-${task.id}-${input.dateISO}`,
      linkedTaskId: task.id,
      projectId: task.linkedProjectId,
      startTime: slot.startTime,
      endTime: slot.endTime,
      title: task.title,
      status: isTaskOccurrenceComplete(task, input.dateISO) ? "done" : "planned",
    })
  }

  return entries.sort((a, b) => a.startTime.localeCompare(b.startTime))
}

/**
 * P18: Daily Focus as the day plan. Tasks with a time today come first, earliest start first; the
 * rest keep their manual order. The Command Center and ToDo's "Manual order" both use this.
 */
export function orderDailyFocusTasks<T extends Pick<Task, "id" | "order" | "dueDate">>(
  tasks: T[],
  taskTimeSlots: Record<string, TaskTimeSlot>,
  todayISO = localDateISO()
) {
  const startToday = (task: T) => (task.dueDate === todayISO ? taskTimeSlots[task.id]?.startTime : undefined)
  return [...tasks].sort((a, b) => {
    const aStart = startToday(a)
    const bStart = startToday(b)
    if (aStart && bStart) return aStart.localeCompare(bStart)
    if (aStart) return -1
    if (bStart) return 1
    return (a.order ?? 0) - (b.order ?? 0)
  })
}

// "Next free slot" (P16) looks inside these hours, not the whole calendar, so a task never lands at 05:00.
const SLOT_SNAP_MIN = 15
const NEXT_SLOT_START_HOUR = 8
const NEXT_SLOT_END_HOUR = 20
export const NEXT_SLOT_SEARCH_DAYS = 14
// An all-day calendar event fills the calendar's whole visible day.
const CALENDAR_DAY_START_MIN = 5 * 60
const CALENDAR_DAY_END_MIN = 23 * 60

function minutesOf(time: string) {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + m
}

export function timeOfMinutes(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`
}

/** Length of the block a task gets when it is placed on the calendar. */
export function taskDurationMin(task: Pick<Task, "estimateMin">) {
  return Math.max(SLOT_SNAP_MIN, task.estimateMin ?? 60)
}

/** Start and end of an external calendar event on one day, or null when it is not on that day. */
export function externalBlockDateParts(block: ExternalCalendarBlock, dateISO: string) {
  if (block.allDay) {
    if (block.startISO?.slice(0, 10) !== dateISO) return null
    return { dateISO, startTime: timeOfMinutes(CALENDAR_DAY_START_MIN), endTime: timeOfMinutes(CALENDAR_DAY_END_MIN) }
  }
  if (!block.startISO || !block.endISO) return null
  try {
    const start = parseISO(block.startISO)
    const end = parseISO(block.endISO)
    const blockDateISO = format(start, "yyyy-MM-dd")
    if (blockDateISO !== dateISO) return null
    return { dateISO: blockDateISO, startTime: format(start, "HH:mm"), endTime: format(end, "HH:mm") }
  } catch {
    return null
  }
}

/**
 * The first gap of `durationMin` between 08:00 and 20:00, from now, over the next 14 days. Time
 * blocks, recurring tasks and busy calendar events count as taken.
 */
export function findNextFreeSlot(input: {
  durationMin: number
  timeBlocks: TimeBlock[]
  tasks: Task[]
  taskTimeSlots: Record<string, TaskTimeSlot>
  externalCalendarBlocks: ExternalCalendarBlock[]
  now?: Date
}) {
  const now = input.now ?? new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()

  function busyIntervalsOn(dateISO: string) {
    const intervals: Array<[number, number]> = []
    for (const block of input.timeBlocks) {
      if (!block.deleted && block.dateISO === dateISO) intervals.push([minutesOf(block.startTime), minutesOf(block.endTime)])
    }
    for (const task of input.tasks) {
      const slot = input.taskTimeSlots[task.id]
      if (slot && !task.deleted && !task.completed && isRecurringTask(task) && taskRepeatsOnDate(task, dateISO)) {
        intervals.push([minutesOf(slot.startTime), minutesOf(slot.endTime)])
      }
    }
    for (const block of input.externalCalendarBlocks) {
      if (block.deleted || block.status === "cancelled" || !block.blocksTime) continue
      const parts = externalBlockDateParts(block, dateISO)
      if (parts) intervals.push([minutesOf(parts.startTime), minutesOf(parts.endTime)])
    }
    return intervals.sort((a, b) => a[0] - b[0])
  }

  for (let offset = 0; offset < NEXT_SLOT_SEARCH_DAYS; offset++) {
    const dateISO = format(addDays(now, offset), "yyyy-MM-dd")
    let start = NEXT_SLOT_START_HOUR * 60
    if (offset === 0) start = Math.max(start, Math.ceil(nowMin / SLOT_SNAP_MIN) * SLOT_SNAP_MIN)
    for (const [busyStart, busyEnd] of busyIntervalsOn(dateISO)) {
      if (busyStart >= start + input.durationMin) break
      if (busyEnd > start) start = Math.ceil(busyEnd / SLOT_SNAP_MIN) * SLOT_SNAP_MIN
    }
    if (start + input.durationMin <= NEXT_SLOT_END_HOUR * 60) {
      return { dateISO, startTime: timeOfMinutes(start), endTime: timeOfMinutes(start + input.durationMin) }
    }
  }
  return null
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

/** One occurrence of a recurring task, with the hours Schedule draws for it. */
export function recurringOccurrenceHours(task: Pick<Task, "recurrenceCompletedDates">, slot: TaskTimeSlot, dateISO: string) {
  const done = isTaskOccurrenceComplete(task, dateISO)
  return {
    done,
    plannedHours: slot.plannedHours || calculateTimeBlockHours(slot.startTime, slot.endTime),
    actualHours: done ? slot.actualHours ?? slot.plannedHours ?? calculateTimeBlockHours(slot.startTime, slot.endTime) : undefined,
  }
}

export interface AllocationProgress {
  projectId: string
  allocatedHours: number
  /** Hours on the week's calendar for the project. */
  plannedHours: number
  /** Actual hours of those blocks. */
  doneHours: number
}

/**
 * P28: hours per allocated project for one week, the same on Schedule, ToDo and the Command Center.
 * The blocks are the ones Schedule draws for the week: saved time blocks (except those of recurring
 * tasks) and each occurrence of a recurring task with a time slot. Done is their actual hours, which
 * is also what the week's execution logs add up.
 */
export function selectAllocationProgress(input: {
  plan?: WeeklyPlan
  timeBlocks: TimeBlock[]
  tasks: Task[]
  taskTimeSlots: Record<string, TaskTimeSlot>
  dayISOList: string[]
}): AllocationProgress[] {
  if (!input.plan) return []
  const live = input.tasks.filter((task) => !task.deleted)
  const recurringIds = new Set(live.filter((task) => isRecurringTask(task)).map((task) => task.id))
  const hours: Array<{ projectId?: string; planned: number; done: number }> = []
  for (const block of selectTimeBlocksForDates(input.timeBlocks, input.dayISOList)) {
    if (block.linkedTaskId && recurringIds.has(block.linkedTaskId)) continue
    hours.push({ projectId: block.projectId, planned: block.plannedHours, done: block.actualHours ?? 0 })
  }
  for (const task of live) {
    const slot = input.taskTimeSlots[task.id]
    if (task.completed || !task.linkedProjectId || !slot || !recurringIds.has(task.id)) continue
    for (const dateISO of input.dayISOList) {
      if (!taskRepeatsOnDate(task, dateISO)) continue
      const occurrence = recurringOccurrenceHours(task, slot, dateISO)
      hours.push({ projectId: task.linkedProjectId, planned: occurrence.plannedHours, done: occurrence.actualHours ?? 0 })
    }
  }
  return input.plan.allocations.map((allocation) => {
    const own = hours.filter((entry) => entry.projectId === allocation.projectId)
    return {
      projectId: allocation.projectId,
      allocatedHours: allocation.hoursAllocated,
      plannedHours: own.reduce((total, entry) => total + entry.planned, 0),
      doneHours: own.reduce((total, entry) => total + entry.done, 0),
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
