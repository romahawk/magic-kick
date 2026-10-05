// Project roadmap selectors (ADR-025, P12).
// Pure functions: no store access, no side effects. Milestones stay embedded in the
// Project document; tasks join them through `Task.milestoneId`.

import { differenceInCalendarDays, parseISO } from "date-fns"
import type { Project, ProjectMilestone, Resource, Task } from "./types"

/** Fallback rank for milestones without `order`: after every ordered one, in legacy weekday order. */
const LEGACY_ORDER_BASE = 1_000_000

export function milestoneRank(milestone: Pick<ProjectMilestone, "order" | "dayIndex">): number {
  return typeof milestone.order === "number" ? milestone.order : LEGACY_ORDER_BASE + (milestone.dayIndex ?? 0)
}

export function sortMilestones<T extends Pick<ProjectMilestone, "order" | "dayIndex" | "title">>(milestones: T[]): T[] {
  return [...milestones].sort((a, b) => {
    const diff = milestoneRank(a) - milestoneRank(b)
    if (diff !== 0) return diff
    return a.title.localeCompare(b.title)
  })
}

/** Rewrites `order` as 1..n in the current sorted order. */
export function renumberMilestones(milestones: ProjectMilestone[]): ProjectMilestone[] {
  return sortMilestones(milestones).map((milestone, index) => ({ ...milestone, order: index + 1 }))
}

/** Moves a milestone one step up (-1) or down (+1). Returns the input unchanged at the edges. */
export function moveMilestoneInList(milestones: ProjectMilestone[], milestoneId: string, direction: -1 | 1): ProjectMilestone[] {
  const ordered = renumberMilestones(milestones)
  const index = ordered.findIndex((milestone) => milestone.id === milestoneId)
  const target = index + direction
  if (index < 0 || target < 0 || target >= ordered.length) return ordered
  const next = [...ordered]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next.map((milestone, i) => ({ ...milestone, order: i + 1 }))
}

export function nextMilestoneOrder(milestones: ProjectMilestone[]): number {
  return milestones.reduce((max, milestone) => Math.max(max, typeof milestone.order === "number" ? milestone.order : 0), 0) + 1
}

export function isValidDateISO(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  return !Number.isNaN(parseISO(value).getTime())
}

export type MilestoneSchedule = "done" | "overdue" | "due-soon" | "on-track" | "unscheduled"

export const DUE_SOON_DAYS = 7

export function milestoneSchedule(milestone: ProjectMilestone, today: Date = new Date()): MilestoneSchedule {
  if (milestone.completed) return "done"
  if (!isValidDateISO(milestone.targetDate)) return "unscheduled"
  const days = differenceInCalendarDays(parseISO(milestone.targetDate), today)
  if (days < 0) return "overdue"
  if (days <= DUE_SOON_DAYS) return "due-soon"
  return "on-track"
}

export interface RoadmapMilestone {
  milestone: ProjectMilestone
  tasks: Task[]
  openTasks: Task[]
  doneTasks: Task[]
  /** 0–100. A completed milestone is 100; otherwise done/total tasks, or 0 without tasks. */
  progress: number
  schedule: MilestoneSchedule
  daysToTarget: number | null
}

export interface ProjectRoadmap {
  milestones: RoadmapMilestone[]
  unassigned: Task[]
  totals: {
    milestones: number
    milestonesDone: number
    tasks: number
    tasksDone: number
  }
  /** The first open milestone in roadmap order, if any. */
  nextMilestoneId: string | null
}

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1
    const aDue = a.dueDate ?? "9999-12-31"
    const bDue = b.dueDate ?? "9999-12-31"
    if (aDue !== bDue) return aDue.localeCompare(bDue)
    return (a.order ?? 0) - (b.order ?? 0)
  })
}

export function selectProjectTasks(project: Pick<Project, "id">, tasks: Task[]): Task[] {
  return tasks.filter((task) => !task.deleted && task.linkedProjectId === project.id)
}

