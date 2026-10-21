"use client"

import { useId, useMemo, useState } from "react"
import { format, parseISO } from "date-fns"
import { CalendarClock, ListTodo, PanelRightClose, Plus, Undo2 } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { categoryColor, defaultTaskCategory } from "@/lib/categories"
import { normalizeProjectColor } from "@/lib/project-colors"
import { buildProjectRows, countByProject, countCategories, filterByProject, resolveProjectFilter, type ProjectAllocation } from "@/lib/unscheduled-filter"
import { useCategories } from "@/hooks/use-categories"
import type { Project, Task } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TruncatedTooltip } from "@/components/ui/truncated-tooltip"
import { FiltersPopover, InlineSearch, ProjectFilterList, ScopeSwitch, useStoredProjectFilter } from "@/components/modules/task-filters"

type TaskSort = "due" | "project" | "estimate"
type TaskScope = "focus" | "all"

const SORT_LABELS: Record<TaskSort, string> = {
  due: "Due date",
  project: "Project",
  estimate: "Shortest first",
}

const SCOPE_LABELS: Record<TaskScope, string> = {
  focus: "This week",
  all: "All",
}

const HELP_TEXT = "Drag a task onto the calendar, or use its clock for the next free slot."
const PROJECT_FILTER_KEY = "magic-kick-schedule-project-filter"

/** Where a calendar block is being dragged relative to this panel: not at all, elsewhere, or over it. */
export type UnscheduleDropState = null | "near" | "over"

interface UnscheduledTasksPanelProps {
  /** Open, unscheduled tasks that belong to no project or to an active one (P16). */
  tasks: Task[]
  /** P24: ids of `tasks` shown in the default "This week" view; the rest wait behind "All" and search. */
  focusTaskIds: ReadonlySet<string>
  /** P26: the active week plan's allocations, in plan order; empty without a plan. */
  allocations: ProjectAllocation[]
  /** Called with the ids of tasks created from this panel, so they stay in view. */
  onTasksAdded: (ids: string[]) => void
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
  onOpenTask: (taskId: string) => void
  onCollapse: () => void
}

const NO_PROJECT = "none"

function dueValue(task: Task) {
  return task.dueDate ? new Date(`${task.dueDate}T00:00:00`).getTime() : Number.POSITIVE_INFINITY
}

