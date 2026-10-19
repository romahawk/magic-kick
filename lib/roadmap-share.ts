// P23 — share a project roadmap (ADR-035).
// Pure: turns a built roadmap into Markdown or a self-contained SVG card. No DOM, no store.
// The browser layer (components/modules/roadmap-share-dialog.tsx) rasterises the SVG to PNG,
// prints it to PDF, or copies the Markdown.

import { format, parseISO } from "date-fns"
import { normalizeProjectColor } from "./project-colors"
import { isValidDateISO, resolveResources, type ProjectRoadmap, type RoadmapMilestone } from "./roadmap"
import type { Project, Resource, Task } from "./types"

export interface ShareOptions {
  includeTasks: boolean
  includeNotes: boolean
  includeResources: boolean
}

export const DEFAULT_SHARE_OPTIONS: ShareOptions = {
  includeTasks: true,
  includeNotes: true,
  includeResources: true,
}

export interface ShareInput {
  project: Project
  roadmap: ProjectRoadmap
  resources: Resource[]
  today: Date
  options: ShareOptions
}

// ─── shared helpers ─────────────────────────────────────────────────────────

function percent(roadmap: ProjectRoadmap) {
  const { milestones, milestonesDone } = roadmap.totals
  return milestones > 0 ? Math.round((milestonesDone / milestones) * 100) : 0
}

function shortDate(iso: string) {
  return format(parseISO(iso), "MMM d")
}

function relative(days: number | null) {
  if (days === null) return ""
  if (days === 0) return "today"
  if (days > 0) return `in ${days}d`
  return `${Math.abs(days)}d late`
}

function resourceHref(resource: Resource) {
  return resource.links?.[0]?.url ?? resource.url
}

/** One-line status for a milestone, shared by Markdown and the card. */
export function milestoneStatusLine(entry: RoadmapMilestone, isNext: boolean): string {
  const { milestone, tasks, doneTasks, schedule, daysToTarget } = entry
  const parts: string[] = []
  if (milestone.completed) {
    parts.push(milestone.completedAt && isValidDateISO(milestone.completedAt) ? `Done ${shortDate(milestone.completedAt)}` : "Done")
  } else if (isValidDateISO(milestone.targetDate)) {
    const rel = relative(daysToTarget)
    parts.push(`Target ${shortDate(milestone.targetDate)}${rel ? ` (${rel})` : ""}`)
  } else {
    parts.push("No target date")
  }
  if (!milestone.completed && schedule === "overdue") parts.push("Overdue")
  if (isNext) parts.push("Next")
  if (tasks.length > 0) parts.push(`${doneTasks.length}/${tasks.length} tasks`)
  return parts.join(" · ")
}

export function shareFileName(project: Pick<Project, "title">, today: Date, ext: string) {
  const slug =
    project.title
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 60) || "project"
  return `${slug}-roadmap-${format(today, "yyyy-MM-dd")}.${ext}`
}

// ─── Markdown ───────────────────────────────────────────────────────────────

