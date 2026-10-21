import { describe, expect, it } from "vitest"
import { isPlanningFocus, selectNextMilestoneByProject, selectTasks } from "./roadmap"
import type { ProjectMilestone } from "./types"

function milestone(id: string, order: number, completed = false): ProjectMilestone {
  return { id, title: id, dayIndex: 0, order, completed } as ProjectMilestone
}

describe("selectNextMilestoneByProject", () => {
  it("maps each project to its first open milestone in roadmap order", () => {
    const map = selectNextMilestoneByProject([
      { id: "p1", milestones: [milestone("b", 2), milestone("a", 1, true), milestone("c", 3)] },
      { id: "p2", milestones: [milestone("x", 1, true)] },
      { id: "p3", milestones: undefined as unknown as ProjectMilestone[] },
    ])
    expect(map.get("p1")).toBe("b")
    expect(map.has("p2")).toBe(false)
    expect(map.has("p3")).toBe(false)
  })
})

describe("isPlanningFocus", () => {
  const weekEnd = "2026-10-25"
  const next = new Map([["p1", "m-next"]])

  it("includes the Daily Focus lane", () => {
    expect(isPlanningFocus({ lane: "daily-focus" }, weekEnd, next)).toBe(true)
  })

  it("includes tasks due by the end of the shown week, overdue too", () => {
    expect(isPlanningFocus({ dueDate: "2026-10-25" }, weekEnd, next)).toBe(true)
    expect(isPlanningFocus({ dueDate: "2026-09-01" }, weekEnd, next)).toBe(true)
    expect(isPlanningFocus({ dueDate: "2026-10-26" }, weekEnd, next)).toBe(false)
  })

  it("includes project tasks in the Next milestone only", () => {
    expect(isPlanningFocus({ linkedProjectId: "p1", milestoneId: "m-next" }, weekEnd, next)).toBe(true)
    expect(isPlanningFocus({ linkedProjectId: "p1", milestoneId: "m-later" }, weekEnd, next)).toBe(false)
    expect(isPlanningFocus({ linkedProjectId: "p1", milestoneId: "" }, weekEnd, next)).toBe(false)
  })

  it("leaves undated backlog and parking-lot tasks out", () => {
    expect(isPlanningFocus({}, weekEnd, next)).toBe(false)
    expect(isPlanningFocus({ lane: "backlog" }, weekEnd, next)).toBe(false)
    expect(isPlanningFocus({ lane: "parking-lot" }, weekEnd, next)).toBe(false)
  })
})

describe("selectTasks", () => {
  const order = ["a", "b", "c", "d", "e"]

  it("toggles one task on a plain click", () => {
    expect(selectTasks(order, [], null, "b", false)).toEqual(["b"])
    expect(selectTasks(order, ["b", "c"], "c", "b", false)).toEqual(["c"])
  })

  it("adds the shown range between the anchor and the target, in either direction", () => {
    expect(selectTasks(order, ["b"], "b", "d", true).sort()).toEqual(["b", "c", "d"])
    expect(selectTasks(order, ["d"], "d", "a", true).sort()).toEqual(["a", "b", "c", "d"])
  })

  it("never deselects with a range", () => {
    expect(selectTasks(order, ["a", "c", "e"], "c", "d", true).sort()).toEqual(["a", "c", "d", "e"])
  })

  it("falls back to a toggle when the anchor is not shown", () => {
    expect(selectTasks(order, ["x"], "x", "c", true).sort()).toEqual(["c", "x"])
    expect(selectTasks(order, [], null, "c", true)).toEqual(["c"])
  })
})
