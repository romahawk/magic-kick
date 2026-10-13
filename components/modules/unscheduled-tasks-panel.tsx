"use client"

import { useMemo, useState } from "react"
import { format, parseISO } from "date-fns"
import { CalendarClock, Clock, ListTodo, PanelRightClose, Search, Undo2, X } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { categoryColor } from "@/lib/categories"
import { normalizeProjectColor } from "@/lib/project-colors"
import { useCategories } from "@/hooks/use-categories"
import type { Project, Task } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TruncatedTooltip } from "@/components/ui/truncated-tooltip"
import { CategoryBadge } from "@/components/category-badge"

type TaskSort = "due" | "project" | "estimate"

const SORT_LABELS: Record<TaskSort, string> = {
  due: "Due date",
  project: "Project",
  estimate: "Shortest first",
}

/** Where a calendar block is being dragged relative to this panel: not at all, elsewhere, or over it. */
export type UnscheduleDropState = null | "near" | "over"

interface UnscheduledTasksPanelProps {
  /** Open, unscheduled tasks that belong to no project or to an active one (P16). */
  tasks: Task[]
  /** Open, unscheduled tasks left out because their project is not active. */
  hiddenCount: number
  projects: Project[]
  todayISO: string
  draggedTaskId: string | null
  dropState: UnscheduleDropState
  panelRef: React.Ref<HTMLDivElement>
  onDragStart: (taskId: string) => void
  onDragEnd: () => void
  onScheduleNext: (task: Task) => void
  onCollapse: () => void
}

function dueValue(task: Task) {
  return task.dueDate ? new Date(`${task.dueDate}T00:00:00`).getTime() : Number.POSITIVE_INFINITY
}

export function UnscheduledTasksPanel({
  tasks,
  hiddenCount,
  projects,
  todayISO,
  draggedTaskId,
  dropState,
  panelRef,
  onDragStart,
  onDragEnd,
  onScheduleNext,
  onCollapse,
}: UnscheduledTasksPanelProps) {
  const allCategories = useCategories()
  const categoryColors = useAppStore((s) => s.profile.taskCategoryColors)
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<TaskSort>("due")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects])

  // Only categories that have an unscheduled task, in the order of the shared list (P14).
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const task of tasks) counts.set(task.category, (counts.get(task.category) ?? 0) + 1)
    const ordered = allCategories.filter((c) => counts.has(c))
    for (const c of counts.keys()) if (!ordered.includes(c)) ordered.push(c)
    return ordered.map((name) => ({ name, count: counts.get(name) ?? 0 }))
  }, [tasks, allCategories])

  // A selected category that no longer has tasks stops filtering instead of hiding everything.
  const activeCategories = selectedCategories.filter((c) => categoryCounts.some((entry) => entry.name === c))

  const visibleTasks = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return tasks
      .filter((task) => activeCategories.length === 0 || activeCategories.includes(task.category))
      .filter((task) => {
        if (!needle) return true
        const projectTitle = task.linkedProjectId ? projectById.get(task.linkedProjectId)?.title ?? "" : ""
        return task.title.toLowerCase().includes(needle) || projectTitle.toLowerCase().includes(needle)
      })
      .sort((a, b) => {
        if (sort === "project") {
          const aTitle = a.linkedProjectId ? projectById.get(a.linkedProjectId)?.title ?? "" : ""
          const bTitle = b.linkedProjectId ? projectById.get(b.linkedProjectId)?.title ?? "" : ""
          // Tasks without a project go last.
          if (aTitle !== bTitle) return !aTitle ? 1 : !bTitle ? -1 : aTitle.localeCompare(bTitle)
        }
        if (sort === "estimate") {
          const aEst = a.estimateMin ?? Number.POSITIVE_INFINITY
          const bEst = b.estimateMin ?? Number.POSITIVE_INFINITY
          if (aEst !== bEst) return aEst - bEst
        }
        const byDue = dueValue(a) - dueValue(b)
        if (byDue !== 0) return byDue
        return (a.order ?? 0) - (b.order ?? 0)
      })
  }, [tasks, activeCategories, query, sort, projectById])

  const isFiltered = activeCategories.length > 0 || query.trim() !== ""

  function toggleCategory(name: string) {
    setSelectedCategories((current) => (current.includes(name) ? current.filter((c) => c !== name) : [...current, name]))
  }

  return (
    <div
      ref={panelRef}
      className={cn(
        "rounded-xl border bg-card transition-[box-shadow,border-color]",
        dropState === "over" && "border-primary ring-2 ring-primary/40"
      )}
    >
      <div className="sticky top-0 z-10 space-y-3 rounded-t-xl border-b bg-card/95 p-4 pb-3 backdrop-blur supports-backdrop-filter:bg-card/85">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">Unscheduled tasks</p>
              <Badge variant="secondary" className="text-[10px] tabular-nums">
                {isFiltered ? `${visibleTasks.length}/${tasks.length}` : tasks.length}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Drag onto the calendar, or use the clock for the next free slot.</p>
          </div>
          <button
            type="button"
            onClick={onCollapse}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Hide unscheduled tasks"
            title="Hide unscheduled tasks"
          >
            <PanelRightClose className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setQuery("")}
              placeholder="Search"
              aria-label="Search unscheduled tasks"
              className="h-8 pl-8 pr-7 text-xs"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-1.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            ) : null}
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as TaskSort)}>
            <SelectTrigger size="sm" className="h-8 w-32 shrink-0 text-xs" aria-label="Sort unscheduled tasks">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SORT_LABELS) as TaskSort[]).map((key) => (
                <SelectItem key={key} value={key} className="text-xs">
                  {SORT_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {categoryCounts.length > 1 ? (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by category">
            <button
              type="button"
              onClick={() => setSelectedCategories([])}
              aria-pressed={activeCategories.length === 0}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                activeCategories.length === 0
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
              )}
            >
              All
            </button>
            {categoryCounts.map(({ name, count }) => {
              const selected = activeCategories.includes(name)
              const color = categoryColor(name, categoryColors)
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => toggleCategory(name)}
                  aria-pressed={selected}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                    selected ? "border-transparent text-white" : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                  )}
                  style={selected ? { backgroundColor: color } : undefined}
                >
                  {!selected ? <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} /> : null}
                  {name}
                  <span className={cn("tabular-nums", selected ? "text-white/80" : "text-muted-foreground/70")}>{count}</span>
                </button>
              )
            })}
          </div>
        ) : null}
      </div>

      <div className="space-y-2 p-4 pt-3">
        {dropState ? (
          <div
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg border-2 border-dashed px-3 py-4 text-xs font-medium transition-colors",
              dropState === "over" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
            )}
          >
            <Undo2 className="h-3.5 w-3.5" />
            Drop here to unschedule
          </div>
        ) : null}

        {tasks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
            All open tasks already have an assigned time slot.
          </div>
        ) : visibleTasks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
            No tasks match.{" "}
            <button
              type="button"
              className="font-medium text-foreground underline-offset-2 hover:underline"
              onClick={() => {
                setQuery("")
                setSelectedCategories([])
              }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          visibleTasks.map((task) => (
            <UnscheduledTaskCard
              key={task.id}
              task={task}
              project={task.linkedProjectId ? projectById.get(task.linkedProjectId) : undefined}
              todayISO={todayISO}
              isDragging={draggedTaskId === task.id}
              onDragStart={() => onDragStart(task.id)}
              onDragEnd={onDragEnd}
              onScheduleNext={() => onScheduleNext(task)}
            />
          ))
        )}

        {hiddenCount > 0 ? (
          <p className="pt-1 text-[11px] text-muted-foreground">
            {hiddenCount} {hiddenCount === 1 ? "task" : "tasks"} from paused, parked or completed projects hidden.
          </p>
        ) : null}
      </div>
    </div>
  )
}

