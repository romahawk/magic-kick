import { describe, expect, it } from "vitest"
import { berlinDateISO, parseDailyPlan, selectUnmatchedPlanTasks } from "./plan-parser"
import type { Task } from "../types"

const EXAMPLE = `---
type: daily-plan
date: 2026-10-14
source: vincent
version: 1
---

# Plan 2026-10-14

## Tasks
- [ ] Job search: submit Veeva application | project: Job search | start: 09:00 | end: 10:30 | due: 2026-10-14
- [ ] Portfolio: review /ai PR on ai-page-fixes | project: Portfolio website update | start: 11:00 | end: 11:45 | due: 2026-10-14
- [ ] Record PR-vs-main DEC in AI-OS | project: AI-OS optimisation | due: 2026-10-15
`

describe("parseDailyPlan", () => {
  it("parses the documented example", () => {
    const plan = parseDailyPlan(EXAMPLE)
    expect(plan.date).toBe("2026-10-14")
    expect(plan.source).toBe("vincent")
    expect(plan.warnings).toEqual([])
    expect(plan.tasks).toHaveLength(3)
    expect(plan.tasks[0]).toEqual({
      id: "plan:2026-10-14:job-search-submit-veeva-application",
      title: "Job search: submit Veeva application",
      project: "Job search",
      start: "09:00",
      end: "10:30",
      due: "2026-10-14",
      done: false,
    })
    expect(plan.tasks[2]).toMatchObject({ project: "AI-OS optimisation", due: "2026-10-15" })
    expect(plan.tasks[2].start).toBeUndefined()
  })

  it("reads tasks without front matter, with a warning", () => {
    const plan = parseDailyPlan("## Tasks\n- [ ] Write README | project: Magic Kick\n")
    expect(plan.date).toBeNull()
    expect(plan.source).toBeNull()
    expect(plan.tasks).toHaveLength(1)
    expect(plan.tasks[0].id).toBe("plan:undated:write-readme")
    expect(plan.warnings.some((w) => w.includes("front matter"))).toBe(true)
  })

  it("skips a task without a project", () => {
    const plan = parseDailyPlan(EXAMPLE.replace(" | project: Job search", ""))
    expect(plan.tasks).toHaveLength(2)
    expect(plan.warnings).toEqual(['Skipped "Job search: submit Veeva application": no project.'])
  })

  it("reads [x] as done", () => {
    const plan = parseDailyPlan(EXAMPLE.replace("- [ ] Record", "- [x] Record"))
    expect(plan.tasks.map((task) => task.done)).toEqual([false, false, true])
  })

  it("ignores unknown keys", () => {
    const plan = parseDailyPlan(EXAMPLE.replace("| due: 2026-10-15", "| due: 2026-10-15 | energy: high | owner: RM"))
    expect(plan.warnings).toEqual([])
    expect(plan.tasks[2]).not.toHaveProperty("energy")
  })

  it("handles Windows line endings", () => {
    const plan = parseDailyPlan(EXAMPLE.replace(/\n/g, "\r\n"))
    expect(plan.date).toBe("2026-10-14")
    expect(plan.tasks).toHaveLength(3)
    expect(plan.tasks[1].end).toBe("11:45")
  })

  it("returns no tasks for an empty task list", () => {
    const plan = parseDailyPlan(EXAMPLE.split("## Tasks")[0] + "## Tasks\n\n")
    expect(plan.tasks).toEqual([])
    expect(plan.warnings).toEqual([])
  })

  it("drops a malformed time and keeps the task", () => {
    const plan = parseDailyPlan(EXAMPLE.replace("start: 09:00", "start: 9am"))
    expect(plan.tasks[0].start).toBeUndefined()
    expect(plan.tasks[0].end).toBe("10:30")
    expect(plan.warnings).toHaveLength(1)
  })
})

describe("berlinDateISO", () => {
  it("uses the Berlin date around midnight UTC", () => {
    // 23:30 UTC on 14 Oct is 01:30 on 15 Oct in Berlin (CEST, UTC+2).
    expect(berlinDateISO(new Date("2026-10-14T23:30:00Z"))).toBe("2026-10-15")
    // 21:30 UTC on 14 Oct is 23:30 on 14 Oct in Berlin.
    expect(berlinDateISO(new Date("2026-10-14T21:30:00Z"))).toBe("2026-10-14")
    // Winter time (CET, UTC+1): 23:30 UTC on 14 Dec is 00:30 on 15 Dec.
    expect(berlinDateISO(new Date("2026-12-14T23:30:00Z"))).toBe("2026-12-15")
  })
})

describe("selectUnmatchedPlanTasks", () => {
  const planTasks = parseDailyPlan(EXAMPLE).tasks
  const task = (patch: Partial<Task>): Task =>
    ({ id: "t", title: "Other", category: "Work", completed: false, xpValue: 10, ...patch }) as Task

  it("hides a plan task whose title is already a task, ignoring case and spaces", () => {
    const left = selectUnmatchedPlanTasks(planTasks, [task({ title: "  job search:  SUBMIT veeva application " })])
    expect(left.map((t) => t.title)).not.toContain("Job search: submit Veeva application")
    expect(left).toHaveLength(2)
  })

  it("hides a plan task an agent already wrote, by sourceId", () => {
    const left = selectUnmatchedPlanTasks(planTasks, [task({ source: "agent", sourceId: planTasks[1].id })])
    expect(left).toHaveLength(2)
  })

  it("keeps a plan task whose matching task is deleted", () => {
    const left = selectUnmatchedPlanTasks(planTasks, [task({ title: "Record PR-vs-main DEC in AI-OS", deleted: true })])
    expect(left).toHaveLength(3)
  })
})
