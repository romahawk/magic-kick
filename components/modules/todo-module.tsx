"use client"

import { useEffect, useState, useMemo } from "react"
import { useAppStore } from "@/lib/store"
import { isOverdue, isDueToday } from "@/lib/game-utils"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Search, Zap, Clock, Trash2, Pencil, Save, Tags, Plus } from "lucide-react"
import type { Task, TaskCategory } from "@/lib/types"

const DEFAULT_TASK_CATEGORIES = ["Learning", "Sport", "Family/Home", "Hobby", "Travel"]

export function TodoModule() {
  const allTasks = useAppStore((s) => s.tasks)
  const taskCategories = useAppStore((s) => s.profile.taskCategories)
  const taskCategoryColors = useAppStore((s) => s.profile.taskCategoryColors)
  const categories = taskCategories?.length ? taskCategories : DEFAULT_TASK_CATEGORIES
  const categoryColors = taskCategoryColors ?? {}
  const toggleTask = useAppStore((s) => s.toggleTask)
  const reorderTasks = useAppStore((s) => s.reorderTasks)
  const updateTask = useAppStore((s) => s.updateTask)
  const deleteTask = useAppStore((s) => s.deleteTask)
  const addCategory = useAppStore((s) => s.addCategory)
  const renameCategory = useAppStore((s) => s.renameCategory)
  const removeCategory = useAppStore((s) => s.deleteCategory)
  const setCategoryColor = useAppStore((s) => s.setCategoryColor)
  const tasks = useMemo(
    () => allTasks.filter((t) => !t.deleted).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [allTasks]
  )
  const [search, setSearch] = useState("")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editCategory, setEditCategory] = useState<TaskCategory>("Learning")
  const [editDueDate, setEditDueDate] = useState("")
  const [editEstimate, setEditEstimate] = useState("")
  const [editPomodoros, setEditPomodoros] = useState("")
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [newCategory, setNewCategory] = useState("")
  const [renameFrom, setRenameFrom] = useState("")
  const [renameTo, setRenameTo] = useState("")

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
      if (filterCategory !== "all" && t.category !== filterCategory) return false
      if (filterStatus === "active" && t.completed) return false
      if (filterStatus === "completed" && !t.completed) return false
      return true
    })
  }, [tasks, search, filterCategory, filterStatus])

  const groupedByCategory = useMemo(() => {
    const map: Record<string, Task[]> = {}
    for (const t of filteredTasks) {
      if (!map[t.category]) map[t.category] = []
      map[t.category].push(t)
    }
    return map
  }, [filteredTasks])

  useEffect(() => {
    if (filterCategory !== "all" && !categories.includes(filterCategory)) {
      setFilterCategory("all")
    }
    if (!categories.includes(editCategory)) {
      setEditCategory(categories[0] ?? "General")
    }
  }, [categories, editCategory, filterCategory])

  function openTask(task: Task) {
    setSelectedTask(task)
    setIsEditing(false)
    setEditTitle(task.title)
    setEditCategory(task.category)
    setEditDueDate(task.dueDate ?? "")
    setEditEstimate(task.estimateMin ? String(task.estimateMin) : "")
    setEditPomodoros(task.pomodorosPlanned ? String(task.pomodorosPlanned) : "")
  }

  function saveTaskEdits() {
    if (!selectedTask) return
    updateTask(selectedTask.id, {
      title: editTitle.trim() || selectedTask.title,
      category: editCategory,
      dueDate: editDueDate || undefined,
      estimateMin: editEstimate ? Number(editEstimate) : undefined,
      pomodorosPlanned: editPomodoros ? Number(editPomodoros) : undefined,
    })
    setSelectedTask({
      ...selectedTask,
      title: editTitle.trim() || selectedTask.title,
      category: editCategory,
      dueDate: editDueDate || undefined,
      estimateMin: editEstimate ? Number(editEstimate) : undefined,
      pomodorosPlanned: editPomodoros ? Number(editPomodoros) : undefined,
    })
    setIsEditing(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight">ToDo</h1>
        <p className="text-sm text-muted-foreground">{tasks.filter((t) => !t.completed).length} tasks remaining</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Tags className="h-4 w-4" />
              Categories
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage Categories</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-category">Add Category</Label>
                <div className="flex gap-2">
                  <Input id="new-category" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Category name" />
                  <Button
                    type="button"
                    onClick={() => {
                      if (!newCategory.trim()) return
                      addCategory(newCategory)
                      setNewCategory("")
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Rename Category</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Select value={renameFrom} onValueChange={setRenameFrom}>
                    <SelectTrigger><SelectValue placeholder="Current" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input value={renameTo} onChange={(e) => setRenameTo(e.target.value)} placeholder="New name" />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (!renameFrom || !renameTo.trim()) return
                      renameCategory(renameFrom, renameTo)
                      setRenameFrom("")
                      setRenameTo("")
                    }}
                  >
                    Rename
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Delete Category</Label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <Button
                      key={category}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeCategory(category)}
                      disabled={categories.length <= 1}
                    >
                      Delete {category}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Category Colors</Label>
                <div className="space-y-2">
                  {categories.map((category) => (
                    <div key={category} className="flex items-center justify-between rounded-md border border-border p-2">
                      <span className="text-sm">{category}</span>
                      <input
                        type="color"
                        value={categoryColors[category] ?? "#64748b"}
                        onChange={(e) => setCategoryColor(category, e.target.value)}
                        className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent p-0"
                        aria-label={`Pick color for ${category}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="board">By Category</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4 flex flex-col gap-2">
          {filteredTasks.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No tasks found. Try adjusting your filters.
              </CardContent>
            </Card>
          )}
          {filteredTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              categoryColor={categoryColors[task.category]}
              onToggle={toggleTask}
              onSelect={openTask}
              onDragStart={(taskId) => setDraggedTaskId(taskId)}
              onDropOnTask={(targetTaskId) => {
                if (!draggedTaskId || draggedTaskId === targetTaskId) return
                reorderTasks(draggedTaskId, targetTaskId)
                setDraggedTaskId(null)
              }}
              onDragEnd={() => setDraggedTaskId(null)}
            />
          ))}
        </TabsContent>

        <TabsContent value="board" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat) => (
              <Card key={cat}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: categoryColors[cat] ?? "#64748b" }} />
                    {cat}
                    <Badge variant="secondary" className="ml-auto text-[10px]">
                      {groupedByCategory[cat]?.length ?? 0}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-1.5">
                  {(groupedByCategory[cat] ?? []).map((task) => (
                    <button
                      key={task.id}
                      onClick={() => openTask(task)}
                      className={cn(
                        "flex items-center gap-2 rounded-md border border-border p-2 text-left text-sm transition-colors hover:bg-secondary/50",
                        task.completed && "line-through opacity-50"
                      )}
                    >
                      <Checkbox
                        checked={task.completed}
                        onCheckedChange={() => {
                          toggleTask(task.id)
                        }}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Complete ${task.title}`}
                      />
                      <span className="flex-1 truncate">{task.title}</span>
                      <span className="text-[10px] text-muted-foreground">+{task.xpValue}</span>
                    </button>
                  ))}
                  {(!groupedByCategory[cat] || groupedByCategory[cat].length === 0) && (
                    <p className="py-2 text-center text-xs text-muted-foreground">No tasks</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Task detail sheet */}
      <Sheet open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{selectedTask?.title}</SheetTitle>
          </SheetHeader>
          {selectedTask && (
            <div className="mt-4 flex flex-col gap-4">
              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="edit-task-title">Title</Label>
                    <Input id="edit-task-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
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
                    <Label htmlFor="edit-task-due">Due date</Label>
                    <Input id="edit-task-due" type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="edit-task-estimate">Estimate (min)</Label>
                      <Input id="edit-task-estimate" type="number" value={editEstimate} onChange={(e) => setEditEstimate(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="edit-task-pomodoros">Pomodoros</Label>
                      <Input id="edit-task-pomodoros" type="number" value={editPomodoros} onChange={(e) => setEditPomodoros(e.target.value)} />
                    </div>
                  </div>
                </div>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                <Badge style={{ backgroundColor: categoryColors[selectedTask.category] ?? "#334155", color: "#ffffff" }}>
                  {selectedTask.category}
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Zap className="h-3 w-3" /> {selectedTask.xpValue} XP
                </Badge>
                {selectedTask.completed && <Badge variant="secondary">Completed</Badge>}
              </div>
              {selectedTask.dueDate && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className={cn(isOverdue(selectedTask.dueDate) && "text-destructive")}>
                    Due: {selectedTask.dueDate}
                  </span>
                  {isDueToday(selectedTask.dueDate) && <Badge className="bg-primary text-primary-foreground text-[10px]">Today</Badge>}
                </div>
              )}
              {selectedTask.estimateMin && (
                <p className="text-sm text-muted-foreground">Estimated: {selectedTask.estimateMin} min</p>
              )}
              {selectedTask.pomodorosPlanned && (
                <p className="text-sm text-muted-foreground">Pomodoros planned: {selectedTask.pomodorosPlanned}</p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (isEditing) {
                      saveTaskEdits()
                    } else {
                      setIsEditing(true)
                    }
                  }}
                >
                  {isEditing ? <Save className="mr-1 h-4 w-4" /> : <Pencil className="mr-1 h-4 w-4" />}
                  {isEditing ? "Save" : "Edit"}
                </Button>
                <Button
                  variant={selectedTask.completed ? "secondary" : "default"}
                  onClick={() => {
                    toggleTask(selectedTask.id)
                    setSelectedTask(null)
                  }}
                >
                  {selectedTask.completed ? "Mark Incomplete" : "Mark Complete"}
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => {
                    deleteTask(selectedTask.id)
                    setSelectedTask(null)
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function TaskRow({
  task,
  categoryColor,
  onToggle,
  onSelect,
  onDragStart,
  onDropOnTask,
  onDragEnd,
}: {
  task: Task
  categoryColor?: string
  onToggle: (id: string) => void
  onSelect: (t: Task) => void
  onDragStart: (taskId: string) => void
  onDropOnTask: (taskId: string) => void
  onDragEnd: () => void
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-secondary/30 cursor-grab active:cursor-grabbing",
        task.completed && "opacity-50"
      )}
      onClick={() => onSelect(task)}
      draggable
      onDragStart={() => onDragStart(task.id)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        onDropOnTask(task.id)
      }}
      onDragEnd={onDragEnd}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect(task)}
    >
      <Checkbox
        checked={task.completed}
        onCheckedChange={() => onToggle(task.id)}
        onClick={(e) => e.stopPropagation()}
        aria-label={`Complete ${task.title}`}
      />
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium truncate", task.completed && "line-through")}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant="secondary" className="text-[10px]" style={categoryColor ? { backgroundColor: categoryColor, color: "#ffffff" } : undefined}>{task.category}</Badge>
          {task.dueDate && (
            <span className={cn("text-[10px] text-muted-foreground", isOverdue(task.dueDate) && "text-destructive font-medium")}>
              {isDueToday(task.dueDate) ? "Today" : task.dueDate}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Zap className="h-3 w-3" />
        {task.xpValue}
      </div>
    </div>
  )
}
