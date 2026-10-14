"use client"

import { useState } from "react"
import { Clock, Pencil, Save, Trash2, Zap } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { TASK_LANE_LABELS } from "@/lib/execution-os"
import { isDueToday, isOverdue } from "@/lib/game-utils"
import { TASK_REPEAT_OPTIONS } from "@/lib/task-recurrence"
import { firstCategory } from "@/lib/categories"
import { cn } from "@/lib/utils"
import { useCategories } from "@/hooks/use-categories"
import { CategoryBadge } from "@/components/category-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import type { Task, TaskCategory, TaskLane, TaskRepeat } from "@/lib/types"

const LANE_OPTIONS: TaskLane[] = ["backlog", "daily-focus", "parking-lot"]

export interface TaskTimeSlot {
  startTime: string
  endTime: string
}

interface TaskDetailSheetProps {
  /** The task to show; null closes the sheet. Read live from the store, so edits show at once. */
  taskId: string | null
  timeSlot?: TaskTimeSlot
  onClose: () => void
  /** Called after the task is deleted, e.g. to offer Undo. */
  onDeleted?: (task: Task) => void
}

function fmtTime(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number)
  return `${h}:${String(m).padStart(2, "0")}`
}

/** The one task detail and edit sheet, used by ToDo and by Schedule's unscheduled-tasks panel (P17). */
export function TaskDetailSheet({ taskId, timeSlot, onClose, onDeleted }: TaskDetailSheetProps) {
  const task = useAppStore((s) => (taskId ? s.tasks.find((t) => t.id === taskId && !t.deleted) : undefined))

  return (
    <Sheet open={!!task} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="px-6">
        <SheetHeader><SheetTitle>{task?.title}</SheetTitle></SheetHeader>
        {task ? <TaskDetailBody key={task.id} task={task} timeSlot={timeSlot} onClose={onClose} onDeleted={onDeleted} /> : null}
      </SheetContent>
    </Sheet>
  )
}

function TaskDetailBody({ task, timeSlot, onClose, onDeleted }: {
  task: Task
  timeSlot?: TaskTimeSlot
  onClose: () => void
  onDeleted?: (task: Task) => void
}) {
  const tasks = useAppStore((s) => s.tasks)
  const dailyFocusLimit = useAppStore((s) => s.profile.systemConfig?.dailyFocusLimit ?? 3)
  const toggleTask = useAppStore((s) => s.toggleTask)
  const updateTask = useAppStore((s) => s.updateTask)
  const deleteTask = useAppStore((s) => s.deleteTask)
  const categories = useCategories()

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

  function startEditing() {
    setTaskFormError(null)
    setEditTitle(task.title)
    setEditCategory(task.category)
    setEditLane(task.lane ?? "backlog")
    setEditDueDate(task.dueDate ?? "")
    setEditRepeat(task.repeat ?? "none")
    setEditStartTime(timeSlot?.startTime ?? "")
    setEditEndTime(timeSlot?.endTime ?? "")
    setEditEstimate(task.estimateMin ? String(task.estimateMin) : "")
    setEditPomodoros(task.pomodorosPlanned ? String(task.pomodorosPlanned) : "")
    setIsEditing(true)
  }

  function canUseDailyFocusLane() {
    return tasks.filter((t) => !t.deleted && !t.completed && (t.lane ?? "backlog") === "daily-focus" && t.id !== task.id).length < dailyFocusLimit
  }

  function saveTaskEdits() {
    if (editLane === "daily-focus" && !canUseDailyFocusLane()) {
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
    updateTask(task.id, {
      title: editTitle.trim() || task.title,
      category: categories.includes(editCategory) ? editCategory : task.category,
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

  return (
    <div className="mt-4 flex flex-col gap-4">
      {isEditing ? (
        <div className="space-y-3">
          <div><Label htmlFor="edit-task-title">Title</Label><Input id="edit-task-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} /></div>
          <div>
            <Label>Category</Label>
            <Select value={categories.includes(editCategory) ? editCategory : firstCategory(categories)} onValueChange={(v) => setEditCategory(v as TaskCategory)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Lane</Label>
            <Select value={editLane} onValueChange={(v) => setEditLane(v as TaskLane)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LANE_OPTIONS.map((l) => <SelectItem key={l} value={l}>{TASK_LANE_LABELS[l]}</SelectItem>)}</SelectContent>
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
        <CategoryBadge category={task.category} />
        <Badge variant="outline">{TASK_LANE_LABELS[task.lane ?? "backlog"]}</Badge>
        {(task.repeat ?? "none") !== "none" ? <Badge variant="outline">Repeats {task.repeat}</Badge> : null}
        <Badge variant="outline" className="gap-1"><Zap className="h-3 w-3" /> {task.xpValue} XP</Badge>
        {task.completed ? <Badge variant="secondary">Completed</Badge> : null}
      </div>
      {taskFormError ? <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{taskFormError}</div> : null}
      {task.dueDate ? (
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className={cn(isOverdue(task.dueDate) && "text-destructive")}>Due: {task.dueDate}</span>
          {isDueToday(task.dueDate) ? <Badge className="bg-primary text-primary-foreground text-[10px]">Today</Badge> : null}
        </div>
      ) : null}
      {timeSlot ? (
        <p className="text-sm text-muted-foreground">
          Time slot: {fmtTime(timeSlot.startTime)} - {fmtTime(timeSlot.endTime)}
        </p>
      ) : null}
      {task.estimateMin ? <p className="text-sm text-muted-foreground">Estimated: {task.estimateMin} min</p> : null}
      {task.pomodorosPlanned ? <p className="text-sm text-muted-foreground">Pomodoros planned: {task.pomodorosPlanned}</p> : null}
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => { if (isEditing) saveTaskEdits(); else startEditing() }}>
          {isEditing ? <Save className="mr-1 h-4 w-4" /> : <Pencil className="mr-1 h-4 w-4" />}
          {isEditing ? "Save" : "Edit"}
        </Button>
        <Button variant={task.completed ? "secondary" : "default"} onClick={() => { toggleTask(task.id); onClose() }}>
          {task.completed ? "Mark Incomplete" : "Mark Complete"}
        </Button>
        <Button
          variant="destructive"
          size="icon"
          aria-label="Delete task"
          onClick={() => {
            deleteTask(task.id)
            onDeleted?.(task)
            onClose()
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