function dueLabel(dueDate: string | undefined, todayISO: string) {
  if (!dueDate) return { text: "No date", overdue: false }
  const label = format(parseISO(`${dueDate}T12:00:00`), "MMM d")
  if (dueDate < todayISO) return { text: `Overdue · ${label}`, overdue: true }
  if (dueDate === todayISO) return { text: "Today", overdue: false }
  return { text: label, overdue: false }
}

function UnscheduledTaskCard({
  task,
  project,
  todayISO,
  isDragging,
  onDragStart,
  onDragEnd,
  onScheduleNext,
}: {
  task: Task
  project?: Project
  todayISO: string
  isDragging: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onScheduleNext: () => void
}) {
  const due = dueLabel(task.dueDate, todayISO)

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move"
        onDragStart()
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "group relative flex w-full cursor-grab flex-col gap-2 rounded-lg border border-l-[3px] border-border/70 bg-secondary/20 px-3 py-2 text-left transition-[background-color,box-shadow,opacity] hover:bg-secondary/35 hover:shadow-sm active:cursor-grabbing",
        isDragging && "opacity-50"
      )}
      style={{ borderLeftColor: project ? normalizeProjectColor(project.color) : "transparent" }}
    >
      <div className="flex items-start gap-2">
        <ListTodo className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1 pr-6">
          <TruncatedTooltip as="p" content={task.title} className="truncate text-sm font-medium" />
          {project ? (
            <p className="truncate text-[11px] text-muted-foreground" title={project.title}>
              {project.title}
            </p>
          ) : null}
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <CategoryBadge category={task.category} className="text-[10px]" />
            <span className={cn("text-[10px]", due.overdue ? "font-semibold text-destructive" : "text-muted-foreground")}>{due.text}</span>
            {(task.repeat ?? "none") !== "none" ? (
              <Badge variant="outline" className="text-[10px]">
                Repeats {task.repeat}
              </Badge>
            ) : null}
            {task.estimateMin ? (
              <Badge variant="outline" className="gap-1 text-[10px]">
                <Clock className="h-2.5 w-2.5" />
                {task.estimateMin}m
              </Badge>
            ) : null}
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={onScheduleNext}
        className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-[opacity,background-color,color] hover:bg-primary/10 hover:text-primary focus-visible:opacity-100 group-hover:opacity-100"
        aria-label={`Schedule "${task.title}" in the next free slot`}
        title="Schedule in the next free slot"
      >
        <CalendarClock className="h-4 w-4" />
      </button>
    </div>
  )
}
