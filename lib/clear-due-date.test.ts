import { beforeEach, describe, expect, it } from "vitest"
import { useAppStore } from "./store"
import type { Task } from "./types"

const dated = (over: Partial<Task> = {}): Task =>
  ({ id: "t1", title: "Dated", category: "Work", completed: false, xpValue: 10, lane: "daily-focus", order: 1, deleted: false, dueDate: "2026-11-06", repeat: "weekly", ...over }) as Task

// The call the ToDo row's "Remove due date" button makes.
const clearDate = () =>
  useAppStore.getState().updateTask("t1", { dueDate: undefined, repeat: "none", lane: "backlog" }, { clearTimeSlot: true })

describe("remove a task's due date in one click", () => {
  beforeEach(() => {
    useAppStore.setState({ tasks: [dated()], schedule: [], timeBlocks: [] })
  })

  it("drops the date and repeat and puts the task in the backlog", () => {
    clearDate()
    const task = useAppStore.getState().tasks.find((t) => t.id === "t1")!
    expect(task.dueDate).toBeUndefined()
    expect(task.repeat).toBe("none")
    expect(task.lane).toBe("backlog")
    expect(task.deleted).toBe(false)
    expect(task.completed).toBe(false)
  })

  it("leaves a task that is already in the backlog there, undated", () => {
    useAppStore.setState({ tasks: [dated({ lane: "backlog" })] })
    clearDate()
    const task = useAppStore.getState().tasks[0]
    expect(task.lane).toBe("backlog")
    expect(task.dueDate).toBeUndefined()
  })

  it("a date can be set again afterwards, and Undo restores the old values", () => {
    clearDate()
    useAppStore.getState().updateTask("t1", { dueDate: "2026-11-10" })
    expect(useAppStore.getState().tasks[0].dueDate).toBe("2026-11-10")
    useAppStore.getState().updateTask("t1", { dueDate: "2026-11-06", repeat: "weekly", lane: "daily-focus" })
    expect(useAppStore.getState().tasks[0]).toMatchObject({ dueDate: "2026-11-06", repeat: "weekly", lane: "daily-focus" })
  })
})
