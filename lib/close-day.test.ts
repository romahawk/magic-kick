import { describe, expect, it } from "vitest"
import {
  CLOSE_DAY_ESSENTIAL_KEYS,
  CLOSE_DAY_MORE_KEYS,
  DAILY_FOCUS_SNAPSHOT_DAYS,
  addCloseDayChip,
  addReason,
  buildCloseDayChecklist,
  closeDayChipsFor,
  closeDayJournalEntry,
  composeCloseDayFields,
  dailyFocusSnapshotTasks,
  findDailyFocusSnapshot,
  initialTicks,
  insertChip,
  mergeDailyFocusSnapshots,
  nextDailyFocusSnapshots,
  pruneDailyFocusSnapshots,
  removeCloseDayChip,
  selectClosedDayEntries,
  selectLegacyJournalEntries,
} from "./close-day"
import { DAILY_REVIEW_SECTIONS, buildDailyReview, emptyDailyReviewFields } from "./os-feed/daily-review"
import type { JournalEntry } from "./types"
import type { DayAgendaEntry } from "./weekly-plan"
import type { DailyFocusSnapshot, Task } from "./types"

const task = (patch: Partial<Task>): Task =>
  ({ id: patch.title ?? "t", title: "Task", category: "Work", completed: false, xpValue: 10, ...patch }) as Task
const toLocal = (date: Date) => date.toISOString().slice(0, 10)
const block = (patch: Partial<DayAgendaEntry>): DayAgendaEntry => ({
  id: "b1",
  startTime: "09:00",
  endTime: "10:00",
  title: "Block",
  status: "planned",
  ...patch,
})

const TODAY = "2026-10-17"
const tasks = [
  task({ title: "Write ADR", lane: "daily-focus", order: 2 }),
  task({ title: "Send CV", lane: "daily-focus", order: 1, completed: true, completedAt: "2026-10-17T10:00:00Z" }),
  task({ title: "Old focus done", lane: "daily-focus", completed: true, completedAt: "2026-10-10T10:00:00Z" }),
  task({ title: "Admin", lane: "backlog", completed: true, completedAt: "2026-10-17T15:00:00Z" }),
  task({ title: "Focus deleted", lane: "daily-focus", deleted: true }),
  task({ title: "Yesterday's win", completed: true, completedAt: "2026-10-16T12:00:00Z" }),
]

describe("buildCloseDayChecklist for today", () => {
  const checklist = buildCloseDayChecklist({
    tasks,
    dateISO: TODAY,
    todayISO: TODAY,
    toLocalDateISO: toLocal,
    agenda: [
      block({ id: "b1", linkedTaskId: "Write ADR", title: "Write ADR" }),
      block({ id: "b2", title: "Gym", status: "done" }),
      block({ id: "b3", title: "Call with Anna" }),
    ],
  })

  it("lists Daily Focus, then blocks, then other completed tasks, once each", () => {
    expect(checklist.plan).toBe("today")
    expect(checklist.items.map((item) => [item.title, item.source, item.done])).toEqual([
      ["Send CV", "focus", true],
      ["Write ADR", "focus", false],
      ["Gym", "block", true],
      ["Call with Anna", "block", false],
      ["Admin", "done", true],
    ])
  })

  it("pre-ticks completed items only", () => {
    expect(initialTicks(checklist.items)).toEqual({
      "Send CV": true,
      "Write ADR": false,
      "block:b2": true,
      "block:b3": false,
      Admin: true,
    })
  })
})

