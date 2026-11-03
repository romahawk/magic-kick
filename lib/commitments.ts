/**
 * P30: dated commitments from AI-Business-OS (ADR-036).
 *
 * `01_CONTEXT/dated-commitments.md` on OS `main` is the only source: a markdown table with the columns
 * `date | start | end | title | link | lane`. Magic Kick reads it and shows each row as a fixed,
 * read-only block. Pure functions, no network, no store: nothing parsed here is written to Firestore
 * or to the persisted store, and nothing is written back to the file.
 *
 * Times are written in Europe/Berlin and shown as written, the same wall-clock way Schedule shows
 * every other block.
 */

export interface DatedCommitment {
  /** `commitment:<date>:<start or all-day>:<row>`; the row number keeps two equal rows apart. */
  id: string
  /** YYYY-MM-DD. */
  date: string
  /** HH:mm, or null for an all-day row. */
  start: string | null
  /** HH:mm, or null when the row has no end (and for all-day rows). */
  end: string | null
  allDay: boolean
  title: string
  /** An http(s) URL, or null. */
  link: string | null
  lane: string
}

export interface ParsedCommitments {
  commitments: DatedCommitment[]
  warnings: string[]
}

export type CommitmentsFeedStatus = "ok" | "missing" | "not-configured" | "error"

/** What `GET /api/os/commitments` returns. On error with an earlier good fetch, `stale` is true and
 * the rest is that fetch's. */
export interface CommitmentsFeedResult {
  ok: boolean
  status: CommitmentsFeedStatus
  fetchedAt: string | null
  commitments: DatedCommitment[]
  warnings: string[]
  stale: boolean
}

/** How long a row without an end counts as busy, in minutes. */
export const DEFAULT_COMMITMENT_MINUTES = 30

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME = /^([01]?\d|2[0-3]):([0-5]\d)$/
const ALL_DAY = /^all[\s-]?day$/i
const SEPARATOR_CELL = /^:?-{3,}:?$/

function toLines(markdown: string): string[] {
  return markdown.replace(/^﻿/, "").replace(/\r\n?/g, "\n").split("\n")
}

/** Splits a table row on `|` that is not escaped as `\|`, without the outer pipes. */
function splitRow(line: string): string[] {
  const body = line.trim().replace(/^\|/, "").replace(/\|$/, "")
  const cells: string[] = []
  let current = ""
  for (let i = 0; i < body.length; i += 1) {
    if (body[i] === "\\" && body[i + 1] === "|") {
      current += "|"
      i += 1
    } else if (body[i] === "|") {
      cells.push(current.trim())
      current = ""
    } else {
      current += body[i]
    }
  }
  cells.push(current.trim())
  return cells
}

