"use client"

import { useEffect, useMemo, useState } from "react"
import { differenceInCalendarDays, endOfWeek, format, isSameMonth, isTomorrow, parseISO, startOfWeek } from "date-fns"
import { useAppStore } from "@/lib/store"
import { TASK_LANE_LABELS, selectDailyFocus } from "@/lib/execution-os"
import { getActiveWeeklyPlan, getCurrentWeekStartISO, getWeekDates, localDateISO, orderDailyFocusTasks, selectAllocationProgress, selectTaskTimeSlots } from "@/lib/weekly-plan"
import { getActiveWeeklyPlan, localDateISO, orderDailyFocusTasks, selectProjectHours, selectTaskTimeSlots } from "@/lib/weekly-plan"
import { isPlanningFocus, selectNextMilestoneByProject } from "@/lib/roadmap"
import { buildProjectRows, countByProject, countCategories, filterByProject, resolveProjectFilter, type ProjectAllocation } from "@/lib/unscheduled-filter"
import { categoryColor } from "@/lib/categories"
import { normalizeProjectColor } from "@/lib/project-colors"
import { sourceLabel } from "@/lib/provenance"
import { isDueToday, isOverdue } from "@/lib/game-utils"
import { cn } from "@/lib/utils"
import { useCategories } from "@/hooks/use-categories"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { TaskDetailSheet } from "@/components/task-detail-sheet"
import { SuggestedFocusList } from "@/components/modules/attention-block"
import { FiltersPopover, InlineSearch, ProjectFilterList, ScopeSwitch, useStoredProjectFilter } from "@/components/modules/task-filters"
import { ChevronDown, PanelRightClose, PanelRightOpen } from "lucide-react"
import type { Project, Task, TaskLane } from "@/lib/types"

const TASK_LANES: Array<{ id: TaskLane; title: string; description: string }> = [
  { id: "backlog", title: "Backlog", description: "Important work waiting for a focus slot." },
  { id: "daily-focus", title: "Daily Focus", description: "Only the few tasks that deserve today." },
  { id: "parking-lot", title: "Parking Lot", description: "Ideas and tasks not needed this month." },
]

// P28: the sidebar's scope, sort and project filter follow Schedule's Unscheduled panel (P24, P26).
type TodoScope = "week" | "all" | "done"
type TodoSort = "date-asc" | "date-desc" | "manual"

const SORT_LABELS: Record<TodoSort, string> = {
  "date-asc": "Date: earliest",
  "date-desc": "Date: latest",
  manual: "Manual order",
}

const PROJECT_FILTER_KEY = "magic-kick-todo-project-filter"
const SIDEBAR_COLLAPSED_KEY = "magic-kick-todo-sidebar-collapsed"

type TimeSlot = { startTime: string; endTime: string; plannedHours: number; actualHours?: number; status: string }
type QuickEdit = (id: string, patch: Partial<Omit<Task, "id" | "deleted" | "clientUpdatedAt">>, timing?: { startHHmm?: string; endHHmm?: string; blockTypeId?: string; clearTimeSlot?: boolean }) => void

// Time sections for the "Date: earliest" sort, in display order.
type DueGroup = "overdue" | "today" | "tomorrow" | "later" | "no-date"
const DUE_GROUPS: Array<{ id: DueGroup; title: string }> = [
  { id: "overdue", title: "Overdue" },
  { id: "today", title: "Today" },
  { id: "tomorrow", title: "Tomorrow" },
  { id: "later", title: "Later" },
  { id: "no-date", title: "No date" },
]

function dueGroupOf(task: Task): DueGroup {
  if (!task.dueDate) return "no-date"
  if (isOverdue(task.dueDate)) return "overdue"
  if (isDueToday(task.dueDate)) return "today"
  if (isTomorrow(parseISO(task.dueDate))) return "tomorrow"
  return "later"
}

// Done view sections, by completion date. Today, Yesterday and This week open expanded;
// older sections load one at a time on "Show earlier".
type DoneGroup = { key: string; title: string; recent: boolean; tasks: Task[] }

