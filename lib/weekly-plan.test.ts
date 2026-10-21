import { describe, expect, it } from "vitest"
import { selectAllocationProgress, type TaskTimeSlot } from "./weekly-plan"
import type { Task, TimeBlock, WeeklyPlan } from "./types"

const days = ["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25"]
const plan = {
  id: "plan",
  weekStartISO: "2026-10-19",
  totalCapacityHours: 25,
  status: "active",
  allocations: [
    { projectId: "p1", hoursAllocated: 6, priority: "P1", weeklyOutcome: "" },
    { projectId: "p2", hoursAllocated: 4, priority: "P2", weeklyOutcome: "" },
  ],
} as WeeklyPlan
const block = (id: string, dateISO: string, projectId: string | undefined, plannedHours: number, extra: Partial<TimeBlock> = {}) =>
  ({ id, weekPlanId: "plan", projectId, dateISO, startTime: "09:00", endTime: "10:00", taskDescription: id, plannedHours, status: "planned", deleted: false, ...extra }) as TimeBlock

describe("selectAllocationProgress (P28)", () => {
  it("sums the week's blocks per allocated project, done from actual hours", () => {
    const timeBlocks = [
      block("a", "2026-10-19", "p1", 2, { status: "done", actualHours: 1.5 }),
      block("b", "2026-10-21", "p1", 2),
      block("c", "2026-10-26", "p1", 3), // next week
      block("d", "2026-10-20", "p1", 1, { deleted: true }),
      block("e", "2026-10-20", "p3", 5), // not allocated
    ]
    expect(selectAllocationProgress({ plan, timeBlocks, tasks: [], taskTimeSlots: {}, dayISOList: days })).toEqual([
      { projectId: "p1", allocatedHours: 6, plannedHours: 4, doneHours: 1.5 },
      { projectId: "p2", allocatedHours: 4, plannedHours: 0, doneHours: 0 },
    ])
  })

  it("counts each occurrence of a recurring task once, not its saved block", () => {
    const task = {
      id: "gym", title: "Gym", category: "Health", completed: false, xpValue: 10, deleted: false,
      linkedProjectId: "p2", dueDate: "2026-10-19", repeat: "custom", recurrenceDays: [1, 3], recurrenceCompletedDates: ["2026-10-19"],
    } as unknown as Task
    const timeBlocks = [block("slot", "2026-10-19", "p2", 1, { linkedTaskId: "gym", status: "done", actualHours: 1 })]
    const taskTimeSlots: Record<string, TaskTimeSlot> = { gym: { startTime: "07:00", endTime: "08:00", plannedHours: 1, actualHours: 1, status: "done" } }
    const [, p2] = selectAllocationProgress({ plan, timeBlocks, tasks: [task], taskTimeSlots, dayISOList: days })
    // Monday and Wednesday: 2 planned, Monday done.
    expect(p2).toEqual({ projectId: "p2", allocatedHours: 4, plannedHours: 2, doneHours: 1 })
  })

  it("returns nothing without a plan", () => {
    expect(selectAllocationProgress({ plan: undefined, timeBlocks: [], tasks: [], taskTimeSlots: {}, dayISOList: days })).toEqual([])
  })
})
