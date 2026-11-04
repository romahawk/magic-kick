import { describe, expect, it } from "vitest"
import {
  buildCommitmentsResult,
  commitmentRange,
  commitmentsForDate,
  commitmentsInRange,
  overlapsCommitment,
  parseDatedCommitments,
} from "./commitments"

// Same shape as AI-Business-OS `01_CONTEXT/dated-commitments.md`: prose, then the table.
const HEADER = `Purpose: the only source of dated commitments.

| date (YYYY-MM-DD) | start (HH:MM, Europe/Berlin, or all-day) | end (HH:MM or empty) | title | link (URL or empty) | lane |
|---|---|---|---|---|---|
`

describe("parseDatedCommitments", () => {
  it("reads a valid row", () => {
    const { commitments, warnings } = parseDatedCommitments(
      `${HEADER}| 2026-11-04 | 11:00 | 12:00 | Isis call, Lucas Peiffer | https://example.com/isis | Medintegro |\n`
    )
    expect(warnings).toEqual([])
    expect(commitments).toEqual([
      {
        id: "commitment:2026-11-04:11:00:1",
        date: "2026-11-04",
        start: "11:00",
        end: "12:00",
        allDay: false,
        title: "Isis call, Lucas Peiffer",
        link: "https://example.com/isis",
        lane: "Medintegro",
      },
    ])
  })

  it("reads an all-day row and a row with no end or link", () => {
    const { commitments, warnings } = parseDatedCommitments(
      `${HEADER}| 2026-11-10 | all-day | | Application deadline | | Job-Search |\n| 2026-11-11 | 9:30 | | Stand-up | | Medintegro |\n`
    )
    expect(warnings).toEqual([])
    expect(commitments[0]).toMatchObject({ allDay: true, start: null, end: null, link: null })
    expect(commitments[1]).toMatchObject({ allDay: false, start: "09:30", end: null })
  })

  it("skips a bad date and warns, keeping the good rows", () => {
    const { commitments, warnings } = parseDatedCommitments(
      `${HEADER}| 04.11.2026 | 11:00 | 12:00 | Wrong format | | A |\n| 2026-02-30 | 11:00 | 12:00 | Not a day | | A |\n| 2026-11-04 | 14:00 | 15:00 | Good | | A |\n`
    )
    expect(commitments.map((entry) => entry.title)).toEqual(["Good"])
    expect(warnings).toHaveLength(2)
    expect(warnings[0]).toContain("04.11.2026")
  })

  it("skips rows with a bad time, end before start, no title or the wrong column count", () => {
    const { commitments, warnings } = parseDatedCommitments(
      `${HEADER}| 2026-11-04 | 25:00 | | Bad start | | A |\n| 2026-11-04 | 12:00 | 11:00 | Backwards | | A |\n| 2026-11-04 | 12:00 | | | | A |\n| 2026-11-04 | 12:00 | Short row |\n`
    )
    expect(commitments).toEqual([])
    expect(warnings).toHaveLength(4)
  })

  it("keeps a row whose link is not http(s), without the link", () => {
    const { commitments, warnings } = parseDatedCommitments(`${HEADER}| 2026-11-04 | 11:00 | | Call | javascript:alert(1) | A |\n`)
    expect(commitments[0].link).toBeNull()
    expect(warnings).toHaveLength(1)
  })

  it("reads an escaped pipe inside a title", () => {
    const { commitments } = parseDatedCommitments(`${HEADER}| 2026-11-04 | 11:00 | | Pitch \\| demo | | A |\n`)
    expect(commitments[0].title).toBe("Pitch | demo")
  })

  it("gives no rows for an empty table, empty text or missing text", () => {
    expect(parseDatedCommitments(HEADER)).toEqual({ commitments: [], warnings: [] })
    expect(parseDatedCommitments("")).toEqual({ commitments: [], warnings: [] })
    expect(parseDatedCommitments(null)).toEqual({ commitments: [], warnings: [] })
  })

  it("reads CRLF files", () => {
    const text = `${HEADER}| 2026-11-04 | 11:00 | 12:00 | Call | | A |\n`.replace(/\n/g, "\r\n")
    expect(parseDatedCommitments(text).commitments).toHaveLength(1)
  })
})

