"use client"

import { useMemo, useState } from "react"
import type { ElementType } from "react"
import { useAppStore } from "@/lib/store"
import { TASK_LANE_LABELS } from "@/lib/execution-os"
import { isDueToday, isOverdue } from "@/lib/game-utils"
import { TASK_REPEAT_OPTIONS } from "@/lib/task-recurrence"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Archive, ChevronDown, Clock, Focus, LayoutList, Pencil, Save, Search, Tags, Trash2, Zap } from "lucide-react"
import type { Task, TaskCategory, TaskLane, TaskRepeat } from "@/lib/types"

const DEFAULT_TASK_CATEGORIES = ["Learning", "Sport", "Family/Home", "Hobby", "Travel"]
const TASK_LANES: Array<{ id: TaskLane; title: string; description: string; icon: ElementType }> = [
  { id: "backlog", title: "Backlog", description: "Important work waiting for a focus slot.", icon: LayoutList },
  { id: "daily-focus", title: "Daily Focus", description: "Only the few tasks that deserve today.", icon: Focus },
  { id: "parking-lot", title: "Parking Lot", description: "Ideas and tasks not needed this month.", icon: Archive },
]

export function TodoModule() {
  const allTasks = useAppStore((s) => s.tasks)
  const allTimeBlocks = useAppStore((s) => s.timeBlocks)
  const allScheduleItems = useAppStore((s) => s.schedule)
  const taskCategories = useAppStore((s) => s.profile.taskCategories)
  const taskCategoryColors = useAppStore((s) => s.profile.taskCategoryColors)
  const dailyFocusLimit = useAppStore((s) => s.profile.systemConfig?.dailyFocusLimit ?? 3)
  const toggleTask = useAppStore((s) => s.toggleTask)
  const reorderTasks = useAppStore((s) => s.reorderTasks)
  const moveTaskToLane = useAppStore((s) => s.moveTaskToLane)
  const updateTask = useAppStore((s) => s.updateTask)
  const deleteTask = useAppStore((s) => s.deleteTask)
  const addCategory = useAppStore((s) => s.addCategory)
  const renameCategory = useAppStore((s) => s.renameCategory)
  const removeCategory = useAppStore((s) => s.deleteCategory)
  const setCategoryColor = useAppStore((s) => s.setCategoryColor)

  const categories = taskCategories?.length ? taskCategories : DEFAULT_TASK_CATEGORIES
  const categoryColors = taskCategoryColors ?? {}
  const tasks = useMemo(() => allTasks.filter((t) => !t.deleted).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [allTasks])

  const taskTimeSlots = useMemo(() => {
    const map: Record<string, { startTime: string; endTime: string; plannedHours: number; actualHours?: number; status: string }> = {}
    for (const item of allScheduleItems) {
      if (!item.deleted && item.linkedTaskId && item.hasExplicitTime) {
        map[item.linkedTaskId] = {
          startTime: item.startISO.slice(11, 16),
          endTime: item.endISO.slice(11, 16),
          plannedHours: 0,
          status: "planned",
        }
      }
    }
    for (const block of allTimeBlocks) {
      if (!block.deleted && block.linkedTaskId) {
        map[block.linkedTaskId] = { startTime: block.startTime, endTime: block.endTime, plannedHours: block.plannedHours, actualHours: block.actualHours, status: block.status }
      }
    }
    return map
  }, [allScheduleItems, allTimeBlocks])

  const [search, setSearch] = useState("")
  const [filterCategory, setFilterCategory] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [sortBy, setSortBy] = useState("date-asc")
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [taskFormError, setTaskFormError] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editCategory, setEditCategory] = useState<TaskCategory>("Learning")
  const [editLane, setEditLane] = useState<TaskLane>("backlog")
  const [editDueDate, setEditDueDate] = useState("")
  const [editRepeat, setEditRepeat] = useState<TaskRepeat>("none")
  const [editStartTime, setEditStartTime] = useState("")
  const [editEndTime, setEditEndTime] = useState("")
  const [editEstimate, setEditEstimate] = useState("")
  const [editPomodoros, setEditPomodoros] = useState("")
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [newCategory, setNewCategory] = useState("")
  const [renameFrom, setRenameFrom] = useState("")
  const [renameTo, setRenameTo] = useState("")

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (search && !task.title.toLowerCase().includes(search.toLowerCase())) return false
      if (filterCategory !== "all" && task.category !== filterCategory) return false
      return true
    })
  }, [tasks, search, filterCategory])

  const sortedTasks = useMemo(() => {
    const items = [...filteredTasks]
    const dueToTs = (task: Task) => (task.dueDate ? new Date(`${task.dueDate}T00:00:00`).getTime() : Number.POSITIVE_INFINITY)
    items.sort((a, b) => {
      if (sortBy === "date-asc") {
        const diff = dueToTs(a) - dueToTs(b)
        if (diff !== 0) return diff
      } else if (sortBy === "date-desc") {
        const aTs = a.dueDate ? new Date(`${a.dueDate}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY
        const bTs = b.dueDate ? new Date(`${b.dueDate}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY
        const diff = bTs - aTs
        if (diff !== 0) return diff
      } else {
        const diff = (a.order ?? 0) - (b.order ?? 0)
        if (diff !== 0) return diff
      }
      return a.title.localeCompare(b.title)
    })
    return items
  }, [filteredTasks, sortBy])

  const openTasks = useMemo(() => sortedTasks.filter((task) => !task.completed), [sortedTasks])
  const archivedTasks = useMemo(() => sortedTasks.filter((task) => task.completed), [sortedTasks])
  const backlogTasks = useMemo(() => openTasks.filter((task) => (task.lane ?? "backlog") === "backlog"), [openTasks])
  const dailyFocusTasks = useMemo(() => openTasks.filter((task) => (task.lane ?? "backlog") === "daily-focus"), [openTasks])
  const parkingLotTasks = useMemo(() => openTasks.filter((task) => (task.lane ?? "backlog") === "parking-lot"), [openTasks])

  function openTask(task: Task) {
    setSelectedTask(task)
    setIsEditing(false)
    setTaskFormError(null)
    setEditTitle(task.title)
    setEditCategory(task.category)
    setEditLane(task.lane ?? "backlog")
    setEditDueDate(task.dueDate ?? "")
    setEditRepeat(task.repeat ?? "none")
    setEditStartTime(taskTimeSlots[task.id]?.startTime ?? "")
    setEditEndTime(taskTimeSlots[task.id]?.endTime ?? "")
    setEditEstimate(task.estimateMin ? String(task.estimateMin) : "")
    setEditPomodoros(task.pomodorosPlanned ? String(task.pomodorosPlanned) : "")
  }

  function canUseDailyFocusLane(taskId?: string) {
    return tasks.filter((task) => !task.deleted && !task.completed && (task.lane ?? "backlog") === "daily-focus" && task.id !== taskId).length < dailyFocusLimit
  }

  function handleMoveTask(taskId: string, lane: TaskLane, targetTaskId?: string) {
    if (lane === "daily-focus" && !canUseDailyFocusLane(taskId)) return
    moveTaskToLane(taskId, lane, targetTaskId)
  }

  function saveTaskEdits() {
    if (!selectedTask) return
    if (editLane === "daily-focus" && !canUseDailyFocusLane(selectedTask.id)) {
      setTaskFormError(`Daily Focus is limited to ${dailyFocusLimit} tasks.`)
      return
    }
    if (editDueDate && editEndTime && !editStartTime) {
      setTaskFormError("Set a start time before choosing an end time.")
      return
    }
    if (editStartTime && editEndTime && editEndTime <= editStartTime) {
      setTaskFormError("End time must be later than the start time.")
      return
    }
    updateTask(selectedTask.id, {
      title: editTitle.trim() || selectedTask.title,
      category: categories.includes(editCategory) ? editCategory : selectedTask.category,
      lane: editLane,
      dueDate: editDueDate || undefined,
      repeat: editRepeat,
      estimateMin: editEstimate ? Number(editEstimate) : undefined,
      pomodorosPlanned: editPomodoros ? Number(editPomodoros) : undefined,
    }, {
      startHHmm: editDueDate ? editStartTime || undefined : undefined,
      endHHmm: editDueDate ? editEndTime || undefined : undefined,
      clearTimeSlot: Boolean(editDueDate) && !editStartTime && !editEndTime,
    })
    setTaskFormError(null)
    setIsEditing(false)
  }

  function makeDragHandlers(lane: TaskLane) {
    return {
      onDragStart: (taskId: string) => setDraggedTaskId(taskId),
      onDropOnTask: (targetTask: Task) => {
        if (!draggedTaskId || draggedTaskId === targetTask.id) return
        const draggedLane = tasks.find((t) => t.id === draggedTaskId)?.lane ?? "backlog"
        if ((targetTask.lane ?? "backlog") === draggedLane) {
          if (sortBy === "manual") reorderTasks(draggedTaskId, targetTask.id)
        } else {
          handleMoveTask(draggedTaskId, targetTask.lane ?? "backlog", targetTask.id)
        }
        setDraggedTaskId(null)
      },
      onDropOnLane: () => {
        if (!draggedTaskId) return
        handleMoveTask(draggedTaskId, lane)
        setDraggedTaskId(null)
      },
      onDragEnd: () => setDraggedTaskId(null),
    }
  }

  const laneTasks: Record<TaskLane, Task[]> = {
    backlog: backlogTasks,
    "daily-focus": dailyFocusTasks,
    "parking-lot": parkingLotTasks,
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight">ToDo</h1>
        <p className="text-sm text-muted-foreground">{openTasks.length} open tasks across focus, backlog, and parking lot</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 basis-full sm:min-w-65 sm:flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-32"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Open + Archive</SelectItem>
            <SelectItem value="active">Open</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Sort" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="date-asc">Date: earliest</SelectItem>
            <SelectItem value="date-desc">Date: latest</SelectItem>
            <SelectItem value="manual">Manual order</SelectItem>
          </SelectContent>
        </Select>
        <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Manage categories"><Tags className="h-4 w-4" /></Button>
              </DialogTrigger>
            </TooltipTrigger>
            <TooltipContent sideOffset={8}>Manage Categories</TooltipContent>
          </Tooltip>
          <DialogContent>
            <DialogHeader><DialogTitle>Manage Categories</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-category">Add Category</Label>
                <div className="flex gap-2">
                  <Input id="new-category" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Category name" />
                  <Button type="button" onClick={() => { if (!newCategory.trim()) return; addCategory(newCategory); setNewCategory("") }}>Add</Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Rename Category</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Select value={renameFrom} onValueChange={setRenameFrom}>
                    <SelectTrigger><SelectValue placeholder="Current" /></SelectTrigger>
                    <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input value={renameTo} onChange={(e) => setRenameTo(e.target.value)} placeholder="New name" />
                  <Button type="button" variant="outline" onClick={() => { if (!renameFrom || !renameTo.trim()) return; renameCategory(renameFrom, renameTo); setRenameFrom(""); setRenameTo("") }}>Rename</Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Delete Category</Label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((c) => <Button key={c} type="button" variant="outline" size="sm" onClick={() => removeCategory(c)} disabled={categories.length <= 1}>Delete {c}</Button>)}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Category Colors</Label>
                <div className="space-y-2">
                  {categories.map((c) => (
                    <div key={c} className="flex items-center justify-between rounded-md border border-border p-2">
                      <span className="text-sm">{c}</span>
                      <input type="color" value={categoryColors[c] ?? "#64748b"} onChange={(e) => setCategoryColor(c, e.target.value)} className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent p-0" aria-label={`Pick color for ${c}`} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Row 1 — Summary cards: Backlog | Daily Focus | Parking Lot */}
      <div className="grid gap-3 md:grid-cols-3">
        <LaneSummaryCard title="Backlog" count={backlogTasks.length} badge="Queue" description="Important work waiting for a focus slot." icon={LayoutList} tone="default" />
        <LaneSummaryCard title="Daily Focus" count={dailyFocusTasks.length} badge={`${dailyFocusLimit} max`} description="Only the few tasks that deserve today." icon={Focus} tone={dailyFocusTasks.length > dailyFocusLimit ? "warning" : "default"} />
        <LaneSummaryCard title="Parking Lot" count={parkingLotTasks.length} badge="Later" description="Ideas and tasks not needed this month." icon={Archive} tone="muted" />
      </div>

      {/* Row 2 — Kanban columns: Backlog | Daily Focus | Parking Lot */}
      {filterStatus !== "completed" ? (
        <div className="grid gap-4 md:grid-cols-3 items-start">
          {TASK_LANES.map((laneConfig) => {
            const handlers = makeDragHandlers(laneConfig.id)
            return (
              <KanbanColumn
                key={laneConfig.id}
                lane={laneConfig.id}
                tasks={laneTasks[laneConfig.id]}
                limit={laneConfig.id === "daily-focus" ? dailyFocusLimit : undefined}
                categoryColors={categoryColors}
                taskTimeSlots={taskTimeSlots}
                onToggle={toggleTask}
                onSelect={openTask}
                {...handlers}
              />
            )
          })}
        </div>
      ) : null}

      {/* Archive */}
      {(filterStatus === "all" || filterStatus === "completed") && archivedTasks.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm">
              <span>Archive</span>
              <Button variant="outline" size="sm" onClick={() => setArchiveOpen((v) => !v)}>
                <ChevronDown className={cn("mr-1 h-3 w-3 transition-transform", archiveOpen && "rotate-180")} />
                {archiveOpen ? "Hide" : "Show"} ({archivedTasks.length})
              </Button>
            </CardTitle>
          </CardHeader>
          {archiveOpen ? (
            <CardContent className="flex flex-col gap-2">
              {archivedTasks.map((task) => (
                <TaskCard key={`arch-${task.id}`} task={task} categoryColor={categoryColors[task.category]} onToggle={toggleTask} onSelect={openTask} onDragStart={() => {}} onDropOnTask={() => {}} onDragEnd={() => {}} draggable={false} showLane />
              ))}
            </CardContent>
          ) : null}
        </Card>
      ) : null}

      {/* Task detail sheet */}
      <Sheet open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <SheetContent className="px-6">
          <SheetHeader><SheetTitle>{selectedTask?.title}</SheetTitle></SheetHeader>
          {selectedTask ? (
            <div className="mt-4 flex flex-col gap-4">
              {isEditing ? (
                <div className="space-y-3">
                  <div><Label htmlFor="edit-task-title">Title</Label><Input id="edit-task-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} /></div>
                  <div>
                    <Label>Category</Label>
                    <Select value={categories.includes(editCategory) ? editCategory : categories[0] ?? "General"} onValueChange={(v) => setEditCategory(v as TaskCategory)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Lane</Label>
                    <Select value={editLane} onValueChange={(v) => setEditLane(v as TaskLane)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{TASK_LANES.map((l) => <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label htmlFor="edit-task-due">Due date</Label><Input id="edit-task-due" type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} /></div>
                  <div>
                    <Label>Repeat</Label>
                    <Select value={editRepeat} onValueChange={(value) => setEditRepeat(value as TaskRepeat)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TASK_REPEAT_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label htmlFor="edit-task-start">Start time</Label><Input id="edit-task-start" type="time" value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)} disabled={!editDueDate} /></div>
                    <div><Label htmlFor="edit-task-end">End time</Label><Input id="edit-task-end" type="time" value={editEndTime} onChange={(e) => setEditEndTime(e.target.value)} disabled={!editDueDate} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label htmlFor="edit-task-estimate">Estimate (min)</Label><Input id="edit-task-estimate" type="number" value={editEstimate} onChange={(e) => setEditEstimate(e.target.value)} /></div>
                    <div><Label htmlFor="edit-task-pomodoros">Pomodoros</Label><Input id="edit-task-pomodoros" type="number" value={editPomodoros} onChange={(e) => setEditPomodoros(e.target.value)} /></div>
                  </div>
                </div>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                <Badge style={{ backgroundColor: categoryColors[selectedTask.category] ?? "#334155", color: "#ffffff" }}>{selectedTask.category}</Badge>
                <Badge variant="outline">{TASK_LANE_LABELS[selectedTask.lane ?? "backlog"]}</Badge>
                {(selectedTask.repeat ?? "none") !== "none" ? <Badge variant="outline">Repeats {selectedTask.repeat}</Badge> : null}
                <Badge variant="outline" className="gap-1"><Zap className="h-3 w-3" /> {selectedTask.xpValue} XP</Badge>
                {selectedTask.completed ? <Badge variant="secondary">Completed</Badge> : null}
              </div>
              {taskFormError ? <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{taskFormError}</div> : null}
              {selectedTask.dueDate ? (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className={cn(isOverdue(selectedTask.dueDate) && "text-destructive")}>Due: {selectedTask.dueDate}</span>
                  {isDueToday(selectedTask.dueDate) ? <Badge className="bg-primary text-primary-foreground text-[10px]">Today</Badge> : null}
                </div>
              ) : null}
              {taskTimeSlots[selectedTask.id] ? (
                <p className="text-sm text-muted-foreground">
                  Time slot: {fmtTime(taskTimeSlots[selectedTask.id].startTime)} - {fmtTime(taskTimeSlots[selectedTask.id].endTime)}
                </p>
              ) : null}
              {selectedTask.estimateMin ? <p className="text-sm text-muted-foreground">Estimated: {selectedTask.estimateMin} min</p> : null}
              {selectedTask.pomodorosPlanned ? <p className="text-sm text-muted-foreground">Pomodoros planned: {selectedTask.pomodorosPlanned}</p> : null}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { if (isEditing) saveTaskEdits(); else { setTaskFormError(null); setIsEditing(true) } }}>
                  {isEditing ? <Save className="mr-1 h-4 w-4" /> : <Pencil className="mr-1 h-4 w-4" />}
                  {isEditing ? "Save" : "Edit"}
                </Button>
                <Button variant={selectedTask.completed ? "secondary" : "default"} onClick={() => { toggleTask(selectedTask.id); setSelectedTask(null) }}>
                  {selectedTask.completed ? "Mark Incomplete" : "Mark Complete"}
                </Button>
                <Button variant="destructive" size="icon" onClick={() => { deleteTask(selectedTask.id); setSelectedTask(null) }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}

// ── Lane summary card (row 1) ────────────────────────────────────────────────

function LaneSummaryCard({ title, count, badge, description, icon: Icon, tone }: {
  title: string; count: number; badge: string; description: string; icon: ElementType; tone: "default" | "warning" | "muted"
}) {
  return (
    <Card className={cn(tone === "warning" && "border-amber-500/40 bg-amber-500/10", tone === "muted" && "border-border/60 bg-secondary/10")}>
      <CardContent className="flex items-center gap-2.5 px-4 py-2.5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary/60">
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium">{title}</p>
            <Badge variant="outline" className="text-[10px]">{badge}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <p className="text-2xl font-semibold tabular-nums">{count}</p>
      </CardContent>
    </Card>
  )
}

// ── Kanban column (row 2) ────────────────────────────────────────────────────

function KanbanColumn({ lane, tasks, limit, categoryColors, taskTimeSlots, onToggle, onSelect, onDragStart, onDropOnTask, onDropOnLane, onDragEnd }: {
  lane: TaskLane; tasks: Task[]; limit?: number; categoryColors: Record<string, string>
  taskTimeSlots: Record<string, { startTime: string; endTime: string; plannedHours: number; actualHours?: number; status: string }>
  onToggle: (id: string) => void; onSelect: (task: Task) => void
  onDragStart: (taskId: string) => void; onDropOnTask: (task: Task) => void
  onDropOnLane: () => void; onDragEnd: () => void
}) {
  const config = TASK_LANES.find((l) => l.id === lane)
  const atLimit = typeof limit === "number" && tasks.length >= limit

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2 px-1">
        <div className="min-w-0">
          <p className="font-semibold text-sm">{config?.title ?? lane}</p>
          <p className="text-xs text-muted-foreground leading-snug">{config?.description}</p>
        </div>
        <div className="shrink-0">
          {typeof limit === "number" ? (
            <Badge variant={atLimit ? "destructive" : "outline"} className="text-[10px]">{tasks.length}/{limit}</Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px]">{tasks.length}</Badge>
          )}
        </div>
      </div>
      <div
        className="flex flex-col gap-2 min-h-45 max-h-[60vh] overflow-y-auto rounded-xl border-2 border-dashed border-border/50 p-2 transition-colors hover:border-border/80"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); onDropOnLane() }}
      >
        {tasks.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-10 text-xs text-muted-foreground select-none">
            Drop tasks here
          </div>
        ) : null}
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            categoryColor={categoryColors[task.category]}
            timeSlot={taskTimeSlots[task.id]}
            onToggle={onToggle}
            onSelect={onSelect}
            onDragStart={onDragStart}
            onDropOnTask={onDropOnTask}
            onDragEnd={onDragEnd}
            draggable={!task.completed}
          />
        ))}
      </div>
    </div>
  )
}

