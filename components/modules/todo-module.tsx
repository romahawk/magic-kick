"use client"

import { useMemo, useState } from "react"
import type { ElementType } from "react"
import { useAppStore } from "@/lib/store"
import { TASK_LANE_LABELS } from "@/lib/execution-os"
import { isDueToday, isOverdue } from "@/lib/game-utils"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Archive, ChevronDown, ChevronRight, Clock, Focus, LayoutList, Pencil, Rows3, Save, Search, Tags, Trash2, Zap } from "lucide-react"
import type { Task, TaskCategory, TaskLane } from "@/lib/types"

const DEFAULT_TASK_CATEGORIES = ["Learning", "Sport", "Family/Home", "Hobby", "Travel"]
const TASK_LANES: Array<{ id: TaskLane; title: string; description: string }> = [
  { id: "daily-focus", title: "Daily Focus", description: "Only the few tasks that deserve today." },
  { id: "backlog", title: "Backlog", description: "Important work waiting for a focus slot." },
  { id: "parking-lot", title: "Parking Lot", description: "Ideas and tasks not needed this month." },
]

export function TodoModule() {
  const allTasks = useAppStore((s) => s.tasks)
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

  const [viewMode, setViewMode] = useState<"list" | "board">("list")
  const [search, setSearch] = useState("")
  const [filterCategory, setFilterCategory] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [sortBy, setSortBy] = useState("date-asc")
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [openLanes, setOpenLanes] = useState<Record<TaskLane, boolean>>({
    "daily-focus": true,
    backlog: true,
    "parking-lot": true,
  })
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [taskFormError, setTaskFormError] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editCategory, setEditCategory] = useState<TaskCategory>("Learning")
  const [editLane, setEditLane] = useState<TaskLane>("backlog")
  const [editDueDate, setEditDueDate] = useState("")
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
  const dailyFocusTasks = useMemo(() => openTasks.filter((task) => (task.lane ?? "backlog") === "daily-focus"), [openTasks])
  const backlogTasks = useMemo(() => openTasks.filter((task) => (task.lane ?? "backlog") === "backlog"), [openTasks])
  const parkingLotTasks = useMemo(() => openTasks.filter((task) => (task.lane ?? "backlog") === "parking-lot"), [openTasks])

  const boardTasks = useMemo(() => {
    if (filterStatus === "completed") return archivedTasks
    if (filterStatus === "active") return openTasks
    return sortedTasks
  }, [archivedTasks, filterStatus, openTasks, sortedTasks])

  const groupedByCategory = useMemo(() => {
    const map: Record<string, Task[]> = {}
    for (const task of boardTasks) {
      if (!map[task.category]) map[task.category] = []
      map[task.category].push(task)
    }
    return map
  }, [boardTasks])

  function openTask(task: Task) {
    setSelectedTask(task)
    setIsEditing(false)
    setTaskFormError(null)
    setEditTitle(task.title)
    setEditCategory(task.category)
    setEditLane(task.lane ?? "backlog")
    setEditDueDate(task.dueDate ?? "")
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
    updateTask(selectedTask.id, {
      title: editTitle.trim() || selectedTask.title,
      category: categories.includes(editCategory) ? editCategory : selectedTask.category,
      lane: editLane,
      dueDate: editDueDate || undefined,
      estimateMin: editEstimate ? Number(editEstimate) : undefined,
      pomodorosPlanned: editPomodoros ? Number(editPomodoros) : undefined,
    })
    setTaskFormError(null)
    setIsEditing(false)
  }

  function toggleLane(lane: TaskLane) {
    setOpenLanes((prev) => ({
      ...prev,
      [lane]: !prev[lane],
    }))
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight">ToDo</h1>
        <p className="text-sm text-muted-foreground">{openTasks.length} open tasks across focus, backlog, and parking lot</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 basis-full sm:min-w-[260px] sm:flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}
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
        <IconToggleButton active={viewMode === "list"} onClick={() => setViewMode("list")} label="Lane View" icon={LayoutList} />
        <IconToggleButton active={viewMode === "board"} onClick={() => setViewMode("board")} label="By Category" icon={Rows3} />
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
                  <Button type="button" onClick={() => {
                    if (!newCategory.trim()) return
                    addCategory(newCategory)
                    setNewCategory("")
                  }}>Add</Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Rename Category</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Select value={renameFrom} onValueChange={setRenameFrom}>
                    <SelectTrigger><SelectValue placeholder="Current" /></SelectTrigger>
                    <SelectContent>{categories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input value={renameTo} onChange={(e) => setRenameTo(e.target.value)} placeholder="New name" />
                  <Button type="button" variant="outline" onClick={() => {
                    if (!renameFrom || !renameTo.trim()) return
                    renameCategory(renameFrom, renameTo)
                    setRenameFrom("")
                    setRenameTo("")
                  }}>Rename</Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Delete Category</Label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => <Button key={category} type="button" variant="outline" size="sm" onClick={() => removeCategory(category)} disabled={categories.length <= 1}>Delete {category}</Button>)}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Category Colors</Label>
                <div className="space-y-2">
                  {categories.map((category) => (
                    <div key={category} className="flex items-center justify-between rounded-md border border-border p-2">
                      <span className="text-sm">{category}</span>
                      <input type="color" value={categoryColors[category] ?? "#64748b"} onChange={(e) => setCategoryColor(category, e.target.value)} className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent p-0" aria-label={`Pick color for ${category}`} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <LaneSummaryCard title="Daily Focus" count={dailyFocusTasks.length} limit={`${dailyFocusLimit} max`} description="Only the few tasks that deserve today." icon={Focus} tone={dailyFocusTasks.length > dailyFocusLimit ? "warning" : "default"} />
        <LaneSummaryCard title="Backlog" count={backlogTasks.length} limit="Queue" description="Important work waiting for a focus slot." icon={LayoutList} tone="default" />
        <LaneSummaryCard title="Parking Lot" count={parkingLotTasks.length} limit="Later" description="Ideas and tasks not needed this month." icon={Archive} tone="muted" />
      </div>

      {viewMode === "list" ? (
        <div className="flex flex-col gap-4">
          {filterStatus !== "completed" ? (
            <>
              <TaskLaneSection lane="daily-focus" open={openLanes["daily-focus"]} onToggleOpen={() => toggleLane("daily-focus")} tasks={dailyFocusTasks} limit={dailyFocusLimit} categoryColors={categoryColors} onToggle={toggleTask} onSelect={openTask} onDragStart={(taskId) => setDraggedTaskId(taskId)} onDropOnTask={(targetTask) => {
                if (!draggedTaskId || draggedTaskId === targetTask.id) return
                if ((targetTask.lane ?? "backlog") === (tasks.find((task) => task.id === draggedTaskId)?.lane ?? "backlog")) {
                  if (sortBy !== "manual") return
                  reorderTasks(draggedTaskId, targetTask.id)
                }
                else handleMoveTask(draggedTaskId, targetTask.lane ?? "backlog", targetTask.id)
                setDraggedTaskId(null)
              }} onDropOnLane={() => {
                if (!draggedTaskId) return
                handleMoveTask(draggedTaskId, "daily-focus")
                setDraggedTaskId(null)
              }} draggable={true} onDragEnd={() => setDraggedTaskId(null)} />
              <TaskLaneSection lane="backlog" open={openLanes.backlog} onToggleOpen={() => toggleLane("backlog")} tasks={backlogTasks} categoryColors={categoryColors} onToggle={toggleTask} onSelect={openTask} onDragStart={(taskId) => setDraggedTaskId(taskId)} onDropOnTask={(targetTask) => {
                if (!draggedTaskId || draggedTaskId === targetTask.id) return
                if ((targetTask.lane ?? "backlog") === (tasks.find((task) => task.id === draggedTaskId)?.lane ?? "backlog")) {
                  if (sortBy !== "manual") return
                  reorderTasks(draggedTaskId, targetTask.id)
                }
                else handleMoveTask(draggedTaskId, targetTask.lane ?? "backlog", targetTask.id)
                setDraggedTaskId(null)
              }} onDropOnLane={() => {
                if (!draggedTaskId) return
                handleMoveTask(draggedTaskId, "backlog")
                setDraggedTaskId(null)
              }} draggable={true} onDragEnd={() => setDraggedTaskId(null)} />
              <TaskLaneSection lane="parking-lot" open={openLanes["parking-lot"]} onToggleOpen={() => toggleLane("parking-lot")} tasks={parkingLotTasks} categoryColors={categoryColors} onToggle={toggleTask} onSelect={openTask} onDragStart={(taskId) => setDraggedTaskId(taskId)} onDropOnTask={(targetTask) => {
                if (!draggedTaskId || draggedTaskId === targetTask.id) return
                if ((targetTask.lane ?? "backlog") === (tasks.find((task) => task.id === draggedTaskId)?.lane ?? "backlog")) {
                  if (sortBy !== "manual") return
                  reorderTasks(draggedTaskId, targetTask.id)
                }
                else handleMoveTask(draggedTaskId, targetTask.lane ?? "backlog", targetTask.id)
                setDraggedTaskId(null)
              }} onDropOnLane={() => {
                if (!draggedTaskId) return
                handleMoveTask(draggedTaskId, "parking-lot")
                setDraggedTaskId(null)
              }} draggable={true} onDragEnd={() => setDraggedTaskId(null)} />
            </>
          ) : null}
          {(filterStatus === "all" || filterStatus === "completed") && archivedTasks.length > 0 ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm">
                  <span>Archive</span>
                  <Button variant="outline" size="sm" onClick={() => setArchiveOpen((value) => !value)}>{archiveOpen ? "Hide" : "Show"} ({archivedTasks.length})</Button>
                </CardTitle>
              </CardHeader>
              {archiveOpen ? <CardContent className="flex flex-col gap-2">{archivedTasks.map((task) => <TaskRow key={`arch-${task.id}`} task={task} categoryColor={categoryColors[task.category]} onToggle={toggleTask} onSelect={openTask} onDragStart={() => {}} onDropOnTask={() => {}} onDragEnd={() => {}} draggable={false} />)}</CardContent> : null}
            </Card>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Card key={category}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: categoryColors[category] ?? "#64748b" }} />
                  {category}
                  <Badge variant="secondary" className="ml-auto text-[10px]">{groupedByCategory[category]?.length ?? 0}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1.5">
                {(groupedByCategory[category] ?? []).map((task) => (
                  <button key={task.id} onClick={() => openTask(task)} className={cn("flex items-center gap-2 rounded-md border border-border p-2 text-left text-sm transition-colors hover:bg-secondary/50", task.completed && "line-through opacity-50")}>
                    <Checkbox checked={task.completed} onCheckedChange={() => toggleTask(task.id)} onClick={(e) => e.stopPropagation()} aria-label={`Complete ${task.title}`} />
                    <span className="flex-1 truncate">{task.title}</span>
                    <Badge variant="outline" className="text-[10px]">{TASK_LANE_LABELS[task.lane ?? "backlog"]}</Badge>
                  </button>
                ))}
                {(!groupedByCategory[category] || groupedByCategory[category].length === 0) ? <p className="py-2 text-center text-xs text-muted-foreground">No tasks</p> : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <SheetContent>
          <SheetHeader><SheetTitle>{selectedTask?.title}</SheetTitle></SheetHeader>
          {selectedTask ? (
            <div className="mt-4 flex flex-col gap-4">
              {isEditing ? (
                <div className="space-y-3">
                  <div><Label htmlFor="edit-task-title">Title</Label><Input id="edit-task-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} /></div>
                  <div>
                    <Label>Category</Label>
                    <Select value={categories.includes(editCategory) ? editCategory : categories[0] ?? "General"} onValueChange={(value) => setEditCategory(value as TaskCategory)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{categories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Lane</Label>
                    <Select value={editLane} onValueChange={(value) => setEditLane(value as TaskLane)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{TASK_LANES.map((lane) => <SelectItem key={lane.id} value={lane.id}>{lane.title}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label htmlFor="edit-task-due">Due date</Label><Input id="edit-task-due" type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label htmlFor="edit-task-estimate">Estimate (min)</Label><Input id="edit-task-estimate" type="number" value={editEstimate} onChange={(e) => setEditEstimate(e.target.value)} /></div>
                    <div><Label htmlFor="edit-task-pomodoros">Pomodoros</Label><Input id="edit-task-pomodoros" type="number" value={editPomodoros} onChange={(e) => setEditPomodoros(e.target.value)} /></div>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                <Badge style={{ backgroundColor: categoryColors[selectedTask.category] ?? "#334155", color: "#ffffff" }}>{selectedTask.category}</Badge>
                <Badge variant="outline">{TASK_LANE_LABELS[selectedTask.lane ?? "backlog"]}</Badge>
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
              {selectedTask.estimateMin ? <p className="text-sm text-muted-foreground">Estimated: {selectedTask.estimateMin} min</p> : null}
              {selectedTask.pomodorosPlanned ? <p className="text-sm text-muted-foreground">Pomodoros planned: {selectedTask.pomodorosPlanned}</p> : null}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => {
                  if (isEditing) saveTaskEdits()
                  else {
                    setTaskFormError(null)
                    setIsEditing(true)
                  }
                }}>
                  {isEditing ? <Save className="mr-1 h-4 w-4" /> : <Pencil className="mr-1 h-4 w-4" />}
                  {isEditing ? "Save" : "Edit"}
                </Button>
                <Button variant={selectedTask.completed ? "secondary" : "default"} onClick={() => {
                  toggleTask(selectedTask.id)
                  setSelectedTask(null)
                }}>{selectedTask.completed ? "Mark Incomplete" : "Mark Complete"}</Button>
                <Button variant="destructive" size="icon" onClick={() => {
                  deleteTask(selectedTask.id)
                  setSelectedTask(null)
                }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function IconToggleButton({ active, onClick, label, icon: Icon }: { active: boolean; onClick: () => void; label: string; icon: ElementType }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" size="icon" variant={active ? "default" : "outline"} onClick={onClick} aria-label={label}>
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent sideOffset={8}>{label}</TooltipContent>
    </Tooltip>
  )
}

function LaneSummaryCard({ title, count, limit, description, icon: Icon, tone }: { title: string; count: number; limit: string; description: string; icon: ElementType; tone: "default" | "warning" | "muted" }) {
  return (
    <Card className={cn(tone === "warning" && "border-amber-500/40 bg-amber-500/10", tone === "muted" && "border-border/60 bg-secondary/10")}>
      <CardContent className="flex items-start gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/60"><Icon className="h-4 w-4" /></div>
        <div className="min-w-0">
          <div className="flex items-center gap-2"><p className="font-medium">{title}</p><Badge variant="outline" className="text-[10px]">{limit}</Badge></div>
          <p className="text-2xl font-semibold">{count}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function TaskLaneSection({
  lane,
  open,
  onToggleOpen,
  tasks,
  categoryColors,
  onToggle,
  onSelect,
  onDragStart,
  onDropOnTask,
  onDropOnLane,
  draggable,
  onDragEnd,
  limit,
}: {
  lane: TaskLane
  open: boolean
  onToggleOpen: () => void
  tasks: Task[]
  categoryColors: Record<string, string>
  onToggle: (id: string) => void
  onSelect: (task: Task) => void
  onDragStart: (taskId: string) => void
  onDropOnTask: (task: Task) => void
  onDropOnLane: () => void
  draggable: boolean
  onDragEnd: () => void
  limit?: number
}) {
  const config = TASK_LANES.find((item) => item.id === lane)
  return (
    <Collapsible open={open} onOpenChange={onToggleOpen}>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <CollapsibleTrigger asChild>
              <button className="flex min-w-0 items-start gap-2 text-left">
                {open ? <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />}
                <div>
                  <CardTitle className="text-base">{config?.title ?? TASK_LANE_LABELS[lane]}</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">{config?.description}</p>
                </div>
              </button>
            </CollapsibleTrigger>
            <div className="flex items-center gap-2">
              {typeof limit === "number" ? <Badge variant="outline" className="text-[10px]">{tasks.length}/{limit}</Badge> : null}
              <Badge variant="secondary" className="text-[10px]">{tasks.length}</Badge>
            </div>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent
            className="flex flex-col gap-2"
            onDragOver={(e) => {
              if (!draggable) return
              e.preventDefault()
            }}
            onDrop={(e) => {
              if (!draggable) return
              e.preventDefault()
              onDropOnLane()
            }}
          >
            {tasks.length === 0 ? <p className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">No tasks in this lane.</p> : null}
            {tasks.map((task) => (
              <TaskRow key={task.id} task={task} categoryColor={categoryColors[task.category]} onToggle={onToggle} onSelect={onSelect} onDragStart={onDragStart} onDropOnTask={onDropOnTask} draggable={draggable && !task.completed} onDragEnd={onDragEnd} />
            ))}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

function TaskRow({ task, categoryColor, onToggle, onSelect, onDragStart, onDropOnTask, draggable = true, onDragEnd }: { task: Task; categoryColor?: string; onToggle: (id: string) => void; onSelect: (task: Task) => void; onDragStart: (taskId: string) => void; onDropOnTask: (task: Task) => void; draggable?: boolean; onDragEnd: () => void }) {
  return (
    <div
      className={cn("flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-secondary/30", draggable ? "cursor-grab active:cursor-grabbing" : "", task.completed && "opacity-50")}
      onClick={() => onSelect(task)}
      draggable={draggable}
      onDragStart={() => onDragStart(task.id)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        onDropOnTask(task)
      }}
      onDragEnd={onDragEnd}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect(task)}
    >
      <Checkbox checked={task.completed} onCheckedChange={() => onToggle(task.id)} onClick={(e) => e.stopPropagation()} aria-label={`Complete ${task.title}`} />
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm font-medium", task.completed && "line-through")}>{task.title}</p>
        <div className="mt-0.5 flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px]" style={categoryColor ? { backgroundColor: categoryColor, color: "#ffffff" } : undefined}>{task.category}</Badge>
          <Badge variant="outline" className="text-[10px]">{TASK_LANE_LABELS[task.lane ?? "backlog"]}</Badge>
          {task.dueDate ? <span className={cn("text-[10px] text-muted-foreground", isOverdue(task.dueDate) && "font-medium text-destructive")}>{isDueToday(task.dueDate) ? "Today" : task.dueDate}</span> : null}
        </div>
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground"><Zap className="h-3 w-3" />{task.xpValue}</div>
    </div>
  )
}