function doneGroupOf(task: Task, now: Date): { key: string; title: string; recent: boolean } {
  if (!task.completedAt) return { key: "undated", title: "Undated", recent: false }
  const done = parseISO(task.completedAt)
  const daysAgo = differenceInCalendarDays(now, done)
  if (daysAgo <= 0) return { key: "today", title: "Today", recent: true }
  if (daysAgo === 1) return { key: "yesterday", title: "Yesterday", recent: true }
  if (done >= startOfWeek(now, { weekStartsOn: 1 })) return { key: "this-week", title: "This week", recent: true }
  if (isSameMonth(done, now)) return { key: "this-month", title: "Earlier this month", recent: false }
  return { key: task.completedAt.slice(0, 7), title: format(done, "MMMM yyyy"), recent: false }
}

function groupDoneTasks(tasks: Task[], now: Date): DoneGroup[] {
  const sorted = [...tasks].sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? "") || a.title.localeCompare(b.title))
  const groups: DoneGroup[] = []
  for (const task of sorted) {
    const { key, title, recent } = doneGroupOf(task, now)
    const group = groups.find((g) => g.key === key)
    if (group) group.tasks.push(task)
    else groups.push({ key, title, recent, tasks: [task] })
  }
  // Newest first; an empty completedAt sorts last, so "Undated" is the last group.
  return groups
}

function readCollapsed() {
  if (typeof window === "undefined") return false
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true"
  } catch {
    return false
  }
}

