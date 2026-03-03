"use client"

import { useEffect, useMemo, useState } from "react"
import { addDays, differenceInCalendarDays, differenceInCalendarWeeks, endOfYear, format, isAfter, isBefore, parseISO, startOfYear } from "date-fns"
import { useAppStore } from "@/lib/store"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { Project } from "@/lib/types"

type SortKey = "date" | "name"
type SortDirection = "asc" | "desc"
type TimelineStatus = "not-started" | "in-progress" | "completed" | "overdue"

type InteractionMode = "move" | "resize-start" | "resize-end"

interface TimelineRow {
  id: string
  label: string
  start: Date
  end: Date
  status: TimelineStatus
  statusReason: string
  lateCompletion: boolean
  dueSoon: boolean
}

interface DraftWeeks {
  startWeek: number
  endWeek: number
}

const ITEMS_PER_PAGE = 10
const TOTAL_WEEKS = 52
const DAY_MS = 24 * 60 * 60 * 1000
const DUE_SOON_DAYS = 14

function clampWeek(value: number) {
  return Math.max(1, Math.min(TOTAL_WEEKS, value))
}

function normalizeRange(startWeek: number, endWeek: number) {
  const clampedStart = clampWeek(startWeek)
  const clampedEnd = clampWeek(endWeek)
  if (clampedStart <= clampedEnd) return { startWeek: clampedStart, endWeek: clampedEnd }
  return { startWeek: clampedEnd, endWeek: clampedStart }
}

function yearWeekToDate(year: number, week: number, endOfWeekRange = false) {
  const yearStart = startOfYear(new Date(year, 0, 1))
  const weekStart = addDays(yearStart, (clampWeek(week) - 1) * 7)
  return endOfWeekRange ? addDays(weekStart, 6) : weekStart
}

function dateToWeekInYear(date: Date, selectedYear: number) {
  const yearStart = startOfYear(new Date(selectedYear, 0, 1))
  const weeks = differenceInCalendarWeeks(date, yearStart, { weekStartsOn: 1 })
  return clampWeek(weeks + 1)
}

function statusFromProject(project: Project): { status: TimelineStatus; statusReason: string } {
  const today = new Date()
  const start = parseISO(project.weekStartISO)
  const end = parseISO(project.weekEndISO)
  const completedCount = project.milestones.filter((m) => m.completed).length
  const allCompleted = project.milestones.length > 0 && completedCount === project.milestones.length
  if (allCompleted) return { status: "completed", statusReason: "All milestones completed" }
  if (isBefore(end, today)) return { status: "overdue", statusReason: "Timeline end date is in the past" }
  if (isAfter(start, today) && completedCount === 0) return { status: "not-started", statusReason: "Project starts in the future" }
  return { status: "in-progress", statusReason: "Active timeline with incomplete milestones" }
}