export function UnscheduledTasksPanel({
  tasks,
  focusTaskIds,
  allocations,
  onTasksAdded,
  hiddenCount,
  projects,
  todayISO,
  draggedTaskId,
  dropState,
  panelRef,
  onDragStart,
  onDragEnd,
  onScheduleNext,
  onOpenTask,
  onCollapse,
}: UnscheduledTasksPanelProps) {
  const allCategories = useCategories()
  const categoryColors = useAppStore((s) => s.profile.taskCategoryColors)
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<TaskSort>("due")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [adding, setAdding] = useState(false)
  const [scope, setScope] = useState<TaskScope>("focus")
  const [storedProjectFilter, chooseProject] = useStoredProjectFilter(PROJECT_FILTER_KEY)
  const helpId = useId()

  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects])
  const activeProjectIds = useMemo(() => new Set(projects.map((p) => p.id)), [projects])
  // With a plan, the rows are its allocations (active projects only); without one, every active project.
  const listedProjects = useMemo(
    () =>
      allocations.length > 0
        ? allocations.flatMap((a) => {
            const project = projectById.get(a.projectId)
            return project ? [project] : []
          })
        : projects,
    [allocations, projectById, projects]
  )
  const listedIds = useMemo(() => new Set(listedProjects.map((p) => p.id)), [listedProjects])
  const projectFilter = resolveProjectFilter(storedProjectFilter, listedIds)

  const needle = query.trim().toLowerCase()
  const focusTasks = useMemo(() => tasks.filter((task) => focusTaskIds.has(task.id)), [tasks, focusTaskIds])
  // Search always looks through every open task, whatever the view.
  const baseTasks = scope === "all" || needle ? tasks : focusTasks
  const moreCount = tasks.length - focusTasks.length

  // Only categories that have a task in view, in the order of the shared list (P14).
  const categoryCounts = useMemo(() => countCategories(baseTasks, allCategories), [baseTasks, allCategories])

  // A selected category that no longer has tasks stops filtering instead of hiding everything.
  const activeCategories = selectedCategories.filter((c) => categoryCounts.some((entry) => entry.name === c))

  // Scope, search and categories; the project filter comes last, so its counts match the list.
  const filteredTasks = useMemo(
    () =>
      baseTasks
        .filter((task) => activeCategories.length === 0 || activeCategories.includes(task.category))
        .filter((task) => {
          if (!needle) return true
          const projectTitle = task.linkedProjectId ? projectById.get(task.linkedProjectId)?.title ?? "" : ""
          return task.title.toLowerCase().includes(needle) || projectTitle.toLowerCase().includes(needle)
        }),
    [baseTasks, activeCategories, needle, projectById]
  )
  const projectCounts = useMemo(() => countByProject(filteredTasks, listedIds, activeProjectIds), [filteredTasks, listedIds, activeProjectIds])

  const visibleTasks = useMemo(() => {
    return [...filterByProject(filteredTasks, projectFilter, listedIds, activeProjectIds)].sort((a, b) => {
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
  }, [filteredTasks, projectFilter, listedIds, activeProjectIds, sort, projectById])

  const projectRows = buildProjectRows(listedProjects, allocations, projectCounts, projectFilter, normalizeProjectColor)

  function showAll() {
    setScope("all")
    setSelectedCategories([])
  }

  function clearFilters() {
    setQuery("")
    setSelectedCategories([])
    chooseProject("all")
  }

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
      <div className="sticky top-0 z-10 space-y-1.5 rounded-t-xl border-b bg-card/95 p-2.5 backdrop-blur supports-backdrop-filter:bg-card/85">
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-sm font-semibold" title={HELP_TEXT}>
            Unscheduled <span className="text-muted-foreground">·</span> <span className="tabular-nums">{visibleTasks.length}</span>
          </p>
          <p id={helpId} className="sr-only">
            {HELP_TEXT}
          </p>
          <div className="flex shrink-0 items-center">
            <button
              type="button"
              onClick={() => setAdding((v) => !v)}
              aria-expanded={adding}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                adding && "bg-muted text-foreground"
              )}
              aria-label="Add task"
              title="Add task"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onCollapse}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Hide unscheduled tasks"
              title="Hide unscheduled tasks"
            >
              <PanelRightClose className="h-4 w-4" />
            </button>
          </div>
        </div>

        {adding ? (
          <AddTaskForm projects={projects} categories={allCategories} onAdded={onTasksAdded} onDone={() => setAdding(false)} />
        ) : null}

        <div className="flex items-center gap-1">
          <ScopeSwitch
            label="Which tasks to show"
            value={scope}
            onChange={setScope}
            options={(Object.keys(SCOPE_LABELS) as TaskScope[]).map((key) => ({
              key,
              label: SCOPE_LABELS[key],
              count: key === "focus" ? focusTasks.length : tasks.length,
              title: key === "focus" ? "Overdue, due this week, Daily Focus, and each project's Next milestone" : "Every open task without a time slot",
            }))}
          />
          <InlineSearch query={query} onQueryChange={setQuery} label="Search unscheduled tasks" />
          <FiltersPopover
            sort={sort}
            sortLabels={SORT_LABELS}
            defaultSort="due"
            onSortChange={setSort}
            sortLabel="Sort unscheduled tasks"
            categories={categoryCounts}
            selectedCategories={activeCategories}
            onToggleCategory={toggleCategory}
            onClearCategories={() => setSelectedCategories([])}
            colorOf={(name) => categoryColor(name, categoryColors)}
          />
        </div>

        <ProjectFilterList rows={projectRows} value={projectFilter} onChange={chooseProject} />
      </div>

      <div className="space-y-1 p-2.5 pt-2" aria-describedby={helpId}>
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
            All open tasks already have an assigned time slot. {HELP_TEXT}
          </div>
        ) : baseTasks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
            Nothing overdue, due this week, in Daily Focus or in a Next milestone.{" "}
            <button type="button" className="font-medium text-foreground underline-offset-2 hover:underline" onClick={showAll}>
              Show all open ({tasks.length})
            </button>
          </div>
        ) : visibleTasks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
            No tasks match.{" "}
            <button type="button" className="font-medium text-foreground underline-offset-2 hover:underline" onClick={clearFilters}>
              Clear filters
            </button>
            <span className="mt-1 block">{HELP_TEXT}</span>
          </div>
        ) : (
          visibleTasks.map((task) => (
            <UnscheduledTaskCard
              key={task.id}
              task={task}
              project={task.linkedProjectId ? projectById.get(task.linkedProjectId) : undefined}
              showProject={projectFilter === "all" || projectFilter === "other"}
              categoryColor={categoryColor(task.category, categoryColors)}
              todayISO={todayISO}
              isDragging={draggedTaskId === task.id}
              onDragStart={() => onDragStart(task.id)}
              onDragEnd={onDragEnd}
              onScheduleNext={() => onScheduleNext(task)}
              onOpen={() => onOpenTask(task.id)}
            />
          ))
        )}

        {scope === "focus" && !needle && moreCount > 0 && focusTasks.length > 0 ? (
          <p className="pt-1 text-[11px] text-muted-foreground">
            {moreCount} more open {moreCount === 1 ? "task" : "tasks"} not due this week.{" "}
            <button type="button" className="font-medium text-foreground underline-offset-2 hover:underline" onClick={showAll}>
              Show all
            </button>
          </p>
        ) : null}

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

