import { describe, expect, it } from "vitest"
import type { CanonFeedResult } from "@/lib/os-feed/canon-parser"
import {
  MAX_CANDIDATES,
  buildUserContent,
  canonForFocus,
  createFocusLimiter,
  freeSlots,
  parseSuggestions,
  pickCandidates,
} from "./daily-focus"

const OUTCOMES = [
  { id: "canon:outcome:1", title: "Ship P19" },
  { id: "canon:outcome:2", title: "Land one client" },
]

describe("parseSuggestions", () => {
  const ctx = { taskIds: new Set(["t1", "t2", "t3", "t4"]), outcomes: OUTCOMES, slots: 3 }
  const run = (suggestions: unknown) => parseSuggestions(JSON.stringify({ suggestions }), ctx)

  it("keeps a valid item and adds the outcome title", () => {
    expect(run([{ taskId: "t1", outcomeId: "canon:outcome:1", reason: "Moves the ADR forward" }])).toEqual([
      { taskId: "t1", outcomeId: "canon:outcome:1", outcomeTitle: "Ship P19", reason: "Moves the ADR forward" },
    ])
  })
  it("drops unknown task ids and unknown outcome ids", () => {
    expect(
      run([
        { taskId: "ghost", outcomeId: "canon:outcome:1", reason: "x" },
        { taskId: "t1", outcomeId: "canon:outcome:9", reason: "x" },
        { taskId: "t2", outcomeId: "canon:outcome:2", reason: "ok" },
      ]).map((s) => s.taskId)
    ).toEqual(["t2"])
  })
  it("drops duplicates, empty and over-long reasons, and wrong shapes", () => {
    expect(
      run([
        { taskId: "t1", outcomeId: "canon:outcome:1", reason: "first" },
        { taskId: "t1", outcomeId: "canon:outcome:2", reason: "dup" },
        { taskId: "t2", outcomeId: "canon:outcome:1", reason: "   " },
        { taskId: "t3", outcomeId: "canon:outcome:1", reason: "x".repeat(121) },
        { taskId: 4, outcomeId: "canon:outcome:1", reason: "bad" },
        "nope",
      ]).map((s) => s.taskId)
    ).toEqual(["t1"])
  })
  it("keeps at most the slot count", () => {
    const items = ["t1", "t2", "t3", "t4"].map((taskId) => ({ taskId, outcomeId: "canon:outcome:1", reason: "r" }))
    expect(parseSuggestions(JSON.stringify({ suggestions: items }), { ...ctx, slots: 2 })).toHaveLength(2)
  })
  it("accepts a fenced JSON answer and gives an empty list for garbage", () => {
    const fenced = "```json\n" + JSON.stringify({ suggestions: [{ taskId: "t1", outcomeId: "canon:outcome:1", reason: "r" }] }) + "\n```"
    expect(parseSuggestions(fenced, ctx)).toHaveLength(1)
    expect(parseSuggestions("not json", ctx)).toEqual([])
    expect(parseSuggestions(JSON.stringify({ suggestions: "x" }), ctx)).toEqual([])
  })
})

describe("canonForFocus", () => {
  const base: CanonFeedResult = {
    ok: true, status: "ok", fetchedAt: "2026-11-04T08:00:00Z", packGenerated: "2026-11-04 09:00",
    reconciledWithGit: null, outcomes: OUTCOMES, allocation: [], warnings: [], stale: false,
  }
  it("runs on ok", () => {
    expect(canonForFocus(base)).toMatchObject({ usable: true, stale: false })
  })
  it("runs on a stale last-known copy and keeps its fetch time", () => {
    expect(canonForFocus({ ...base, ok: false, status: "error", stale: true })).toMatchObject({
      usable: true, stale: true, fetchedAt: "2026-11-04T08:00:00Z",
    })
  })
  it("is unavailable for missing, not-configured, error without a copy, and no outcomes", () => {
    for (const status of ["missing", "not-configured"] as const) {
      expect(canonForFocus({ ...base, ok: false, status, outcomes: [] })).toEqual({ usable: false })
    }
    expect(canonForFocus({ ...base, ok: false, status: "error", stale: false, outcomes: [] })).toEqual({ usable: false })
    expect(canonForFocus({ ...base, outcomes: [] })).toEqual({ usable: false })
  })
})

describe("pickCandidates", () => {
  const projects = [
    { id: "p-active", title: "Active" },
    { id: "p-paused", title: "Paused", status: "paused" },
    { id: "p-gone", title: "Gone", deleted: true },
  ]
  const tasks = [
    { id: "done", title: "done", completed: true },
    { id: "focus", title: "already", lane: "daily-focus" },
    { id: "paused", title: "paused", linkedProjectId: "p-paused" },
    { id: "gone", title: "gone", linkedProjectId: "p-gone" },
    { id: "unknown", title: "unknown", linkedProjectId: "nope" },
    { id: "later", title: "later", dueDate: "2026-11-20", lane: "backlog" },
    { id: "late", title: "late", dueDate: "2026-11-01", linkedProjectId: "p-active" },
    { id: "none", title: "no date" },
    { id: "soon", title: "soon", dueDate: "2026-11-05" },
  ]
  it("filters, then sorts overdue first, then due date, then undated", () => {
    expect(pickCandidates(tasks, projects, "2026-11-04").map((c) => c.id)).toEqual(["late", "soon", "later", "none"])
  })
  it("sends only id, title, project, due and lane, with the title cut to 120 characters", () => {
    const [c] = pickCandidates([{ id: "a", title: "x".repeat(300), notes: "SECRET", linkedProjectId: "p-active" } as never], projects, "2026-11-04")
    expect(Object.keys(c).sort()).toEqual(["dueDate", "id", "lane", "project", "title"])
    expect(c.title).toHaveLength(120)
    expect(c.project).toBe("Active")
    expect(buildUserContent(OUTCOMES, [c], 2)).not.toContain("SECRET")
  })
  it("caps the list at 60", () => {
    const many = Array.from({ length: 100 }, (_, i) => ({ id: `t${i}`, title: `t${i}` }))
    expect(pickCandidates(many, [], "2026-11-04")).toHaveLength(MAX_CANDIDATES)
  })
})

describe("freeSlots", () => {
  it("is the limit minus the lane, at most 3, never below 0", () => {
    const lane = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `l${i}`, title: "t", lane: "daily-focus" }))
    expect(freeSlots(lane(1), 3)).toBe(2)
    expect(freeSlots(lane(3), 3)).toBe(0)
    expect(freeSlots(lane(5), 3)).toBe(0)
    expect(freeSlots([], 7)).toBe(3)
  })
})

describe("createFocusLimiter", () => {
  it("allows one in flight per user and a daily cap, and resets on a new day", () => {
    let day = "2026-11-04"
    const limiter = createFocusLimiter(2, () => day)
    expect(limiter.start("u")).toBe("ok")
    expect(limiter.start("u")).toBe("busy")
    expect(limiter.start("other")).toBe("ok")
    limiter.finish("u")
    expect(limiter.start("u")).toBe("ok")
    limiter.finish("u")
    expect(limiter.start("u")).toBe("cap")
    day = "2026-11-05"
    expect(limiter.start("u")).toBe("ok")
  })
})