export function ProjectsTimelineChart({ projects }: { projects: Project[] }) {
  const updateProject = useAppStore((s) => s.updateProject)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [sortKey, setSortKey] = useState<SortKey>("date")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [alertOnly, setAlertOnly] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [flashPhase, setFlashPhase] = useState(false)
  const [weekLabels] = useState(() => Array.from({ length: TOTAL_WEEKS }, (_, idx) => `W${idx + 1}`))
  const [draftRanges, setDraftRanges] = useState<Record<string, DraftWeeks>>({})
  const [interaction, setInteraction] = useState<{
    projectId: string
    mode: InteractionMode
    startX: number
    origin: DraftWeeks
  } | null>(null)

  const availableYears = useMemo(() => {
    const years = new Set<number>()
    years.add(new Date().getFullYear())
    for (const project of projects) {
      years.add(parseISO(project.weekStartISO).getFullYear())
      years.add(parseISO(project.weekEndISO).getFullYear())
    }
    return [...years].sort((a, b) => a - b)
  }, [projects])

  const rows = useMemo<TimelineRow[]>(() => {
    const rangeStart = startOfYear(new Date(selectedYear, 0, 1))
    const rangeEnd = endOfYear(rangeStart)

    const mapped = projects
      .map((project) => {
        const start = parseISO(project.weekStartISO)
        const end = parseISO(project.weekEndISO)
        const today = new Date()
        const latestCompletedMilestone = project.milestones
          .filter((m) => m.completed)
          .sort((a, b) => b.dayIndex - a.dayIndex)[0]
        const actualEnd = latestCompletedMilestone ? addDays(start, latestCompletedMilestone.dayIndex) : null
        const lateCompletion = Boolean(actualEnd && actualEnd.getTime() - end.getTime() > DAY_MS)
        const derived = statusFromProject(project)
        const daysUntilEnd = differenceInCalendarDays(end, today)
        const dueSoon = derived.status !== "completed" && daysUntilEnd >= 0 && daysUntilEnd <= DUE_SOON_DAYS
        return {
          id: project.id,
          label: project.title,
          start,
          end,
          status: derived.status,
          statusReason: derived.statusReason,
          lateCompletion,
          dueSoon,
        }
      })
      .filter((row) => !(row.end < rangeStart || row.start > rangeEnd))

    const alertFiltered = alertOnly ? mapped.filter((row) => row.status === "overdue" || row.lateCompletion || row.dueSoon) : mapped
    const sorted = [...alertFiltered].sort((a, b) => {
      if (sortKey === "name") return a.label.localeCompare(b.label)
      return a.start.getTime() - b.start.getTime()
    })
    return sortDirection === "asc" ? sorted : sorted.reverse()
  }, [projects, selectedYear, alertOnly, sortKey, sortDirection])

  const pageCount = Math.max(1, Math.ceil(rows.length / ITEMS_PER_PAGE))

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, pageCount))
  }, [pageCount])

  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return rows.slice(start, start + ITEMS_PER_PAGE)
  }, [rows, currentPage])

  const statusCounts = useMemo(
    () =>
      rows.reduce(
        (acc, row) => {
          acc[row.status] += 1
          return acc
        },
        {
          "not-started": 0,
          "in-progress": 0,
          completed: 0,
          overdue: 0,
        } as Record<TimelineStatus, number>
      ),
    [rows]
  )

  useEffect(() => {
    if (!pageRows.some((row) => row.status === "overdue")) return
    const interval = window.setInterval(() => setFlashPhase((value) => !value), 650)
    return () => window.clearInterval(interval)
  }, [pageRows])

  useEffect(() => {
    const nextDrafts: Record<string, DraftWeeks> = {}
    for (const row of rows) {
      nextDrafts[row.id] = normalizeRange(dateToWeekInYear(row.start, selectedYear), dateToWeekInYear(row.end, selectedYear))
    }
    setDraftRanges(nextDrafts)
  }, [rows, selectedYear])

  function commitProjectRange(projectId: string, range: DraftWeeks) {
    const normalized = normalizeRange(range.startWeek, range.endWeek)
    updateProject(projectId, {
      weekStartISO: format(yearWeekToDate(selectedYear, normalized.startWeek), "yyyy-MM-dd"),
      weekEndISO: format(yearWeekToDate(selectedYear, normalized.endWeek, true), "yyyy-MM-dd"),
    })
  }

  useEffect(() => {
    if (!interaction) return
    const active = interaction
    function onPointerMove(event: MouseEvent) {
      const deltaWeeks = Math.round((event.clientX - active.startX) / 22)
      setDraftRanges((prev) => {
        const current = prev[active.projectId] ?? active.origin
        if (!current) return prev
        let next: DraftWeeks = current
        if (active.mode === "move") {
          const span = active.origin.endWeek - active.origin.startWeek
          const startWeek = clampWeek(active.origin.startWeek + deltaWeeks)
          const endWeek = clampWeek(startWeek + span)
          next = normalizeRange(startWeek, endWeek)
        } else if (active.mode === "resize-start") {
          next = normalizeRange(active.origin.startWeek + deltaWeeks, active.origin.endWeek)
        } else {
          next = normalizeRange(active.origin.startWeek, active.origin.endWeek + deltaWeeks)
        }
        return { ...prev, [active.projectId]: next }
      })
    }
    function onPointerUp() {
      const latest = draftRanges[active.projectId] ?? active.origin
      commitProjectRange(active.projectId, latest)
      setInteraction(null)
    }
    window.addEventListener("mousemove", onPointerMove)
    window.addEventListener("mouseup", onPointerUp)
    return () => {
      window.removeEventListener("mousemove", onPointerMove)
      window.removeEventListener("mouseup", onPointerUp)
    }
  }, [interaction, draftRanges, selectedYear])

  function startInteraction(projectId: string, mode: InteractionMode, clientX: number) {
    const origin = draftRanges[projectId]
    if (!origin) return
    setInteraction({ projectId, mode, startX: clientX, origin })
  }

  function setSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"))
      return
    }
    setSortKey(nextKey)
    setSortDirection("asc")
  }

  const sortArrow = (key: SortKey) => (sortKey === key ? (sortDirection === "asc" ? "^" : "v") : "")
  const currentWeek = dateToWeekInYear(new Date(), selectedYear)

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="grid gap-3 md:grid-cols-3 md:items-center">
          <div className="flex items-center gap-2">
            <select
              value={selectedYear}
              onChange={(event) => {
                setSelectedYear(Number(event.target.value))
                setCurrentPage(1)
              }}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              aria-label="Filter timeline by year"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button type="button" size="sm" variant={sortKey === "date" ? "default" : "outline"} onClick={() => setSort("date")}>
              Date {sortArrow("date")}
            </Button>
            <Button type="button" size="sm" variant={sortKey === "name" ? "default" : "outline"} onClick={() => setSort("name")}>
              Name {sortArrow("name")}
            </Button>
            <Button type="button" size="sm" variant={alertOnly ? "destructive" : "outline"} onClick={() => setAlertOnly((value) => !value)}>
              Alerts
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 md:justify-end">
            {[
              { key: "not-started", label: "Not started", className: "bg-slate-300/70 border-slate-400", count: statusCounts["not-started"] },
              { key: "in-progress", label: "In progress", className: "bg-emerald-500/60 border-emerald-500", count: statusCounts["in-progress"] },
              { key: "completed", label: "Completed", className: "bg-blue-500/60 border-blue-500", count: statusCounts.completed },
              { key: "overdue", label: "Overdue", className: "bg-red-300/60 border-red-500", count: statusCounts.overdue },
              { key: "late", label: "Late completion", className: "bg-red-200/70 border-red-300", count: rows.filter((row) => row.lateCompletion).length },
              { key: "due-soon", label: "Due soon", className: "bg-amber-300/80 border-amber-400", count: rows.filter((row) => row.dueSoon).length },
            ].map((legend) => (
              <div key={legend.key} className="flex items-center gap-1.5 text-xs">
                <span className={cn("h-3 w-3 rounded-sm border", legend.className)} />
                <span>{legend.label}</span>
                {"count" in legend ? <span className="text-muted-foreground">({legend.count})</span> : null}
              </div>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Status rules: Completed = all milestones done; Overdue = end date in past and not completed; Not started = starts in future with no completed milestones; In progress = otherwise. Alerts show overdue, late completion, and due soon ({DUE_SOON_DAYS}d).
        </p>

        <div className="sticky top-0 z-10 rounded-md border border-border/80 bg-card/95 py-1 backdrop-blur">
          <div className="grid gap-0.5 text-center text-[10px] text-muted-foreground" style={{ gridTemplateColumns: "repeat(52, minmax(0, 1fr))" }}>
            {weekLabels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-border/70 p-2">
          <div className="space-y-2">
            {pageRows.map((row) => {
              const range = draftRanges[row.id] ?? normalizeRange(dateToWeekInYear(row.start, selectedYear), dateToWeekInYear(row.end, selectedYear))
              const leftPct = ((range.startWeek - 1) / TOTAL_WEEKS) * 100
              const widthPct = ((range.endWeek - range.startWeek + 1) / TOTAL_WEEKS) * 100
              const isOverdue = row.status === "overdue"
              const barColor = row.lateCompletion
                ? "bg-red-200 border-red-300"
                : row.status === "completed"
                  ? "bg-blue-500/35 border-blue-500"
                  : row.status === "not-started"
                    ? "bg-slate-300/35 border-slate-500"
                  : isOverdue
                    ? "bg-red-300/35 border-red-500"
                    : "bg-emerald-500/30 border-emerald-500"
              return (
                <div key={row.id} className="rounded-md border border-border/60 bg-card p-2">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="truncate text-xs font-medium">{row.label}</p>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px]",
                          row.status === "completed" && "bg-blue-500/20 text-blue-700 dark:text-blue-300",
                          row.status === "in-progress" && "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
                          row.status === "overdue" && "bg-red-500/20 text-red-700 dark:text-red-300",
                          row.status === "not-started" && "bg-slate-500/20 text-slate-700 dark:text-slate-300"
                        )}
                      >
                        {row.status}
                      </Badge>
                      {row.dueSoon && row.status !== "overdue" ? <Badge className="bg-amber-500/80 text-black text-[10px]">due soon</Badge> : null}
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="date"
                        className="h-7 rounded-md border border-input bg-background px-2 text-[11px]"
                        value={format(yearWeekToDate(selectedYear, range.startWeek), "yyyy-MM-dd")}
                        onChange={(event) => {
                          const nextWeek = dateToWeekInYear(parseISO(event.target.value), selectedYear)
                          const next = normalizeRange(nextWeek, range.endWeek)
                          setDraftRanges((prev) => ({ ...prev, [row.id]: next }))
                          commitProjectRange(row.id, next)
                        }}
                        aria-label={`${row.label} start date`}
                      />
                      <input
                        type="date"
                        className="h-7 rounded-md border border-input bg-background px-2 text-[11px]"
                        value={format(yearWeekToDate(selectedYear, range.endWeek, true), "yyyy-MM-dd")}
                        onChange={(event) => {
                          const nextWeek = dateToWeekInYear(parseISO(event.target.value), selectedYear)
                          const next = normalizeRange(range.startWeek, nextWeek)
                          setDraftRanges((prev) => ({ ...prev, [row.id]: next }))
                          commitProjectRange(row.id, next)
                        }}
                        aria-label={`${row.label} end date`}
                      />
                    </div>
                  </div>
                  <p className="mb-1 text-[10px] text-muted-foreground">{row.statusReason}</p>
                  <div className="relative h-10 overflow-hidden rounded-md border border-border/50 bg-secondary/25">
                    <div className="absolute inset-y-0 border-r border-yellow-400/80 bg-yellow-300/25" style={{ left: `${((currentWeek - 1) / TOTAL_WEEKS) * 100}%`, width: `${100 / TOTAL_WEEKS}%` }} />
                    <div
                      className={cn("absolute top-1 bottom-1 rounded border shadow-sm", barColor, isOverdue && (flashPhase ? "ring-2 ring-red-500/60" : ""))}
                      style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 1.5)}%` }}
                    >
                      <div
                        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize rounded-l bg-black/20"
                        onMouseDown={(event) => startInteraction(row.id, "resize-start", event.clientX)}
                      />
                      <div
                        className="flex h-full cursor-grab items-center justify-center px-2 text-[11px] font-medium"
                        onMouseDown={(event) => startInteraction(row.id, "move", event.clientX)}
                      >
                        {row.label}
                      </div>
                      <div
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize rounded-r bg-black/20"
                        onMouseDown={(event) => startInteraction(row.id, "resize-end", event.clientX)}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
            {pageRows.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No projects for this year.</p> : null}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Button type="button" size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>
            Prev
          </Button>
          <p className="text-xs text-muted-foreground">
            Page {currentPage} / {pageCount} ({rows.length} items)
          </p>
          <Button type="button" size="sm" variant="outline" disabled={currentPage >= pageCount} onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}>
            Next
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
