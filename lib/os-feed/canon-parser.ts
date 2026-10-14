/**
 * P7: current focus from AI-Business-OS canon (ADR-031, OS DEC-2026-10-14-003).
 *
 * Reads two tracked files on OS `main`: `01_CONTEXT/current-focus.md` (primary outcomes and the
 * execution allocation) and the front matter of `00_HOME/context-pack.md` (when the pack was built).
 * Pure functions, no network, no store. Nothing parsed here is written to Firestore or the
 * persisted store.
 */

export interface CanonOutcome {
  /** `canon:outcome:<n>`, the outcome's number in the list. */
  id: string
  /** The bold title only. */
  title: string
}

export type AllocationLevel = "primary" | "protected" | "limited" | "none"

export interface CanonLane {
  /** `canon:lane:<lane>`. */
  id: string
  lane: string
  level: AllocationLevel
}

export interface ParsedCurrentFocus {
  /** YYYY-MM-DD from `reconciled_with_git`. */
  reconciledWithGit: string | null
  outcomes: CanonOutcome[]
  allocation: CanonLane[]
  warnings: string[]
}

export type CanonFeedStatus = "ok" | "missing" | "not-configured" | "error"

/** What `GET /api/os/canon` returns. On error with an earlier good fetch, `stale` is true and the
 * rest is that fetch's. */
export interface CanonFeedResult {
  ok: boolean
  status: CanonFeedStatus
  fetchedAt: string | null
  /** The context pack's `generated` value, as written (for example "2026-10-14 19:37 Europe/Berlin"). */
  packGenerated: string | null
  reconciledWithGit: string | null
  outcomes: CanonOutcome[]
  allocation: CanonLane[]
  warnings: string[]
  stale: boolean
}

const DATE = /^\d{4}-\d{2}-\d{2}$/
const LEVELS: readonly AllocationLevel[] = ["primary", "protected", "limited", "none"]
const OUTCOME_LINE = /^(\d+)\.\s+(.*)$/
const BOLD = /^\*\*(.+?)\*\*/
const LANE_LINE = /^\s+([A-Za-z0-9_-]+):\s*(\S+)\s*$/

function toLines(markdown: string): string[] {
  return markdown.replace(/^﻿/, "").replace(/\r\n?/g, "\n").split("\n")
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

/** The lines under `## <title>`, up to the next heading of level 1 or 2. Null when the heading is absent. */
function section(lines: string[], title: string): string[] | null {
  const heading = new RegExp(`^##\\s+${title}\\s*$`, "i")
  const start = lines.findIndex((line) => heading.test(line.trim()))
  if (start === -1) return null
  const rest = lines.slice(start + 1)
  const end = rest.findIndex((line) => /^#{1,2}\s/.test(line))
  return end === -1 ? rest : rest.slice(0, end)
}

function parseOutcomes(lines: string[], warnings: string[]): CanonOutcome[] {
  const outcomes: CanonOutcome[] = []
  for (const line of lines) {
    const match = OUTCOME_LINE.exec(line.trim())
    if (!match) continue
    const bold = BOLD.exec(match[2])
    if (!bold) {
      warnings.push(`Outcome ${match[1]} has no bold title; skipped.`)
      continue
    }
    outcomes.push({ id: `canon:outcome:${match[1]}`, title: bold[1].trim() })
  }
  return outcomes
}

function parseAllocation(lines: string[], warnings: string[]): CanonLane[] {
  const open = lines.findIndex((line) => /^```ya?ml\s*$/i.test(line.trim()))
  if (open === -1) {
    warnings.push("Execution Allocation has no yaml block.")
    return []
  }
  const close = lines.findIndex((line, index) => index > open && line.trim().startsWith("```"))
  const block = lines.slice(open + 1, close === -1 ? undefined : close)

  const key = block.findIndex((line) => /^execution_allocation:\s*(#.*)?$/.test(line.trim()))
  if (key === -1) {
    warnings.push("The yaml block has no execution_allocation key.")
    return []
  }

  const allocation: CanonLane[] = []
  for (const raw of block.slice(key + 1)) {
    const line = raw.replace(/\s+#.*$/, "")
    if (!line.trim() || line.trim().startsWith("#")) continue
    const match = LANE_LINE.exec(line)
    if (!match) break // back at the top level of the yaml
    const level = match[2].toLowerCase() as AllocationLevel
    if (!LEVELS.includes(level)) {
      warnings.push(`Lane "${match[1]}": unknown level "${match[2]}"; skipped.`)
      continue
    }
    allocation.push({ id: `canon:lane:${match[1]}`, lane: match[1], level })
  }
  return allocation
}

/** Parses `01_CONTEXT/current-focus.md`. Never throws on content: missing parts give warnings. */
export function parseCurrentFocus(markdown: string): ParsedCurrentFocus {
  const warnings: string[] = []
  const lines = toLines(markdown)

  const frontMatter = parseFrontMatter(lines)
  if (!frontMatter) warnings.push("No front matter; the reconcile date is unknown.")
  const reconciled = frontMatter?.fields.reconciled_with_git
  const reconciledWithGit = reconciled && DATE.test(reconciled) ? reconciled : null
  if (frontMatter && !reconciledWithGit) warnings.push("Front matter has no valid reconciled_with_git.")

  const body = lines.slice(frontMatter?.bodyStart ?? 0)

  const outcomeLines = section(body, "Primary Outcomes")
  if (!outcomeLines) warnings.push("No ## Primary Outcomes section.")
  const outcomes = outcomeLines ? parseOutcomes(outcomeLines, warnings) : []

  const allocationLines = section(body, "Execution Allocation")
  if (!allocationLines) warnings.push("No ## Execution Allocation section.")
  const allocation = allocationLines ? parseAllocation(allocationLines, warnings) : []

  return { reconciledWithGit, outcomes, allocation, warnings }
}

/** The `generated` value from a file's front matter (the context pack's build time), or null. */
export function parseFrontMatterGenerated(markdown: string): string | null {
  return parseFrontMatter(toLines(markdown))?.fields.generated || null
}
