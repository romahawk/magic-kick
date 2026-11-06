import { beforeEach, describe, expect, it } from "vitest"
import { useAppStore } from "./store"
import { applyRemoteSnapshot } from "./sync/applyRemote"
import { ENTITY_COLLECTIONS } from "./db/types"
import type { RemoteSnapshot } from "./db/types"
import type { Task } from "./types"

const t = (id: string, order: number, over: Partial<Task> = {}): Task =>
  ({ id, title: id, category: "Work", completed: false, xpValue: 10, lane: "backlog", order, deleted: false, clientUpdatedAt: 100, ...over }) as Task

const remote = (tasks: Task[]): RemoteSnapshot => {
  const entities = Object.fromEntries(ENTITY_COLLECTIONS.map((name) => [name, []])) as unknown as RemoteSnapshot["entities"]
  return { profile: null, entities: { ...entities, tasks }, cursor: 0 }
}

describe("moving a task must not re-stamp the tasks it did not move", () => {
  beforeEach(() => {
    useAppStore.setState((s) => ({
      tasks: [t("A", 1), t("B", 2), t("C", 3), t("D", 4), t("E", 5)],
      sync: { ...s.sync, pending: { ...s.sync.pending, tasks: {} } },
    }))
  })

  it("reorderTasks stamps and queues only the tasks whose order changed", () => {
    useAppStore.getState().reorderTasks("A", "B") // A and B swap; C, D, E keep their order
    const { tasks, sync } = useAppStore.getState()
    const stamp = (id: string) => tasks.find((x) => x.id === id)!.clientUpdatedAt
    expect(stamp("A")).toBeGreaterThan(100)
    expect(stamp("B")).toBeGreaterThan(100)
    for (const id of ["C", "D", "E"]) expect(stamp(id)).toBe(100)
    expect(Object.keys(sync.pending.tasks).sort()).toEqual(["A", "B"])
  })

  it("moveTaskToLane stamps the moved task and only the tasks whose order changed", () => {
    useAppStore.getState().moveTaskToLane("E", "daily-focus") // last task moves lane; others keep their order
    const { tasks, sync } = useAppStore.getState()
    expect(tasks.find((x) => x.id === "E")!.lane).toBe("daily-focus")
    for (const id of ["A", "B", "C", "D"]) expect(tasks.find((x) => x.id === id)!.clientUpdatedAt).toBe(100)
    expect(Object.keys(sync.pending.tasks)).toEqual(["E"])
  })

  it("a stale device moving one task cannot bring back a task deleted elsewhere", () => {
    // Device B still shows D, which device A deleted at 500. B drags A below B.
    useAppStore.getState().reorderTasks("A", "B")
    const tombstone = t("D", 4, { deleted: true, clientUpdatedAt: 500 })
    applyRemoteSnapshot(remote([tombstone]))
    expect(useAppStore.getState().tasks.find((x) => x.id === "D")!.deleted).toBe(true)
  })
})