export function buildProjectRoadmap(project: Project, tasks: Task[], today: Date = new Date()): ProjectRoadmap {
  const projectTasks = selectProjectTasks(project, tasks)
  const milestones = sortMilestones(project.milestones ?? [])
  const milestoneIds = new Set(milestones.map((milestone) => milestone.id))

  const grouped = new Map<string, Task[]>()
  const unassigned: Task[] = []
  for (const task of projectTasks) {
    // A dangling id (milestone deleted on another device) falls back to unassigned.
    if (task.milestoneId && milestoneIds.has(task.milestoneId)) {
      const list = grouped.get(task.milestoneId) ?? []
      list.push(task)
      grouped.set(task.milestoneId, list)
    } else {
      unassigned.push(task)
    }
  }

  const roadmapMilestones = milestones.map<RoadmapMilestone>((milestone) => {
    const list = sortTasks(grouped.get(milestone.id) ?? [])
    const doneTasks = list.filter((task) => task.completed)
    const openTasks = list.filter((task) => !task.completed)
    const progress = milestone.completed ? 100 : list.length > 0 ? Math.round((doneTasks.length / list.length) * 100) : 0
    const daysToTarget = isValidDateISO(milestone.targetDate)
      ? differenceInCalendarDays(parseISO(milestone.targetDate), today)
      : null
    return {
      milestone,
      tasks: list,
      openTasks,
      doneTasks,
      progress,
      schedule: milestoneSchedule(milestone, today),
      daysToTarget,
    }
  })

  return {
    milestones: roadmapMilestones,
    unassigned: sortTasks(unassigned),
    totals: {
      milestones: milestones.length,
      milestonesDone: milestones.filter((milestone) => milestone.completed).length,
      tasks: projectTasks.length,
      tasksDone: projectTasks.filter((task) => task.completed).length,
    },
    nextMilestoneId: roadmapMilestones.find((entry) => !entry.milestone.completed)?.milestone.id ?? null,
  }
}

/** Resolves ids to live resources, keeping the given order and dropping deleted or unknown ids. */
export function resolveResources(ids: string[] | undefined, resources: Resource[]): Resource[] {
  if (!ids || ids.length === 0) return []
  const byId = new Map(resources.filter((resource) => !resource.deleted).map((resource) => [resource.id, resource]))
  const seen = new Set<string>()
  const result: Resource[] = []
  for (const id of ids) {
    const resource = byId.get(id)
    if (resource && !seen.has(id)) {
      seen.add(id)
      result.push(resource)
    }
  }
  return result
}

export function toggleId(ids: string[] | undefined, id: string): string[] {
  const list = ids ?? []
  return list.includes(id) ? list.filter((entry) => entry !== id) : [...list, id]
}

export interface ResourceBacklink {
  projectId: string
  projectTitle: string
  projectColor: string
  milestoneId?: string
  milestoneTitle?: string
}

/** Where a resource is referenced: project-level and milestone-level links, live projects only. */
export function selectResourceBacklinks(resourceId: string, projects: Project[]): ResourceBacklink[] {
  const links: ResourceBacklink[] = []
  for (const source of projects) {
    if (source.deleted) continue
    // Legacy projects store Tailwind tokens ("bg-chart-1") instead of hex colours.
    const project = { ...source, color: source.color?.startsWith("#") ? source.color : "#3b82f6" }
    if (project.resourceIds?.includes(resourceId)) {
      links.push({ projectId: project.id, projectTitle: project.title, projectColor: project.color })
    }
    for (const milestone of sortMilestones(project.milestones ?? [])) {
      if (milestone.resourceIds?.includes(resourceId)) {
        links.push({
          projectId: project.id,
          projectTitle: project.title,
          projectColor: project.color,
          milestoneId: milestone.id,
          milestoneTitle: milestone.title,
        })
      }
    }
  }
  return links
}
