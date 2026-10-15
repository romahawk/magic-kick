/**
 * P11, first slice: Close day (ADR-032). Builds the OS daily review file
 * (`06_REVIEWS/daily/YYYY-MM-DD.md`, sections of the OS `09_TEMPLATES/daily-review-template.md`) and
 * holds the one writable-path rule. Pure functions, shared by the dialog's preview and the server.
 */
import type { Task } from "@/lib/types"

export const DAILY_REVIEW_SECTIONS = [
  { key: "primaryOutcome", heading: "Primary Outcome", label: "Primary outcome" },
  { key: "completed", heading: "Completed", label: "Completed" },
  { key: "progress", heading: "Meaningful Progress", label: "Meaningful progress" },
  { key: "blockers", heading: "Blockers", label: "Blockers" },
  { key: "decisions", heading: "Decisions Made", label: "Decisions" },
  { key: "learning", heading: "Captured Learning", label: "Captured learning" },
  { key: "carryForward", heading: "Carry Forward", label: "Carry forward" },
  { key: "stopAvoid", heading: "Stop / Avoid", label: "Stop / avoid" },
] as const

export type DailyReviewKey = (typeof DAILY_REVIEW_SECTIONS)[number]["key"]
export type DailyReviewFields = Record<DailyReviewKey, string>

export type DailyReviewStatus = "ok" | "exists" | "not-configured" | "forbidden" | "no-access" | "error"

/** What `GET /api/os/daily-review` returns. */
export interface DailyReviewState {
  ok: boolean
  status: DailyReviewStatus
  /** Today in Europe/Berlin; the file the dialog would write. */
  date: string | null
  /** Link to today's file when it already exists. */
  url: string | null
}

/** What `POST /api/os/daily-review` returns. */
export interface DailyReviewCommitResult {
  ok: boolean
  status: DailyReviewStatus
  date: string | null
  url: string | null
  commitUrl: string | null
  error?: string
}

export const DAILY_REVIEW_DIR = "06_REVIEWS/daily"
const WRITABLE_PATH = /^06_REVIEWS\/daily\/\d{4}-\d{2}-\d{2}\.md$/
const DATE = /^\d{4}-\d{2}-\d{2}$/
/** Per field, so one paste cannot make a huge commit. */
export const DAILY_REVIEW_FIELD_MAX = 4000

/** The only rule for where Close day may write (ADR-032 point 2). */
export function isWritableOsPath(path: string): boolean {
  return WRITABLE_PATH.test(path)
}

export function dailyReviewPath(dateISO: string): string {
  if (!DATE.test(dateISO)) throw new Error(`Not a date: ${dateISO}`)
  return `${DAILY_REVIEW_DIR}/${dateISO}.md`
}

export function dailyReviewCommitMessage(dateISO: string): string {
  return `daily-close: ${dateISO} (Magic Kick)`
}

/** Today's date in Europe/Berlin as YYYY-MM-DD, whatever the server's time zone. */
export function berlinDateISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
}

export function emptyDailyReviewFields(): DailyReviewFields {
  return Object.fromEntries(DAILY_REVIEW_SECTIONS.map((section) => [section.key, ""])) as DailyReviewFields
}

/** Keeps only known keys, as trimmed strings within the length limit. Null when a value is not a string. */
export function sanitizeDailyReviewFields(input: unknown): DailyReviewFields | null {
  if (!input || typeof input !== "object") return null
  const fields = emptyDailyReviewFields()
  for (const { key } of DAILY_REVIEW_SECTIONS) {
    const value = (input as Record<string, unknown>)[key]
    if (value === undefined || value === null) continue
    if (typeof value !== "string") return null
    fields[key] = value.replace(/\r\n?/g, "\n").trim().slice(0, DAILY_REVIEW_FIELD_MAX)
  }
  return fields
}

export function hasDailyReviewContent(fields: DailyReviewFields): boolean {
  return DAILY_REVIEW_SECTIONS.some(({ key }) => fields[key].trim() !== "")
}

/** One line per item, as a Markdown list. */
export function toBulletList(items: string[]): string {
  return items.map((item) => `- ${item.replace(/\s+/g, " ").trim()}`).join("\n")
}

/**
 * Close day's starting text: tasks completed today (a recurring task counts when today's occurrence
 * is done) and the Daily Focus tasks still open. `completedAt` is compared in local time, like the
 * rest of Execution.
 */
export function selectCloseDayPrefill(tasks: Task[], todayISO: string, toLocalDateISO: (date: Date) => string) {
  const live = tasks.filter((task) => !task.deleted)
  const completed = live.filter(
    (task) =>
      (task.completed && task.completedAt && toLocalDateISO(new Date(task.completedAt)) === todayISO) ||
      task.recurrenceCompletedDates?.includes(todayISO),
  )
  const carryForward = live.filter((task) => task.lane === "daily-focus" && !task.completed && !completed.includes(task))
  return {
    completed: toBulletList(completed.map((task) => task.title)),
    carryForward: toBulletList(carryForward.map((task) => task.title)),
  }
}

/**
 * The file, in the template's order. Every heading is kept so the file reads like the others in
 * `06_REVIEWS/daily/`; an empty section says "None.".
 */
export function buildDailyReview(dateISO: string, fields: DailyReviewFields): string {
  const parts = [`# Daily Review - ${dateISO}`]
  for (const { key, heading } of DAILY_REVIEW_SECTIONS) {
    // A line starting with "#" would open a new section; indent it so the structure holds.
    const body = fields[key].trim().replace(/^(#{1,6}\s)/gm, " $1")
    parts.push(`## ${heading}\n\n${body || "None."}`)
  }
  return parts.join("\n\n") + "\n"
}
