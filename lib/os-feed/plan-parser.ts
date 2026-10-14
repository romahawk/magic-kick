import type { Task } from "@/lib/types"

/**
 * P7, first slice: today's plan from AI-Business-OS (`07_INBOX/agent/plans/YYYY-MM-DD.md`).
 *
 * The plan file is owned by the OS and documented there. This module only reads it: pure functions,
 * no network, no store. Nothing parsed here is written to Firestore or the persisted store.
 */

export interface PlanTask {
  /** `plan:<date>:<slugified title>`, stable across fetches of the same file. */
  id: string
  title: string
  project: string
  /** HH:MM, Europe/Berlin. */
  start?: string
  end?: string
  /** YYYY-MM-DD. */
  due?: string
  done: boolean
}

export interface ParsedDailyPlan {
  date: string | null
  source: string | null
  tasks: PlanTask[]
  warnings: string[]
}

export type PlanFeedStatus = "ok" | "missing" | "not-configured" | "error"

/** What `GET /api/os/plan` returns. On error with an earlier good fetch, `stale` is true and `date`,
 * `fetchedAt` and `tasks` are that fetch's. */
export interface PlanFeedResult {
  ok: boolean
  status: PlanFeedStatus
  date: string | null
  fetchedAt: string | null
  tasks: PlanTask[]
  warnings: string[]
  stale: boolean
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
const DATE = /^\d{4}-\d{2}-\d{2}$/
const TASK_LINE = /^\s*[-*]\s+\[([ xX])\]\s*(.*)$/

/** Today's date in Europe/Berlin as YYYY-MM-DD, whatever the server's time zone. */
export function berlinDateISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
}

function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/** Case- and whitespace-insensitive title, for matching plan tasks against Magic Kick tasks. */
export function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+/g, " ").toLowerCase()
}

function parseFrontMatter(lines: string[]): { fields: Record<string, string>; bodyStart: number } | null {
  if (lines[0]?.trim() !== "---") return null
  const end = lines.findIndex((line, index) => index > 0 && line.trim() === "---")
  if (end === -1) return null
  const fields: Record<string, string> = {}
  for (const line of lines.slice(1, end)) {
    const colon = line.indexOf(":")
    if (colon === -1) continue
    fields[line.slice(0, colon).trim().toLowerCase()] = line.slice(colon + 1).trim().replace(/^["']|["']$/g, "")
  }
  return { fields, bodyStart: end + 1 }
}

/** Parses a daily plan file. Never throws on content: bad lines are skipped with a warning. */
export function parseDailyPlan(markdown: string): ParsedDailyPlan {
  const warnings: string[] = []
  const lines = markdown.replace(/^﻿/, "").replace(/\r\n?/g, "\n").split("\n")

  const frontMatter = parseFrontMatter(lines)
  if (!frontMatter) warnings.push("No front matter; date and source are unknown.")
  const fields = frontMatter?.fields ?? {}

  const date: string | null = fields.date && DATE.test(fields.date) ? fields.date : null
  if (frontMatter && !date) warnings.push("Front matter has no valid date.")
  const source = fields.source || null
  if (frontMatter && !source) warnings.push("Front matter has no source.")
  if (fields.type && fields.type !== "daily-plan") warnings.push(`Unexpected type "${fields.type}".`)

  const body = lines.slice(frontMatter?.bodyStart ?? 0)
  const tasksHeading = body.findIndex((line) => /^##\s+tasks\s*$/i.test(line.trim()))
  if (tasksHeading === -1) {
    warnings.push("No ## Tasks section.")
    return { date, source, tasks: [], warnings }
  }

  const idDate = date ?? "undated"
  const tasks: PlanTask[] = []
  const usedIds = new Set<string>()

  for (const raw of body.slice(tasksHeading + 1)) {
    const line = raw.trim()
    if (/^#{1,2}\s/.test(line)) break
    if (!line) continue

    const match = TASK_LINE.exec(line)
    if (!match) {
      warnings.push(`Skipped a line that is not a task: "${line}"`)
      continue
    }

    const [titlePart, ...fieldParts] = match[2].split("|")
    const title = titlePart.trim()
    if (!title) {
      warnings.push(`Skipped a task without a title: "${line}"`)
      continue
    }

    const values: Record<string, string> = {}
    for (const part of fieldParts) {
      const colon = part.indexOf(":")
      if (colon === -1) {
        if (part.trim()) warnings.push(`"${title}": ignored "${part.trim()}" (no key).`)
        continue
      }
      values[part.slice(0, colon).trim().toLowerCase()] = part.slice(colon + 1).trim()
    }

    if (!values.project) {
      warnings.push(`Skipped "${title}": no project.`)
      continue
    }

    const task: PlanTask = { id: "", title, project: values.project, done: match[1].toLowerCase() === "x" }
    for (const key of ["start", "end"] as const) {
      if (!values[key]) continue
      if (TIME.test(values[key])) task[key] = values[key]
      else warnings.push(`"${title}": ignored ${key} "${values[key]}" (not HH:MM).`)
    }
    if (values.due) {
      if (DATE.test(values.due)) task.due = values.due
      else warnings.push(`"${title}": ignored due "${values.due}" (not YYYY-MM-DD).`)
    }

    const baseId = `plan:${idDate}:${slugify(title) || "task"}`
    let id = baseId
    for (let n = 2; usedIds.has(id); n++) id = `${baseId}-${n}`
    usedIds.add(id)
    task.id = id
    tasks.push(task)
  }

  return { date, source, tasks, warnings }
}

/**
 * Plan tasks not already in Magic Kick: hidden when a task with the same normalised title exists,
 * or one written by an agent with this plan task's id as its `sourceId` (ADR-018 provenance).
 */
export function selectUnmatchedPlanTasks(planTasks: PlanTask[], tasks: Task[]): PlanTask[] {
  const liveTasks = tasks.filter((task) => !task.deleted)
  const titles = new Set(liveTasks.map((task) => normalizeTitle(task.title)))
  const agentIds = new Set(liveTasks.filter((task) => task.source === "agent" && task.sourceId).map((task) => task.sourceId))
  return planTasks.filter((planTask) => !titles.has(normalizeTitle(planTask.title)) && !agentIds.has(planTask.id))
}
