import { describe, expect, it } from "vitest"
import { addDays, format } from "date-fns"
import { selectAttentionItems } from "./execution-os"
import { getCurrentWeekStartISO } from "./weekly-plan"
import type { Project, Task, WeeklyPlan } from "./types"

const inAMonth = format(addDays(new Date(), 30), "yyyy-MM-dd")
const project = (id: string): Project =>
  ({ id, title: "Project " + id, objective: "", status: "active", weekStartISO: "2026-01-05", weekEndISO: inAMonth, milestones: [], color: "" }) as Project
const plan = (outcomes: Record<string, string>): WeeklyPlan => ({
  id: "plan",
  weekStartISO: getCurrentWeekStartISO(),
  totalCapacityHours: 25,
  status: "active",
  allocations: Object.entries(outcomes).map(([projectId, weeklyOutcome]) => ({ projectId, hoursAllocated: 5, priority: "P1", weeklyOutcome })),
} as WeeklyPlan)
// Parking lot, so Daily Focus never suggests it (a suggested overdue task gets no attention row).
const overdue = { id: "late", title: "Late task", category: "Work", completed: false, xpValue: 10, dueDate: "2026-01-01", lane: "parking-lot" } as Task

function outcomeRows(projects: Project[], weeklyPlans: WeeklyPlan[], tasks: Task[] = []) {
  const result = selectAttentionItems({ projects, tasks, weeklyPlans })
  return { result, rows: result.items.filter((item) => item.kind === "outcome-missing") }
}

describe("selectAttentionItems: missing weekly outcomes (P20, CC-1)", () => {
  it("adds no row when every active project has an outcome", () => {
    const { rows } = outcomeRows([project("a"), project("b")], [plan({ a: "Ship", b: "Draft" })])
    expect(rows).toEqual([])
  })

  it("keeps one project's own row, with 'Set outcome'", () => {
    const { rows } = outcomeRows([project("a"), project("b")], [plan({ a: "Ship" })])
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ id: "outcome-missing:b", subject: "No weekly outcome — Project b" })
    expect(rows[0].actions).toEqual([{ label: "Set outcome", effect: { type: "open-tab", tab: "plan" } }])
  })

  it("groups four missing outcomes into one row naming three, '+1 more'", () => {
    const projects = ["a", "b", "c", "d"].map(project)
    const { rows } = outcomeRows(projects, [plan({})])
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      id: "outcome-missing",
      severity: "medium",
      subject: "Week not planned — 4 projects have no outcome",
      detail: "Project a · Project b · Project c · +1 more",
    })
    expect(rows[0].actions).toEqual([{ label: "Open Plan", effect: { type: "open-tab", tab: "plan" } }])
  })

  it("names every project when there are three or fewer, with no '+N more'", () => {
    const { rows } = outcomeRows(["a", "b"].map(project), [plan({})])
    expect(rows[0].detail).toBe("Project a · Project b")
  })

  it("leaves the plan-missing row unchanged when there is no plan", () => {
    const { result, rows } = outcomeRows(["a", "b"].map(project), [])
    expect(rows).toEqual([])
    expect(result.items.find((item) => item.kind === "plan-missing")).toMatchObject({
      id: "plan-missing",
      subject: "No plan for this week",
      detail: "2 active projects with no weekly outcome",
    })
  })

  it("counts the grouped row once in the total, next to the other rows", () => {
    const projects = ["a", "b", "c", "d"].map(project)
    const { result } = outcomeRows(projects, [plan({})], [overdue])
    // overdue task, the grouped outcome row, and the load row (4 active projects over the limit of 3)
    expect(result.items.map((item) => item.kind)).toEqual(["task-overdue", "outcome-missing", "load"])
    expect(result.total).toBe(3)
  })
})