// ── Task card ────────────────────────────────────────────────────────────────

function fmtTime(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number)
  return `${h}:${String(m).padStart(2, "0")}`
}

function fmtOverrun(diffHours: number) {
  const mins = Math.round(diffHours * 60)
  if (mins < 60) return `+${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `+${h}h ${m}m` : `+${h}h`
}

function TaskCard({ task, categoryColor, timeSlot, onToggle, onSelect, onDragStart, onDropOnTask, draggable = true, onDragEnd, showLane = false }: {
  task: Task; categoryColor?: string; timeSlot?: { startTime: string; endTime: string; plannedHours: number; actualHours?: number; status: string }
  onToggle: (id: string) => void; onSelect: (task: Task) => void
  onDragStart: (taskId: string) => void; onDropOnTask: (task: Task) => void
  draggable?: boolean; onDragEnd: () => void; showLane?: boolean
}) {
  return (
    <div
      className={cn("flex flex-col gap-2 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-secondary/30", draggable ? "cursor-grab active:cursor-grabbing" : "", task.completed && "opacity-50")}
      onClick={() => onSelect(task)}
      draggable={draggable}
      onDragStart={() => onDragStart(task.id)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); onDropOnTask(task) }}
      onDragEnd={onDragEnd}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect(task)}
    >
      <div className="flex items-start gap-2">
        <Checkbox checked={task.completed} onCheckedChange={() => onToggle(task.id)} onClick={(e) => e.stopPropagation()} aria-label={`Complete ${task.title}`} className="mt-0.5 shrink-0" />
        <p className={cn("flex-1 text-sm font-medium leading-snug", task.completed && "line-through")}>{task.title}</p>
      </div>
      <div className="ml-6 flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary" className="text-[10px]" style={categoryColor ? { backgroundColor: categoryColor, color: "#fff" } : undefined}>
          {task.category}
        </Badge>
        {showLane ? <Badge variant="outline" className="text-[10px]">{TASK_LANE_LABELS[task.lane ?? "backlog"]}</Badge> : null}
        {(task.repeat ?? "none") !== "none" ? <Badge variant="outline" className="text-[10px]">Repeats {task.repeat}</Badge> : null}
        {timeSlot ? (
          <Badge variant="outline" className="gap-1 text-[10px] font-normal tabular-nums">
            <Clock className="h-2.5 w-2.5" />{fmtTime(timeSlot.startTime)} – {fmtTime(timeSlot.endTime)}
          </Badge>
        ) : null}
        {timeSlot?.status === "done" && timeSlot.actualHours != null && timeSlot.actualHours > timeSlot.plannedHours ? (
          <Badge variant="outline" className="gap-1 text-[10px] font-medium tabular-nums border-amber-500/50 text-amber-500">
            {fmtOverrun(timeSlot.actualHours - timeSlot.plannedHours)} over
          </Badge>
        ) : null}
        {task.dueDate ? (
          <span className={cn("text-[10px] text-muted-foreground", isOverdue(task.dueDate) && "font-medium text-destructive")}>
            {isDueToday(task.dueDate) ? "Today" : task.dueDate}
          </span>
        ) : null}
        {task.estimateMin && !timeSlot ? (
          <Badge variant="secondary" className="gap-1 text-[10px]">
            <Clock className="h-2.5 w-2.5" />{task.estimateMin}m
          </Badge>
        ) : null}
        <span className="ml-auto flex items-center gap-0.5 text-[10px] text-muted-foreground">
          <Zap className="h-2.5 w-2.5" />{task.xpValue}
        </span>
      </div>
    </div>
  )
}
