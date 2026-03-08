"use client"

import { useState, useEffect, useCallback, useMemo, useRef, type DragEvent } from "react"
import { useAppStore } from "@/lib/store"
import { getWeekDays } from "@/lib/game-utils"
import { cn } from "@/lib/utils"
import { format, parseISO, isSameDay } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarDays, Play, Pause, RotateCcw, Timer, Pencil, ExternalLink, Briefcase, FolderKanban, Mail, Rocket, Target, AlertTriangle, ChevronDown, SlidersHorizontal } from "lucide-react"
import type { ExecutionBlockTemplate, ScheduleItem, TaskCategory } from "@/lib/types"
import { DEFAULT_EXECUTION_BLOCKS } from "@/lib/execution-os"

const POMODORO_WORK = 25 * 60
const POMODORO_BREAK = 5 * 60
const DEFAULT_TASK_CATEGORIES = ["Learning", "Sport", "Family/Home", "Hobby", "Travel"]
const DAY_START_HOUR = 6
const DAY_END_HOUR = 23
const MINUTES_PER_DAY = 24 * 60
const GRID_SNAP_MINUTES = 30
const HOUR_ROW_HEIGHT_PX = 64
const PIXELS_PER_MINUTE = HOUR_ROW_HEIGHT_PX / 60
const DEEP_WORK_BLOCK_MINUTES = 90

