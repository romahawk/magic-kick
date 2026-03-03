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
import { CalendarDays, Play, Pause, RotateCcw, Timer, Pencil, ExternalLink } from "lucide-react"
import type { ScheduleItem, TaskCategory } from "@/lib/types"

const POMODORO_WORK = 25 * 60
const POMODORO_BREAK = 5 * 60
const DEFAULT_TASK_CATEGORIES = ["Learning", "Sport", "Family/Home", "Hobby", "Travel"]
const DAY_START_HOUR = 6
const DAY_END_HOUR = 23
const MINUTES_PER_DAY = 24 * 60
const GRID_SNAP_MINUTES = 30
const HOUR_ROW_HEIGHT_PX = 64
const PIXELS_PER_MINUTE = HOUR_ROW_HEIGHT_PX / 60

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
  const categories = taskCategories?.length ? taskCategories : DEFAULT_TASK_CATEGORIES
  const updateTask = useAppStore((s) => s.updateTask)
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
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null)
  const [isGridDragOver, setIsGridDragOver] = useState(false)
  const [weekDragOverDay, setWeekDragOverDay] = useState<string | null>(null)
  const dayGridRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!categories.includes(editCategory)) {
      setEditCategory(categories[0] ?? "General")
    }
  }, [categories, editCategory])

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
  }

  function saveTaskFromSchedule() {
    if (!editingTaskId) return
    updateTask(
      editingTaskId,
      {
        title: editTitle.trim(),
        category: editCategory,
        dueDate: editDate || undefined,
        estimateMin: editEstimate ? Number(editEstimate) : undefined,
      },
      {
        startHHmm: editStartTime,
        endHHmm: editEndTime,
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight">Schedule</h1>
          <p className="text-sm text-muted-foreground">Plan your day and stay focused.</p>
        </div>
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <a href="https://calendar.google.com/" target="_blank" rel="noreferrer noopener">
            Google Calendar
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>
      </div>

      <Tabs defaultValue="day">
        <TabsList>
          <TabsTrigger value="day">Day View</TabsTrigger>
          <TabsTrigger value="week">Week View</TabsTrigger>
          <TabsTrigger value="pomodoro">Pomodoro</TabsTrigger>
        </TabsList>

        <TabsContent value="day" className="mt-4 flex flex-col gap-4">
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
                        return (
                          <div
                            key={item.id}
                            className={cn(
                              "flex items-center gap-2 rounded-md border border-border p-2 cursor-grab active:cursor-grabbing"
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
                              <p className="text-xs font-medium truncate">{item.title}</p>
                              {hasExplicitTime ? (
                                <p className="text-[10px] text-muted-foreground">
                                  {format(start, "HH:mm")} - {format(end, "HH:mm")}
                                </p>
                              ) : null}
                            </div>
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
              <Select value={editCategory} onValueChange={(v) => setEditCategory(v as TaskCategory)}>
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
