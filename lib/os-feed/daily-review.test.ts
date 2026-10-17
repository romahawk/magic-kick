import { describe, expect, it } from "vitest"
import {
  DAILY_REVIEW_FIELD_MAX,
  berlinDateISO,
  buildDailyReview,
  closeDayDates,
  isClosableDate,
  dailyReviewCommitMessage,
  dailyReviewPath,
  emptyDailyReviewFields,
  hasDailyReviewContent,
  isWritableOsPath,
  sanitizeDailyReviewFields,
  selectCloseDayPrefill,
} from "./daily-review"
import type { Task } from "../types"

describe("isWritableOsPath", () => {
  it("allows only a dated file directly under 06_REVIEWS/daily/", () => {
    expect(isWritableOsPath("06_REVIEWS/daily/2026-10-15.md")).toBe(true)
    for (const path of [
      "06_REVIEWS/daily/2026-10-15-extra.md",
      "06_REVIEWS/daily/../../01_CONTEXT/current-focus.md",
      "06_REVIEWS/daily/sub/2026-10-15.md",
      "06_REVIEWS/weekly/2026-10-15.md",
      "01_CONTEXT/current-focus.md",
      "/06_REVIEWS/daily/2026-10-15.md",
      "06_REVIEWS/daily/2026-10-15.md\n",
    ]) {
      expect(isWritableOsPath(path), path).toBe(false)
    }
  })

  it("builds the path and commit message from the date", () => {
    expect(dailyReviewPath("2026-10-15")).toBe("06_REVIEWS/daily/2026-10-15.md")
    expect(() => dailyReviewPath("../x")).toThrow()
    expect(dailyReviewCommitMessage("2026-10-15")).toBe("daily-close: 2026-10-15 (Magic Kick)")
  })
})

describe("berlinDateISO", () => {
  it("uses the Berlin date around midnight UTC", () => {
    expect(berlinDateISO(new Date("2026-10-14T23:30:00Z"))).toBe("2026-10-15")
    expect(berlinDateISO(new Date("2026-10-14T21:30:00Z"))).toBe("2026-10-14")
    expect(berlinDateISO(new Date("2026-12-14T23:30:00Z"))).toBe("2026-12-15")
  })
})

describe("buildDailyReview", () => {
  it("writes every template heading in order, with Decisions under Decisions Made", () => {
    const fields = { ...emptyDailyReviewFields(), completed: "- Job search", decisions: "- Ship Close day first" }
    const file = buildDailyReview("2026-10-15", fields)
    expect(file.startsWith("# Daily Review - 2026-10-15\n\n## Primary Outcome\n\nNone.\n\n## Completed\n\n- Job search")).toBe(true)
    expect(file).toContain("## Decisions Made\n\n- Ship Close day first")
    const headings = file.split("\n").filter((line) => line.startsWith("## "))
    expect(headings).toEqual([
      "## Primary Outcome",
      "## Completed",
      "## Meaningful Progress",
      "## Blockers",
      "## Decisions Made",
      "## Captured Learning",
      "## Carry Forward",
      "## Stop / Avoid",
    ])
    expect(file.endsWith("\n")).toBe(true)
  })

  it("keeps a typed heading from opening a new section", () => {
    const file = buildDailyReview("2026-10-15", { ...emptyDailyReviewFields(), blockers: "## Fake section\nreal text" })
    expect(file.split("\n").filter((line) => line.startsWith("## "))).toHaveLength(8)
    expect(file).toContain(" ## Fake section\nreal text")
  })
})

describe("sanitizeDailyReviewFields", () => {
  it("keeps known keys, trims, normalises line endings and caps length", () => {
    const fields = sanitizeDailyReviewFields({ decisions: "  a\r\nb  ", unknown: "x", learning: "y".repeat(DAILY_REVIEW_FIELD_MAX + 10) })
    expect(fields?.decisions).toBe("a\nb")
    expect(fields).not.toHaveProperty("unknown")
    expect(fields?.learning).toHaveLength(DAILY_REVIEW_FIELD_MAX)
  })

  it("refuses non-strings and non-objects", () => {
    expect(sanitizeDailyReviewFields({ decisions: 3 })).toBeNull()
    expect(sanitizeDailyReviewFields("text")).toBeNull()
    expect(sanitizeDailyReviewFields(null)).toBeNull()
  })

  it("reports empty input as no content", () => {
    expect(hasDailyReviewContent(sanitizeDailyReviewFields({ decisions: "   " })!)).toBe(false)
    expect(hasDailyReviewContent(sanitizeDailyReviewFields({ decisions: "x" })!)).toBe(true)
  })
})

describe("selectCloseDayPrefill", () => {
  const task = (patch: Partial<Task>): Task =>
    ({ id: patch.title ?? "t", title: "Task", category: "Work", completed: false, xpValue: 10, ...patch }) as Task
  const toLocal = (date: Date) => date.toISOString().slice(0, 10)

  const tasks = [
    task({ title: "Done today", completed: true, completedAt: "2026-10-15T09:00:00Z" }),
    task({ title: "Done yesterday", completed: true, completedAt: "2026-10-14T09:00:00Z" }),
    task({ title: "Recurring done today", repeat: "daily", recurrenceCompletedDates: ["2026-10-15"] }),
    task({ title: "Focus open", lane: "daily-focus" }),
    task({ title: "Focus deleted", lane: "daily-focus", deleted: true }),
    task({ title: "Backlog open", lane: "backlog" }),
  ]

  it("lists today's completed tasks and the open Daily Focus tasks", () => {
    const prefill = selectCloseDayPrefill(tasks, "2026-10-15", "2026-10-15", toLocal)
    expect(prefill.completed).toBe("- Done today\n- Recurring done today")
    expect(prefill.carryForward).toBe("- Focus open")
  })

  it("for a missed day, lists that day's completed tasks and leaves Carry forward empty", () => {
    const prefill = selectCloseDayPrefill(tasks, "2026-10-14", "2026-10-15", toLocal)
    expect(prefill.completed).toBe("- Done yesterday")
    expect(prefill.carryForward).toBe("")
  })
})

describe("closeDayDates and isClosableDate", () => {
  it("covers today and the six days before it, newest first, across a month end", () => {
    expect(closeDayDates("2026-11-02")).toEqual([
      "2026-11-02",
      "2026-11-01",
      "2026-10-31",
      "2026-10-30",
      "2026-10-29",
      "2026-10-28",
      "2026-10-27",
    ])
    expect(closeDayDates("not a date")).toEqual([])
  })

  it("refuses future days, older days and anything that is not a date", () => {
    expect(isClosableDate("2026-10-17", "2026-10-17")).toBe(true)
    expect(isClosableDate("2026-10-11", "2026-10-17")).toBe(true)
    expect(isClosableDate("2026-10-10", "2026-10-17")).toBe(false)
    expect(isClosableDate("2026-10-18", "2026-10-17")).toBe(false)
    expect(isClosableDate("2026-10-16.md", "2026-10-17")).toBe(false)
  })
})

describe("buildDailyReview for a missed day", () => {
  it("adds the written-on line under the title only when the dates differ", () => {
    const fields = { ...emptyDailyReviewFields(), completed: "- x" }
    expect(buildDailyReview("2026-10-16", fields, "2026-10-17")).toMatch(
      /^# Daily Review - 2026-10-16\n\n_Written on 2026-10-17 for 2026-10-16\._\n\n## Primary Outcome\n/,
    )
    expect(buildDailyReview("2026-10-17", fields, "2026-10-17")).not.toContain("Written on")
    expect(buildDailyReview("2026-10-17", fields)).not.toContain("Written on")
  })
})