function isRealDate(value: string): boolean {
  const match = DATE.exec(value)
  if (!match) return false
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

function normalizeTime(value: string): string | null {
  const match = TIME.exec(value)
  return match ? `${match[1].padStart(2, "0")}:${match[2]}` : null
}

/** Minutes from midnight for an `HH:mm` string. */
function minutesOf(time: string): number {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + m
}

/**
 * Parses the commitments table. Bad rows are skipped with a warning; text outside the table, the
 * header row and the separator row are ignored. Null, empty or table-less input gives no rows.
 */
export function parseDatedCommitments(markdown: string | null | undefined): ParsedCommitments {
  const commitments: DatedCommitment[] = []
  const warnings: string[] = []
  if (!markdown) return { commitments, warnings }

  let rowNumber = 0
  for (const line of toLines(markdown)) {
    if (!line.trim().startsWith("|")) continue
    const cells = splitRow(line)
    if (cells.every((cell) => cell === "" || SEPARATOR_CELL.test(cell))) continue
    if (/^date\b/i.test(cells[0])) continue

    rowNumber += 1
    const label = `Row ${rowNumber} (${cells[0] || "no date"})`
    if (cells.length !== 6) {
      warnings.push(`${label}: expected 6 columns, found ${cells.length}; skipped.`)
      continue
    }
    const [date, startCell, endCell, title, linkCell, lane] = cells

    if (!isRealDate(date)) {
      warnings.push(`${label}: "${date}" is not a YYYY-MM-DD date; skipped.`)
      continue
    }
    if (!title) {
      warnings.push(`${label}: no title; skipped.`)
      continue
    }

    let start: string | null = null
    let end: string | null = null
    const allDay = ALL_DAY.test(startCell)
    if (!allDay) {
      start = normalizeTime(startCell)
      if (!start) {
        warnings.push(`${label}: start "${startCell}" is not HH:MM or all-day; skipped.`)
        continue
      }
      if (endCell) {
        end = normalizeTime(endCell)
        if (!end) {
          warnings.push(`${label}: end "${endCell}" is not HH:MM; skipped.`)
          continue
        }
        if (minutesOf(end) <= minutesOf(start)) {
          warnings.push(`${label}: end ${end} is not after start ${start}; skipped.`)
          continue
        }
      }
    }

    let link: string | null = null
    if (linkCell) {
      if (/^https?:\/\/\S+$/i.test(linkCell)) link = linkCell
      else warnings.push(`${label}: link "${linkCell}" is not an http(s) URL; shown without a link.`)
    }

    commitments.push({
      id: `commitment:${date}:${allDay ? "all-day" : start}:${rowNumber}`,
      date,
      start,
      end,
      allDay,
      title,
      link,
      lane,
    })
  }

  return { commitments, warnings }
}

/** The file as the server found it: its text, absent, or unreadable. */
export type CommitmentsFile = { status: "ok"; text: string } | { status: "missing" } | { status: "error" }

type GoodFetch = Omit<CommitmentsFeedResult, "ok" | "status" | "stale">

function emptyResult(status: CommitmentsFeedStatus): CommitmentsFeedResult {
  return { ok: false, status, fetchedAt: null, commitments: [], warnings: [], stale: false }
}

/**
 * Turns what the server found into the route's answer. A missing file shows nothing; an unreadable one
 * shows the last good fetch, marked stale, or nothing. Never throws.
 */
export function buildCommitmentsResult(
  file: CommitmentsFile,
  lastGood: GoodFetch | null,
  now: Date = new Date()
): { result: CommitmentsFeedResult; lastGood: GoodFetch | null } {
  if (file.status === "missing") return { result: emptyResult("missing"), lastGood }
  if (file.status === "error") {
    const result: CommitmentsFeedResult = lastGood
      ? { ok: false, status: "error", ...lastGood, stale: true }
      : emptyResult("error")
    return { result, lastGood }
  }
  const parsed = parseDatedCommitments(file.text)
  const good: GoodFetch = { fetchedAt: now.toISOString(), commitments: parsed.commitments, warnings: parsed.warnings }
  return { result: { ok: true, status: "ok", ...good, stale: false }, lastGood: good }
}

/** The day's rows, all-day first, then by start time. */
export function commitmentsForDate(commitments: readonly DatedCommitment[], dateISO: string): DatedCommitment[] {
  return commitments
    .filter((entry) => entry.date === dateISO)
    .sort((a, b) => (a.start ?? "").localeCompare(b.start ?? "") || a.title.localeCompare(b.title))
}

/** Start and end in minutes from midnight for a timed row (an open end gets the default length, up to
 * midnight); null for an all-day row, which does not block time. */
export function commitmentRange(entry: DatedCommitment): { startMin: number; endMin: number } | null {
  if (entry.allDay || !entry.start) return null
  const startMin = minutesOf(entry.start)
  const endMin = entry.end ? minutesOf(entry.end) : Math.min(24 * 60, startMin + DEFAULT_COMMITMENT_MINUTES)
  return { startMin, endMin }
}

/** True when `startTime`–`endTime` on `dateISO` touches a timed row. Back-to-back is not an overlap. */
export function overlapsCommitment(
  commitments: readonly DatedCommitment[],
  dateISO: string,
  startTime: string,
  endTime: string
): boolean {
  const startMin = minutesOf(startTime)
  const endMin = minutesOf(endTime)
  return commitments.some((entry) => {
    if (entry.date !== dateISO) return false
    const range = commitmentRange(entry)
    return range !== null && startMin < range.endMin && endMin > range.startMin
  })
}
