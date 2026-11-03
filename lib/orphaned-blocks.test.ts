import { beforeEach, describe, expect, it } from "vitest"
import { useAppStore } from "./store"
import { isOrphanedBlock, selectAllocationProgress, selectDayAgenda } from "./weekly-plan"
import type { Task, TimeBlock, WeeklyPlan } from "./types"

const task = (id: string, extra: Partial<Task> = {}) =>
  ({ id, title: id, category: "Work", completed: false, xpValue: 10, lane: "backlog", order: 1, deleted: false, ...extra }) as Task
const block = (id: string, linkedTaskId: string | undefined, extra: Partial<TimeBlock> = {}) =>
  ({
    id, weekPlanId: "plan", projectId: "p1", dateISO: "2026-11-04", startTime: "11:00", endTime: "12:00",
    taskDescription: id, plannedHours: 1, status: "planned", deleted: false, linkedTaskId, ...extra,
  }) as TimeBlock
const plan = {
  id: "plan", weekStartISO: "2026-11-02", totalCapacityHours: 25, status: "active",
  allocations: [{ projectId: "p1", hoursAllocated: 6, priority: "P1", weeklyOutcome: "" }],
} as WeeklyPlan

describe("orphaned time blocks", () => {
  beforeEach(() => {
    useAppStore.setState((s) => ({
      tasks: [task("call"), task("other")],
      timeBlocks: [block("b-call", "call"), block("b-other", "other"), block("b-own", undefined)],
      sync: { ...s.sync, pending: { ...s.sync.pending, tasks: {}, timeBlocks: {} } },
    }))
  })

  describe("deleteTask / restoreTask", () => {
    it("deletes the task's blocks with it and leaves other blocks alone", () => {
      useAppStore.getState().deleteTask("call")
      const { timeBlocks, sync } = useAppStore.getState()
      expect(timeBlocks.find((b) => b.id === "b-call")?.deleted).toBe(true)
      expect(timeBlocks.find((b) => b.id === "b-other")?.deleted).toBe(false)
      expect(timeBlocks.find((b) => b.id === "b-own")?.deleted).toBe(false)
      expect(Object.keys(sync.pending.timeBlocks)).toEqual(["b-call"])
    })

    it("brings the blocks back on Undo, but not a block that was already deleted", () => {
      useAppStore.setState((s) => ({
        timeBlocks: [...s.timeBlocks, block("b-gone", "call", { deleted: true, clientUpdatedAt: 1 })],
      }))
      useAppStore.getState().deleteTask("call")
      useAppStore.getState().restoreTask("call")
      const { timeBlocks, sync } = useAppStore.getState()
      expect(timeBlocks.find((b) => b.id === "b-call")?.deleted).toBe(false)
      expect(timeBlocks.find((b) => b.id === "b-gone")?.deleted).toBe(true)
      expect(sync.pending.timeBlocks["b-call"]).toBeTypeOf("number")
    })
  })

  describe("blocks whose task is already gone", () => {
    const live = new Set(["other"])

    it("flags a block with a missing task, never a block without one", () => {
      expect(isOrphanedBlock({ linkedTaskId: "call" }, live)).toBe(true)
      expect(isOrphanedBlock({ linkedTaskId: "other" }, live)).toBe(false)
      expect(isOrphanedBlock({ linkedTaskId: undefined }, live)).toBe(false)
    })

    it("leaves them out of the day agenda (Command Center, Close day)", () => {
      const agenda = selectDayAgenda({
        timeBlocks: [block("b-call", "call"), block("b-other", "other"), block("b-own", undefined)],
        tasks: [task("other"), task("call", { deleted: true })],
        taskTimeSlots: {},
        dateISO: "2026-11-04",
      })
      expect(agenda.map((entry) => entry.id).sort()).toEqual(["b-other", "b-own"])
    })

    it("does not count them in the week's allocation hours", () => {
      const [p1] = selectAllocationProgress({
        plan,
        timeBlocks: [block("b-call", "call"), block("b-other", "other")],
        tasks: [task("other")],
        taskTimeSlots: {},
        dayISOList: ["2026-11-04"],
      })
      expect(p1.plannedHours).toBe(1)
    })
  })
})