describe("composeCloseDayFields", () => {
  const items = buildCloseDayChecklist({ tasks, dateISO: TODAY, todayISO: TODAY, toLocalDateISO: toLocal, agenda: [] }).items

  it("puts ticked lines in Completed and unticked lines, with notes, in Carry Forward", () => {
    const ticks = initialTicks(items)
    const fields = composeCloseDayFields(emptyDailyReviewFields(), items, ticks, { "Write ADR": "  ran out of   time " })
    expect(fields.completed).toBe("- Send CV\n- Admin")
    expect(fields.carryForward).toBe("- Write ADR: ran out of time")
  })

  it("moves a line when it is ticked or unticked", () => {
    const ticks = { ...initialTicks(items), "Write ADR": true, "Send CV": false }
    const fields = composeCloseDayFields(emptyDailyReviewFields(), items, ticks, {})
    expect(fields.completed).toBe("- Write ADR\n- Admin")
    expect(fields.carryForward).toBe("- Send CV")
  })

  it("keeps Roman's own text after each list and leaves other fields as typed", () => {
    const extras = { ...emptyDailyReviewFields(), completed: "admin tasks", carryForward: "- Book dentist", blockers: "- Low energy" }
    const fields = composeCloseDayFields(extras, items, initialTicks(items), {})
    expect(fields.completed).toBe("- Send CV\n- Admin\nadmin tasks")
    expect(fields.carryForward).toBe("- Write ADR\n- Book dentist")
    expect(fields.blockers).toBe("- Low energy")
  })

  it("writes all 8 headings in template order when only the 4 essentials are filled", () => {
    const extras = { ...emptyDailyReviewFields(), blockers: "- Scope unclear", decisions: "- Decided to ship" }
    const file = buildDailyReview(TODAY, composeCloseDayFields(extras, items, initialTicks(items), {}))
    expect(file.split("\n").filter((line) => line.startsWith("## "))).toEqual(
      DAILY_REVIEW_SECTIONS.map((section) => `## ${section.heading}`),
    )
    expect(file).toContain("## Completed\n\n- Send CV\n- Admin")
    expect(file).toContain("## Carry Forward\n\n- Write ADR")
    for (const heading of ["Primary Outcome", "Meaningful Progress", "Captured Learning", "Stop / Avoid"]) {
      expect(file).toContain(`## ${heading}\n\nNone.`)
    }
  })

  it("splits the 8 sections into 3 shown fields (plus the checklist) and 4 behind More", () => {
    const keys = [...CLOSE_DAY_ESSENTIAL_KEYS, ...CLOSE_DAY_MORE_KEYS, "completed"].sort()
    expect(keys).toEqual(DAILY_REVIEW_SECTIONS.map((section) => section.key).sort())
  })
})

describe("chips", () => {
  it("offers the blocker set, and the same set plus 'Moved on purpose' for reasons", () => {
    expect(closeDayChipsFor("blockers").presets).toEqual([
      "Waiting on someone",
      "Ran out of time",
      "Low energy",
      "Unplanned admin",
      "Scope unclear",
    ])
    expect(closeDayChipsFor("reasons").presets).toEqual([...closeDayChipsFor("blockers").presets, "Moved on purpose"])
  })

  it("inserts a chip as a new line, once for a full entry, open-ended for a starter", () => {
    expect(insertChip("", "Low energy")).toBe("- Low energy")
    expect(insertChip("- Waiting on someone\n", "Low energy")).toBe("- Waiting on someone\n- Low energy")
    expect(insertChip("- Low energy", "Low energy")).toBe("- Low energy")
    expect(insertChip("- Decided to ship", "Decided to ")).toBe("- Decided to ship\n- Decided to ")
  })

  it("adds a reason to a Carry Forward note", () => {
    expect(addReason("", "Ran out of time")).toBe("Ran out of time")
    expect(addReason("blocked by review", "Waiting on someone")).toBe("blocked by review; waiting on someone")
    expect(addReason("Ran out of time", "ran out of time")).toBe("Ran out of time")
  })

  it("saves and removes custom chips per section, without duplicates or blanks", () => {
    let saved = addCloseDayChip([], "blockers", "  Kids  sick ")
    expect(saved).toEqual([{ section: "blockers", text: "Kids sick" }])
    expect(addCloseDayChip(saved, "blockers", "kids sick")).toBe(saved)
    expect(addCloseDayChip(saved, "blockers", "low energy")).toBe(saved)
    expect(addCloseDayChip(saved, "blockers", "   ")).toBe(saved)
    saved = addCloseDayChip(saved, "decisions", "Kids sick")
    expect(closeDayChipsFor("blockers", saved).custom).toEqual(["Kids sick"])
    expect(closeDayChipsFor("learning", saved).custom).toEqual([])
    saved = removeCloseDayChip(saved, "blockers", "Kids sick")
    expect(saved).toEqual([{ section: "decisions", text: "Kids sick" }])
  })

  it("caps a section's saved chips", () => {
    let saved = addCloseDayChip([], "learning", "x0")
    for (let i = 1; i < 20; i++) saved = addCloseDayChip(saved, "learning", `x${i}`)
    expect(saved).toHaveLength(12)
  })
})

