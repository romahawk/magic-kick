"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useAppStore } from "@/lib/store"
import {
  getActiveWeeklyPlan,
  getCurrentWeekStartISO,
  getWeekDates,
  selectProjectHours,
  selectTimeBlocksForDates,
} from "@/lib/weekly-plan"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, X, CheckCircle2, Trash2 } from "lucide-react"
import type { TimeBlock } from "@/lib/types"
import { cn } from "@/lib/utils"

// ── Grid constants ──────────────────────────────────────────────────────────
const HOUR_PX = 64          // pixels per hour
const DAY_START = 6         // first visible hour (6 AM)
const DAY_END = 23          // last visible hour (11 PM)
const SNAP_MIN = 15         // snap interval in minutes
const TOTAL_HOURS = DAY_END - DAY_START
const GRID_HEIGHT = TOTAL_HOURS * HOUR_PX

// ── Time math ───────────────────────────────────────────────────────────────
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

// ── Hour label list ──────────────────────────────────────────────────────────
const HOUR_LABELS = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => {
  const h = DAY_START + i
  return { h, label: h === 12 ? "12 PM" : h < 12 ? `${h} AM` : `${h - 12} PM` }
})

// ── Project color helpers ────────────────────────────────────────────────────
function hexToRgb(hex: string) {
  const clean = hex.replace("#", "")
  const n = parseInt(clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function blockStyle(color: string) {
  const [r, g, b] = hexToRgb(color || "#6366f1")
  return {
    backgroundColor: `rgba(${r},${g},${b},0.18)`,
    borderColor: `rgba(${r},${g},${b},0.7)`,
    color: `rgb(${r},${g},${b})`,
  }
}

// ── Drag state (ref-based to avoid stale closures) ───────────────────────────
interface DragState {
  blockId: string
  mode: "move" | "resize"
  origStart: string
  origEnd: string
  origDay: string
  mouseStartY: number
  blockOffsetY: number // cursor Y within the block top at drag start
}

// ── Preview (local during drag, committed on mouseup) ────────────────────────
interface Preview {
  blockId: string
  startTime: string
  endTime: string
  dateISO: string
}

// ─────────────────────────────────────────────────────────────────────────────

export function ScheduleModule() {
  const projects = useAppStore((s) => s.projects).filter((p) => !p.deleted)
  const weeklyPlans = useAppStore((s) => s.weeklyPlans)
  const timeBlocks = useAppStore((s) => s.timeBlocks)
  const executionLogs = useAppStore((s) => s.executionLogs)
  const saveTimeBlock = useAppStore((s) => s.saveTimeBlock)
  const updateTimeBlock = useAppStore((s) => s.updateTimeBlock)
  const deleteTimeBlock = useAppStore((s) => s.deleteTimeBlock)
  const setActiveModule = useAppStore((s) => s.setActiveModule)

  const weekStartISO = getCurrentWeekStartISO()
  const activePlan = getActiveWeeklyPlan(weeklyPlans, weekStartISO)
  const weekDays = getWeekDates(weekStartISO)

  const [view, setView] = useState<"week" | "day">("week")
  const [dayIndex, setDayIndex] = useState(() => {
    const today = todayISO()
    const idx = weekDays.findIndex((d) => d.iso === today)
    return idx >= 0 ? idx : 0
  })

  // Current time bar
  const [nowY, setNowY] = useState<number | null>(null)
  const [nowDayISO, setNowDayISO] = useState(todayISO())
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

  const activeProjects = projects.filter((p) => (p.status ?? "active") === "active")
  const projectHours = selectProjectHours(activePlan, timeBlocks, executionLogs)
  const weekBlocks = selectTimeBlocksForDates(timeBlocks, weekDays.map((d) => d.iso))

  // Create panel
  const [creating, setCreating] = useState<{ dayISO: string; startTime: string; endTime: string } | null>(null)
  const [newDesc, setNewDesc] = useState("")
  const [newProjectId, setNewProjectId] = useState("")

  // Edit panel
  const [editId, setEditId] = useState<string | null>(null)
  const editBlock = weekBlocks.find((b) => b.id === editId) ?? null

  // Drag preview (optimistic local state during drag)
  const [preview, setPreview] = useState<Preview | null>(null)
  const dragRef = useRef<DragState | null>(null)

  // Mouse down on grid background → record position for click-to-create detection
  function gridMouseDown(e: React.MouseEvent<HTMLDivElement>, dayISO: string) {
    if (e.button !== 0) return
    ;(e.currentTarget as HTMLElement).dataset.mousedownY = String(e.clientY)
  }

  function gridMouseUp(e: React.MouseEvent<HTMLDivElement>, dayISO: string) {
    if (dragRef.current) return
    const startY = Number((e.currentTarget as HTMLElement).dataset.mousedownY ?? 0)
    if (Math.abs(e.clientY - startY) > 8) return
    const y = Math.max(0, e.clientY - e.currentTarget.getBoundingClientRect().top)
    const startMin = clampMin(yToMin(y))
    const endMin = clampMin(startMin + 60)
    setCreating({ dayISO, startTime: toTime(startMin), endTime: toTime(endMin) })
    setNewDesc("")
    setNewProjectId("")
    setEditId(null)
  }

  function handleCreate() {
    if (!creating || !newDesc.trim()) return
    saveTimeBlock({
      weekPlanId: activePlan?.id ?? "",
      projectId: newProjectId || undefined,
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

  // Block drag start
  function blockMouseDown(e: React.MouseEvent, block: TimeBlock, mode: "move" | "resize") {
    e.stopPropagation()
    e.preventDefault()
    const colEl = document.querySelector(`[data-day="${block.dateISO}"]`) as HTMLElement | null
    const colTop = colEl?.getBoundingClientRect().top ?? 0
    dragRef.current = {
      blockId: block.id,
      mode,
      origStart: block.startTime,
      origEnd: block.endTime,
      origDay: block.dateISO,
      mouseStartY: e.clientY,
      blockOffsetY: e.clientY - colTop - toY(block.startTime),
    }
    setPreview({ blockId: block.id, startTime: block.startTime, endTime: block.endTime, dateISO: block.dateISO })
  }

  // Global mousemove/mouseup for drag
  useEffect(() => {
    function onMove(e: MouseEvent) {
      const drag = dragRef.current
      if (!drag) return

      // Find which day column the cursor is over
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

    function onUp() {
      const drag = dragRef.current
      if (drag && preview) {
        updateTimeBlock(drag.blockId, {
          startTime: preview.startTime,
          endTime: preview.endTime,
          dateISO: preview.dateISO,
        })
      }
      dragRef.current = null
      setPreview(null)
    }

    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
  }, [preview, updateTimeBlock])

  const visibleDays = view === "week" ? weekDays : [weekDays[dayIndex]]

  return (
    <div className="flex h-full flex-col gap-0">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight">Schedule</h1>
          <p className="text-sm text-muted-foreground">Click a slot to add · drag to move · drag edge to resize</p>
        </div>
        <div className="flex items-center gap-2">
          {view === "day" && (
            <>
              <Button variant="ghost" size="icon" onClick={() => setDayIndex((i) => Math.max(0, i - 1))} disabled={dayIndex === 0}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-22.5 text-center text-sm font-medium">
                {weekDays[dayIndex]?.label} {weekDays[dayIndex]?.dayNumber}
              </span>
              <Button variant="ghost" size="icon" onClick={() => setDayIndex((i) => Math.min(6, i + 1))} disabled={dayIndex === 6}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
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

      <div className="flex flex-1 gap-4 overflow-hidden">
          {/* Calendar grid */}
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border">
            {/* Day header row */}
            <div className="flex border-b bg-muted/30">
              <div className="w-14 shrink-0 border-r" />
              {visibleDays.map((day) => {
                const isToday = day.iso === nowDayISO
                return (
                  <div
                    key={day.iso}
                    className={cn(
                      "flex flex-1 flex-col items-center py-2 text-center",
                      view === "week" && "border-r last:border-r-0"
                    )}
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

            {/* Scrollable grid body */}
            <div className="flex flex-1 overflow-y-auto">
              {/* Time labels */}
              <div className="relative w-14 shrink-0 border-r">
                <div style={{ height: GRID_HEIGHT }}>
                  {HOUR_LABELS.map(({ h, label }) => (
                    <div
                      key={h}
                      className="absolute right-2 -translate-y-1/2 text-[10px] text-muted-foreground"
                      style={{ top: (h - DAY_START) * HOUR_PX }}
                    >
                      {label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Day columns */}
              <div className={cn("flex flex-1", view === "week" && "")}>
                {visibleDays.map((day) => {
                  const dayBlocks = weekBlocks
                    .filter((b) => b.dateISO === day.iso)
                    .sort((a, b) => a.startTime.localeCompare(b.startTime))
                  const isToday = day.iso === nowDayISO

                  return (
                    <div
                      key={day.iso}
                      data-day={day.iso}
                      className={cn(
                        "relative flex-1 cursor-crosshair select-none",
                        view === "week" && "border-r last:border-r-0"
                      )}
                      style={{ height: GRID_HEIGHT }}
                      onMouseDown={(e) => gridMouseDown(e, day.iso)}
                      onMouseUp={(e) => gridMouseUp(e, day.iso)}
                    >
                      {/* Hour grid lines */}
                      {HOUR_LABELS.map(({ h }) => (
                        <div key={h} className="absolute inset-x-0 border-t border-border/40" style={{ top: (h - DAY_START) * HOUR_PX }} />
                      ))}
                      {/* Half-hour lines */}
                      {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                        <div
                          key={i}
                          className="absolute inset-x-0 border-t border-border/20 border-dashed"
                          style={{ top: (i + 0.5) * HOUR_PX }}
                        />
                      ))}

                      {/* Current time bar */}
                      {isToday && nowY !== null && (
                        <div className="pointer-events-none absolute inset-x-0 z-10" style={{ top: nowY }}>
                          <div className="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-red-500" />
                          <div className="h-px bg-red-500" />
                        </div>
                      )}

                      {/* Time blocks */}
                      {dayBlocks.map((block) => {
                        const isPreview = preview?.blockId === block.id
                        const displayStart = isPreview ? preview.startTime : block.startTime
                        const displayEnd = isPreview ? preview.endTime : block.endTime
                        const displayDay = isPreview ? preview.dateISO : block.dateISO
                        if (displayDay !== day.iso) return null

                        const project = projects.find((p) => p.id === block.projectId)
                        const style = blockStyle(project?.color ?? "#6366f1")
                        const isEditing = editId === block.id

                        return (
                          <div
                            key={block.id}
                            className={cn(
                              "absolute inset-x-1 z-20 overflow-hidden rounded-md border-l-[3px] px-2 py-1 text-xs",
                              isEditing && "ring-2 ring-primary ring-offset-1",
                              isPreview && "opacity-90"
                            )}
                            style={{
                              top: toY(displayStart),
                              height: blockH(displayStart, displayEnd),
                              ...style,
                              cursor: "grab",
                            }}
                            onMouseDown={(e) => blockMouseDown(e, { ...block, startTime: displayStart, endTime: displayEnd, dateISO: displayDay }, "move")}
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditId(editId === block.id ? null : block.id)
                              setCreating(null)
                            }}
                          >
                            <p className="truncate font-medium leading-tight">{block.taskDescription}</p>
                            <p className="truncate opacity-75">{displayStart}–{displayEnd}</p>
                            {block.status === "done" && block.actualHours != null && block.actualHours > block.plannedHours ? (
                              <p className="mt-0.5 text-[10px] font-semibold text-amber-400">{fmtOverrun(block.actualHours - block.plannedHours)} over</p>
                            ) : null}
                            {block.status === "done" && (
                              <CheckCircle2 className="absolute right-1 top-1 h-3 w-3" />
                            )}
                            {/* Resize handle */}
                            <div
                              className="absolute inset-x-0 bottom-0 h-2 cursor-s-resize"
                              onMouseDown={(e) => {
                                e.stopPropagation()
                                blockMouseDown(e, { ...block, startTime: displayStart, endTime: displayEnd, dateISO: displayDay }, "resize")
                              }}
                            />
                          </div>
                        )
                      })}

                      {/* Preview ghost for blocks being dragged to this day */}
                      {preview && preview.dateISO === day.iso && !dayBlocks.find((b) => b.id === preview.blockId) && (() => {
                        const block = weekBlocks.find((b) => b.id === preview.blockId)
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
                            <p className="truncate font-medium leading-tight">{block.taskDescription}</p>
                            <p className="truncate opacity-75">{preview.startTime}–{preview.endTime}</p>
                          </div>
                        )
                      })()}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Right sidebar: create panel / edit panel / allocation status */}
          <div className="flex w-72 shrink-0 flex-col gap-3 overflow-y-auto">
            {/* Create panel */}
            {creating && (
              <div className="rounded-xl border bg-card p-4 shadow-sm">
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
                  <div className="space-y-1.5">
                    <Label className="text-xs">Project <span className="text-muted-foreground">(optional)</span></Label>
                    <Select value={newProjectId || "none"} onValueChange={(v) => setNewProjectId(v === "none" ? "" : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="No project" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No project</SelectItem>
                        {activeProjects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Start</Label>
                      <Input type="time" value={creating.startTime} onChange={(e) => setCreating((c) => c && ({ ...c, startTime: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">End</Label>
                      <Input type="time" value={creating.endTime} onChange={(e) => setCreating((c) => c && ({ ...c, endTime: e.target.value }))} />
                    </div>
                  </div>
                  <Button className="w-full" onClick={handleCreate} disabled={!newDesc.trim()}>
                    Add block
                  </Button>
                </div>
              </div>
            )}

            {/* Edit panel */}
            {editBlock && (
              <EditPanel
                block={editBlock}
                project={projects.find((p) => p.id === editBlock.projectId)}
                allProjects={activeProjects}
                onUpdate={(updates) => updateTimeBlock(editBlock.id, updates)}
                onDelete={() => { deleteTimeBlock(editBlock.id); setEditId(null) }}
                onClose={() => setEditId(null)}
              />
            )}

            {/* Allocation status — only when a weekly plan exists */}
            {activePlan && projectHours.length > 0 && (
              <div className="rounded-xl border bg-card p-4">
                <p className="mb-3 text-sm font-semibold">Week allocation</p>
                <div className="space-y-3">
                  {projectHours.map((item) => {
                    const project = projects.find((p) => p.id === item.projectId)
                    const pct = Math.min(100, (item.plannedHours / item.allocatedHours) * 100)
                    return (
                      <div key={item.projectId} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="truncate font-medium">{project?.title ?? "Unknown"}</span>
                          <span className="ml-2 shrink-0 text-muted-foreground">{item.plannedHours}h / {item.allocatedHours}h</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: project?.color ?? "#6366f1",
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
    </div>
  )
}

// ── Edit panel ────────────────────────────────────────────────────────────────
interface EditPanelProps {
  block: TimeBlock
  project: { id: string; title: string; color: string } | undefined
  allProjects: { id: string; title: string; color: string }[]
  onUpdate: (updates: Partial<TimeBlock>) => void
  onDelete: () => void
  onClose: () => void
}

function EditPanel({ block, project, allProjects, onUpdate, onDelete, onClose }: EditPanelProps) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: project?.color ?? "#94a3b8" }} />
          <p className="text-sm font-semibold truncate">{project?.title ?? "No project"}</p>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Description</Label>
          <Input
            value={block.taskDescription}
            onChange={(e) => onUpdate({ taskDescription: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Project <span className="text-muted-foreground">(optional)</span></Label>
          <Select
            value={block.projectId ?? "none"}
            onValueChange={(v) => onUpdate({ projectId: v === "none" ? undefined : v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="No project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No project</SelectItem>
              {allProjects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Start</Label>
            <Input type="time" value={block.startTime} onChange={(e) => onUpdate({ startTime: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">End</Label>
            <Input type="time" value={block.endTime} onChange={(e) => onUpdate({ endTime: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Actual hours</Label>
            <Input
              type="number"
              min={0}
              step={0.25}
              value={block.actualHours ?? block.plannedHours}
              onChange={(e) => onUpdate({ actualHours: Number(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Status</Label>
            <Select value={block.status} onValueChange={(v) => onUpdate({ status: v as TimeBlock["status"] })}>
              <SelectTrigger>
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
        <div className="flex gap-2">
          <Button
            className="flex-1"
            variant="outline"
            onClick={() => onUpdate({ status: "done", actualHours: block.actualHours ?? block.plannedHours })}
          >
            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
            Done
          </Button>
          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
