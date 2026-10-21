import { describe, expect, it } from "vitest"
import { buildProjectRows, countByProject, countCategories, filterByProject, resolveProjectFilter } from "./unscheduled-filter"

const listed = new Set(["p1", "p2"])
const active = new Set(["p1", "p2", "p3"])
const tasks = [
  { id: "a", linkedProjectId: "p1" },
  { id: "b", linkedProjectId: "p1" },
  { id: "c", linkedProjectId: "p2" },
  { id: "d", linkedProjectId: "p3" },
  { id: "e" },
  { id: "f", linkedProjectId: "gone" },
]
const ids = (list: { id: string }[]) => list.map((t) => t.id)

describe("filterByProject", () => {
  it("keeps every task for all", () => {
    expect(ids(filterByProject(tasks, "all", listed, active))).toEqual(["a", "b", "c", "d", "e", "f"])
  })

  it("keeps one listed project's tasks", () => {
    expect(ids(filterByProject(tasks, "p1", listed, active))).toEqual(["a", "b"])
  })

  it("keeps active projects that are not listed under other", () => {
    expect(ids(filterByProject(tasks, "other", listed, active))).toEqual(["d"])
  })

  it("keeps tasks without a usable project under none", () => {
    expect(ids(filterByProject(tasks, "none", listed, active))).toEqual(["e", "f"])
  })

  it("matches nothing for a stale id", () => {
    expect(filterByProject(tasks, "gone", listed, active)).toEqual([])
  })
})

describe("countByProject", () => {
  it("counts each bucket and the total, matching filterByProject", () => {
    const counts = countByProject(tasks, listed, active)
    expect(Object.fromEntries(counts)).toEqual({ all: 6, p1: 2, p2: 1, other: 1, none: 2 })
    for (const key of ["p1", "p2", "other", "none"]) {
      expect(filterByProject(tasks, key, listed, active).length).toBe(counts.get(key))
    }
  })

  it("puts every active project task under its own id when all are listed (no plan)", () => {
    expect(Object.fromEntries(countByProject(tasks, active, active))).toEqual({ all: 6, p1: 2, p2: 1, p3: 1, none: 2 })
  })
})

describe("resolveProjectFilter", () => {
  it("keeps all, other, none and listed ids", () => {
    expect(resolveProjectFilter("all", listed)).toBe("all")
    expect(resolveProjectFilter("other", listed)).toBe("other")
    expect(resolveProjectFilter("none", listed)).toBe("none")
    expect(resolveProjectFilter("p2", listed)).toBe("p2")
  })

  it("falls back to all for a stale or missing id", () => {
    expect(resolveProjectFilter("p3", listed)).toBe("all")
    expect(resolveProjectFilter(null, listed)).toBe("all")
    expect(resolveProjectFilter(undefined, listed)).toBe("all")
  })
})

describe("buildProjectRows", () => {
  const projects = [
    { id: "p1", title: "One", color: "#111111" },
    { id: "p2", title: "Two" },
  ]
  const color = (c: string | undefined) => c ?? "#000000"
  const keys = (rows: { key: string }[]) => rows.map((r) => r.key)

  it("lists all, projects with tasks, then other and none when they have tasks", () => {
    const counts = new Map([["all", 4], ["p1", 2], ["none", 2]])
    expect(keys(buildProjectRows(projects, [], counts, "all", color))).toEqual(["all", "p1", "none"])
  })

  it("keeps an allocated project at 0 and carries its allocation", () => {
    const rows = buildProjectRows(projects, [{ projectId: "p2", allocatedHours: 4, plannedHours: 1, doneHours: 0 }], new Map([["all", 0]]), "all", color)
    expect(keys(rows)).toEqual(["all", "p2"])
    expect(rows[1].allocation?.allocatedHours).toBe(4)
  })

  it("keeps the selected row even at 0", () => {
    expect(keys(buildProjectRows(projects, [], new Map([["all", 0]]), "other", color))).toEqual(["all", "other"])
  })
})

describe("countCategories", () => {
  it("follows the shared order and appends unknown categories", () => {
    const tasks = [{ category: "B" }, { category: "Z" }, { category: "A" }, { category: "B" }]
    expect(countCategories(tasks, ["A", "B", "C"])).toEqual([
      { name: "A", count: 1 },
      { name: "B", count: 2 },
      { name: "Z", count: 1 },
    ])
  })
})