describe("buildCommitmentsResult", () => {
  it("shows nothing when the file is missing, even after an earlier good fetch", () => {
    const good = buildCommitmentsResult({ status: "ok", text: `${HEADER}| 2026-11-04 | 11:00 | | Call | | A |\n` }, null)
    const missing = buildCommitmentsResult({ status: "missing" }, good.lastGood)
    expect(missing.result).toMatchObject({ ok: false, status: "missing", commitments: [], stale: false })
  })

  it("shows the last good fetch, marked stale, when the file fails to load", () => {
    const good = buildCommitmentsResult({ status: "ok", text: `${HEADER}| 2026-11-04 | 11:00 | | Call | | A |\n` }, null)
    expect(good.result.ok).toBe(true)
    const failed = buildCommitmentsResult({ status: "error" }, good.lastGood)
    expect(failed.result).toMatchObject({ ok: false, status: "error", stale: true })
    expect(failed.result.commitments).toHaveLength(1)
  })

  it("shows nothing when the file fails to load and there is no earlier fetch", () => {
    const failed = buildCommitmentsResult({ status: "error" }, null)
    expect(failed.result).toMatchObject({ ok: false, status: "error", commitments: [], stale: false })
  })
})

describe("commitmentsForDate and overlapsCommitment", () => {
  const { commitments } = parseDatedCommitments(
    `${HEADER}| 2026-11-04 | 11:00 | 12:00 | Isis call | | A |\n| 2026-11-04 | all-day | | Deadline | | A |\n| 2026-11-04 | 15:00 | | Open end | | A |\n| 2026-11-05 | 11:00 | 12:00 | Other day | | A |\n`
  )

  it("lists a day's rows, all-day first, and nothing on other days", () => {
    expect(commitmentsForDate(commitments, "2026-11-04").map((entry) => entry.title)).toEqual(["Deadline", "Isis call", "Open end"])
    expect(commitmentsForDate(commitments, "2026-11-03")).toEqual([])
  })

  it("counts an open end as 30 minutes and an all-day row as no time", () => {
    expect(commitmentRange(commitments[2])).toEqual({ startMin: 900, endMin: 930 })
    expect(commitmentRange(commitments[1])).toBeNull()
  })

  it("detects overlap on the same day only, and allows back-to-back", () => {
    expect(overlapsCommitment(commitments, "2026-11-04", "11:30", "12:30")).toBe(true)
    expect(overlapsCommitment(commitments, "2026-11-04", "10:00", "11:00")).toBe(false)
    expect(overlapsCommitment(commitments, "2026-11-04", "12:00", "13:00")).toBe(false)
    expect(overlapsCommitment(commitments, "2026-11-04", "15:15", "16:00")).toBe(true)
    expect(overlapsCommitment(commitments, "2026-11-04", "15:30", "16:00")).toBe(false)
    expect(overlapsCommitment(commitments, "2026-11-06", "11:00", "12:00")).toBe(false)
  })
})

describe("commitmentsInRange", () => {
  const row = (date: string, start: string | null, title: string) => ({
    id: `${date}${start}${title}`, date, start, end: null, allDay: start === null, title, link: null, lane: "",
  })
  const rows = [
    row("2026-11-03", "09:00", "past"),
    row("2026-11-06", "10:00", "timed"),
    row("2026-11-06", null, "all day"),
    row("2026-11-04", "08:00", "today"),
    row("2026-11-08", "18:00", "last day"),
    row("2026-11-09", "09:00", "next week"),
  ]
  it("keeps today through the end of the week, inclusive, and sorts", () => {
    expect(commitmentsInRange(rows, "2026-11-04", "2026-11-08").map((r) => r.title)).toEqual([
      "today", "all day", "timed", "last day",
    ])
  })
  it("is empty when nothing falls in range", () => {
    expect(commitmentsInRange(rows, "2026-12-01", "2026-12-07")).toEqual([])
  })
})
