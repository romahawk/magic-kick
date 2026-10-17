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

/** One day Close day can write, newest first. */
export interface CloseDayOption {
  date: string
  closed: boolean
  /** Link to the day's file when it is closed. */
  url: string | null
}

/** What `GET /api/os/daily-review` returns. */
export interface DailyReviewState {
  ok: boolean
  status: DailyReviewStatus
  /** Today in Europe/Berlin. */
  date: string | null
  /** Today and the days before it that may still be closed (ADR-033); empty unless `ok`. */
  days: CloseDayOption[]
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
/** How many days before today a missed day may still be closed (ADR-033). */
export const CLOSE_DAY_DAYS_BACK = 6
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

/** Today and the `CLOSE_DAY_DAYS_BACK` days before it, newest first. Calendar arithmetic, no time zone. */
export function closeDayDates(todayISO: string): string[] {
  if (!DATE.test(todayISO)) return []
  const today = new Date(`${todayISO}T00:00:00Z`)
  return Array.from({ length: CLOSE_DAY_DAYS_BACK + 1 }, (_, back) => {
    const day = new Date(today)
    day.setUTCDate(today.getUTCDate() - back)
    return day.toISOString().slice(0, 10)
  })
}

/** Whether Close day may write this date: today or up to `CLOSE_DAY_DAYS_BACK` days before, never later. */
export function isClosableDate(dateISO: string, todayISO: string): boolean {
  return DATE.test(dateISO) && closeDayDates(todayISO).includes(dateISO)
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
 * Close day's starting text for `dateISO`: tasks completed that day (a recurring task counts when that
 * day's occurrence is done) and, for today only, the Daily Focus tasks still open. Magic Kick keeps no
 * history of the lane, so a past day's Carry Forward starts empty. `completedAt` is compared in local
 * time, like the rest of Execution.
 */
export function selectCloseDayPrefill(
  tasks: Task[],
  dateISO: string,
  todayISO: string,
  toLocalDateISO: (date: Date) => string,
) {
  const live = tasks.filter((task) => !task.deleted)
  const completed = live.filter(
    (task) =>
      (task.completed && task.completedAt && toLocalDateISO(new Date(task.completedAt)) === dateISO) ||
      task.recurrenceCompletedDates?.includes(dateISO),
  )
  const carryForward =
    dateISO === todayISO
      ? live.filter((task) => task.lane === "daily-focus" && !task.completed && !completed.includes(task))
      : []
  return {
    completed: toBulletList(completed.map((task) => task.title)),
    carryForward: toBulletList(carryForward.map((task) => task.title)),
  }
}

/**
 * The file, in the template's order. Every heading is kept so the file reads like the others in
 * `06_REVIEWS/daily/`; an empty section says "None.". A day closed later than itself says so under
 * the title (ADR-033), so a backfilled record is never mistaken for one written that evening.
 */
export function buildDailyReview(dateISO: string, fields: DailyReviewFields, writtenOnISO?: string): string {
  const parts = [`# Daily Review - ${dateISO}`]
  if (writtenOnISO && writtenOnISO !== dateISO) parts.push(`_Written on ${writtenOnISO} for ${dateISO}._`)
  for (const { key, heading } of DAILY_REVIEW_SECTIONS) {
    // A line starting with "#" would open a new section; indent it so the structure holds.
    const body = fields[key].trim().replace(/^(#{1,6}\s)/gm, " $1")
    parts.push(`## ${heading}\n\n${body || "None."}`)
  }
  return parts.join("\n\n") + "\n"
}