/** Two lines (P26): title, then category dot · due · estimate · project. About 48 px tall. */
function UnscheduledTaskCard({
  task,
  project,
  showProject,
  categoryColor,
  todayISO,
  isDragging,
  onDragStart,
  onDragEnd,
  onScheduleNext,
  onOpen,
}: {
  task: Task
  project?: Project
  showProject: boolean
  categoryColor: string
  todayISO: string
  isDragging: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onScheduleNext: () => void
  onOpen: () => void
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
      // A click (not a drag) opens the task sheet; the title button below is the keyboard path.
      onClick={onOpen}
      className={cn(
        "group relative flex w-full cursor-grab items-start gap-2 rounded-md border border-l-[3px] border-border/70 bg-secondary/20 px-2.5 py-1 text-left transition-[background-color,box-shadow,opacity] hover:bg-secondary/35 hover:shadow-sm active:cursor-grabbing",
        isDragging && "opacity-50"
      )}
      style={{ borderLeftColor: project ? normalizeProjectColor(project.color) : "transparent" }}
    >
      <ListTodo className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1 pr-6">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onOpen()
          }}
          className="block w-full min-w-0 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Open "${task.title}"`}
        >
          <TruncatedTooltip as="p" content={task.title} className="truncate text-sm font-medium leading-5" />
        </button>
        <div className="flex min-w-0 items-center gap-1.5 text-[11px] leading-4 text-muted-foreground">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: categoryColor }} title={task.category} aria-hidden="true" />
          <span className="sr-only">{task.category},</span>
          <span className={cn("shrink-0", due.overdue && "font-semibold text-destructive")}>{due.text}</span>
          {task.estimateMin ? <span className="shrink-0">· {task.estimateMin}m</span> : null}
          {(task.repeat ?? "none") !== "none" ? <span className="shrink-0">· repeats</span> : null}
          {showProject && project ? (
            <span className="min-w-0 truncate" title={project.title}>
              · {project.title}
            </span>
          ) : null}
        </div>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onScheduleNext()
        }}
        className="absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-[opacity,background-color,color] hover:bg-primary/10 hover:text-primary focus-visible:opacity-100 group-hover:opacity-100"
        aria-label={`Schedule "${task.title}" in the next free slot`}
        title="Schedule in the next free slot"
      >
        <CalendarClock className="h-4 w-4" />
      </button>
    </div>
  )
}

/** Inline create form (P17). The task gets no date or time, so it lands in this list ready to place. */
function AddTaskForm({
  projects,
  categories,
  onAdded,
  onDone,
}: {
  projects: Project[]
  categories: string[]
  onAdded: (ids: string[]) => void
  onDone: () => void
}) {
  const addTask = useAppStore((s) => s.addTask)
  const [title, setTitle] = useState("")
  const [projectId, setProjectId] = useState(NO_PROJECT)
  const [category, setCategory] = useState(() => defaultTaskCategory(categories))
  const [estimate, setEstimate] = useState("")

  function chooseProject(id: string) {
    setProjectId(id)
    // A project's tasks take its category (P14), unless it has none.
    setCategory(defaultTaskCategory(categories, projects.find((p) => p.id === id)))
  }

  function submit() {
    const trimmed = title.trim()
    if (!trimmed) return
    const minutes = Number(estimate)
    const before = new Set(useAppStore.getState().tasks.map((task) => task.id))
    addTask({
      title: trimmed.slice(0, 300),
      category: categories.includes(category) ? category : defaultTaskCategory(categories),
      completed: false,
      lane: "backlog",
      ...(projectId !== NO_PROJECT ? { linkedProjectId: projectId, milestoneId: "" } : {}),
      estimateMin: Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes) : undefined,
    })
    // addTask returns nothing; the new id is the one that was not there before.
    onAdded(useAppStore.getState().tasks.filter((task) => !before.has(task.id)).map((task) => task.id))
    // Stay open for rapid entry; project and category carry over.
    setTitle("")
    setEstimate("")
  }

  return (
    <form
      className="space-y-2 rounded-lg border bg-secondary/20 p-2.5"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <Input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && onDone()}
        placeholder="Task title"
        aria-label="New task title"
        maxLength={300}
        className="h-8 text-xs"
      />
      <div className="grid grid-cols-2 gap-2">
        <Select value={projectId} onValueChange={chooseProject}>
          <SelectTrigger size="sm" className="h-8 w-full text-xs" aria-label="New task project">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_PROJECT} className="text-xs">No project</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id} className="text-xs">{p.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger size="sm" className="h-8 w-full text-xs" aria-label="New task category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={1}
          value={estimate}
          onChange={(e) => setEstimate(e.target.value)}
          placeholder="Minutes"
          aria-label="Estimate in minutes"
          className="h-8 w-24 text-xs"
        />
        <div className="ml-auto flex gap-1.5">
          <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" size="sm" className="h-8 text-xs" disabled={!title.trim()}>
            Add
          </Button>
        </div>
      </div>
    </form>
  )
}