export function TodoModule() {
  const allTasks = useAppStore((s) => s.tasks)
  const allTimeBlocks = useAppStore((s) => s.timeBlocks)
  const allScheduleItems = useAppStore((s) => s.schedule)
  const systemConfig = useAppStore((s) => s.profile.systemConfig)
  const categoryColors = useAppStore((s) => s.profile.taskCategoryColors)
  const dailyFocusLimit = systemConfig?.dailyFocusLimit ?? 3
  const allProjects = useAppStore((s) => s.projects)
  const weeklyPlans = useAppStore((s) => s.weeklyPlans)
  const toggleTask = useAppStore((s) => s.toggleTask)
  const reorderTasks = useAppStore((s) => s.reorderTasks)
  const moveTaskToLane = useAppStore((s) => s.moveTaskToLane)
  const updateTask = useAppStore((s) => s.updateTask)
  const allCategories = useCategories()
  const tasks = useMemo(() => allTasks.filter((t) => !t.deleted).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [allTasks])
  const projects = useMemo(() => allProjects.filter((p) => !p.deleted), [allProjects])
  const activeProjects = useMemo(() => projects.filter((p) => (p.status ?? "active") === "active"), [projects])
  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects])

  const taskTimeSlots = useMemo(() => selectTaskTimeSlots(allScheduleItems, allTimeBlocks), [allScheduleItems, allTimeBlocks])

  const [search, setSearch] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<TodoSort>("date-asc")
  const [scope, setScope] = useState<TodoScope>("week")
  const [storedProjectFilter, chooseProject] = useStoredProjectFilter(PROJECT_FILTER_KEY)
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [olderGroupsShown, setOlderGroupsShown] = useState(0)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed))
    } catch {
      // Blocked storage: the sidebar state lasts for this visit.
    }
  }, [collapsed])

  // This week's allocations, with the same hours as Schedule; without a plan, every active project is listed.
  const activePlan = getActiveWeeklyPlan(weeklyPlans)
  const allocations: ProjectAllocation[] = useMemo(
    () =>
      selectAllocationProgress({
        plan: activePlan,
        timeBlocks: allTimeBlocks,
        tasks,
        taskTimeSlots,
        dayISOList: getWeekDates(getCurrentWeekStartISO()).map((day) => day.iso),
      }).filter((a) => activeProjects.some((p) => p.id === a.projectId)),
    [activePlan, allTimeBlocks, tasks, taskTimeSlots, activeProjects]
  // The week's allocations, as on Schedule; without a plan, every active project is listed.
  const activePlan = getActiveWeeklyPlan(weeklyPlans)
  const allocations: ProjectAllocation[] = useMemo(
    () =>
      selectProjectHours(activePlan, allTimeBlocks, [])
        .filter((a) => activeProjects.some((p) => p.id === a.projectId))
        .map((a) => ({ projectId: a.projectId, allocatedHours: a.allocatedHours, plannedHours: a.plannedHours })),
    [activePlan, allTimeBlocks, activeProjects]
  )
  const listedProjects = useMemo(
    () => (allocations.length > 0 ? allocations.flatMap((a) => projectById.get(a.projectId) ?? []) : activeProjects),
    [allocations, projectById, activeProjects]
  )
  const listedIds = useMemo(() => new Set(listedProjects.map((p) => p.id)), [listedProjects])
  // Tasks of paused or parked projects fall under "Other projects", not "No project".
  const knownProjectIds = useMemo(() => new Set(projects.map((p) => p.id)), [projects])
  const projectFilter = resolveProjectFilter(storedProjectFilter, listedIds)

  const openTasks = useMemo(() => tasks.filter((t) => !t.completed), [tasks])
  const doneTasks = useMemo(() => tasks.filter((t) => t.completed), [tasks])
  const weekTasks = useMemo(() => {
    const weekEndISO = localDateISO(endOfWeek(new Date(), { weekStartsOn: 1 }))
    const nextMilestoneByProject = selectNextMilestoneByProject(activeProjects)
    return openTasks.filter((task) => isPlanningFocus(task, weekEndISO, nextMilestoneByProject))
  }, [openTasks, activeProjects])

  const needle = search.trim().toLowerCase()
  // Search always looks through every open task, whatever the view (P24).
  const baseTasks = scope === "done" ? doneTasks : scope === "all" || needle ? openTasks : weekTasks
  const categoryCounts = useMemo(() => countCategories(baseTasks, allCategories), [baseTasks, allCategories])
  // A selected category that no longer has tasks stops filtering instead of hiding everything.
  const activeCategories = selectedCategories.filter((c) => categoryCounts.some((entry) => entry.name === c))

  const matches = useMemo(() => {
    const projectTitle = (task: Task) => (task.linkedProjectId ? projectById.get(task.linkedProjectId)?.title ?? "" : "")
    return (task: Task) =>
      (activeCategories.length === 0 || activeCategories.includes(task.category)) &&
      (!needle || task.title.toLowerCase().includes(needle) || projectTitle(task).toLowerCase().includes(needle))
  }, [activeCategories, needle, projectById])

  // Scope, search and categories; the project filter comes last, so its counts match the board.
  const filteredTasks = useMemo(() => baseTasks.filter(matches), [baseTasks, matches])
  const projectCounts = useMemo(() => countByProject(filteredTasks, listedIds, knownProjectIds), [filteredTasks, listedIds, knownProjectIds])
  const visibleTasks = useMemo(
    () => filterByProject(filteredTasks, projectFilter, listedIds, knownProjectIds),
    [filteredTasks, projectFilter, listedIds, knownProjectIds]
  )
  const projectRows = buildProjectRows(listedProjects, allocations, projectCounts, projectFilter, normalizeProjectColor)

  const sortedTasks = useMemo(() => {
    const items = [...visibleTasks]
    const dueToTs = (task: Task) => (task.dueDate ? new Date(`${task.dueDate}T00:00:00`).getTime() : Number.POSITIVE_INFINITY)
    items.sort((a, b) => {
      if (sortBy === "date-asc") {
        const diff = dueToTs(a) - dueToTs(b)
        if (diff !== 0) return diff
        // Same day: tasks with a start time first, earliest start first.
        const aStart = taskTimeSlots[a.id]?.startTime
        const bStart = taskTimeSlots[b.id]?.startTime
        if (aStart && bStart && aStart !== bStart) return aStart.localeCompare(bStart)
        if (aStart && !bStart) return -1
        if (!aStart && bStart) return 1
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
  }, [visibleTasks, sortBy, taskTimeSlots])

  const doneGroups = useMemo(() => (scope === "done" ? groupDoneTasks(visibleTasks, new Date()) : []), [scope, visibleTasks])
  const laneOf = (task: Task) => task.lane ?? "backlog"
  const backlogTasks = sortedTasks.filter((task) => laneOf(task) === "backlog")
  // "Manual order" shows Daily Focus as the Command Center does: today's timed tasks first (P18).
  const dailyFocusLane = sortedTasks.filter((task) => laneOf(task) === "daily-focus")
  const dailyFocusTasks = sortBy === "manual" ? orderDailyFocusTasks(dailyFocusLane, taskTimeSlots) : dailyFocusLane
  const parkingLotTasks = sortedTasks.filter((task) => laneOf(task) === "parking-lot")
  // The lane's limit counts every open Daily Focus task, not only the filtered ones.
  const dailyFocusCount = openTasks.filter((task) => laneOf(task) === "daily-focus").length
  // The same suggestions the Command Center shows, from all open tasks (not the search or filter).
  const suggestedFocus = useMemo(
    () => selectDailyFocus(tasks, projects, systemConfig, { weeklyPlans, taskTimeSlots }).filter((entry) => !entry.chosen),
    [tasks, projects, systemConfig, weeklyPlans, taskTimeSlots]
  )

  // In This week, each lane says how many of its tasks wait in All (same search, category and project).
  const hiddenByLane = useMemo(() => {
    const counts: Record<TaskLane, number> = { backlog: 0, "daily-focus": 0, "parking-lot": 0 }
    if (scope !== "week" || needle) return counts
    const shown = new Set(visibleTasks.map((t) => t.id))
    for (const task of filterByProject(openTasks.filter(matches), projectFilter, listedIds, knownProjectIds)) {
      if (!shown.has(task.id)) counts[laneOf(task)] += 1
    }
    return counts
  }, [scope, needle, visibleTasks, openTasks, matches, projectFilter, listedIds, knownProjectIds])

  function canUseDailyFocusLane(taskId?: string) {
    return openTasks.filter((task) => laneOf(task) === "daily-focus" && task.id !== taskId).length < dailyFocusLimit
  }

  function handleMoveTask(taskId: string, lane: TaskLane, targetTaskId?: string) {
    if (lane === "daily-focus" && !canUseDailyFocusLane(taskId)) return
    moveTaskToLane(taskId, lane, targetTaskId)
  }

  function makeDragHandlers(lane: TaskLane) {
    return {
      onDragStart: (taskId: string) => setDraggedTaskId(taskId),
      onDropOnTask: (targetTask: Task) => {
        if (!draggedTaskId || draggedTaskId === targetTask.id) return
        const draggedLane = tasks.find((t) => t.id === draggedTaskId)?.lane ?? "backlog"
        if (laneOf(targetTask) === draggedLane) {
          if (sortBy === "manual") reorderTasks(draggedTaskId, targetTask.id)
        } else {
          handleMoveTask(draggedTaskId, laneOf(targetTask), targetTask.id)
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

  function clearFilters() {
    setSearch("")
    setSelectedCategories([])
    chooseProject("all")
  }

  const laneTasks: Record<TaskLane, Task[]> = {
    backlog: backlogTasks,
    "daily-focus": dailyFocusTasks,
    "parking-lot": parkingLotTasks,
  }
  const showProject = projectFilter === "all" || projectFilter === "other"
  const filtersActive = Boolean(needle) || activeCategories.length > 0 || projectFilter !== "all"
  const todayISO = localDateISO()

  const sidebar = (
    <aside className="rounded-xl border bg-card xl:sticky xl:top-4" aria-label="Task filters">
      <div className="space-y-1.5 p-2.5">
        <div className="flex items-center gap-1">
          <p className="min-w-0 flex-1 truncate text-sm font-semibold">
            Tasks <span className="text-muted-foreground">·</span> <span className="tabular-nums">{visibleTasks.length}</span>
          </p>
          <InlineSearch query={search} onQueryChange={setSearch} label="Search tasks" />
          <FiltersPopover
            sort={sortBy}
            sortLabels={SORT_LABELS}
            defaultSort="date-asc"
            onSortChange={setSortBy}
            sortDisabled={scope === "done"}
            sortLabel="Sort tasks"
            categories={categoryCounts}
            selectedCategories={activeCategories}
            onToggleCategory={(name) => setSelectedCategories((current) => (current.includes(name) ? current.filter((c) => c !== name) : [...current, name]))}
            onClearCategories={() => setSelectedCategories([])}
            colorOf={(name) => categoryColor(name, categoryColors)}
          />
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Hide filters"
            title="Hide filters"
          >
            <PanelRightClose className="h-4 w-4" />
          </button>
        </div>
        <div className="flex">
          <ScopeSwitch
            label="Which tasks to show"
            value={scope}
            onChange={setScope}
            options={[
              { key: "week", label: "This week", count: weekTasks.length, title: "Overdue, due this week, Daily Focus, and each project's Next milestone" },
              { key: "all", label: "All", count: openTasks.length, title: "Every open task" },
              { key: "done", label: "Done", count: doneTasks.length, title: "Completed tasks, newest first" },
            ]}
          />
        </div>
        <ProjectFilterList rows={projectRows} value={projectFilter} onChange={chooseProject} />
        {filtersActive ? (
          <button type="button" className="px-2 text-[11px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline" onClick={clearFilters}>
            Clear filters
          </button>
        ) : null}
      </div>
    </aside>
  )

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-serif text-2xl font-bold tracking-tight">ToDo</h1>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
        <div className="order-2 min-w-0 flex-1 xl:order-1">
          {scope === "done" ? (
            <DoneView
              groups={doneGroups}
              olderGroupsShown={olderGroupsShown}
              onShowEarlier={() => setOlderGroupsShown((n) => n + 1)}
              emptyMessage={doneTasks.length > 0 ? "No completed tasks match your filters." : "No completed tasks yet."}
              projectById={projectById}
              categoryColors={categoryColors}
              todayISO={todayISO}
              onToggle={toggleTask}
              onSelect={(task) => setSelectedTaskId(task.id)}
            />
          ) : (
            <div className="grid items-start gap-4 md:grid-cols-3">
              {TASK_LANES.map((laneConfig) => (
                <KanbanColumn
                  key={laneConfig.id}
                  lane={laneConfig.id}
                  tasks={laneTasks[laneConfig.id]}
                  count={laneConfig.id === "daily-focus" ? dailyFocusCount : laneTasks[laneConfig.id].length}
                  limit={laneConfig.id === "daily-focus" ? dailyFocusLimit : undefined}
                  hiddenCount={hiddenByLane[laneConfig.id]}
                  onShowAll={() => setScope("all")}
                  grouped={sortBy === "date-asc"}
                  taskTimeSlots={taskTimeSlots}
                  projectById={projectById}
                  showProject={showProject}
                  categoryColors={categoryColors}
                  todayISO={todayISO}
                  draggedTaskId={draggedTaskId}
                  onToggle={toggleTask}
                  onSelect={(task) => setSelectedTaskId(task.id)}
                  onQuickEdit={updateTask}
                  footer={
                    laneConfig.id === "daily-focus" ? (
                      <SuggestedFocusList
                        entries={suggestedFocus}
                        taskTimeSlots={taskTimeSlots}
                        onAdd={(taskId) => handleMoveTask(taskId, "daily-focus")}
                        className="rounded-xl border border-border/60 bg-card p-3"
                      />
                    ) : null
                  }
                  {...makeDragHandlers(laneConfig.id)}
                />
              ))}
            </div>
          )}
        </div>

        <div className={cn("order-1 xl:order-2 xl:shrink-0", collapsed ? "xl:w-11" : "xl:w-72")}>
          {collapsed ? (
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="flex w-full items-center justify-center gap-3 rounded-xl border bg-card px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground xl:flex-col xl:py-3"
              aria-label={`Show filters (${visibleTasks.length} tasks)`}
              title="Show filters"
            >
              <PanelRightOpen className="h-4 w-4" />
              <Badge variant="secondary" className="px-1.5 text-[10px] tabular-nums">{visibleTasks.length}</Badge>
              <span className="text-xs font-medium xl:[writing-mode:vertical-rl]">Filters</span>
            </button>
          ) : (
            sidebar
          )}
        </div>
      </div>

      <TaskDetailSheet
        taskId={selectedTaskId}
        timeSlot={selectedTaskId ? taskTimeSlots[selectedTaskId] : undefined}
        onClose={() => setSelectedTaskId(null)}
      />
    </div>
  )
}

// ── Done view (replaces the board in the Done scope) ─────────────────────────

function DoneView({ groups, olderGroupsShown, onShowEarlier, emptyMessage, projectById, categoryColors, todayISO, onToggle, onSelect }: {
  groups: DoneGroup[]; olderGroupsShown: number; onShowEarlier: () => void; emptyMessage: string
  projectById: Map<string, Project>; categoryColors?: Record<string, string>; todayISO: string
  onToggle: (id: string) => void; onSelect: (task: Task) => void
}) {
  if (groups.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{emptyMessage}</p>
  }

  const recentGroups = groups.filter((g) => g.recent)
  const olderGroups = groups.filter((g) => !g.recent)
  const visibleGroups = [...recentGroups, ...olderGroups.slice(0, olderGroupsShown)]
  const nextGroup = olderGroups[olderGroupsShown]

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      {recentGroups.length === 0 ? <p className="text-sm text-muted-foreground">Nothing completed this week.</p> : null}
      {visibleGroups.map((group) => (
        <section key={group.key} className="flex flex-col gap-1">
          <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {group.title} · {group.tasks.length}
          </p>
          {group.tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              project={task.linkedProjectId ? projectById.get(task.linkedProjectId) : undefined}
              showProject
              categoryColor={categoryColor(task.category, categoryColors)}
              todayISO={todayISO}
              onToggle={onToggle}
              onSelect={onSelect}
              showLane
            />
          ))}
        </section>
      ))}
      {nextGroup ? (
        <Button variant="outline" size="sm" className="self-center" onClick={onShowEarlier}>
          <ChevronDown className="mr-1 h-3 w-3" />
          Show earlier: {nextGroup.title} ({nextGroup.tasks.length})
        </Button>
      ) : null}
    </div>
  )
}

// ── Kanban column ────────────────────────────────────────────────────────────

function KanbanColumn({
  lane, tasks, count, limit, hiddenCount, onShowAll, grouped = false, taskTimeSlots, projectById, showProject, categoryColors, todayISO,
  draggedTaskId, onToggle, onSelect, onDragStart, onDropOnTask, onDropOnLane, onDragEnd, onQuickEdit, footer,
}: {
  lane: TaskLane; tasks: Task[]; count: number; limit?: number; hiddenCount: number; onShowAll: () => void; grouped?: boolean
  taskTimeSlots: Record<string, TimeSlot>; projectById: Map<string, Project>; showProject: boolean
  categoryColors?: Record<string, string>; todayISO: string; draggedTaskId: string | null; footer?: React.ReactNode
  onToggle: (id: string) => void; onSelect: (task: Task) => void
  onDragStart: (taskId: string) => void; onDropOnTask: (task: Task) => void
  onDropOnLane: () => void; onDragEnd: () => void; onQuickEdit?: QuickEdit
}) {
  const config = TASK_LANES.find((l) => l.id === lane)
  const atLimit = typeof limit === "number" && count >= limit
  const [dragOver, setDragOver] = useState(false)

  function renderRow(task: Task) {
    return (
      <TaskRow
        key={task.id}
        task={task}
        timeSlot={taskTimeSlots[task.id]}
        project={task.linkedProjectId ? projectById.get(task.linkedProjectId) : undefined}
        showProject={showProject}
        categoryColor={categoryColor(task.category, categoryColors)}
        todayISO={todayISO}
        isDragging={draggedTaskId === task.id}
        onToggle={onToggle}
        onSelect={onSelect}
        drag={{ onDragStart, onDropOnTask, onDragEnd }}
        onQuickEdit={onQuickEdit}
      />
    )
  }

  return (
    <section className="flex min-w-0 flex-col gap-2" aria-label={config?.title}>
      <div className="flex items-center gap-2 px-1" title={config?.description}>
        <h2 className="text-sm font-semibold">{config?.title ?? lane}</h2>
        <span className={cn("text-xs tabular-nums text-muted-foreground", atLimit && "font-medium text-foreground")}>
          {typeof limit === "number" ? `${count}/${limit}` : count}
        </span>
      </div>
      <div
        className={cn(
          "flex max-h-[calc(100dvh-11rem)] flex-col gap-1 overflow-y-auto rounded-xl bg-muted/40 p-1.5 transition-colors",
          dragOver && draggedTaskId && "bg-primary/10 ring-2 ring-primary/40"
        )}
        onDragOver={(e) => {
          e.preventDefault()
          if (!dragOver) setDragOver(true)
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragOver(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          onDropOnLane()
        }}
      >
        {tasks.length === 0 ? (
          <p className="select-none px-2 py-4 text-center text-xs text-muted-foreground">
            {lane === "daily-focus" ? "Drag up to three tasks here, or add a suggestion." : "Nothing here."}
          </p>
        ) : grouped ? (
          DUE_GROUPS.map((group) => {
            const groupTasks = tasks.filter((task) => dueGroupOf(task) === group.id)
            if (groupTasks.length === 0) return null
            return (
              <div key={group.id} className="flex flex-col gap-1">
                <p className={cn("px-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground", group.id === "overdue" && "text-destructive")}>
                  {group.title} · {groupTasks.length}
                </p>
                {groupTasks.map(renderRow)}
              </div>
            )
          })
        ) : (
          tasks.map(renderRow)
        )}
        {hiddenCount > 0 ? (
          <p className="px-1.5 pt-1 text-[11px] text-muted-foreground">
            {hiddenCount} more not this week.{" "}
            <button type="button" className="font-medium text-foreground underline-offset-2 hover:underline" onClick={onShowAll}>
              Show all
            </button>
          </p>
        ) : null}
      </div>
      {footer}
    </section>
  )
}

// ── Task row: two lines, as on Schedule (P26) ────────────────────────────────

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

function dueText(dueDate: string, todayISO: string) {
  if (dueDate === todayISO) return "Today"
  if (isTomorrow(parseISO(dueDate))) return "Tomorrow"
  return format(parseISO(`${dueDate}T12:00:00`), "MMM d")
}

function TaskRow({ task, timeSlot, project, showProject, categoryColor, todayISO, isDragging = false, onToggle, onSelect, drag, showLane = false, onQuickEdit }: {
  task: Task; timeSlot?: TimeSlot; project?: Project; showProject: boolean; categoryColor: string; todayISO: string; isDragging?: boolean
  onToggle: (id: string) => void; onSelect: (task: Task) => void
  drag?: { onDragStart: (taskId: string) => void; onDropOnTask: (task: Task) => void; onDragEnd: () => void }
  showLane?: boolean; onQuickEdit?: QuickEdit
}) {
  const [editingField, setEditingField] = useState<null | "date" | "time">(null)
  const [dateVal, setDateVal] = useState("")
  const [startVal, setStartVal] = useState("")
  const [endVal, setEndVal] = useState("")
  const draggable = Boolean(drag) && !task.completed

  function startDateEdit(e: React.MouseEvent) {
    e.stopPropagation()
    setDateVal(task.dueDate ?? "")
    setEditingField("date")
  }
  function saveDateEdit() {
    onQuickEdit?.(task.id, { dueDate: dateVal || undefined })
    setEditingField(null)
  }
  function startTimeEdit(e: React.MouseEvent) {
    e.stopPropagation()
    setStartVal(timeSlot?.startTime ?? "")
    setEndVal(timeSlot?.endTime ?? "")
    setEditingField("time")
  }
  function saveTimeEdit() {
    onQuickEdit?.(task.id, {}, { startHHmm: startVal || undefined, endHHmm: endVal || undefined })
    setEditingField(null)
  }

  const overdue = Boolean(task.dueDate && !task.completed && task.dueDate < todayISO)
  const source = sourceLabel(task)

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-md border border-l-[3px] border-border/70 bg-card px-2.5 py-1.5 transition-[background-color,opacity] hover:bg-secondary/35",
        draggable && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50",
        task.completed && "opacity-60"
      )}
      style={{ borderLeftColor: project ? normalizeProjectColor(project.color) : "transparent" }}
      onClick={() => onSelect(task)}
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move"
        drag?.onDragStart(task.id)
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        if (!drag) return
        e.preventDefault()
        e.stopPropagation()
        drag.onDropOnTask(task)
      }}
      onDragEnd={drag?.onDragEnd}
    >
      <Checkbox checked={task.completed} onCheckedChange={() => onToggle(task.id)} onClick={(e) => e.stopPropagation()} aria-label={`Complete ${task.title}`} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        {/* A click anywhere opens the task sheet; the title button is the keyboard path (as on Schedule). */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onSelect(task)
          }}
          className={cn("line-clamp-2 w-full rounded-sm text-left text-sm font-medium leading-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", task.completed && "line-through")}
          title={task.title}
        >
          {task.title}
        </button>
        <div className="flex min-w-0 items-center gap-x-1.5 overflow-hidden whitespace-nowrap text-[11px] leading-4 text-muted-foreground">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: categoryColor }} title={task.category} aria-hidden="true" />
          <span className="sr-only">{task.category},</span>
          {task.dueDate ? (
            editingField === "date" ? (
              <input
                type="date"
                value={dateVal}
                autoFocus
                aria-label="Due date"
                className="h-5 rounded border border-border bg-background px-1 text-[10px] tabular-nums"
                onChange={(e) => setDateVal(e.target.value)}
                onBlur={saveDateEdit}
                onKeyDown={(e) => { if (e.key === "Enter") saveDateEdit(); if (e.key === "Escape") setEditingField(null) }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <button
                type="button"
                className={cn("shrink-0 rounded-sm hover:underline", overdue && "font-semibold text-destructive")}
                onClick={startDateEdit}
                title="Edit date"
              >
                {dueText(task.dueDate, todayISO)}
              </button>
            )
          ) : null}
          {timeSlot ? (
            editingField === "time" ? (
              <span className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <input
                  type="time"
                  value={startVal}
                  autoFocus
                  aria-label="Start time"
                  className="h-5 w-18 rounded border border-border bg-background px-1 text-[10px] tabular-nums"
                  onChange={(e) => setStartVal(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveTimeEdit(); if (e.key === "Escape") setEditingField(null) }}
                />
                <span>–</span>
                <input
                  type="time"
                  value={endVal}
                  aria-label="End time"
                  className="h-5 w-18 rounded border border-border bg-background px-1 text-[10px] tabular-nums"
                  onChange={(e) => setEndVal(e.target.value)}
                  onBlur={saveTimeEdit}
                  onKeyDown={(e) => { if (e.key === "Enter") saveTimeEdit(); if (e.key === "Escape") setEditingField(null) }}
                />
              </span>
            ) : (
              <button type="button" className="shrink-0 rounded-sm tabular-nums hover:underline" onClick={startTimeEdit} title="Edit time">
                {task.dueDate ? "· " : ""}{fmtTime(timeSlot.startTime)}–{fmtTime(timeSlot.endTime)}
              </button>
            )
          ) : null}
          {timeSlot?.status === "done" && timeSlot.actualHours != null && timeSlot.actualHours > timeSlot.plannedHours ? (
            <span className="shrink-0 font-medium text-amber-600 dark:text-amber-500">{fmtOverrun(timeSlot.actualHours - timeSlot.plannedHours)} over</span>
          ) : null}
          {task.estimateMin && !timeSlot ? <span className="shrink-0">· {task.estimateMin}m</span> : null}
          {(task.repeat ?? "none") !== "none" ? <span className="shrink-0">· repeats {task.repeat}</span> : null}
          {source ? <span className="shrink-0" title={task.sourceId}>· {source}</span> : null}
          {showLane ? <span className="shrink-0">· {TASK_LANE_LABELS[task.lane ?? "backlog"]}</span> : null}
          {showProject && project ? (
            <span className="min-w-0 truncate" title={project.title}>
              · {project.title}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}
