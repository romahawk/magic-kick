"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"
import { addDays, format, getISOWeek, parseISO } from "date-fns"
import { useAppStore } from "@/lib/store"
import { calculateTimeBlockHours, getActiveWeeklyPlan, getCurrentWeekStartISO, getWeekDates, externalBlockDateParts, selectTaskTimeSlots, selectTimeBlocksForDates, taskDurationMin } from "@/lib/weekly-plan"
import { usePlanInNextSlot } from "@/hooks/use-plan-next-slot"
import { TASK_REPEAT_OPTIONS, WEEK_DAYS, formatRecurrenceDays, isRecurringTask, isTaskOccurrenceComplete, taskRepeatsOnDate } from "@/lib/task-recurrence"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { ChevronLeft, ChevronRight, X, CheckCircle2, Focus, Trash2, Sparkles, PanelRightOpen } from "lucide-react"
import { toast } from "sonner"
import type { ExternalCalendarBlock, ScheduleSuggestion, Task, TaskRepeat, TimeBlock, TimeBlockStatus } from "@/lib/types"
import { cn } from "@/lib/utils"
import { TruncatedTooltip } from "@/components/ui/truncated-tooltip"
import { auth } from "@/lib/firebase/client"
import { isAiEnabled } from "@/lib/ai/flags"
import { detectConflicts, dayIndexToISO } from "@/lib/ai/conflict"
import { ScheduleSuggestionPanel } from "@/components/ai/ScheduleSuggestionPanel"
import { syncGoogleCalendarEvents } from "@/lib/calendar/google-calendar-sync"
import { getCachedGoogleCalendarAccessToken } from "@/lib/calendar/google-oauth"
import { useCategories } from "@/hooks/use-categories"
import { defaultTaskCategory } from "@/lib/categories"
import { CategoryBadge } from "@/components/category-badge"
import { normalizeProjectColor } from "@/lib/project-colors"
import { UnscheduledTasksPanel, type UnscheduleDropState } from "@/components/modules/unscheduled-tasks-panel"
import { TaskDetailSheet } from "@/components/task-detail-sheet"


const HOUR_PX = 64
const DAY_START = 5
const DAY_END = 23
const SNAP_MIN = 15
const TOTAL_HOURS = DAY_END - DAY_START
const GRID_HEIGHT = TOTAL_HOURS * HOUR_PX
const AUTO_CALENDAR_SYNC_INTERVAL_MS = 60_000
const TASKS_PANEL_COLLAPSED_KEY = "magic-kick-schedule-tasks-collapsed"

function toMin(time: string) {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + m
}

