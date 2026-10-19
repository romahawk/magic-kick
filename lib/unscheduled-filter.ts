// P26: the Schedule panel's project filter. Pure functions, no store access.
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
