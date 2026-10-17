/**
 * P11 Close day, second slice (ADR-034): the checklist, the quick-pick chips and the Daily Focus
 * snapshots behind the dialog. Pure functions; the dialog turns their output into the same
 * `DailyReviewFields` the server already takes, so the write path does not change.
 */
import type { CloseDayChip, CloseDayChipSection, DailyFocusSnapshot, Task } from "@/lib/types"
import type { DayAgendaEntry } from "@/lib/weekly-plan"
import { CLOSE_DAY_DAYS_BACK, closeDayDates, selectCompletedOn, toBulletList } from "@/lib/os-feed/daily-review"
import type { DailyReviewFields, DailyReviewKey } from "@/lib/os-feed/daily-review"

// ---------------------------------------------------------------------------------------------
// Checklist

export type CloseDayItemSource = "focus" | "block" | "done"

export interface CloseDayItem {
  /** The task id, or `block:<id>` for a block with no task. */
  key: string
  title: string
  source: CloseDayItemSource
  /** Completed that day; the item starts ticked. */
  done: boolean
}

export interface CloseDayChecklist {
  items: CloseDayItem[]
  /**
   * "today": the live Daily Focus lane. "snapshot": a missed day with a saved list.
   * "none": a missed day without one, so only that day's completed tasks are known (ADR-033 behaviour).
   */
  plan: "today" | "snapshot" | "none"
}

/**
 * The day's plan as ticks: Daily Focus tasks, then scheduled blocks, then anything else completed
 * that day. A block of a listed task is not listed twice. A past day takes its plan from its
 * snapshot; without one only the completed tasks are listed, as before this slice.
 */
export function buildCloseDayChecklist(input: {
  tasks: Task[]
  dateISO: string
  todayISO: string
  toLocalDateISO: (date: Date) => string
  agenda: DayAgendaEntry[]
  snapshot?: DailyFocusSnapshot
}): CloseDayChecklist {
  const { tasks, dateISO, todayISO, toLocalDateISO, agenda, snapshot } = input
  const completed = selectCompletedOn(tasks, dateISO, toLocalDateISO)
  const doneIds = new Set(completed.map((task) => task.id))
  const plan: CloseDayChecklist["plan"] = dateISO === todayISO ? "today" : snapshot ? "snapshot" : "none"

  const items: CloseDayItem[] = []
  const seen = new Set<string>()
  const add = (item: CloseDayItem) => {
    if (seen.has(item.key) || !item.title.trim()) return
    seen.add(item.key)
    items.push(item)
  }

  const focus =
    plan === "today"
      ? tasks
          .filter((task) => !task.deleted && task.lane === "daily-focus" && (!task.completed || doneIds.has(task.id)))
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      : plan === "snapshot"
        ? snapshot!.tasks
        : []
  for (const task of focus) add({ key: task.id, title: task.title, source: "focus", done: doneIds.has(task.id) })

  if (plan !== "none") {
    for (const entry of agenda) {
      add({
        key: entry.linkedTaskId ?? `block:${entry.id}`,
        title: entry.title,
        source: "block",
        done: entry.status === "done" || (entry.linkedTaskId ? doneIds.has(entry.linkedTaskId) : false),
      })
    }
  }

  for (const task of completed) add({ key: task.id, title: task.title, source: "done", done: true })
  return { items, plan }
}

/** Ticks as the checklist opens: completed items ticked, the rest not. */
export function initialTicks(items: CloseDayItem[]): Record<string, boolean> {
  return Object.fromEntries(items.map((item) => [item.key, item.done]))
}

/** One line for an unticked item: `<title>: <note>`, or the title alone. */
export function carryForwardLine(title: string, note?: string): string {
  const reason = note?.replace(/\s+/g, " ").trim()
  return reason ? `${title}: ${reason}` : title
}

function joinBlocks(...blocks: string[]): string {
  return blocks.map((block) => block.trim()).filter(Boolean).join("\n")
}

/**
 * The fields the server writes. Ticked items go to Completed, unticked ones to Carry Forward (with
 * their note); Roman's own text follows each list. Ticks only shape this text: no task changes.
 */
export function composeCloseDayFields(
  extras: DailyReviewFields,
  items: CloseDayItem[],
  ticks: Record<string, boolean>,
  notes: Record<string, string>,
): DailyReviewFields {
  const ticked = items.filter((item) => ticks[item.key])
  const open = items.filter((item) => !ticks[item.key])
  return {
    ...extras,
    completed: joinBlocks(toBulletList(ticked.map((item) => item.title)), extras.completed),
    carryForward: joinBlocks(
      toBulletList(open.map((item) => carryForwardLine(item.title, notes[item.key]))),
      extras.carryForward,
    ),
  }
}

/** Shown by default; the other four sections sit behind "More". The file always has all eight. */
export const CLOSE_DAY_ESSENTIAL_KEYS = ["blockers", "decisions", "carryForward"] as const satisfies readonly DailyReviewKey[]
export const CLOSE_DAY_MORE_KEYS = ["primaryOutcome", "progress", "learning", "stopAvoid"] as const satisfies readonly DailyReviewKey[]

// ---------------------------------------------------------------------------------------------
// Chips

const COMMON_REASONS = ["Waiting on someone", "Ran out of time", "Low energy", "Unplanned admin", "Scope unclear"]

export const CLOSE_DAY_CHIP_PRESETS: Record<CloseDayChipSection, string[]> = {
  blockers: COMMON_REASONS,
  reasons: [...COMMON_REASONS, "Moved on purpose"],
  decisions: ["Decided to ", "Said no to ", "Deferred ", "Committed to "],
  learning: ["Worked well: ", "Next time: ", "Surprised by: "],
}