const EXECUTION_BLOCK_STYLES = [
  { icon: Briefcase, tone: "text-sky-300 border-sky-500/30 bg-sky-500/10" },
  { icon: FolderKanban, tone: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10" },
  { icon: Mail, tone: "text-amber-200 border-amber-500/30 bg-amber-500/10" },
  { icon: Rocket, tone: "text-violet-200 border-violet-500/30 bg-violet-500/10" },
] as const

function clampMinutes(minutes: number) {
  return Math.max(0, Math.min(MINUTES_PER_DAY - 1, minutes))
}

function snapMinutes(minutes: number) {
  return Math.round(minutes / GRID_SNAP_MINUTES) * GRID_SNAP_MINUTES
}

function minutesToHHmm(totalMinutes: number) {
  const clamped = clampMinutes(totalMinutes)
  const hours = Math.floor(clamped / 60)
  const minutes = clamped % 60
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

function clampToDayWindow(minutes: number) {
  const start = DAY_START_HOUR * 60
  const end = DAY_END_HOUR * 60
  return Math.max(start, Math.min(end, minutes))
}

function dateToMinutes(valueISO: string) {
  const date = parseISO(valueISO)
  return date.getHours() * 60 + date.getMinutes()
}

function getDurationMinutes(item: ScheduleItem, fallbackMinutes: number) {
  if (item.hasExplicitTime === false) return Math.max(15, fallbackMinutes)
  const start = parseISO(item.startISO).getTime()
  const end = parseISO(item.endISO).getTime()
  const diff = Math.round((end - start) / 60000)
  if (!Number.isFinite(diff)) return Math.max(15, fallbackMinutes)
  return Math.max(15, diff)
}

export function ScheduleModule() {
  const allSchedule = useAppStore((s) => s.schedule)
  const allTasks = useAppStore((s) => s.tasks)
  const taskCategories = useAppStore((s) => s.profile.taskCategories)
  const systemConfig = useAppStore((s) => s.profile.systemConfig)
  const categories = taskCategories?.length ? taskCategories : DEFAULT_TASK_CATEGORIES
  const updateTask = useAppStore((s) => s.updateTask)
  const updateSystemConfig = useAppStore((s) => s.updateSystemConfig)
  const updateScheduleItem = useAppStore((s) => s.updateScheduleItem)
  const unscheduleTask = useAppStore((s) => s.unscheduleTask)
  const moveTaskToTodo = useAppStore((s) => s.moveTaskToTodo)
  const weekDays = getWeekDays()
  const schedule = allSchedule.filter((item) => !item.deleted)
  const tasks = allTasks.filter((task) => !task.deleted)
  const [selectedDay, setSelectedDay] = useState(
    weekDays.find((d) => d.isToday)?.iso ?? weekDays[0].iso
  )
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editCategory, setEditCategory] = useState<TaskCategory>("Learning")
  const [editDate, setEditDate] = useState("")
  const [editStartTime, setEditStartTime] = useState("09:00")
  const [editEndTime, setEditEndTime] = useState("09:30")
  const [editEstimate, setEditEstimate] = useState("")
  const [editBlockTypeId, setEditBlockTypeId] = useState("none")
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null)
  const [isGridDragOver, setIsGridDragOver] = useState(false)
  const [weekDragOverDay, setWeekDragOverDay] = useState<string | null>(null)
  const [showRecommendedStructure, setShowRecommendedStructure] = useState(true)
  const [isBlockEditorOpen, setIsBlockEditorOpen] = useState(false)
  const [draftExecutionBlocks, setDraftExecutionBlocks] = useState<ExecutionBlockTemplate[]>([])
  const dayGridRef = useRef<HTMLDivElement | null>(null)
  const activeEditCategory = useMemo(
    () => (categories.includes(editCategory) ? editCategory : (categories[0] ?? "General")),
    [categories, editCategory]
  )
  const executionBlockTemplate = useMemo(
    () => systemConfig?.executionBlocks?.length ? systemConfig.executionBlocks : DEFAULT_EXECUTION_BLOCKS,
    [systemConfig]
  )
  const executionBlockById = useMemo(
    () => new Map(executionBlockTemplate.map((block) => [block.id, block])),
    [executionBlockTemplate]
  )

  const dayItems = useMemo(
    () =>
      schedule
        .filter((item) => {
          const itemDate = parseISO(item.startISO)
          return format(itemDate, "yyyy-MM-dd") === selectedDay
        })
        .sort((a, b) => a.startISO.localeCompare(b.startISO)),
    [schedule, selectedDay]
  )

  const timedDayItems = useMemo(() => dayItems.filter((item) => item.hasExplicitTime !== false), [dayItems])
  const noTimeDayItems = useMemo(() => dayItems.filter((item) => item.hasExplicitTime === false), [dayItems])
  const weekItems = useMemo(() => [...schedule].sort((a, b) => a.startISO.localeCompare(b.startISO)), [schedule])
  const hourMarkers = useMemo(
    () => Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }, (_, idx) => DAY_START_HOUR + idx),
    []
  )
  const selectedDayExecutionItems = useMemo(
    () => timedDayItems.filter((item) => item.blockTypeId && executionBlockById.has(item.blockTypeId)),
    [executionBlockById, timedDayItems]
  )
  const selectedDayDeepWorkItems = useMemo(
    () =>
      timedDayItems.filter((item) => {
        if (!item.blockTypeId) return false
        const block = executionBlockById.get(item.blockTypeId)
        return Boolean(block && block.duration >= DEEP_WORK_BLOCK_MINUTES)
      }),
    [executionBlockById, timedDayItems]
  )
  const selectedDayMicroItems = useMemo(
    () => timedDayItems.filter((item) => !item.blockTypeId || !executionBlockById.has(item.blockTypeId)),
    [executionBlockById, timedDayItems]
  )
  const selectedDayExecutionMinutes = useMemo(
    () => selectedDayExecutionItems.reduce((total, item) => total + getDurationMinutes(item, 30), 0),
    [selectedDayExecutionItems]
  )
  const selectedDayBlockHealth = useMemo(() => {
    if (selectedDayExecutionMinutes >= 240 && selectedDayDeepWorkItems.length >= 2 && selectedDayMicroItems.length <= 2) {
      return {
        label: "Execution-ready",
        description: "The day is shaped around meaningful blocks with limited fragmentation.",
        tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
      }
    }
    if (selectedDayExecutionMinutes >= 180 && selectedDayDeepWorkItems.length >= 1) {
      return {
        label: "Workable",
        description: "The day has real execution blocks, but it could use one more deep-work window.",
        tone: "border-sky-500/30 bg-sky-500/10 text-sky-200",
      }
    }
    return {
      label: "Fragmented",
      description: "Too much of the day is still shaped like small tasks instead of execution blocks.",
      tone: "border-amber-500/30 bg-amber-500/10 text-amber-100",
    }
  }, [selectedDayDeepWorkItems.length, selectedDayExecutionMinutes, selectedDayMicroItems.length])

  function moveItemToSlot(scheduleItemId: string, minutesFromStartOfDay: number) {
    const item = schedule.find((entry) => entry.id === scheduleItemId)
    if (!item?.linkedTaskId) return
    const linkedTask = tasks.find((entry) => entry.id === item.linkedTaskId)
    const duration = getDurationMinutes(item, linkedTask?.estimateMin ?? 30)
    const windowStart = DAY_START_HOUR * 60
    const windowEnd = DAY_END_HOUR * 60
    const maxStart = Math.max(windowStart, windowEnd - duration)
    const snappedStart = clampToDayWindow(snapMinutes(minutesFromStartOfDay))
    const startMinutes = Math.min(snappedStart, maxStart)
    const endMinutes = clampToDayWindow(startMinutes + duration)

    updateTask(
      item.linkedTaskId,
      {
        dueDate: selectedDay,
      },
      {
        startHHmm: minutesToHHmm(startMinutes),
        endHHmm: minutesToHHmm(endMinutes),
      }
    )
  }

  function onGridDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsGridDragOver(true)
  }

  function onGridDragLeave() {
    setIsGridDragOver(false)
  }

  function onGridDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    const draggedId = draggedItemId ?? event.dataTransfer.getData("text/plain")
    setIsGridDragOver(false)
    setDraggedItemId(null)
    if (!draggedId) return
    const grid = dayGridRef.current
    if (!grid) return
    const rect = grid.getBoundingClientRect()
    const y = event.clientY - rect.top + grid.scrollTop
    const minutes = DAY_START_HOUR * 60 + Math.floor(y / PIXELS_PER_MINUTE)
    moveItemToSlot(draggedId, minutes)
  }

  function moveItemToDay(scheduleItemId: string, targetDayISO: string) {
    const item = schedule.find((entry) => entry.id === scheduleItemId)
    if (!item) return
    if (!item.linkedTaskId) {
      const startHHmm = format(parseISO(item.startISO), "HH:mm")
      const endHHmm = format(parseISO(item.endISO), "HH:mm")
      updateScheduleItem(item.id, {
        startISO: `${targetDayISO}T${startHHmm}`,
        endISO: `${targetDayISO}T${endHHmm}`,
      })
      return
    }
    const hasExplicitTime = item.hasExplicitTime !== false
    if (!hasExplicitTime) {
      updateTask(item.linkedTaskId, { dueDate: targetDayISO })
      return
    }
    const startHHmm = format(parseISO(item.startISO), "HH:mm")
    const endHHmm = format(parseISO(item.endISO), "HH:mm")
    updateTask(
      item.linkedTaskId,
      { dueDate: targetDayISO },
      { startHHmm, endHHmm }
    )
  }

  function startWeekItemDrag(event: DragEvent<HTMLElement>, scheduleItemId: string) {
    setDraggedItemId(scheduleItemId)
    event.dataTransfer.setData("text/plain", scheduleItemId)
    event.dataTransfer.effectAllowed = "move"
  }

  function onWeekDayDragOver(event: DragEvent<HTMLElement>, dayISO: string) {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
    if (weekDragOverDay !== dayISO) setWeekDragOverDay(dayISO)
  }

  function onWeekDayDrop(event: DragEvent<HTMLElement>, dayISO: string) {
    event.preventDefault()
    const draggedId = draggedItemId ?? event.dataTransfer.getData("text/plain")
    setWeekDragOverDay(null)
    setDraggedItemId(null)
    if (!draggedId) return
    moveItemToDay(draggedId, dayISO)
  }

  function openTaskEditor(scheduleItemId: string) {
    const item = schedule.find((entry) => entry.id === scheduleItemId)
    if (!item?.linkedTaskId) return
    const task = tasks.find((entry) => entry.id === item.linkedTaskId)
    if (!task) return
    const hasExplicitTime = item.hasExplicitTime !== false
    setEditingTaskId(task.id)
    setEditTitle(task.title)
    setEditCategory(task.category)
    setEditDate(task.dueDate ?? format(parseISO(item.startISO), "yyyy-MM-dd"))
    setEditStartTime(hasExplicitTime ? format(parseISO(item.startISO), "HH:mm") : "")
    setEditEndTime(hasExplicitTime ? format(parseISO(item.endISO), "HH:mm") : "")
    setEditEstimate(task.estimateMin ? String(task.estimateMin) : "")
    setEditBlockTypeId(item.blockTypeId ?? "none")
  }

  function saveTaskFromSchedule() {
    if (!editingTaskId) return
    updateTask(
      editingTaskId,
      {
        title: editTitle.trim(),
        category: activeEditCategory,
        dueDate: editDate || undefined,
        estimateMin: editEstimate ? Number(editEstimate) : undefined,
      },
      {
        startHHmm: editStartTime,
        endHHmm: editEndTime,
        blockTypeId: editBlockTypeId === "none" ? "" : editBlockTypeId,
      }
    )
    setEditingTaskId(null)
  }

  function handleRemoveTimeAssignment() {
    if (!editingTaskId) return
    unscheduleTask(editingTaskId)
    setEditingTaskId(null)
  }

  function handleMoveToTodo() {
    if (!editingTaskId) return
    moveTaskToTodo(editingTaskId)
    setEditingTaskId(null)
  }

  function openBlockEditor() {
    setDraftExecutionBlocks(executionBlockTemplate.map((block) => ({ ...block })))
    setIsBlockEditorOpen(true)
  }

  function updateDraftBlock(index: number, field: keyof ExecutionBlockTemplate, value: string) {
    setDraftExecutionBlocks((current) =>
      current.map((block, blockIndex) =>
        blockIndex === index
          ? {
              ...block,
              [field]:
                field === "duration"
                  ? Math.max(15, Math.min(240, Number(value) || 15))
                  : value,
            }
          : block
      )
    )
  }

  function saveExecutionBlocks() {
    updateSystemConfig({
      executionBlocks: draftExecutionBlocks.map((block, index) => ({
        id: block.id || executionBlockTemplate[index]?.id || `block-${index + 1}`,
        title: block.title.trim() || `Block ${index + 1}`,
        purpose: block.purpose.trim() || "Execution block",
        duration: Math.max(15, Math.min(240, Number(block.duration) || 60)),
      })),
    })
    setIsBlockEditorOpen(false)
  }

  function resetExecutionBlocks() {
    setDraftExecutionBlocks(DEFAULT_EXECUTION_BLOCKS.map((block) => ({ ...block })))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight">Schedule</h1>
          <p className="text-sm text-muted-foreground">Plan execution blocks first, then fit microtasks around them.</p>
        </div>
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <a href="https://calendar.google.com/" target="_blank" rel="noreferrer noopener">
            Google Calendar
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>
      </div>

      <Card className="border-border/70 bg-gradient-to-br from-card via-card to-primary/5">
        <CardContent className="flex flex-col gap-5 p-5">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowRecommendedStructure((current) => !current)}
                  className="flex items-center gap-2 text-left text-sm font-medium text-primary transition-opacity hover:opacity-80"
                  aria-expanded={showRecommendedStructure}
                >
                  <ChevronDown className={cn("h-4 w-4 transition-transform", showRecommendedStructure ? "rotate-0" : "-rotate-90")} />
                  <Target className="h-4 w-4" />
                  Recommended Daily Structure
                </button>
                <Button type="button" variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-xs" onClick={openBlockEditor}>
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Customize
                </Button>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Your schedule should contain execution blocks, not microtasks.</h2>
                <p className="text-sm text-muted-foreground">
                  Define your own block names, durations, and purposes so the schedule matches your execution style.
                </p>
              </div>
            </div>
            <div className={cn("rounded-full border px-3 py-1 text-xs font-medium", selectedDayBlockHealth.tone)}>
              {selectedDayBlockHealth.label}
            </div>
          </div>

          {showRecommendedStructure ? (
            <div className="grid gap-3 lg:grid-cols-4">
              {executionBlockTemplate.map((block, index) => {
                const style = EXECUTION_BLOCK_STYLES[index % EXECUTION_BLOCK_STYLES.length]
                const Icon = style.icon
                return (
                  <div key={block.id} className="rounded-2xl border border-border/70 bg-background/60 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl border", style.tone)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <Badge variant="outline" className="border-border/70 text-xs">
                        {block.duration} min
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">{block.title}</p>
                      <p className="text-sm text-muted-foreground">{block.purpose}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : null}

          <div className="grid gap-3 lg:grid-cols-[1.3fr_1fr]">
            <div className="rounded-2xl border border-border/70 bg-background/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Today&apos;s Shape</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-2xl font-semibold text-foreground">{selectedDayDeepWorkItems.length}</p>
                  <p className="text-sm text-muted-foreground">Deep-work blocks</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-foreground">{Math.round(selectedDayExecutionMinutes / 60)}</p>
                  <p className="text-sm text-muted-foreground">Execution hours</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-foreground">{selectedDayMicroItems.length + noTimeDayItems.length}</p>
                  <p className="text-sm text-muted-foreground">Microtasks / loose items</p>
                </div>
              </div>
            </div>
            <div className={cn("rounded-2xl border p-4", selectedDayBlockHealth.tone)}>
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <div>
                  <p className="font-medium">{selectedDayBlockHealth.label}</p>
                  <p className="mt-1 text-sm opacity-90">{selectedDayBlockHealth.description}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="day">
        <TabsList>
          <TabsTrigger value="day">Day View</TabsTrigger>
          <TabsTrigger value="week">Week View</TabsTrigger>
          <TabsTrigger value="pomodoro">Pomodoro</TabsTrigger>
        </TabsList>

        <TabsContent value="day" className="mt-4 flex flex-col gap-4">
          <Card className="border-border/70">
            <CardContent className="grid gap-4 p-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Block-First Rule</p>
                <h3 className="text-base font-semibold text-foreground">Protect the large blocks. Push small tasks to the edges.</h3>
                <p className="text-sm text-muted-foreground">
                  Assign scheduled work to one of your execution block types when it deserves real protected time. Leave quick items unassigned so they stay treated as microtasks.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl border border-border/70 bg-background/60 p-3">
                  <p className="text-xs text-muted-foreground">Execution blocks</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">{selectedDayExecutionItems.length}</p>
                </div>
                <div className="rounded-xl border border-border/70 bg-background/60 p-3">
                  <p className="text-xs text-muted-foreground">Microtasks</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">{selectedDayMicroItems.length}</p>
                </div>
                <div className="rounded-xl border border-border/70 bg-background/60 p-3">
                  <p className="text-xs text-muted-foreground">Loose items</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">{noTimeDayItems.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Day selector */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {weekDays.map((d) => (
              <button
                key={d.iso}
                onClick={() => setSelectedDay(d.iso)}
                className={cn(
                  "flex min-w-[3.5rem] flex-col items-center rounded-lg px-3 py-2 text-xs transition-colors",
                  selectedDay === d.iso
                    ? "bg-primary text-primary-foreground"
                    : d.isToday
                      ? "bg-primary/10 text-primary"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
              >
                <span className="font-medium">{d.label}</span>
                <span className="text-lg font-bold">{d.short}</span>
              </button>
            ))}
          </div>

          {/* Day schedule */}
          {dayItems.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-8">
                <CalendarDays className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No events for this day.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {noTimeDayItems.length > 0 ? (
                <Card>
                  <CardContent className="space-y-2 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">No Exact Time</p>
                    {noTimeDayItems.map((item) => (
                      <div
                        key={item.id}
                        draggable={Boolean(item.linkedTaskId)}
                        onDragStart={(event) => {
                          setDraggedItemId(item.id)
                          event.dataTransfer.setData("text/plain", item.id)
                        }}
                        onDragEnd={() => {
                          setDraggedItemId(null)
                          setIsGridDragOver(false)
                        }}
                        className={cn(
                          "flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2",
                          item.linkedTaskId ? "cursor-grab active:cursor-grabbing" : ""
                        )}
                      >
                        <div className={cn("h-8 w-1 rounded-full", item.color || "bg-primary")} />
                        <p className="flex-1 text-sm font-medium">{item.title}</p>
                        <Badge variant="outline" className="text-[10px]">
                          Loose task
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">{item.type}</Badge>
                        {item.linkedTaskId ? (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openTaskEditor(item.id)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        ) : null}
                      </div>
                    ))}
                    <p className="text-[11px] text-muted-foreground">
                      Drag a task into the time grid to assign a time slot.
                    </p>
                  </CardContent>
                </Card>
              ) : null}

              <Card>
                <CardContent className="p-0">
                  <div
                    ref={dayGridRef}
                    onDragOver={onGridDragOver}
                    onDragLeave={onGridDragLeave}
                    onDrop={onGridDrop}
                    className={cn(
                      "max-h-[70vh] overflow-y-auto rounded-lg border border-border/60",
                      isGridDragOver ? "bg-primary/5" : ""
                    )}
                  >
                    <div
                      className="grid grid-cols-[3.25rem_1fr]"
                      style={{ height: `${(DAY_END_HOUR - DAY_START_HOUR) * 60 * PIXELS_PER_MINUTE}px` }}
                    >
                      <div className="relative border-r border-border/70 bg-muted/20">
                        {hourMarkers.map((hour) => (
                          <div
                            key={`label-${hour}`}
                            className="absolute left-1 top-0 -translate-y-1/2 text-[10px] text-muted-foreground"
                            style={{ top: `${(hour - DAY_START_HOUR) * 60 * PIXELS_PER_MINUTE}px` }}
                          >
                            {String(hour).padStart(2, "0")}:00
                          </div>
                        ))}
                      </div>

                      <div className="relative">
                        {hourMarkers.map((hour) => (
                          <div
                            key={`line-${hour}`}
                            className="absolute left-0 right-0 border-t border-border/80"
                            style={{ top: `${(hour - DAY_START_HOUR) * 60 * PIXELS_PER_MINUTE}px` }}
                          />
                        ))}
                        {hourMarkers.slice(0, -1).map((hour) => (
                          <div
                            key={`half-${hour}`}
                            className="absolute left-0 right-0 border-t border-dashed border-border/40"
                            style={{ top: `${((hour - DAY_START_HOUR) * 60 + 30) * PIXELS_PER_MINUTE}px` }}
                          />
                        ))}

                        {timedDayItems.map((item) => {
                          const start = parseISO(item.startISO)
                          const end = parseISO(item.endISO)
                          const startMinutes = dateToMinutes(item.startISO)
                          const rawEndMinutes = dateToMinutes(item.endISO)
                          const durationMinutes = Math.max(15, rawEndMinutes - startMinutes)
                          const assignedBlock = item.blockTypeId ? executionBlockById.get(item.blockTypeId) : undefined
                          if (startMinutes < DAY_START_HOUR * 60 || startMinutes > DAY_END_HOUR * 60) return null
                          const top = (startMinutes - DAY_START_HOUR * 60) * PIXELS_PER_MINUTE
                          const height = Math.max(56, durationMinutes * PIXELS_PER_MINUTE)
                          return (
                            <div
                              key={item.id}
                              draggable={Boolean(item.linkedTaskId)}
                              onDragStart={(event) => {
                                setDraggedItemId(item.id)
                                event.dataTransfer.setData("text/plain", item.id)
                              }}
                              onDragEnd={() => {
                                setDraggedItemId(null)
                                setIsGridDragOver(false)
                              }}
                              className={cn(
                                "absolute left-2 right-2 overflow-hidden rounded-md border border-border bg-card px-3 py-2 shadow-sm",
                                item.linkedTaskId ? "cursor-grab active:cursor-grabbing" : ""
                              )}
                              style={{ top: `${top}px`, height: `${height}px` }}
                            >
                              <div className="flex h-full items-start gap-2">
                                <div className={cn("mt-0.5 h-full w-1 rounded-full", item.color || "bg-primary")} />
                                <div className="flex min-w-0 flex-1 flex-col justify-between">
                                  <p className="truncate text-xs font-medium leading-tight">{item.title}</p>
                                  <p className="text-[10px] leading-tight text-muted-foreground">
                                    {format(start, "HH:mm")} - {format(end, "HH:mm")}
                                  </p>
                                  <div className="mt-1 flex items-center gap-1.5">
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        "h-5 border-border/70 px-1.5 text-[9px] uppercase tracking-wide",
                                        assignedBlock ? "text-emerald-300" : "text-amber-200"
                                      )}
                                    >
                                      {assignedBlock ? assignedBlock.title : "Microtask"}
                                    </Badge>
                                    <span className="text-[9px] text-muted-foreground">{durationMinutes} min</span>
                                  </div>
                                </div>
                                {item.linkedTaskId ? (
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openTaskEditor(item.id)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="week" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {weekDays.map((day) => {
              const items = weekItems.filter((item) => {
                const itemDate = parseISO(item.startISO)
                return isSameDay(itemDate, day.date)
              })
              return (
                <Card
                  key={day.iso}
                  className={cn(
                    day.isToday && "ring-2 ring-primary",
                    weekDragOverDay === day.iso && "ring-2 ring-primary/70 bg-primary/5"
                  )}
                  onDragOver={(event) => onWeekDayDragOver(event, day.iso)}
                  onDragLeave={() => {
                    if (weekDragOverDay === day.iso) setWeekDragOverDay(null)
                  }}
                  onDrop={(event) => onWeekDayDrop(event, day.iso)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-sm">
                      <span>{day.label} {day.short}</span>
                      {day.isToday && <Badge className="bg-primary text-primary-foreground text-[10px]">Today</Badge>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-1.5" onDragOver={(event) => onWeekDayDragOver(event, day.iso)} onDrop={(event) => onWeekDayDrop(event, day.iso)}>
                    {items.length === 0 ? (
                      <p className="py-2 text-center text-xs text-muted-foreground">Free day</p>
                    ) : (
                      items.map((item) => {
                        const start = parseISO(item.startISO)
                        const end = parseISO(item.endISO)
                        const hasExplicitTime = item.hasExplicitTime !== false
                        const linkedTask = item.linkedTaskId
                          ? tasks.find((entry) => entry.id === item.linkedTaskId)
                          : null
                        const assignedBlock = item.blockTypeId ? executionBlockById.get(item.blockTypeId) : undefined
                        const isCompletedTask = Boolean(linkedTask?.completed)
                        return (
                          <div
                            key={item.id}
                            className={cn(
                              "flex items-center gap-2 rounded-md border border-border p-2 cursor-grab active:cursor-grabbing",
                              isCompletedTask && "border-emerald-500/50 bg-emerald-500/10"
                            )}
                            draggable
                            onDragStart={(event) => {
                              startWeekItemDrag(event, item.id)
                            }}
                            onDragEnd={() => {
                              setDraggedItemId(null)
                              setWeekDragOverDay(null)
                            }}
                          >
                            <div className={cn("h-6 w-0.5 rounded-full", item.color || "bg-primary")} />
                            <div className="flex-1 min-w-0">
                              <p className={cn("text-xs font-medium truncate", isCompletedTask && "line-through text-muted-foreground")}>{item.title}</p>
                              {hasExplicitTime ? (
                                <p className="text-[10px] text-muted-foreground">
                                  {format(start, "HH:mm")} - {format(end, "HH:mm")}
                                </p>
                              ) : null}
                              {assignedBlock ? (
                                <p className="text-[10px] text-emerald-300">{assignedBlock.title}</p>
                              ) : null}
                            </div>
                            {isCompletedTask ? (
                              <Badge className="h-5 bg-emerald-600 text-[10px] text-white hover:bg-emerald-600">
                                Completed
                              </Badge>
                            ) : null}
                            {item.linkedTaskId ? (
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openTaskEditor(item.id)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            ) : null}
                          </div>
                        )
                      })
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="pomodoro" className="mt-4">
          <PomodoroTimer />
        </TabsContent>
      </Tabs>

      <Dialog open={!!editingTaskId} onOpenChange={(open) => !open && setEditingTaskId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task From Schedule</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="schedule-task-title">Title</Label>
              <Input id="schedule-task-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={activeEditCategory} onValueChange={(v) => setEditCategory(v as TaskCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="schedule-task-date">Date</Label>
              <Input id="schedule-task-date" type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="schedule-task-start">Start</Label>
                <Input id="schedule-task-start" type="time" value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="schedule-task-end">End</Label>
                <Input id="schedule-task-end" type="time" value={editEndTime} onChange={(e) => setEditEndTime(e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="schedule-task-estimate">Estimate (min)</Label>
              <Input id="schedule-task-estimate" type="number" value={editEstimate} onChange={(e) => setEditEstimate(e.target.value)} />
            </div>
            <div>
              <Label>Execution Block Type</Label>
              <Select value={editBlockTypeId} onValueChange={setEditBlockTypeId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None / Microtask</SelectItem>
                  {executionBlockTemplate.map((block) => (
                    <SelectItem key={block.id} value={block.id}>
                      {block.title} ({block.duration} min)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={saveTaskFromSchedule} className="w-full">Save Task</Button>
            <Button variant="outline" onClick={handleRemoveTimeAssignment} className="w-full">
              Remove Assigned Time
            </Button>
            <Button variant="secondary" onClick={handleMoveToTodo} className="w-full">
              Move to ToDo List
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isBlockEditorOpen} onOpenChange={setIsBlockEditorOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Customize Daily Structure</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Rename blocks and update their purpose and duration so the schedule template fits the user, whether that means focused study, training, coding, or admin.
            </p>
            <div className="space-y-3">
              {draftExecutionBlocks.map((block, index) => (
                <div key={block.id} className="grid gap-3 rounded-xl border border-border/70 bg-background/50 p-4 md:grid-cols-[1.2fr_1.5fr_120px]">
                  <div className="space-y-1.5">
                    <Label htmlFor={`block-title-${block.id}`}>Block Name</Label>
                    <Input
                      id={`block-title-${block.id}`}
                      value={block.title}
                      onChange={(event) => updateDraftBlock(index, "title", event.target.value)}
                      placeholder={`Block ${index + 1}`}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`block-purpose-${block.id}`}>Purpose</Label>
                    <Input
                      id={`block-purpose-${block.id}`}
                      value={block.purpose}
                      onChange={(event) => updateDraftBlock(index, "purpose", event.target.value)}
                      placeholder="What this block is for"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`block-duration-${block.id}`}>Minutes</Label>
                    <Input
                      id={`block-duration-${block.id}`}
                      type="number"
                      min={15}
                      max={240}
                      step={15}
                      value={String(block.duration)}
                      onChange={(event) => updateDraftBlock(index, "duration", event.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between gap-3">
              <Button type="button" variant="outline" onClick={resetExecutionBlocks}>
                Reset Defaults
              </Button>
              <Button type="button" onClick={saveExecutionBlocks}>
                Save Structure
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PomodoroTimer() {
  const [mode, setMode] = useState<"work" | "break">("work")
  const [timeLeft, setTimeLeft] = useState(POMODORO_WORK)
  const [running, setRunning] = useState(false)
  const [completedPomodoros, setCompletedPomodoros] = useState(0)

  const totalTime = mode === "work" ? POMODORO_WORK : POMODORO_BREAK
  const progress = ((totalTime - timeLeft) / totalTime) * 100
  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  const handleComplete = useCallback(() => {
    if (mode === "work") {
      setCompletedPomodoros((p) => p + 1)
      setMode("break")
      setTimeLeft(POMODORO_BREAK)
    } else {
      setMode("work")
      setTimeLeft(POMODORO_WORK)
    }
    setRunning(false)
  }, [mode])

  useEffect(() => {
    if (!running) return
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleComplete()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [running, handleComplete])

  function reset() {
    setRunning(false)
    setTimeLeft(mode === "work" ? POMODORO_WORK : POMODORO_BREAK)
  }

  return (
    <div className="mx-auto max-w-sm">
      <Card>
        <CardContent className="flex flex-col items-center gap-6 p-8">
          <div className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              {mode === "work" ? "Focus Time" : "Break Time"}
            </span>
          </div>

          {/* Timer circle */}
          <div className="relative flex h-48 w-48 items-center justify-center">
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 200 200">
              <circle
                cx="100"
                cy="100"
                r="90"
                fill="none"
                className="stroke-secondary"
                strokeWidth="8"
              />
              <circle
                cx="100"
                cy="100"
                r="90"
                fill="none"
                className={mode === "work" ? "stroke-primary" : "stroke-chart-2"}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 90}`}
                strokeDashoffset={`${2 * Math.PI * 90 * (1 - progress / 100)}`}
                style={{ transition: "stroke-dashoffset 0.5s ease" }}
              />
            </svg>
            <div className="z-10 text-center">
              <p className="font-mono text-4xl font-bold tabular-nums text-foreground">
                {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={reset}
              aria-label="Reset timer"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              onClick={() => setRunning(!running)}
              className="gap-2 px-8"
            >
              {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {running ? "Pause" : "Start"}
            </Button>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Completed today: <strong className="text-foreground">{completedPomodoros}</strong></span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