describe("Daily Focus snapshots", () => {
  const snap = (date: string, titles: string[], savedAt = 1): DailyFocusSnapshot => ({
    date,
    tasks: titles.map((title) => ({ id: title, title })),
    savedAt,
  })

  it("holds the lane's open tasks and those completed that day, in order", () => {
    expect(dailyFocusSnapshotTasks(tasks, TODAY, toLocal)).toEqual([
      { id: "Send CV", title: "Send CV" },
      { id: "Write ADR", title: "Write ADR" },
    ])
  })

  it("is keyed by date: today's write replaces today's, other days stay", () => {
    const start = [snap("2026-10-16", ["A"])]
    const next = nextDailyFocusSnapshots(start, [{ id: "B", title: "B" }], TODAY, 5)!
    expect(next.map((s) => s.date)).toEqual(["2026-10-17", "2026-10-16"])
    const later = nextDailyFocusSnapshots(next, [{ id: "C", title: "C" }], TODAY, 9)!
    expect(findDailyFocusSnapshot(later, TODAY)?.tasks).toEqual([{ id: "C", title: "C" }])
    expect(later).toHaveLength(2)
  })

  it("returns null when nothing changed, and saves an empty lane only over an earlier list", () => {
    const start = [snap(TODAY, ["A"])]
    expect(nextDailyFocusSnapshots(start, [{ id: "A", title: "A" }], TODAY, 2)).toBeNull()
    expect(nextDailyFocusSnapshots([], [], TODAY, 2)).toBeNull()
    expect(nextDailyFocusSnapshots(start, [], TODAY, 2)?.[0].tasks).toEqual([])
  })

  it("keeps 7 days, the missed-day window", () => {
    expect(DAILY_FOCUS_SNAPSHOT_DAYS).toBe(7)
    const old = ["2026-10-09", "2026-10-10", "2026-10-11", "2026-10-16"].map((date) => snap(date, ["x"]))
    expect(pruneDailyFocusSnapshots(old, TODAY).map((s) => s.date)).toEqual(["2026-10-16", "2026-10-11"])
    const next = nextDailyFocusSnapshots(old, [], TODAY, 3)
    expect(next?.map((s) => s.date)).toEqual(["2026-10-16", "2026-10-11"])
  })

  it("merges two devices per date, newest save winning", () => {
    const local = [snap(TODAY, ["local"], 10), snap("2026-10-16", ["local"], 1)]
    const remote = [snap(TODAY, ["remote"], 5), snap("2026-10-16", ["remote"], 7), snap("2026-10-15", ["remote"], 1)]
    const merged = mergeDailyFocusSnapshots(local, remote, TODAY)
    expect(merged.map((s) => [s.date, s.tasks[0].title])).toEqual([
      ["2026-10-17", "local"],
      ["2026-10-16", "remote"],
      ["2026-10-15", "remote"],
    ])
  })
})