/** Which field a section's chip writes into; reasons go to a Carry Forward item's note instead. */
export const CLOSE_DAY_CHIP_FIELD: Record<Exclude<CloseDayChipSection, "reasons">, DailyReviewKey> = {
  blockers: "blockers",
  decisions: "decisions",
  learning: "learning",
}

export const CLOSE_DAY_CHIP_MAX = 40
export const CLOSE_DAY_CUSTOM_CHIPS_PER_SECTION = 12

const sameText = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

/** Built-in chips first, then Roman's own, without duplicates. */
export function closeDayChipsFor(section: CloseDayChipSection, custom: CloseDayChip[] = []) {
  const own = custom.filter((chip) => chip.section === section).map((chip) => chip.text)
  const presets = CLOSE_DAY_CHIP_PRESETS[section]
  return {
    presets,
    custom: own.filter((text, index) => !presets.some((p) => sameText(p, text)) && own.findIndex((t) => sameText(t, text)) === index),
  }
}

/** Adds a saved chip. Unchanged when the text is empty, already there, or the section is full. */
export function addCloseDayChip(custom: CloseDayChip[] = [], section: CloseDayChipSection, text: string): CloseDayChip[] {
  const clean = text.replace(/\s+/g, " ").trim().slice(0, CLOSE_DAY_CHIP_MAX)
  if (!clean) return custom
  const { presets, custom: own } = closeDayChipsFor(section, custom)
  if ([...presets, ...own].some((existing) => sameText(existing, clean))) return custom
  if (own.length >= CLOSE_DAY_CUSTOM_CHIPS_PER_SECTION) return custom
  return [...custom, { section, text: clean }]
}

export function removeCloseDayChip(custom: CloseDayChip[] = [], section: CloseDayChipSection, text: string): CloseDayChip[] {
  return custom.filter((chip) => !(chip.section === section && sameText(chip.text, text)))
}

/**
 * A chip's text added to a section as a new `- ` line. A starter ending in a space ("Decided to ")
 * is left open for typing; a full entry already in the section is not added twice.
 */
export function insertChip(current: string, chip: string): string {
  const line = `- ${chip.trimStart()}`
  const lines = current.split("\n")
  if (chip.trim() === chip && lines.some((existing) => sameText(existing, line))) return current
  const body = current.replace(/\s+$/, "")
  return body ? `${body}\n${line}` : line
}

/** A reason chip on a Carry Forward note: it fills an empty note, or follows the text already there. */
export function addReason(note: string, reason: string): string {
  const current = note.trim()
  if (!current) return reason
  if (current.split(/;\s*/).some((part) => sameText(part, reason))) return current
  return `${current}; ${reason.charAt(0).toLowerCase()}${reason.slice(1)}`
}

// ---------------------------------------------------------------------------------------------
// Daily Focus snapshots (ADR-034)

/** One per day the dialog can close: today and the six days before it (ADR-033). */
export const DAILY_FOCUS_SNAPSHOT_DAYS = CLOSE_DAY_DAYS_BACK + 1

/** What a day's snapshot holds: the Daily Focus lane, open tasks and those completed that day. */
export function dailyFocusSnapshotTasks(tasks: Task[], dateISO: string, toLocalDateISO: (date: Date) => string) {
  const doneIds = new Set(selectCompletedOn(tasks, dateISO, toLocalDateISO).map((task) => task.id))
  return tasks
    .filter((task) => !task.deleted && task.lane === "daily-focus" && (!task.completed || doneIds.has(task.id)))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((task) => ({ id: task.id, title: task.title }))
}

/** Only the days still in the window, newest first, one per date. */
export function pruneDailyFocusSnapshots(snapshots: DailyFocusSnapshot[], todayISO: string): DailyFocusSnapshot[] {
  const days = new Set(closeDayDates(todayISO))
  const byDate = new Map<string, DailyFocusSnapshot>()
  for (const snapshot of snapshots) {
    if (!days.has(snapshot.date)) continue
    const existing = byDate.get(snapshot.date)
    if (!existing || snapshot.savedAt > existing.savedAt) byDate.set(snapshot.date, snapshot)
  }
  return [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date))
}

function sameTasks(a: DailyFocusSnapshot["tasks"], b: DailyFocusSnapshot["tasks"]) {
  return a.length === b.length && a.every((task, index) => task.id === b[index].id && task.title === b[index].title)
}

/**
 * Today's snapshot written over today's old one (the last write of the day wins), older days
 * pruned. Null when nothing would change, so an unchanged lane never touches the profile. An empty
 * lane is saved only to replace a list saved earlier that day.
 */
export function nextDailyFocusSnapshots(
  snapshots: DailyFocusSnapshot[] = [],
  tasks: DailyFocusSnapshot["tasks"],
  todayISO: string,
  savedAt: number,
): DailyFocusSnapshot[] | null {
  const pruned = pruneDailyFocusSnapshots(snapshots, todayISO)
  const existing = pruned.find((snapshot) => snapshot.date === todayISO)
  const unchanged = existing ? sameTasks(existing.tasks, tasks) : tasks.length === 0
  if (unchanged) return pruned.length === snapshots.length ? null : pruned
  return pruneDailyFocusSnapshots([{ date: todayISO, tasks, savedAt }, ...pruned], todayISO)
}

/** Two devices' snapshots: per date the newer one wins, whichever profile wins the sync. */
export function mergeDailyFocusSnapshots(
  local: DailyFocusSnapshot[] = [],
  remote: DailyFocusSnapshot[] = [],
  todayISO: string,
): DailyFocusSnapshot[] {
  return pruneDailyFocusSnapshots([...local, ...remote], todayISO)
}

export function findDailyFocusSnapshot(snapshots: DailyFocusSnapshot[] = [], dateISO: string) {
  return snapshots.find((snapshot) => snapshot.date === dateISO)
}