function toTime(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

function snap(minutes: number) {
  return Math.round(minutes / SNAP_MIN) * SNAP_MIN
}

function toY(time: string) {
  return ((toMin(time) - DAY_START * 60) / 60) * HOUR_PX
}

function fmtOverrun(diffHours: number) {
  const mins = Math.round(diffHours * 60)
  if (mins < 60) return `+${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `+${h}h ${m}m` : `+${h}h`
}

function yToMin(y: number) {
  return snap(DAY_START * 60 + (y / HOUR_PX) * 60)
}

function blockH(start: string, end: string) {
  return Math.max(HOUR_PX / 4, ((toMin(end) - toMin(start)) / 60) * HOUR_PX)
}

function clampMin(m: number) {
  return Math.max(DAY_START * 60, Math.min(DAY_END * 60, m))
}

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

const HOUR_LABELS = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => {
  const h = DAY_START + i
  return { h, label: h === 12 ? "12 PM" : h < 12 ? `${h} AM` : `${h - 12} PM` }
})

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "")
  const n = parseInt(clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function blockStyle(color: string) {
  const [r, g, b] = hexToRgb(normalizeProjectColor(color || "#6366f1"))
  return {
    backgroundColor: `rgba(${r},${g},${b},0.18)`,
    borderColor: `rgba(${r},${g},${b},0.7)`,
    color: `rgb(${r},${g},${b})`,
  }
}

function externalBlockStyle(blocksTime: boolean) {
  return blocksTime
    ? {
        backgroundColor: "rgba(14, 165, 233, 0.12)",
        borderColor: "rgba(14, 165, 233, 0.7)",
        color: "rgb(2, 132, 199)",
      }
    : {
        backgroundColor: "rgba(148, 163, 184, 0.12)",
        borderColor: "rgba(148, 163, 184, 0.7)",
        color: "rgb(100, 116, 139)",
      }
}

function externalBlockToBusyBlock(block: ExternalCalendarBlock, weekDays: Array<{ iso: string }>): TimeBlock[] {
  if (block.deleted || block.status === "cancelled" || !block.blocksTime) return []
  return weekDays.flatMap((day) => {
    const parts = externalBlockDateParts(block, day.iso)
    if (!parts) return []
    return [
      {
        id: block.id,
        weekPlanId: "external-calendar",
        dateISO: parts.dateISO,
        startTime: parts.startTime,
        endTime: parts.endTime,
        taskDescription: block.title,
        plannedHours: calculateTimeBlockHours(parts.startTime, parts.endTime),
        status: "planned" as const,
        deleted: false,
      },
    ]
  })
}

interface DragState {
  blockId: string
  linkedTaskId?: string
  mode: "move" | "resize"
  origStart: string
  origEnd: string
  origDay: string
  mouseStartX: number
  mouseStartY: number
  blockOffsetY: number
}

interface Preview {
  blockId: string
  startTime: string
  endTime: string
  dateISO: string
}

interface HoverSlot {
  dateISO: string
  startTime: string
  endTime: string
}

interface DisplayBlock {
  id: string
  sourceType: "time-block" | "recurring-task" | "external-calendar"
  linkedTaskId?: string
  projectId?: string
  externalSource?: string
  externalCalendarId?: string
  externalHtmlLink?: string
  blocksTime?: boolean
  allDay?: boolean
  dateISO: string
  startTime: string
  endTime: string
  taskDescription: string
  plannedHours: number
  actualHours?: number
  status: TimeBlockStatus
  repeat?: TaskRepeat
  notes?: string
}

export function ScheduleModule() {
  const categories = useCategories()
  const projects = useAppStore((s) => s.projects).filter((p) => !p.deleted)
  const tasks = useAppStore((s) => s.tasks).filter((t) => !t.deleted)
  const scheduleItems = useAppStore((s) => s.schedule)
  const weeklyPlans = useAppStore((s) => s.weeklyPlans)
  const timeBlocks = useAppStore((s) => s.timeBlocks)
  const allExternalCalendarBlocks = useAppStore((s) => s.externalCalendarBlocks)
  const externalCalendarBlocks = allExternalCalendarBlocks.filter((block) => !block.deleted && block.status !== "cancelled")
  const googleCalendarMetadata = useAppStore((s) => s.profile.googleCalendar)
  const displayExternalBlocks = useAppStore((s) => s.profile.googleCalendar?.displayExternalBlocks ?? true)
  const executionLogs = useAppStore((s) => s.executionLogs)
  const saveTimeBlock = useAppStore((s) => s.saveTimeBlock)
  const updateTimeBlock = useAppStore((s) => s.updateTimeBlock)
  const updateTask = useAppStore((s) => s.updateTask)
  const restoreTask = useAppStore((s) => s.restoreTask)
  const toggleTaskOccurrence = useAppStore((s) => s.toggleTaskOccurrence)
  const deleteTimeBlock = useAppStore((s) => s.deleteTimeBlock)
  const planInNextSlot = usePlanInNextSlot()
  const saveExternalCalendarBlock = useAppStore((s) => s.saveExternalCalendarBlock)
  const deleteExternalCalendarBlock = useAppStore((s) => s.deleteExternalCalendarBlock)
  const setGoogleCalendarMetadata = useAppStore((s) => s.setGoogleCalendarMetadata)
  const ensureWeeklyPlan = useAppStore((s) => s.ensureWeeklyPlan)
  const setActiveModule = useAppStore((s) => s.setActiveModule)

  const [selectedDateISO, setSelectedDateISO] = useState(todayISO)
  const [view, setView] = useState<"week" | "day">("week")
  const [creating, setCreating] = useState<{ dayISO: string; startTime: string; endTime: string } | null>(null)
  const [newDesc, setNewDesc] = useState("")
  const [newProjectId, setNewProjectId] = useState("")
  const [newCategory, setNewCategory] = useState("")
  const [editId, setEditId] = useState<string | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [hoverSlot, setHoverSlot] = useState<HoverSlot | null>(null)
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)
  const [nowY, setNowY] = useState<number | null>(null)
  const [nowDayISO, setNowDayISO] = useState(todayISO())
  const [suggestions, setSuggestions] = useState<ScheduleSuggestion[]>([])
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [rejectedTaskIds, setRejectedTaskIds] = useState<Set<string>>(new Set())
  const [taskDropPreview, setTaskDropPreview] = useState<HoverSlot | null>(null)
  const [unscheduleDrop, setUnscheduleDrop] = useState<UnscheduleDropState>(null)
  const [tasksPanelCollapsed, setTasksPanelCollapsed] = useState(() => {
    if (typeof window === "undefined") return false
    return window.localStorage.getItem(TASKS_PANEL_COLLAPSED_KEY) === "true"
  })

  const dragRef = useRef<DragState | null>(null)
  // A drag or resize ends in a click on the block; this stops that click opening the card.
  const suppressClickRef = useRef(false)
  // The block the card was opened from, so focus goes back to it when the dialog closes.
  const editOriginRef = useRef<HTMLElement | null>(null)
  const gridScrollRef = useRef<HTMLDivElement | null>(null)
  const tasksPanelRef = useRef<HTMLDivElement | null>(null)
  const externalCalendarBlocksRef = useRef(allExternalCalendarBlocks)

  useEffect(() => {
    externalCalendarBlocksRef.current = allExternalCalendarBlocks
  }, [allExternalCalendarBlocks])

  useEffect(() => {
    window.localStorage.setItem(TASKS_PANEL_COLLAPSED_KEY, String(tasksPanelCollapsed))
  }, [tasksPanelCollapsed])

  const weekStartISO = useMemo(() => getCurrentWeekStartISO(parseISO(`${selectedDateISO}T00:00:00`)), [selectedDateISO])
  const activePlan = getActiveWeeklyPlan(weeklyPlans, weekStartISO)
  const weekDays = useMemo(() => getWeekDates(weekStartISO), [weekStartISO])
  const dayIndex = Math.max(0, weekDays.findIndex((d) => d.iso === selectedDateISO))
  const visibleDays = view === "week" ? weekDays : [weekDays[dayIndex]]
  const activeProjects = projects.filter((p) => (p.status ?? "active") === "active")
  const busyBlocks = useMemo(
    () => [
      ...timeBlocks,
      ...externalCalendarBlocks.flatMap((block) => externalBlockToBusyBlock(block, weekDays)),
    ],
    [externalCalendarBlocks, timeBlocks, weekDays]
  )

  useEffect(() => {
    function tick() {
      const d = new Date()
      const m = d.getHours() * 60 + d.getMinutes()
      setNowDayISO(todayISO())
      setNowY(m >= DAY_START * 60 && m <= DAY_END * 60 ? ((m - DAY_START * 60) / 60) * HOUR_PX : null)
    }
    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const calendarIds = googleCalendarMetadata?.enabled ? googleCalendarMetadata.selectedCalendarIds : []
    if (calendarIds.length === 0) return

    let syncing = false
    let cancelled = false

    async function syncFromCachedToken() {
      if (syncing || cancelled) return
      const token = getCachedGoogleCalendarAccessToken()
      if (!token) return

      syncing = true
      try {
        await syncGoogleCalendarEvents({
          accessToken: token,
          calendarIds,
          existingBlocks: externalCalendarBlocksRef.current,
          saveExternalCalendarBlock,
          deleteExternalCalendarBlock,
        })
        setGoogleCalendarMetadata({
          status: "connected",
          lastError: undefined,
          lastSyncedAt: Date.now(),
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : "Google Calendar auto-sync failed."
        setGoogleCalendarMetadata({ status: "error", lastError: message })
      } finally {
        syncing = false
      }
    }

    void syncFromCachedToken()
    const intervalId = window.setInterval(syncFromCachedToken, AUTO_CALENDAR_SYNC_INTERVAL_MS)
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void syncFromCachedToken()
    }
    document.addEventListener("visibilitychange", onVisibilityChange)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [
    deleteExternalCalendarBlock,
    googleCalendarMetadata?.enabled,
    googleCalendarMetadata?.selectedCalendarIds,
    saveExternalCalendarBlock,
    setGoogleCalendarMetadata,
  ])

  const weekBlocks = selectTimeBlocksForDates(timeBlocks, weekDays.map((d) => d.iso))

  const taskTimeSlots = useMemo(() => selectTaskTimeSlots(scheduleItems, timeBlocks), [scheduleItems, timeBlocks])

  const displayBlocks: DisplayBlock[] = (() => {
    const persistedBlocks: DisplayBlock[] = weekBlocks
      .filter((block) => {
        if (!block.linkedTaskId) return true
        const linkedTask = tasks.find((task) => task.id === block.linkedTaskId)
        return !linkedTask || !isRecurringTask(linkedTask)
      })
      .map((block): DisplayBlock => ({
        id: block.id,
        sourceType: "time-block" as const,
        linkedTaskId: block.linkedTaskId,
        projectId: block.projectId,
        dateISO: block.dateISO,
        startTime: block.startTime,
        endTime: block.endTime,
        taskDescription: block.taskDescription,
        plannedHours: block.plannedHours,
        actualHours: block.actualHours,
        status: block.status,
        notes: block.notes,
      }))

    const recurringBlocks: DisplayBlock[] = tasks.flatMap((task) => {
      if (task.deleted || task.completed || !isRecurringTask(task)) return []
      const slot = taskTimeSlots[task.id]
      if (!slot) return []

      return weekDays
        .filter((day) => taskRepeatsOnDate(task, day.iso))
        .map((day): DisplayBlock => ({
          id: `recurring-${task.id}-${day.iso}`,
          sourceType: "recurring-task" as const,
          linkedTaskId: task.id,
          projectId: task.linkedProjectId,
          dateISO: day.iso,
          startTime: slot.startTime,
          endTime: slot.endTime,
          taskDescription: task.title,
          plannedHours: slot.plannedHours || calculateTimeBlockHours(slot.startTime, slot.endTime),
          actualHours: isTaskOccurrenceComplete(task, day.iso)
            ? slot.actualHours ?? slot.plannedHours ?? calculateTimeBlockHours(slot.startTime, slot.endTime)
            : undefined,
          status: isTaskOccurrenceComplete(task, day.iso) ? "done" : "planned",
          repeat: task.repeat ?? "none",
        }))
    })

    const externalBlocks: DisplayBlock[] = displayExternalBlocks
      ? externalCalendarBlocks.flatMap((block) =>
          weekDays.flatMap((day) => {
            const parts = externalBlockDateParts(block, day.iso)
            if (!parts) return []
            return [
              {
                id: block.id,
                sourceType: "external-calendar" as const,
                externalSource: block.source,
                externalCalendarId: block.externalCalendarId,
                externalHtmlLink: block.htmlLink,
                blocksTime: block.blocksTime,
                allDay: block.allDay,
                dateISO: parts.dateISO,
                startTime: parts.startTime,
                endTime: parts.endTime,
                taskDescription: block.title,
                plannedHours: calculateTimeBlockHours(parts.startTime, parts.endTime),
                status: "planned" as const,
                notes: block.location,
              },
            ]
          })
        )
      : []

    return [...externalBlocks, ...persistedBlocks, ...recurringBlocks]
  })()

  const editBlock = displayBlocks.find((block) => block.id === editId) ?? null
  const editTask = editBlock?.linkedTaskId ? tasks.find((task) => task.id === editBlock.linkedTaskId) : undefined

  const projectHours = (() => {
    if (!activePlan) return []
    return activePlan.allocations.map((allocation) => {
      const plannedHours = displayBlocks
        .filter((block) => block.projectId === allocation.projectId)
        .reduce((total, block) => total + block.plannedHours, 0)
      const actualHours = executionLogs
        .filter((log) => !log.deleted && log.weekPlanId === activePlan.id && log.projectId === allocation.projectId)
        .reduce((total, log) => total + log.actualHours, 0)

      return {
        projectId: allocation.projectId,
        allocatedHours: allocation.hoursAllocated,
        plannedHours,
        actualHours,
      }
    })
  })()

  // P16: tasks of paused, parked, completed or deleted projects stay off the planning list.
  const activeProjectIds = new Set(activeProjects.map((p) => p.id))
  const openUnscheduledTasks = tasks.filter((task) => !task.completed && !taskTimeSlots[task.id])
  const unscheduledTasks = openUnscheduledTasks.filter((task) => !task.linkedProjectId || activeProjectIds.has(task.linkedProjectId))
  const hiddenUnscheduledCount = openUnscheduledTasks.length - unscheduledTasks.length
  const showSideColumn = !tasksPanelCollapsed

  function openBlockCard(blockId: string, origin: HTMLElement) {
    editOriginRef.current = origin
    setEditId(blockId)
    setCreating(null)
  }

  function returnFocusToBlock(e: Event) {
    e.preventDefault()
    const origin = editOriginRef.current
    editOriginRef.current = null
    if (origin?.isConnected) origin.focus()
    else gridScrollRef.current?.focus()
  }

  const visibleDateLabel =
    view === "week"
      ? `${format(parseISO(`${weekDays[0].iso}T12:00:00`), "MMM d")} - ${format(parseISO(`${weekDays[6].iso}T12:00:00`), "MMM d, yyyy")}`
      : format(parseISO(`${selectedDateISO}T12:00:00`), "EEE, MMM d, yyyy")
  const visibleWeekNumber = getISOWeek(parseISO(`${weekStartISO}T12:00:00`))

  function shiftSelection(days: number) {
    setSelectedDateISO((current) => format(addDays(parseISO(`${current}T00:00:00`), days), "yyyy-MM-dd"))
    setCreating(null)
    setEditId(null)
    setHoverSlot(null)
  }

  function gridMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (e.button !== 0) return
    ;(e.currentTarget as HTMLElement).dataset.mousedownY = String(e.clientY)
  }

  function gridMouseMove(e: React.MouseEvent<HTMLDivElement>, dayISO: string) {
    if (dragRef.current) return
    const y = Math.max(0, e.clientY - e.currentTarget.getBoundingClientRect().top)
    const startMin = clampMin(yToMin(y))
    const endMin = Math.min(DAY_END * 60, startMin + SNAP_MIN)
    setHoverSlot({
      dateISO: dayISO,
      startTime: toTime(startMin),
      endTime: toTime(endMin > startMin ? endMin : startMin + SNAP_MIN),
    })
  }

  function gridMouseUp(e: React.MouseEvent<HTMLDivElement>, dayISO: string) {
    if (dragRef.current || draggedTaskId) return
    const startY = Number((e.currentTarget as HTMLElement).dataset.mousedownY ?? 0)
    if (Math.abs(e.clientY - startY) > 8) return
    const y = Math.max(0, e.clientY - e.currentTarget.getBoundingClientRect().top)
    const startMin = clampMin(yToMin(y))
    const endMin = clampMin(startMin + 60)
    setCreating({ dayISO, startTime: toTime(startMin), endTime: toTime(endMin) })
    setNewDesc("")
    setNewProjectId("")
    setNewCategory(defaultTaskCategory(categories))
    setEditId(null)
  }

  function chooseNewProject(id: string) {
    setNewProjectId(id)
    // A project's tasks take its category (P14), unless it has none.
    setNewCategory(defaultTaskCategory(categories, projects.find((p) => p.id === id)))
  }

  function handleCreate() {
    if (!creating || !newDesc.trim()) return
    saveTimeBlock({
      weekPlanId: activePlan?.id ?? ensureWeeklyPlan(getCurrentWeekStartISO(parseISO(`${creating.dayISO}T00:00:00`))),
      projectId: newProjectId || undefined,
      category: newCategory || undefined,
      dateISO: creating.dayISO,
      startTime: creating.startTime,
      endTime: creating.endTime,
      taskDescription: newDesc.trim(),
      status: "planned",
      deleted: false,
    })
    setCreating(null)
    setNewDesc("")
  }

  function taskDropSlot(task: Task, dayISO: string, clientY: number, containerTop: number): HoverSlot {
    const y = Math.max(0, clientY - containerTop)
    const startMin = clampMin(yToMin(y))
    const endMin = clampMin(startMin + taskDurationMin(task))
    const safeEndMin = endMin > startMin ? endMin : Math.min(DAY_END * 60, startMin + SNAP_MIN)
    return { dateISO: dayISO, startTime: toTime(startMin), endTime: toTime(safeEndMin) }
  }

  function scheduleTaskFromDrop(taskId: string, dayISO: string, clientY: number, containerTop: number) {
    const task = tasks.find((entry) => entry.id === taskId)
    if (!task) return
    const slot = taskDropSlot(task, dayISO, clientY, containerTop)
    updateTask(taskId, { dueDate: dayISO }, { startHHmm: slot.startTime, endHHmm: slot.endTime })
  }

  function scheduleTaskInNextSlot(task: Task) {
    const dateISO = planInNextSlot(task)
    if (dateISO && !visibleDays.some((day) => day.iso === dateISO)) setSelectedDateISO(dateISO)
  }

  /** Same as "Remove from schedule" in the edit panel, with an undo. */
  function unscheduleTaskBlock(taskId: string) {
    const task = tasks.find((entry) => entry.id === taskId)
    const slot = taskTimeSlots[taskId]
    if (!task) return
    updateTask(taskId, { dueDate: undefined, repeat: "none" }, { clearTimeSlot: true })
    if (editBlock?.linkedTaskId === taskId) setEditId(null)
    toast("Moved back to unscheduled tasks", {
      description: task.title,
      action: slot
        ? {
            label: "Undo",
            onClick: () =>
              updateTask(taskId, { dueDate: task.dueDate, repeat: task.repeat }, { startHHmm: slot.startTime, endHHmm: slot.endTime }),
          }
        : undefined,
    })
  }

  function announceDeletedTask(task: Task) {
    toast("Task deleted", {
      description: task.title,
      action: { label: "Undo", onClick: () => restoreTask(task.id) },
    })
  }

  // The mouse listeners below call the latest unscheduleTaskBlock without re-subscribing for it.
  const unscheduleTaskBlockRef = useRef(unscheduleTaskBlock)
  useEffect(() => {
    unscheduleTaskBlockRef.current = unscheduleTaskBlock
  })

  function blockMouseDown(e: React.MouseEvent, block: DisplayBlock, mode: "move" | "resize") {
    e.stopPropagation()
    e.preventDefault()
    suppressClickRef.current = false
    const colEl = document.querySelector(`[data-day="${block.dateISO}"]`) as HTMLElement | null
    const colTop = colEl?.getBoundingClientRect().top ?? 0
    dragRef.current = {
      blockId: block.id,
      linkedTaskId: block.linkedTaskId,
      mode,
      origStart: block.startTime,
      origEnd: block.endTime,
      origDay: block.dateISO,
      mouseStartX: e.clientX,
      mouseStartY: e.clientY,
      blockOffsetY: e.clientY - colTop - toY(block.startTime),
    }
    setPreview({ blockId: block.id, startTime: block.startTime, endTime: block.endTime, dateISO: block.dateISO })
  }

  useEffect(() => {
    function isOverTasksPanel(clientX: number, clientY: number) {
      const rect = tasksPanelRef.current?.getBoundingClientRect()
      return Boolean(rect && clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom)
    }

    function onMove(e: MouseEvent) {
      const drag = dragRef.current
      if (!drag) return
      if (Math.abs(e.clientX - drag.mouseStartX) > 4 || Math.abs(e.clientY - drag.mouseStartY) > 4) {
        suppressClickRef.current = true
      }

      let targetDay = drag.origDay
      const cols = document.querySelectorAll("[data-day]")
      for (const col of cols) {
        const r = col.getBoundingClientRect()
        if (e.clientX >= r.left && e.clientX <= r.right) {
          targetDay = (col as HTMLElement).dataset.day ?? drag.origDay
          break
        }
      }
      const colEl = document.querySelector(`[data-day="${targetDay}"]`) as HTMLElement | null
      if (!colEl) return
      const colTop = colEl.getBoundingClientRect().top

      // A task block dragged over the side panel can be dropped there to unschedule it (P16).
      if (drag.mode === "move" && drag.linkedTaskId && Math.abs(e.clientY - drag.mouseStartY) > 4) {
        setUnscheduleDrop(isOverTasksPanel(e.clientX, e.clientY) ? "over" : "near")
      }

      if (drag.mode === "move") {
        const blockTop = e.clientY - colTop - drag.blockOffsetY
        const startMin = clampMin(yToMin(Math.max(0, blockTop)))
        const durMin = toMin(drag.origEnd) - toMin(drag.origStart)
        const endMin = clampMin(startMin + durMin)
        setPreview({ blockId: drag.blockId, startTime: toTime(startMin), endTime: toTime(endMin), dateISO: targetDay })
      } else {
        const y = e.clientY - colTop
        const newEnd = clampMin(Math.max(toMin(drag.origStart) + SNAP_MIN, yToMin(y)))
        setPreview({ blockId: drag.blockId, startTime: drag.origStart, endTime: toTime(newEnd), dateISO: drag.origDay })
      }
    }

    function onUp(e: MouseEvent) {
      const drag = dragRef.current
      if (drag?.linkedTaskId && drag.mode === "move" && unscheduleDrop && isOverTasksPanel(e.clientX, e.clientY)) {
        unscheduleTaskBlockRef.current(drag.linkedTaskId)
      } else if (drag && preview) {
        const block = displayBlocks.find((entry) => entry.id === drag.blockId)
        if (block?.linkedTaskId) {
          updateTask(
            block.linkedTaskId,
            { dueDate: preview.dateISO },
            { startHHmm: preview.startTime, endHHmm: preview.endTime }
          )
        } else {
          updateTimeBlock(drag.blockId, {
            startTime: preview.startTime,
            endTime: preview.endTime,
            dateISO: preview.dateISO,
          })
        }
      }
      dragRef.current = null
      setPreview(null)
      setUnscheduleDrop(null)
    }

    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
  }, [displayBlocks, preview, unscheduleDrop, updateTask, updateTimeBlock])

  return (
    <div className="flex h-full flex-col gap-0">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight">Schedule</h1>
          <p className="text-sm text-muted-foreground">{visibleDateLabel}</p>
          <p className="text-sm text-muted-foreground">Click a slot to add · drag to move · drag edge to resize</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => shiftSelection(view === "week" ? -7 : -1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSelectedDateISO(todayISO())}>
            Week #{visibleWeekNumber}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => shiftSelection(view === "week" ? 7 : 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {isAiEnabled() && (
            <Button
              variant="outline"
              size="sm"
              disabled={suggestLoading}
              onClick={() => {
                setSuggestLoading(true)
                auth?.currentUser?.getIdToken().then((token) => {
                  fetch("/api/ai/schedule-suggest", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ tasks, projects, existingBlocks: busyBlocks }),
                  })
                    .then((r) => r.json())
                    .then((res) => { if (res.ok) setSuggestions(res.data.suggestions ?? []) })
                    .catch(() => {})
                    .finally(() => setSuggestLoading(false))
                }).catch(() => setSuggestLoading(false))
              }}
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              {suggestLoading ? "Thinking…" : "AI Suggest"}
            </Button>
          )}
          <div className="flex rounded-md border text-sm">
            <button
              className={cn("px-3 py-1.5 transition-colors", view === "week" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
              onClick={() => setView("week")}
            >
              Week
            </button>
            <button
              className={cn("px-3 py-1.5 transition-colors", view === "day" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
              onClick={() => setView("day")}
            >
              Day
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setActiveModule("command-center")}>
            {activePlan ? "Edit plan" : "Create plan"}
          </Button>
        </div>
      </div>

      {suggestions.length > 0 && (
        <ScheduleSuggestionPanel
          suggestions={suggestions.filter((s) => !rejectedTaskIds.has(s.taskId))}
          conflictingTaskIds={
            new Set(
              detectConflicts(
                suggestions.filter((s) => !rejectedTaskIds.has(s.taskId)),
                busyBlocks,
                weekStartISO
              ).map((c) => c.suggestion.taskId)
            )
          }
          onAccept={(s) => {
            const dateISO = dayIndexToISO(weekStartISO, s.dayOfWeek)
            saveTimeBlock({
              weekPlanId: activePlan?.id ?? "",
              dateISO,
              startTime: s.startTime,
              endTime: (() => {
                const [h, m] = s.startTime.split(":").map(Number)
                const end = h * 60 + m + s.duration
                return `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`
              })(),
              taskDescription: s.taskTitle,
              linkedTaskId: s.taskId,
              status: "planned",
            })
            setSuggestions((prev) => prev.filter((x) => x.taskId !== s.taskId))
          }}
          onReject={(taskId) => setRejectedTaskIds((prev) => new Set([...prev, taskId]))}
          onClose={() => { setSuggestions([]); setRejectedTaskIds(new Set()) }}
        />
      )}

      <div className="flex flex-1 gap-4 overflow-hidden">
        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border">
          <div ref={gridScrollRef} tabIndex={-1} className="flex flex-1 overflow-y-auto outline-none [scrollbar-gutter:stable]">
            <div className="flex min-h-full min-w-full flex-col">
              <div className="sticky top-0 z-20 flex border-b bg-card/95 backdrop-blur supports-backdrop-filter:bg-card/85">
                <div className="w-14 shrink-0 border-r" />
                {visibleDays.map((day) => {
                  const isToday = day.iso === nowDayISO
                  return (
                    <div
                      key={day.iso}
                      className={cn("flex flex-1 flex-col items-center py-2 text-center", view === "week" && "border-r last:border-r-0")}
                    >
                      <span className="text-xs text-muted-foreground">{day.label}</span>
                      <span
                        className={cn(
                          "mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold",
                          isToday && "bg-primary text-primary-foreground"
                        )}
                      >
                        {day.dayNumber}
                      </span>
                    </div>
                  )
                })}
              </div>

              <div className="flex flex-1">
                <div className="relative w-14 shrink-0 border-r">
                  <div style={{ height: GRID_HEIGHT }}>
                    {HOUR_LABELS.map(({ h, label }, index) => (
                      <div
                        key={h}
                        className={cn("absolute right-2 text-[10px] text-muted-foreground", index === 0 ? "translate-y-0" : "-translate-y-1/2")}
                        style={{ top: index === 0 ? 6 : (h - DAY_START) * HOUR_PX }}
                      >
                        {label}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-1">
                  {visibleDays.map((day) => {
                    const dayBlocks = displayBlocks
                      .filter((block) => block.dateISO === day.iso)
                      .sort((a, b) => a.startTime.localeCompare(b.startTime))
                    const isToday = day.iso === nowDayISO

                    return (
                      <div
                        key={day.iso}
                        data-day={day.iso}
                        className={cn("relative flex-1 cursor-crosshair select-none", view === "week" && "border-r last:border-r-0")}
                        style={{ height: GRID_HEIGHT }}
                        onMouseDown={gridMouseDown}
                        onMouseMove={(e) => gridMouseMove(e, day.iso)}
                        onMouseLeave={() => setHoverSlot((current) => (current?.dateISO === day.iso ? null : current))}
                        onMouseUp={(e) => gridMouseUp(e, day.iso)}
                        onDragOver={(e) => {
                          if (!draggedTaskId) return
                          e.preventDefault()
                          const task = tasks.find((entry) => entry.id === draggedTaskId)
                          if (!task) return
                          const slot = taskDropSlot(task, day.iso, e.clientY, e.currentTarget.getBoundingClientRect().top)
                          setTaskDropPreview((current) =>
                            current?.dateISO === slot.dateISO && current.startTime === slot.startTime ? current : slot
                          )
                        }}
                        onDragLeave={(e) => {
                          if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
                          setTaskDropPreview((current) => (current?.dateISO === day.iso ? null : current))
                        }}
                        onDrop={(e) => {
                          if (!draggedTaskId) return
                          e.preventDefault()
                          scheduleTaskFromDrop(draggedTaskId, day.iso, e.clientY, e.currentTarget.getBoundingClientRect().top)
                          setDraggedTaskId(null)
                          setTaskDropPreview(null)
                        }}
                      >
                        {HOUR_LABELS.map(({ h }) => (
                          <div key={h} className="absolute inset-x-0 border-t border-border/40" style={{ top: (h - DAY_START) * HOUR_PX }} />
                        ))}
                        {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                          <div
                            key={i}
                            className="absolute inset-x-0 border-t border-border/20 border-dashed"
                            style={{ top: (i + 0.5) * HOUR_PX }}
                          />
                        ))}

                        {hoverSlot?.dateISO === day.iso ? (
                          <div
                            className="pointer-events-none absolute inset-x-1 z-9 rounded-md border border-primary/70 bg-primary/5"
                            style={{
                              top: toY(hoverSlot.startTime),
                              height: blockH(hoverSlot.startTime, hoverSlot.endTime),
                              boxShadow: "inset 0 0 0 1px rgba(34,197,94,0.2)",
                            }}
                          />
                        ) : null}

                        {taskDropPreview?.dateISO === day.iso && draggedTaskId ? (() => {
                          const task = tasks.find((entry) => entry.id === draggedTaskId)
                          const project = projects.find((p) => p.id === task?.linkedProjectId)
                          return (
                            <div
                              className="pointer-events-none absolute inset-x-1 z-20 overflow-hidden rounded-md border border-dashed border-l-[3px] bg-primary/10 px-2 py-1 text-xs text-foreground shadow-sm ring-1 ring-primary/50"
                              style={{
                                top: toY(taskDropPreview.startTime),
                                height: blockH(taskDropPreview.startTime, taskDropPreview.endTime),
                                ...blockStyle(project?.color ?? "#6366f1"),
                              }}
                            >
                              <p className="truncate font-medium leading-tight">{task?.title}</p>
                              <p className="truncate opacity-75">
                                {taskDropPreview.startTime}–{taskDropPreview.endTime}
                              </p>
                            </div>
                          )
                        })() : null}

                        {isToday && nowY !== null && (
                          <div className="pointer-events-none absolute inset-x-0 z-10" style={{ top: nowY }}>
                            <div className="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-red-500" />
                            <div className="h-px bg-red-500" />
                          </div>
                        )}

                        {dayBlocks.map((block) => {
                          const isPreview = preview?.blockId === block.id
                          const displayStart = isPreview ? preview.startTime : block.startTime
                          const displayEnd = isPreview ? preview.endTime : block.endTime
                          const displayDay = isPreview ? preview.dateISO : block.dateISO
                          if (displayDay !== day.iso) return null

                          const isExternal = block.sourceType === "external-calendar"
                          const project = projects.find((p) => p.id === block.projectId)
                          const style = isExternal ? externalBlockStyle(block.blocksTime ?? true) : blockStyle(project?.color ?? "#6366f1")
                          const isEditing = editId === block.id

                          return (
                            <div
                              key={block.id}
                              tabIndex={isExternal ? undefined : 0}
                              role={isExternal ? undefined : "button"}
                              aria-label={isExternal ? undefined : `${block.taskDescription}, ${displayStart}–${displayEnd}`}
                              className={cn(
                                "absolute inset-x-1 z-20 overflow-hidden rounded-md border-l-[3px] px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                isExternal && "border border-dashed",
                                isEditing && "ring-2 ring-primary ring-offset-1",
                                isPreview && "opacity-90"
                              )}
                              style={{
                                top: toY(displayStart),
                                height: blockH(displayStart, displayEnd),
                                ...style,
                                cursor: isExternal ? "default" : "grab",
                              }}
                              onMouseDown={(e) => {
                                if (isExternal) {
                                  e.stopPropagation()
                                  return
                                }
                                blockMouseDown(e, { ...block, startTime: displayStart, endTime: displayEnd, dateISO: displayDay }, "move")
                              }}
                              onClick={(e) => {
                                e.stopPropagation()
                                if (suppressClickRef.current) {
                                  suppressClickRef.current = false
                                  return
                                }
                                if (isExternal) return
                                openBlockCard(block.id, e.currentTarget)
                              }}
                              onKeyDown={(e) => {
                                if (isExternal || e.target !== e.currentTarget) return
                                if (e.key === "Enter") {
                                  e.preventDefault()
                                  openBlockCard(block.id, e.currentTarget)
                                } else if (e.key === " ") {
                                  e.preventDefault()
                                }
                              }}
                              onKeyUp={(e) => {
                                if (isExternal || e.target !== e.currentTarget || e.key !== " ") return
                                openBlockCard(block.id, e.currentTarget)
                              }}
                            >
                              <TruncatedTooltip
                                as="p"
                                content={block.taskDescription}
                                className="truncate font-medium leading-tight"
                              />
                              <p className="truncate opacity-75">
                                {displayStart}–{displayEnd}
                              </p>
                              {isExternal ? (
                                <p className="mt-0.5 truncate text-[10px] opacity-75">
                                  {block.allDay ? "All day" : block.blocksTime ? "Google Calendar" : "Free calendar event"}
                                </p>
                              ) : null}
                              {block.repeat && block.repeat !== "none" ? (
                                <p className="mt-0.5 text-[10px] opacity-75">
                                  {block.repeat === "custom"
                                    ? `${formatRecurrenceDays(tasks.find((t) => t.id === block.linkedTaskId)?.recurrenceDays)}`
                                    : `Repeats ${block.repeat}`}
                                </p>
                              ) : null}
                              {block.status === "done" && block.actualHours != null && block.actualHours > block.plannedHours ? (
                                <p className="mt-0.5 text-[10px] font-semibold text-amber-400">{fmtOverrun(block.actualHours - block.plannedHours)} over</p>
                              ) : null}
                              {block.status === "done" ? <CheckCircle2 className="absolute right-1 top-1 h-3 w-3 text-green-500" /> : null}
                              {!isExternal ? (
                                <div
                                  className="absolute inset-x-0 bottom-0 h-2 cursor-s-resize"
                                  onMouseDown={(e) => {
                                    e.stopPropagation()
                                    blockMouseDown(e, { ...block, startTime: displayStart, endTime: displayEnd, dateISO: displayDay }, "resize")
                                  }}
                                />
                              ) : null}
                            </div>
                          )
                        })}

                        {preview && preview.dateISO === day.iso && !dayBlocks.find((block) => block.id === preview.blockId) && (() => {
                          const block = displayBlocks.find((entry) => entry.id === preview.blockId)
                          if (!block) return null
                          const project = projects.find((p) => p.id === block.projectId)
                          const style = blockStyle(project?.color ?? "#6366f1")
                          return (
                            <div
                              className="pointer-events-none absolute inset-x-1 z-20 overflow-hidden rounded-md border-l-[3px] px-2 py-1 text-xs opacity-80"
                              style={{
                                top: toY(preview.startTime),
                                height: blockH(preview.startTime, preview.endTime),
                                ...style,
                              }}
                            >
                              <TruncatedTooltip
                                as="p"
                                content={block.taskDescription}
                                className="truncate font-medium leading-tight"
                              />
                              <p className="truncate opacity-75">
                                {preview.startTime}–{preview.endTime}
                              </p>
                            </div>
                          )
                        })()}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {creating ? (
            <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-background/20">
              <div className="pointer-events-auto w-full max-w-sm rounded-xl border bg-card p-4 shadow-xl">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold">New block</p>
                  <button onClick={() => setCreating(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Description</Label>
                    <Input
                      autoFocus
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      placeholder="What gets done?"
                      onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="min-w-0 space-y-1.5">
                      <Label className="text-xs">
                        Project <span className="text-muted-foreground">(optional)</span>
                      </Label>
                      <Select value={newProjectId || "none"} onValueChange={(v) => chooseNewProject(v === "none" ? "" : v)}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="No project" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No project</SelectItem>
                          {activeProjects.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="min-w-0 space-y-1.5">
                      <Label className="text-xs">Category</Label>
                      <Select value={newCategory} onValueChange={setNewCategory}>
                        <SelectTrigger className="w-full" aria-label="New block category">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Start</Label>
                      <Input type="time" value={creating.startTime} onChange={(e) => setCreating((current) => current && ({ ...current, startTime: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">End</Label>
                      <Input type="time" value={creating.endTime} onChange={(e) => setCreating((current) => current && ({ ...current, endTime: e.target.value }))} />
                    </div>
                  </div>
                  <Button className="w-full" onClick={handleCreate} disabled={!newDesc.trim()}>
                    Add block
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {showSideColumn ? (
        <div className="flex w-80 shrink-0 flex-col gap-3 overflow-y-auto">

          {!tasksPanelCollapsed && activePlan && projectHours.length > 0 ? (
            <div className="rounded-xl border bg-card p-4">
              <p className="mb-3 text-sm font-semibold">Week allocation</p>
              <div className="space-y-3">
                {projectHours.map((item) => {
                  const project = projects.find((p) => p.id === item.projectId)
                  const pct = item.allocatedHours > 0 ? Math.min(100, (item.plannedHours / item.allocatedHours) * 100) : 0
                  return (
                    <div key={item.projectId} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="truncate font-medium">{project?.title ?? "Unknown"}</span>
                        <span className="ml-2 shrink-0 text-muted-foreground">
                          {item.plannedHours}h / {item.allocatedHours}h
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: normalizeProjectColor(project?.color ?? "#6366f1"),
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}

          {!tasksPanelCollapsed ? (
            <UnscheduledTasksPanel
              tasks={unscheduledTasks}
              hiddenCount={hiddenUnscheduledCount}
              projects={activeProjects}
              todayISO={nowDayISO}
              draggedTaskId={draggedTaskId}
              dropState={unscheduleDrop}
              panelRef={tasksPanelRef}
              onDragStart={setDraggedTaskId}
              onDragEnd={() => {
                setDraggedTaskId(null)
                setTaskDropPreview(null)
              }}
              onScheduleNext={scheduleTaskInNextSlot}
              onOpenTask={setOpenTaskId}
              onCollapse={() => setTasksPanelCollapsed(true)}
            />
          ) : null}
        </div>
        ) : (
          // Collapsed rail. It is also the drop target for unscheduling while the panel is hidden.
          <div ref={tasksPanelRef} className="flex w-11 shrink-0">
            <button
              type="button"
              onClick={() => setTasksPanelCollapsed(false)}
              className={cn(
                "flex w-full flex-col items-center gap-3 rounded-xl border bg-card py-3 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                unscheduleDrop === "near" && "border-dashed border-primary/60",
                unscheduleDrop === "over" && "border-primary bg-primary/10 text-primary ring-2 ring-primary/40"
              )}
              aria-label={`Show unscheduled tasks (${unscheduledTasks.length})`}
              title="Show unscheduled tasks"
            >
              <PanelRightOpen className="h-4 w-4" />
              <Badge variant="secondary" className="px-1.5 text-[10px] tabular-nums">
                {unscheduledTasks.length}
              </Badge>
              <span className="text-xs font-medium [writing-mode:vertical-rl]">Unscheduled tasks</span>
            </button>
          </div>
        )}
      </div>

      <Dialog open={editBlock !== null} onOpenChange={(open) => { if (!open) setEditId(null) }}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md" onCloseAutoFocus={returnFocusToBlock}>
          {editBlock ? (
            <EditPanel
              key={editBlock.id}
              block={editBlock}
              linkedTask={editTask}
              project={projects.find((p) => p.id === editBlock.projectId)}
              allProjects={activeProjects}
              allCategories={categories}
              onUpdateTask={(updates, timing) => {
                if (!editBlock.linkedTaskId) return
                updateTask(editBlock.linkedTaskId, updates, timing)
              }}
              onUpdateTimeBlock={(updates) => {
                if (editBlock.sourceType !== "time-block") return
                updateTimeBlock(editBlock.id, updates)
              }}
              onToggleOccurrenceDone={() => {
                if (!editTask || !isRecurringTask(editTask)) return
                toggleTaskOccurrence(editTask.id, editBlock.dateISO)
              }}
              onRemoveFromSchedule={() => {
                if (editBlock.linkedTaskId) {
                  updateTask(editBlock.linkedTaskId, { dueDate: undefined, repeat: "none" }, { clearTimeSlot: true })
                } else {
                  deleteTimeBlock(editBlock.id)
                }
                setEditId(null)
              }}
              onClose={() => setEditId(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <TaskDetailSheet
        taskId={openTaskId}
        timeSlot={openTaskId ? taskTimeSlots[openTaskId] : undefined}
        onClose={() => setOpenTaskId(null)}
        onDeleted={announceDeletedTask}
      />
    </div>
  )
}

interface EditPanelProps {
  block: DisplayBlock
  linkedTask?: Task
  project: { id: string; title: string; color: string } | undefined
  allProjects: { id: string; title: string; color: string }[]
  allCategories: string[]
  onUpdateTask: (updates: Partial<Omit<Task, "id" | "deleted" | "clientUpdatedAt">>, timing?: { startHHmm?: string; endHHmm?: string; clearTimeSlot?: boolean }) => void
  onUpdateTimeBlock: (updates: Partial<Omit<TimeBlock, "id" | "deleted" | "clientUpdatedAt">>) => void
  onToggleOccurrenceDone: () => void
  onRemoveFromSchedule: () => void
  onClose: () => void
}

function EditPanel({
  block,
  linkedTask,
  project,
  allProjects,
  allCategories,
  onUpdateTask,
  onUpdateTimeBlock,
  onToggleOccurrenceDone,
  onRemoveFromSchedule,
  onClose,
}: EditPanelProps) {
  const storeUpdateTimeBlock = useAppStore((s) => s.updateTimeBlock)
  const moveTaskToLane = useAppStore((s) => s.moveTaskToLane)
  const dailyFocusLimit = useAppStore((s) => s.profile.systemConfig?.dailyFocusLimit ?? 3)
  const focusCount = useAppStore((s) => s.tasks.filter((t) => !t.deleted && !t.completed && t.lane === "daily-focus").length)
  const inFocus = linkedTask?.lane === "daily-focus"
  const fieldId = useId()

  // P18: the block shows, and can change, whether its task is in today's Daily Focus.
  function toggleFocus() {
    if (!linkedTask) return
    if (inFocus) {
      moveTaskToLane(linkedTask.id, "backlog")
      return
    }
    if (focusCount >= dailyFocusLimit) {
      toast.error(`Daily Focus is full (${dailyFocusLimit} tasks). Move one out in ToDo first.`)
      return
    }
    moveTaskToLane(linkedTask.id, "daily-focus")
  }
  const isRecurring = Boolean(linkedTask && isRecurringTask(linkedTask))
  const repeatValue = linkedTask?.repeat ?? "none"
  const savedNotes = linkedTask ? linkedTask.notes : block.notes
  const [localNotes, setLocalNotes] = useState(savedNotes ?? "")
  const [notesMode, setNotesMode] = useState<"view" | "edit">(savedNotes ? "view" : "edit")

  function saveNotes() {
    const trimmed = localNotes.trim()
    if (linkedTask) {
      onUpdateTask({ notes: trimmed || undefined })
    } else if (block.sourceType === "time-block") {
      storeUpdateTimeBlock(block.id, { notes: trimmed || undefined })
    }
    setNotesMode(trimmed ? "view" : "edit")
  }

  function updateTimes(nextStart: string, nextEnd: string) {
    if (linkedTask) {
      onUpdateTask({}, { startHHmm: nextStart, endHHmm: nextEnd })
      return
    }
    onUpdateTimeBlock({ startTime: nextStart, endTime: nextEnd })
  }

  function updateDescription(nextValue: string) {
    if (linkedTask) {
      onUpdateTask({ title: nextValue })
      return
    }
    onUpdateTimeBlock({ taskDescription: nextValue })
  }

  function updateProject(nextProjectId: string) {
    if (linkedTask) {
      onUpdateTask({ linkedProjectId: nextProjectId || undefined })
      return
    }
    onUpdateTimeBlock({ projectId: nextProjectId || undefined })
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2 pr-6">
        <div className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: project ? normalizeProjectColor(project.color) : "#94a3b8" }} />
        <DialogTitle className="min-w-0 truncate text-sm font-semibold">
          <TruncatedTooltip content={project?.title ?? "No project"} />
        </DialogTitle>
        <DialogDescription className="sr-only">
          {block.taskDescription} · {format(parseISO(`${block.dateISO}T12:00:00`), "EEE, MMM d")} · {block.startTime}–{block.endTime}
        </DialogDescription>
      </div>
      <div className="space-y-3">
        {linkedTask ? (
          <div className="flex flex-wrap items-center gap-1.5 rounded-md bg-secondary/40 px-2 py-1.5">
            <CategoryBadge category={linkedTask.category} className="text-[10px]" />
            {linkedTask.lane && !inFocus ? (
              <Badge variant="outline" className="text-[10px] capitalize">{linkedTask.lane.replace("-", " ")}</Badge>
            ) : null}
            {!linkedTask.completed ? (
              <Button
                type="button"
                variant={inFocus ? "default" : "outline"}
                size="sm"
                className="h-6 gap-1 px-2 text-[10px]"
                onClick={toggleFocus}
                aria-pressed={inFocus}
                title={inFocus ? "In Daily Focus. Click to send back to Backlog." : "Add to Daily Focus"}
              >
                <Focus className="h-3 w-3" />
                {inFocus ? "In Daily Focus" : "Add to focus"}
              </Button>
            ) : null}
            {linkedTask.dueDate ? (
              <span className="text-[10px] text-muted-foreground">Due {linkedTask.dueDate}</span>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor={`${fieldId}-desc`} className="text-xs">Description</Label>
          <Input id={`${fieldId}-desc`} value={block.taskDescription} onChange={(e) => updateDescription(e.target.value)} />
        </div>

        {linkedTask ? (
          <div className="space-y-1.5">
            <Label htmlFor={`${fieldId}-category`} className="text-xs">Category</Label>
            <Select value={linkedTask.category} onValueChange={(value) => onUpdateTask({ category: value })}>
              <SelectTrigger id={`${fieldId}-category`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {linkedTask ? (
          <div className="space-y-1.5">
            <Label htmlFor={`${fieldId}-due`} className="text-xs">Due date</Label>
            <div className="flex gap-1.5">
              <Input
                id={`${fieldId}-due`}
                type="date"
                value={linkedTask.dueDate ?? ""}
                onChange={(e) => onUpdateTask({ dueDate: e.target.value || undefined })}
                className="flex-1"
              />
              {linkedTask.dueDate ? (
                <button
                  onClick={() => { onUpdateTask({ dueDate: undefined }, { clearTimeSlot: true }); onClose() }}
                  className="flex items-center rounded-md border border-input px-2 text-muted-foreground hover:text-foreground"
                  title="Remove due date and unschedule"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor={`${fieldId}-project`} className="text-xs">
            Project <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Select value={block.projectId ?? "none"} onValueChange={(value) => updateProject(value === "none" ? "" : value)}>
            <SelectTrigger id={`${fieldId}-project`}>
              <SelectValue placeholder="No project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No project</SelectItem>
              {allProjects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label htmlFor={`${fieldId}-start`} className="text-xs">Start</Label>
            <Input id={`${fieldId}-start`} type="time" value={block.startTime} onChange={(e) => updateTimes(e.target.value, block.endTime)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${fieldId}-end`} className="text-xs">End</Label>
            <Input id={`${fieldId}-end`} type="time" value={block.endTime} onChange={(e) => updateTimes(block.startTime, e.target.value)} />
          </div>
        </div>

        {linkedTask ? (
          <div className="space-y-1.5">
            <Label htmlFor={`${fieldId}-repeat`} className="text-xs">Repeat</Label>
            <Select value={repeatValue} onValueChange={(value) => onUpdateTask({ repeat: value as TaskRepeat })}>
              <SelectTrigger id={`${fieldId}-repeat`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_REPEAT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {repeatValue === "custom" && (
              <div className="flex gap-1 pt-0.5">
                {WEEK_DAYS.map((day) => {
                  const active = linkedTask.recurrenceDays?.includes(day.value) ?? false
                  return (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => {
                        const current = linkedTask.recurrenceDays ?? []
                        const next = active
                          ? current.filter((d) => d !== day.value)
                          : [...current, day.value]
                        onUpdateTask({ recurrenceDays: next })
                      }}
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded text-[11px] font-medium transition-colors",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                      )}
                    >
                      {day.short}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ) : null}

        {isRecurring ? (
          <div className="rounded-lg border border-border/70 bg-secondary/20 px-3 py-2 text-xs text-muted-foreground">
            This edits the repeating template. Moving or resizing this occurrence updates the repeating slot for future weeks too.
          </div>
        ) : null}

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor={`${fieldId}-notes`} className="text-xs">Notes</Label>
            {notesMode === "view" ? (
              <button
                onClick={() => setNotesMode("edit")}
                className="text-[10px] text-muted-foreground hover:text-foreground"
              >
                Edit
              </button>
            ) : null}
          </div>
          {notesMode === "view" ? (
            <div className="min-h-[4.5rem] rounded-md border border-input bg-background px-3 py-2 text-xs whitespace-pre-wrap">
              {localNotes}
            </div>
          ) : (
            <>
              <Textarea
                id={`${fieldId}-notes`}
                value={localNotes}
                onChange={(e) => setLocalNotes(e.target.value)}
                placeholder="Add notes…"
                rows={3}
                className="resize-none text-xs"
                autoFocus={notesMode === "edit" && Boolean(block.notes)}
              />
              {localNotes.trim() ? (
                <Button size="sm" variant="secondary" className="w-full" onClick={saveNotes}>
                  Save notes
                </Button>
              ) : null}
            </>
          )}
        </div>

        {isRecurring ? (
          <div className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2 text-sm">
            <span>
              {block.status === "done" ? "Completed for this date" : "Planned for this date"}: {block.dateISO}
            </span>
            <Button variant="outline" size="sm" onClick={onToggleOccurrenceDone}>
              {block.status === "done" ? "Mark planned" : "Mark done"}
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor={`${fieldId}-actual`} className="text-xs">Actual hours</Label>
                <Input
                  id={`${fieldId}-actual`}
                  type="number"
                  min={0}
                  step={0.25}
                  value={block.actualHours ?? block.plannedHours}
                  onChange={(e) => onUpdateTimeBlock({ actualHours: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${fieldId}-status`} className="text-xs">Status</Label>
                <Select value={block.status} onValueChange={(value) => onUpdateTimeBlock({ status: value as TimeBlock["status"] })}>
                  <SelectTrigger id={`${fieldId}-status`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                    <SelectItem value="missed">Missed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button className="w-full" variant="outline" onClick={() => onUpdateTimeBlock({ status: "done", actualHours: block.actualHours ?? block.plannedHours })}>
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-green-500" />
              Done
            </Button>
          </>
        )}

        <Button variant="ghost" className="w-full text-destructive hover:text-destructive" onClick={onRemoveFromSchedule}>
          <Trash2 className="mr-1.5 h-4 w-4" />
          Remove from schedule
        </Button>
      </div>
    </div>
  )
}