function mdEscape(text: string) {
  return text.replace(/([\\`*_[\]<>#|])/g, "\\$1")
}

function mdTask(task: Task) {
  const due = task.dueDate && isValidDateISO(task.dueDate) ? ` _(due ${shortDate(task.dueDate)})_` : ""
  return `- [${task.completed ? "x" : " "}] ${mdEscape(task.title)}${due}`
}

function mdResources(ids: string[] | undefined, resources: Resource[]) {
  const linked = resolveResources(ids, resources)
  if (linked.length === 0) return null
  return linked
    .map((resource) => {
      const href = resourceHref(resource)
      return href && /^https?:\/\//i.test(href) ? `[${mdEscape(resource.title)}](${href})` : mdEscape(resource.title)
    })
    .join(", ")
}

export function roadmapToMarkdown({ project, roadmap, resources, today, options }: ShareInput): string {
  const lines: string[] = []
  const { totals } = roadmap
  lines.push(`# ${mdEscape(project.title)} — Roadmap`, "")
  if (project.objective?.trim()) lines.push(`> ${mdEscape(project.objective.trim())}`, "")
  lines.push(
    `**Progress:** ${totals.milestonesDone}/${totals.milestones} milestones · ${totals.tasksDone}/${totals.tasks} tasks · ${percent(roadmap)}%  `,
    `**As of:** ${format(today, "d MMM yyyy")}`,
    ""
  )

  roadmap.milestones.forEach((entry, index) => {
    const isNext = roadmap.nextMilestoneId === entry.milestone.id
    lines.push(`## ${index + 1}. ${mdEscape(entry.milestone.title)}`, "")
    lines.push(`_${milestoneStatusLine(entry, isNext)}_`, "")
    if (options.includeNotes && entry.milestone.note?.trim()) {
      lines.push(`**Definition of done:** ${mdEscape(entry.milestone.note.trim()).replace(/\n+/g, " ")}`, "")
    }
    if (options.includeTasks && entry.tasks.length > 0) {
      lines.push(...entry.tasks.map(mdTask), "")
    }
    if (options.includeResources) {
      const res = mdResources(entry.milestone.resourceIds, resources)
      if (res) lines.push(`**Resources:** ${res}`, "")
    }
  })

  if (options.includeTasks && roadmap.unassigned.length > 0) {
    lines.push("## Other tasks", "", ...roadmap.unassigned.map(mdTask), "")
  }
  if (options.includeResources) {
    const res = mdResources(project.resourceIds, resources)
    if (res) lines.push("## Resources", "", res, "")
  }
  lines.push("---", "_Shared from Magic Kick_")
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n"
}

// ─── SVG card ───────────────────────────────────────────────────────────────

/** Width of `text` in px for a CSS font shorthand. The browser passes canvas measureText. */
export type MeasureText = (text: string, font: string) => number

/** Rough fallback for tests and SSR: average glyph ≈ 0.53 em. */
export const approxMeasure: MeasureText = (text, font) => {
  const size = Number(/(\d+(?:\.\d+)?)px/.exec(font)?.[1] ?? 16)
  const bold = /\b(6|7|8)00\b|bold/.test(font)
  return text.length * size * (bold ? 0.57 : 0.53)
}

export const CARD_FONT_STACK = `"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", Arial, sans-serif`

const C = {
  bg: "#ffffff",
  surface: "#f8fafc",
  text: "#0f172a",
  muted: "#64748b",
  faint: "#94a3b8",
  border: "#e2e8f0",
  track: "#e2e8f0",
  primary: "#059669",
  primarySoft: "#ecfdf5",
  danger: "#dc2626",
  amber: "#b45309",
}

const W = 1080
const PAD = 64
const RAIL_X = PAD + 14
const CONTENT_X = PAD + 52
const CONTENT_W = W - CONTENT_X - PAD
const MAX_TASKS_PER_MILESTONE = 6

function esc(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

function font(size: number, weight = 400) {
  return `${weight} ${size}px ${CARD_FONT_STACK}`
}

/** Greedy word wrap with an ellipsis on the last allowed line. Long words are hard-broken. */
export function wrapText(text: string, fontSpec: string, maxWidth: number, maxLines: number, measure: MeasureText): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean)
  const lines: string[] = []
  let current = ""
  const fits = (s: string) => measure(s, fontSpec) <= maxWidth

  const pushWord = (word: string) => {
    const candidate = current ? `${current} ${word}` : word
    if (fits(candidate)) {
      current = candidate
      return
    }
    if (current) lines.push(current)
    current = ""
    // Hard-break a word wider than the line.
    let rest = word
    while (!fits(rest) && rest.length > 1) {
      let cut = rest.length - 1
      while (cut > 1 && !fits(rest.slice(0, cut))) cut--
      lines.push(rest.slice(0, cut))
      rest = rest.slice(cut)
    }
    current = rest
  }

  for (const word of words) pushWord(word)
  if (current) lines.push(current)
  if (lines.length <= maxLines) return lines

  const kept = lines.slice(0, maxLines)
  let last = kept[maxLines - 1]
  while (last.length > 0 && !fits(`${last}…`)) last = last.slice(0, -1).trimEnd()
  kept[maxLines - 1] = `${last}…`
  return kept
}

interface Piece {
  svg: string
}

export interface RoadmapCard {
  svg: string
  width: number
  height: number
}

export function roadmapToSvg(input: ShareInput, measure: MeasureText = approxMeasure): RoadmapCard {
  const { project, roadmap, resources, today, options } = input
  const out: Piece[] = []
  const add = (svg: string) => out.push({ svg })
  const text = (x: number, y: number, value: string, size: number, fill: string, weight = 400, extra = "") =>
    add(
      `<text x="${x}" y="${y}" font-family='${CARD_FONT_STACK}' font-size="${size}" font-weight="${weight}" fill="${fill}"${extra}>${esc(value)}</text>`
    )

  let y = PAD

  // Header — project dot, title, objective, stats, segmented progress.
  const dot = normalizeProjectColor(project.color)
  const titleLines = wrapText(project.title, font(40, 700), W - PAD * 2 - 36, 2, measure)
  titleLines.forEach((line, i) => {
    const baseline = y + 40 + i * 50
    if (i === 0) add(`<circle cx="${PAD + 10}" cy="${baseline - 14}" r="10" fill="${dot}"/>`)
    text(PAD + 36, baseline, line, 40, C.text, 700)
  })
  y += 40 + (titleLines.length - 1) * 50

  if (project.objective?.trim()) {
    const objLines = wrapText(project.objective.trim(), font(22, 400), W - PAD * 2, 2, measure)
    objLines.forEach((line, i) => text(PAD, y + 40 + i * 30, line, 22, C.muted, 400, ` font-style="italic"`))
    y += 40 + (objLines.length - 1) * 30
  }

  const { totals } = roadmap
  y += 40
  text(
    PAD,
    y,
    `${totals.milestonesDone}/${totals.milestones} milestones  ·  ${totals.tasksDone}/${totals.tasks} tasks  ·  ${percent(roadmap)}%`,
    18,
    C.text,
    600
  )
  text(W - PAD, y, `As of ${format(today, "d MMM yyyy")}`, 18, C.muted, 400, ` text-anchor="end"`)

  if (roadmap.milestones.length > 0) {
    y += 22
    const gap = 6
    const n = roadmap.milestones.length
    const segW = (W - PAD * 2 - gap * (n - 1)) / n
    roadmap.milestones.forEach((entry, i) => {
      const x = PAD + i * (segW + gap)
      add(`<rect x="${x}" y="${y}" width="${segW}" height="8" rx="4" fill="${C.track}"/>`)
      if (entry.progress > 0) {
        const fill = entry.schedule === "overdue" ? C.danger : C.primary
        add(`<rect x="${x}" y="${y}" width="${(segW * entry.progress) / 100}" height="8" rx="4" fill="${fill}"/>`)
      }
    })
    y += 8
  }

  y += 36
  add(`<line x1="${PAD}" y1="${y}" x2="${W - PAD}" y2="${y}" stroke="${C.border}" stroke-width="1"/>`)
  y += 44

  // Milestones on a rail.
  const nodes: Array<{ cy: number; done: boolean }> = []
  if (roadmap.milestones.length === 0) {
    text(PAD, y + 4, "No milestones yet.", 20, C.muted)
    y += 40
  }

  roadmap.milestones.forEach((entry) => {
    const { milestone } = entry
    const isNext = roadmap.nextMilestoneId === milestone.id
    const done = milestone.completed
    const overdue = !done && entry.schedule === "overdue"
    const top = y

    const titleFont = font(24, 600)
    const tLines = wrapText(milestone.title, titleFont, CONTENT_W - (isNext ? 80 : 0), 2, measure)
    tLines.forEach((line, i) => {
      text(CONTENT_X, y + 24 + i * 32, line, 24, done ? C.muted : C.text, 600, done ? ` text-decoration="line-through"` : "")
    })
    if (isNext) {
      const lastW = measure(tLines[tLines.length - 1], titleFont)
      const bx = CONTENT_X + lastW + 14
      const by = y + 6 + (tLines.length - 1) * 32
      add(`<rect x="${bx}" y="${by}" width="62" height="24" rx="12" fill="${C.primarySoft}"/>`)
      text(bx + 31, by + 17, "Next", 14, C.primary, 700, ` text-anchor="middle"`)
    }
    const nodeCy = y + 16
    nodes.push({ cy: nodeCy, done })
    y += 24 + (tLines.length - 1) * 32

    y += 28
    const metaColor = overdue ? C.danger : !done && entry.schedule === "due-soon" ? C.amber : C.muted
    text(CONTENT_X, y, milestoneStatusLine(entry, false), 17, metaColor, 500)

    if (options.includeNotes && milestone.note?.trim()) {
      const noteLines = wrapText(milestone.note.trim(), font(18), CONTENT_W - 32, 3, measure)
      const boxTop = y + 16
      const boxH = 20 + noteLines.length * 26
      add(`<rect x="${CONTENT_X}" y="${boxTop}" width="${CONTENT_W}" height="${boxH}" rx="10" fill="${C.surface}"/>`)
      noteLines.forEach((line, i) => text(CONTENT_X + 16, boxTop + 31 + i * 26, line, 18, C.muted))
      y = boxTop + boxH
    }

    if (options.includeTasks && entry.tasks.length > 0) {
      y += 10
      const shown = entry.tasks.slice(0, MAX_TASKS_PER_MILESTONE)
      shown.forEach((task) => {
        y += 32
        const bx = CONTENT_X
        const by = y - 16
        if (task.completed) {
          add(`<rect x="${bx}" y="${by}" width="18" height="18" rx="4" fill="${C.primary}"/>`)
          add(`<path d="M${bx + 4.5} ${by + 9.5} l3.5 3.5 l6 -7" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`)
        } else {
          add(`<rect x="${bx + 0.75}" y="${by + 0.75}" width="16.5" height="16.5" rx="4" fill="none" stroke="${C.faint}" stroke-width="1.5"/>`)
        }
        const due = task.dueDate && isValidDateISO(task.dueDate) ? shortDate(task.dueDate) : ""
        const dueW = due ? measure(due, font(16)) + 16 : 0
        const line = wrapText(task.title, font(19), CONTENT_W - 32 - dueW, 1, measure)[0] ?? ""
        text(bx + 32, y, line, 19, task.completed ? C.faint : C.text, 400, task.completed ? ` text-decoration="line-through"` : "")
        if (due) text(W - PAD, y, due, 16, C.muted, 400, ` text-anchor="end"`)
      })
      if (entry.tasks.length > shown.length) {
        y += 30
        text(CONTENT_X + 32, y, `+ ${entry.tasks.length - shown.length} more`, 17, C.muted)
      }
    }

    if (options.includeResources) {
      const linked = resolveResources(milestone.resourceIds, resources)
      if (linked.length > 0) {
        y += 34
        const label = "Resources  "
        text(CONTENT_X, y, label, 17, C.muted, 600)
        const lw = measure(label, font(17, 600))
        const names = wrapText(linked.map((r) => r.title).join("  ·  "), font(17), CONTENT_W - lw, 1, measure)[0] ?? ""
        text(CONTENT_X + lw, y, names, 17, C.text)
      }
    }

    y = Math.max(y, top + 40) + 44
  })

  // Rail: segments between nodes, then the nodes on top.
  nodes.forEach((node, i) => {
    const next = nodes[i + 1]
    if (next) {
      add(`<line x1="${RAIL_X}" y1="${node.cy + 14}" x2="${RAIL_X}" y2="${next.cy - 14}" stroke="${node.done ? C.primary : C.border}" stroke-width="3" stroke-linecap="round"/>`)
    }
  })
  roadmap.milestones.forEach((entry, i) => {
    const { cy } = nodes[i]
    const isNext = roadmap.nextMilestoneId === entry.milestone.id
    if (entry.milestone.completed) {
      add(`<circle cx="${RAIL_X}" cy="${cy}" r="13" fill="${C.primary}"/>`)
      add(`<path d="M${RAIL_X - 6} ${cy + 0.5} l4 4 l8 -9" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`)
    } else {
      const stroke = entry.schedule === "overdue" ? C.danger : entry.schedule === "due-soon" ? C.amber : isNext ? C.primary : C.faint
      add(`<circle cx="${RAIL_X}" cy="${cy}" r="12" fill="${C.bg}" stroke="${stroke}" stroke-width="3"/>`)
      if (isNext) add(`<circle cx="${RAIL_X}" cy="${cy}" r="4.5" fill="${C.primary}"/>`)
    }
  })

  // Tasks without a milestone.
  if (options.includeTasks && roadmap.unassigned.length > 0) {
    text(PAD, y, "Other tasks", 20, C.text, 600)
    const shown = roadmap.unassigned.slice(0, MAX_TASKS_PER_MILESTONE)
    shown.forEach((task) => {
      y += 32
      const marker = task.completed ? "✓" : "○"
      const due = task.dueDate && isValidDateISO(task.dueDate) ? shortDate(task.dueDate) : ""
      const dueW = due ? measure(due, font(16)) + 16 : 0
      const line = wrapText(task.title, font(19), W - PAD * 2 - 32 - dueW, 1, measure)[0] ?? ""
      text(PAD, y, marker, 18, task.completed ? C.primary : C.faint, 700)
      text(PAD + 32, y, line, 19, task.completed ? C.faint : C.text, 400, task.completed ? ` text-decoration="line-through"` : "")
      if (due) text(W - PAD, y, due, 16, C.muted, 400, ` text-anchor="end"`)
    })
    if (roadmap.unassigned.length > shown.length) {
      y += 30
      text(PAD + 32, y, `+ ${roadmap.unassigned.length - shown.length} more`, 17, C.muted)
    }
    y += 44
  }

  if (options.includeResources) {
    const linked = resolveResources(project.resourceIds, resources)
    if (linked.length > 0) {
      text(PAD, y, "Resources", 20, C.text, 600)
      const lines = wrapText(linked.map((r) => r.title).join("  ·  "), font(18), W - PAD * 2, 2, measure)
      lines.forEach((line) => {
        y += 30
        text(PAD, y, line, 18, C.muted)
      })
      y += 44
    }
  }

  // Footer.
  add(`<line x1="${PAD}" y1="${y}" x2="${W - PAD}" y2="${y}" stroke="${C.border}" stroke-width="1"/>`)
  y += 36
  text(PAD, y, "Magic Kick", 16, C.muted, 700)
  text(W - PAD, y, "Project roadmap", 16, C.faint, 400, ` text-anchor="end"`)
  const height = Math.ceil(y + PAD - 20)

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${height}" viewBox="0 0 ${W} ${height}">` +
    `<rect width="${W}" height="${height}" fill="${C.bg}"/>` +
    out.map((p) => p.svg).join("") +
    `</svg>`
  return { svg, width: W, height }
}