describe("buildCloseDayChecklist for a missed day", () => {
  const agenda = [block({ id: "b9", title: "Deep work" })]

  it("with a snapshot, lists that day's plan, ticking what was done that day", () => {
    const snapshot: DailyFocusSnapshot = {
      date: "2026-10-16",
      tasks: [
        { id: "Yesterday's win", title: "Yesterday's win" },
        { id: "gone", title: "Task since deleted" },
      ],
      savedAt: 1,
    }
    const checklist = buildCloseDayChecklist({ tasks, dateISO: "2026-10-16", todayISO: TODAY, toLocalDateISO: toLocal, agenda, snapshot })
    expect(checklist.plan).toBe("snapshot")
    expect(checklist.items.map((item) => [item.title, item.done])).toEqual([
      ["Yesterday's win", true],
      ["Task since deleted", false],
      ["Deep work", false],
    ])
    const fields = composeCloseDayFields(emptyDailyReviewFields(), checklist.items, initialTicks(checklist.items), {})
    expect(fields.carryForward).toBe("- Task since deleted\n- Deep work")
  })

  it("without a snapshot, falls back to that day's completed tasks and an empty Carry Forward", () => {
    const checklist = buildCloseDayChecklist({ tasks, dateISO: "2026-10-16", todayISO: TODAY, toLocalDateISO: toLocal, agenda })
    expect(checklist.plan).toBe("none")
    expect(checklist.items.map((item) => item.title)).toEqual(["Yesterday's win"])
    const fields = composeCloseDayFields(emptyDailyReviewFields(), checklist.items, initialTicks(checklist.items), {})
    expect(fields.completed).toBe("- Yesterday's win")
    expect(fields.carryForward).toBe("")
  })

  it("does not change any task", () => {
    const before = JSON.stringify(tasks)
    const checklist = buildCloseDayChecklist({ tasks, dateISO: TODAY, todayISO: TODAY, toLocalDateISO: toLocal, agenda })
    composeCloseDayFields(emptyDailyReviewFields(), checklist.items, {}, {})
    dailyFocusSnapshotTasks(tasks, TODAY, toLocal)
    expect(JSON.stringify(tasks)).toBe(before)
  })
})

describe("Journal cards (P27)", () => {
  const fields = { ...emptyDailyReviewFields(), completed: "- Ship P27", blockers: "- Low energy", carryForward: "- Tests" }
  const card = (id: string, dateISO: string, closedAt: number, extra: Partial<JournalEntry> = {}): JournalEntry => ({
    ...closeDayJournalEntry({ dateISO, fields, doneCount: 1, openCount: 1, osUrl: null, commitUrl: null }),
    closedAt,
    id,
    deleted: false,
    clientUpdatedAt: closedAt,
    ...extra,
  })
  const legacy = (id: string, extra: Partial<JournalEntry> = {}): JournalEntry => ({
    id, dateISO: "2026-10-01", type: "daily", mood: 3, highlights: "x", challenges: "", nextSteps: "", deleted: false, clientUpdatedAt: 1, ...extra,
  })

  it("keeps every section as committed and mirrors three into the old fields", () => {
    const entry = closeDayJournalEntry({
      dateISO: "2026-10-19", fields, doneCount: 3, openCount: 1, osUrl: "https://os/file", commitUrl: "https://os/commit",
    })
    expect(entry).toMatchObject({
      type: "close", dateISO: "2026-10-19", doneCount: 3, openCount: 1, osUrl: "https://os/file", commitUrl: "https://os/commit",
      highlights: "- Ship P27", challenges: "- Low energy", nextSteps: "- Tests",
    })
    expect(entry.review).toEqual(fields)
    expect(entry.review).not.toBe(fields)
  })

  it("lists one card per day, newest day first, the latest close winning", () => {
    const list = selectClosedDayEntries([
      card("a", "2026-10-17", 10),
      card("b", "2026-10-19", 20),
      card("c", "2026-10-17", 30),
      card("d", "2026-10-18", 40, { deleted: true }),
      legacy("e"),
    ])
    expect(list.map((entry) => entry.id)).toEqual(["b", "c"])
  })

  it("treats every live non-close entry as old", () => {
    const old = selectLegacyJournalEntries([card("a", "2026-10-19", 1), legacy("b"), legacy("c", { type: "weekly" }), legacy("d", { deleted: true })])
    expect(old.map((entry) => entry.id)).toEqual(["b", "c"])
  })
})
