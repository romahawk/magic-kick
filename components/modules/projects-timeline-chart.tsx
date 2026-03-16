"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { addDays, differenceInCalendarDays, differenceInCalendarWeeks, endOfYear, format, isAfter, isBefore, parseISO, startOfYear } from "date-fns"
import { useAppStore } from "@/lib/store"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { ArrowDownAZ, ArrowUpDown, AlertTriangle, CalendarDays, Info, Sparkles } from "lucide-react"
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

function isProjectVisibleOnTimeline(project: Project) {
  return project.showOnTimeline !== false
}

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
  const [draftOverrides, setDraftOverrides] = useState<Record<string, DraftWeeks>>({})
  const [interaction, setInteraction] = useState<{
    projectId: string
    mode: InteractionMode
    startX: number
    origin: DraftWeeks
  } | null>(null)

  const visibleProjects = useMemo(() => projects.filter((project) => isProjectVisibleOnTimeline(project)), [projects])

  const availableYears = useMemo(() => {
    const years = new Set<number>()
    years.add(new Date().getFullYear())
    for (const project of visibleProjects) {
      years.add(parseISO(project.weekStartISO).getFullYear())
      years.add(parseISO(project.weekEndISO).getFullYear())
    }
    return [...years].sort((a, b) => a - b)
  }, [visibleProjects])

  const rows = useMemo<TimelineRow[]>(() => {
    const rangeStart = startOfYear(new Date(selectedYear, 0, 1))
    const rangeEnd = endOfYear(rangeStart)

    const mapped = visibleProjects
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
  }, [visibleProjects, selectedYear, alertOnly, sortKey, sortDirection])

  const pageCount = Math.max(1, Math.ceil(rows.length / ITEMS_PER_PAGE))
  const activePage = Math.min(currentPage, pageCount)

  const pageRows = useMemo(() => {
    const start = (activePage - 1) * ITEMS_PER_PAGE
    return rows.slice(start, start + ITEMS_PER_PAGE)
  }, [rows, activePage])

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
  const lateCount = rows.filter((row) => row.lateCompletion).length
  const dueSoonCount = rows.filter((row) => row.dueSoon).length
  const alertCount = statusCounts.overdue + lateCount + dueSoonCount

  useEffect(() => {
    if (!pageRows.some((row) => row.status === "overdue")) return
    const interval = window.setInterval(() => setFlashPhase((value) => !value), 650)
    return () => window.clearInterval(interval)
  }, [pageRows])

  const baseDraftRanges = useMemo(() => {
    const nextDrafts: Record<string, DraftWeeks> = {}
    for (const row of rows) {
      nextDrafts[row.id] = normalizeRange(dateToWeekInYear(row.start, selectedYear), dateToWeekInYear(row.end, selectedYear))
    }
    return nextDrafts
  }, [rows, selectedYear])

  const draftRanges = useMemo(
    () => ({ ...baseDraftRanges, ...draftOverrides }),
    [baseDraftRanges, draftOverrides]
  )

  const commitProjectRange = useCallback((projectId: string, range: DraftWeeks) => {
    const normalized = normalizeRange(range.startWeek, range.endWeek)
    updateProject(projectId, {
      weekStartISO: format(yearWeekToDate(selectedYear, normalized.startWeek), "yyyy-MM-dd"),
      weekEndISO: format(yearWeekToDate(selectedYear, normalized.endWeek, true), "yyyy-MM-dd"),
    })
  }, [selectedYear, updateProject])

  useEffect(() => {
    if (!interaction) return
    const active = interaction
    function onPointerMove(event: MouseEvent) {
      const deltaWeeks = Math.round((event.clientX - active.startX) / 22)
      setDraftOverrides((prev) => {
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
      setDraftOverrides((prev) => {
        const next = { ...prev }
        delete next[active.projectId]
        return next
      })
      setInteraction(null)
    }
    window.addEventListener("mousemove", onPointerMove)
    window.addEventListener("mouseup", onPointerUp)
    return () => {
      window.removeEventListener("mousemove", onPointerMove)
      window.removeEventListener("mouseup", onPointerUp)
    }
  }, [commitProjectRange, draftRanges, interaction])

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
      <CardContent className="space-y-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-border/70 bg-secondary/20 p-3">
            <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              Timeline Year
            </div>
            <p className="text-2xl font-semibold">{selectedYear}</p>
            <p className="text-xs text-muted-foreground">{rows.length} visible projects</p>
          </div>
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
            <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-amber-200">
              <AlertTriangle className="h-3.5 w-3.5" />
              Alerts
            </div>
            <p className="text-2xl font-semibold">{alertCount}</p>
            <p className="text-xs text-muted-foreground">Overdue, late completion, and due soon</p>
          </div>
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3">
            <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-emerald-200">
              <Sparkles className="h-3.5 w-3.5" />
              Progress
            </div>
            <p className="text-2xl font-semibold">{statusCounts["in-progress"] + statusCounts.completed}</p>
            <p className="text-xs text-muted-foreground">In progress or completed this year</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-secondary/20 p-3">
            <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <ArrowUpDown className="h-3.5 w-3.5" />
              Sort Mode
            </div>
            <p className="text-2xl font-semibold">{sortKey === "date" ? "Date" : "Name"}</p>
            <p className="text-xs text-muted-foreground">{sortDirection === "asc" ? "Ascending" : "Descending"}</p>
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[auto_1fr_auto] xl:items-center">
          <div className="flex items-center gap-2">
            <select
              value={selectedYear}
              onChange={(event) => {
                setSelectedYear(Number(event.target.value))
                setCurrentPage(1)
                setDraftOverrides({})
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

          <div className="flex flex-wrap items-center gap-2 xl:justify-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" size="icon" variant={sortKey === "date" ? "default" : "outline"} onClick={() => setSort("date")} aria-label={`Sort by date ${sortArrow("date")}`}>
                  <CalendarDays className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent sideOffset={8}>Sort by Date {sortArrow("date")}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" size="icon" variant={sortKey === "name" ? "default" : "outline"} onClick={() => setSort("name")} aria-label={`Sort by name ${sortArrow("name")}`}>
                  <ArrowDownAZ className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent sideOffset={8}>Sort by Name {sortArrow("name")}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" size="icon" variant={alertOnly ? "destructive" : "outline"} onClick={() => setAlertOnly((value) => !value)} aria-label={alertOnly ? "Alert filter on" : "Show alert projects only"}>
                  <AlertTriangle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent sideOffset={8}>{alertOnly ? "Alert Filter On" : "Only Show Alert Projects"}</TooltipContent>
            </Tooltip>
            <div className="flex flex-wrap items-center gap-1.5 pl-1">
              <Badge variant="outline" className="gap-1">
                <span className="h-2 w-2 rounded-full bg-slate-300" />
                Not started {statusCounts["not-started"]}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                In progress {statusCounts["in-progress"]}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                Completed {statusCounts.completed}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <span className="h-2 w-2 rounded-full bg-red-400" />
                Overdue {statusCounts.overdue}
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            <Badge className="bg-red-500/15 text-red-200 hover:bg-red-500/20">Late completion {lateCount}</Badge>
            <Badge className="bg-amber-500/15 text-amber-100 hover:bg-amber-500/20">Due soon {dueSoonCount}</Badge>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs text-sky-100 transition-colors hover:bg-sky-500/15"
                  aria-label="View status rules"
                >
                  <Info className="h-3.5 w-3.5" />
                  Status rules
                </button>
              </TooltipTrigger>
              <TooltipContent sideOffset={8} className="max-w-sm leading-relaxed">
                Completed: all milestones done. Overdue: end date is in the past and not completed. Not started: starts in the future with no completed milestones. In progress: everything else. Alerts cover overdue, late completion, and due soon within {DUE_SOON_DAYS} days.
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

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
                          setDraftOverrides((prev) => ({ ...prev, [row.id]: next }))
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
                          setDraftOverrides((prev) => ({ ...prev, [row.id]: next }))
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
          <Button type="button" size="sm" variant="outline" disabled={activePage <= 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>
            Prev
          </Button>
          <p className="text-xs text-muted-foreground">
            Page {activePage} / {pageCount} ({rows.length} items)
          </p>
          <Button type="button" size="sm" variant="outline" disabled={activePage >= pageCount} onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}>
            Next
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
