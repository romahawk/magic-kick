import { describe, expect, it } from "vitest"
import { isPlanningFocus, selectNextMilestoneByProject } from "./roadmap"
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
