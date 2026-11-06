import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useAppStore } from "@/lib/store"
import { applyRemoteSnapshot } from "./applyRemote"
import { ENTITY_COLLECTIONS } from "@/lib/db/types"
import type { RemoteSnapshot } from "@/lib/db/types"
import type { Task } from "@/lib/types"

const task = (over: Partial<Task> = {}): Task =>
  ({ id: "t1", title: "Basketball", category: "Work", completed: false, xpValue: 10, lane: "backlog", order: 1, deleted: false, clientUpdatedAt: 100, ...over }) as Task

const snapshot = (tasks: Task[]): RemoteSnapshot => {
  const entities = Object.fromEntries(ENTITY_COLLECTIONS.map((name) => [name, []])) as unknown as RemoteSnapshot["entities"]
  return { profile: null, entities: { ...entities, tasks }, cursor: 0 }
}

describe("a delete must survive sync", () => {
  beforeEach(() => {
    useAppStore.setState((s) => ({ tasks: [task()], sync: { ...s.sync, pending: { ...s.sync.pending, tasks: {} } } }))
  })
  afterEach(() => vi.restoreAllMocks())

  it("clearPending keeps a change made after the push was built", () => {
    useAppStore.getState().deleteTask("t1") // stamps pending with the delete time
    const deleteStamp = useAppStore.getState().sync.pending.tasks.t1
    // A push built from an older stamp finishes: the newer delete must stay pending.
    useAppStore.getState().clearPending([{ collection: "tasks", id: "t1", stamp: deleteStamp - 1 }])
    expect(useAppStore.getState().sync.pending.tasks.t1).toBe(deleteStamp)
    // The push of the delete itself clears it.
    useAppStore.getState().clearPending([{ collection: "tasks", id: "t1", stamp: deleteStamp }])
    expect(useAppStore.getState().sync.pending.tasks.t1).toBeUndefined()
  })

  it("clearPending without a stamp clears as before", () => {
    useAppStore.getState().deleteTask("t1")
    useAppStore.getState().clearPending([{ collection: "tasks", id: "t1" }])
    expect(useAppStore.getState().sync.pending.tasks.t1).toBeUndefined()
  })

  it("an older server copy does not bring back a locally deleted task", () => {
    useAppStore.getState().deleteTask("t1")
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    applyRemoteSnapshot(snapshot([task({ clientUpdatedAt: 100 })]))
    expect(useAppStore.getState().tasks[0].deleted).toBe(true)
    expect(warn).not.toHaveBeenCalled()
  })

  it("a newer server copy wins, and the console names the task and both timestamps", () => {
    useAppStore.getState().deleteTask("t1")
    const localStamp = useAppStore.getState().tasks[0].clientUpdatedAt!
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    applyRemoteSnapshot(snapshot([task({ clientUpdatedAt: localStamp + 5000 })]))
    expect(useAppStore.getState().tasks[0].deleted).toBe(false)
    expect(warn).toHaveBeenCalledTimes(1)
    const message = String(warn.mock.calls[0][0])
    expect(message).toContain("Basketball")
    expect(message).toContain(String(localStamp))
    expect(message).toContain(String(localStamp + 5000))
  })
})
