import { beforeEach, describe, expect, it } from "vitest"
import { useAppStore } from "@/lib/store"
import { buildPendingWrites, fieldsToClear } from "./diff"
import type { Task } from "@/lib/types"

const task = (over: Partial<Task> = {}): Task =>
  ({ id: "t1", title: "Basketball", category: "Work", completed: false, xpValue: 10, lane: "backlog", order: 1, deleted: false, clientUpdatedAt: 100, dueDate: "2026-10-27", ...over }) as Task

describe("a cleared field must reach the server", () => {
  beforeEach(() => {
    useAppStore.setState((s) => ({ tasks: [task()], schedule: [], timeBlocks: [], sync: { ...s.sync, pending: { ...s.sync.pending, tasks: {}, schedule: {}, timeBlocks: {} } } }))
  })

  it("removing a due date queues a deletion of dueDate (merge alone would keep the old one)", () => {
    useAppStore.getState().updateTask("t1", { dueDate: undefined, repeat: "none" }, { clearTimeSlot: true })
    const write = buildPendingWrites(useAppStore.getState()).find((w) => w.collection === "tasks" && w.id === "t1")
    expect(write?.clear).toContain("dueDate")
  })

  it("a task that lost its dueDate key (after a reload from local storage) still clears it", () => {
    const { dueDate: _gone, ...withoutKey } = task()
    expect(fieldsToClear("tasks", { ...withoutKey })).toContain("dueDate")
  })

  it("a field the task still has is not cleared", () => {
    expect(fieldsToClear("tasks", { ...task() })).not.toContain("dueDate")
  })
})
