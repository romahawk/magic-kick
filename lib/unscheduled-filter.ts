// P26: the Schedule panel's project filter, shared with ToDo (P28). Pure functions, no store access.
// A task falls in one bucket: a listed project's id (the week's allocations, or every active
// project when there is no plan), "other" (an active project that is not listed) or "none".

import type { Task } from "./types"

/** "all", a listed project id, "other" or "none". */
export type ProjectFilter = string

export interface ProjectAllocation {
  projectId: string
  allocatedHours: number
  plannedHours: number
}

type Ids = ReadonlySet<string>

export function projectBucket(task: Pick<Task, "linkedProjectId">, listedIds: Ids, activeProjectIds: Ids): string {
  const id = task.linkedProjectId
  if (!id || !activeProjectIds.has(id)) return "none"
  return listedIds.has(id) ? id : "other"
}

export function filterByProject<T extends Pick<Task, "linkedProjectId">>(
  tasks: T[],
  filter: ProjectFilter,
  listedIds: Ids,
  activeProjectIds: Ids
): T[] {
  if (filter === "all") return tasks
  return tasks.filter((task) => projectBucket(task, listedIds, activeProjectIds) === filter)
}

/** Count per bucket, plus "all" for the total. */
export function countByProject(tasks: Pick<Task, "linkedProjectId">[], listedIds: Ids, activeProjectIds: Ids): Map<string, number> {
  const counts = new Map<string, number>([["all", tasks.length]])
  for (const task of tasks) {
    const bucket = projectBucket(task, listedIds, activeProjectIds)
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1)
  }
  return counts
}

/** A stored filter that no longer matches a listed project (paused, archived, off the plan) falls back to "all". */
export function resolveProjectFilter(stored: string | null | undefined, listedIds: Ids): ProjectFilter {
  if (stored === "other" || stored === "none") return stored
  return stored && listedIds.has(stored) ? stored : "all"
}

/** One row of the project filter (P26, shared with ToDo in P28). */
export interface ProjectRow {
  key: string
  label: string
  count: number
  color?: string
  allocation?: ProjectAllocation
}

/**
 * All projects, then the listed projects (allocated ones stay at 0, since their hours still matter;
 * without a plan, only projects with tasks), then Other projects and No project when they have tasks.
 * The selected row always stays, so the filter never points at a hidden row.
 */
export function buildProjectRows(
  listedProjects: { id: string; title: string; color?: string }[],
  allocations: ProjectAllocation[],
  counts: ReadonlyMap<string, number>,
  selected: ProjectFilter,
  colorOf: (color: string | undefined) => string
): ProjectRow[] {
  const allocationById = new Map(allocations.map((a) => [a.projectId, a]))
  return [
    { key: "all", label: "All projects", count: counts.get("all") ?? 0 },
    ...listedProjects
      .map((p) => ({ key: p.id, label: p.title, count: counts.get(p.id) ?? 0, color: colorOf(p.color), allocation: allocationById.get(p.id) }))
      .filter((row) => row.allocation || row.count > 0 || row.key === selected),
    ...(["other", "none"] as const)
      .map((key) => ({ key, label: key === "other" ? "Other projects" : "No project", count: counts.get(key) ?? 0 }))
      .filter((row) => row.count > 0 || row.key === selected),
  ]
}

/** Categories that have a task, in the shared list's order (P14); unknown ones follow. */
export function countCategories(tasks: Pick<Task, "category">[], ordered: string[]): { name: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const task of tasks) counts.set(task.category, (counts.get(task.category) ?? 0) + 1)
  const names = ordered.filter((c) => counts.has(c))
  for (const c of counts.keys()) if (!names.includes(c)) names.push(c)
  return names.map((name) => ({ name, count: counts.get(name) ?? 0 }))
}
