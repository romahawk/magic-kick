"use client"

import { useState } from "react"
import { format, isToday, parseISO } from "date-fns"
import { CalendarPlus, GripVertical, Plus } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { isOverdue } from "@/lib/game-utils"
import {
  TASK_LANE_LABELS,
  selectAttentionItems,
  selectDailyFocus,
  normalizeSystemConfig,
} from "@/lib/execution-os"
import type { AttentionEffect, AttentionItem } from "@/lib/execution-os"
import { localDateISO, selectTaskTimeSlots } from "@/lib/weekly-plan"
import type { TaskTimeSlot } from "@/lib/weekly-plan"
import type { Project, SystemConfig, Task, WeeklyPlan } from "@/lib/types"
import { usePlanInNextSlot } from "@/hooks/use-plan-next-slot"
import { useOsPlan } from "@/hooks/use-os-plan"
import { selectUnmatchedPlanTasks } from "@/lib/os-feed/plan-parser"
import type { PlanFeedResult, PlanTask } from "@/lib/os-feed/plan-parser"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

/**
 * P1 — the control plane's first answer.
 *
 * Two questions, above the fold, before any tab is touched:
 * what should I do next (Focus), and what is wrong right now (Attention).
 * All derivation lives in lib/execution-os.ts; this file only renders.
 */
export function AttentionBlock({ onOpenTab }: { onOpenTab: (tab: "plan" | "review") => void }) {
  const profile = useAppStore((s) => s.profile)
  const tasks = useAppStore((s) => s.tasks)
  const projects = useAppStore((s) => s.projects)
  const weeklyPlans = useAppStore((s) => s.weeklyPlans)
  const timeBlocks = useAppStore((s) => s.timeBlocks)
  const scheduleItems = useAppStore((s) => s.schedule)
  const updateProject = useAppStore((s) => s.updateProject)
  const setActiveModule = useAppStore((s) => s.setActiveModule)

  const config = normalizeSystemConfig(profile.systemConfig)
  const liveTasks = tasks.filter((task) => !task.deleted)
  const liveProjects = projects.filter((project) => !project.deleted)

  const taskTimeSlots = selectTaskTimeSlots(scheduleItems, timeBlocks)
  const attention = selectAttentionItems({ projects: liveProjects, tasks: liveTasks, weeklyPlans, config })

  // Actions carry their effect as data (P3), so this runs any item without knowing its kind.
  // The block lives on the Command Center, so "open-tab" switches a tab there.
  function runEffect(effect: AttentionEffect) {
    if (effect.type === "open-module") setActiveModule(effect.module)
    else if (effect.type === "open-tab") onOpenTab(effect.tab)
    else updateProject(effect.projectId, effect.patch)
  }

  return (
    <section aria-label="Now" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="font-serif text-xl font-bold tracking-tight">Now</h2>
        <span className="text-sm text-muted-foreground">{format(new Date(), "EEEE, d MMMM")}</span>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {/* Focus — what next */}
        <DailyFocusCard
          tasks={liveTasks}
          projects={liveProjects}
          weeklyPlans={weeklyPlans}
          taskTimeSlots={taskTimeSlots}
          dailyFocusLimit={config.dailyFocusLimit}
          systemConfig={config}
        />

        {/* Attention — what is wrong */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Needs attention
            </h3>
            {attention.total > 0 ? (
              <span className="text-xs text-muted-foreground">
                {attention.total > attention.items.length
                  ? attention.items.length + " of " + attention.total
                  : attention.total}
              </span>
            ) : null}
          </div>

          {attention.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing needs attention.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {attention.items.map((item) => (
                <AttentionRow key={item.id} item={item} onAction={runEffect} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}

function formatSince(dateISO: string) {
  const date = parseISO(dateISO)
  return isToday(date) ? "since today" : "since " + format(date, "d MMM")
}

function AttentionRow({ item, onAction }: { item: AttentionItem; onAction: (effect: AttentionEffect) => void }) {
  return (
    <li className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
      <span
        aria-hidden
        className={cn(
          "mt-1.5 size-2 shrink-0 rounded-full",
          item.severity === "high" ? "bg-destructive" : "bg-muted-foreground",
        )}
      />
      <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0 basis-48 flex-1">
          <p className="text-sm font-medium leading-snug">{item.subject}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {item.detail}
            {item.since ? " · " + formatSince(item.since) : null}
          </p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          {item.actions.map((action) => (
            <Button key={action.label} variant="outline" size="sm" className="h-7 px-2.5 text-xs" onClick={() => onAction(action.effect)}>
              {action.label}
            </Button>
          ))}
        </div>
      </div>
    </li>
  )
}

/**
 * P18 — Daily Focus as the day plan: chosen tasks (today's timed ones first, in time order), then
 * the suggestions. Untimed chosen tasks can be dragged to reorder and planned into the next free slot.
 */
function DailyFocusCard({
  tasks,
  projects,
  weeklyPlans,
  taskTimeSlots,
  dailyFocusLimit,
  systemConfig,
}: {
  tasks: Task[]
  projects: Project[]
  weeklyPlans: WeeklyPlan[]
  taskTimeSlots: Record<string, TaskTimeSlot>
  dailyFocusLimit: number
  systemConfig: SystemConfig
}) {
  const toggleTask = useAppStore((s) => s.toggleTask)
  const moveTaskToLane = useAppStore((s) => s.moveTaskToLane)
  const reorderTasks = useAppStore((s) => s.reorderTasks)
  const setActiveModule = useAppStore((s) => s.setActiveModule)
  const planInNextSlot = usePlanInNextSlot()
  const osPlan = useOsPlan()
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)

  const focus = selectDailyFocus(tasks, projects, systemConfig, { weeklyPlans, taskTimeSlots })
  const chosen = focus.filter((entry) => entry.chosen)
  const suggested = focus.filter((entry) => !entry.chosen)
  const todayISO = localDateISO()
  const isTimedToday = (task: Task) => task.dueDate === todayISO && Boolean(taskTimeSlots[task.id])

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {TASK_LANE_LABELS["daily-focus"]}
        </h3>
        <span className={cn("text-xs", chosen.length > dailyFocusLimit ? "font-medium text-destructive" : "text-muted-foreground")}>
          {chosen.length} of {dailyFocusLimit} chosen
        </span>
        <button
          type="button"
          onClick={() => setActiveModule("todo")}
          className="ml-auto text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Open in ToDo
        </button>
      </div>

      {chosen.length === 0 && suggested.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing chosen for today.{" "}
          <button
            type="button"
            onClick={() => setActiveModule("todo")}
            className="underline underline-offset-4 hover:text-foreground"
          >
            Pick up to {dailyFocusLimit} tasks
          </button>
          .
        </p>
      ) : null}

      {chosen.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {chosen.map(({ task, linkedProject }) => {
            // Timed tasks sit in time order, so only untimed ones take a manual position.
            const draggable = !isTimedToday(task)
            return (
              <li
                key={task.id}
                className={cn(
                  "group flex items-start gap-2 rounded-md py-1 pr-1",
                  draggedTaskId === task.id && "opacity-50"
                )}
                draggable={draggable}
                onDragStart={() => setDraggedTaskId(task.id)}
                onDragEnd={() => setDraggedTaskId(null)}
                onDragOver={(e) => {
                  if (draggable && draggedTaskId) e.preventDefault()
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  if (draggable && draggedTaskId && draggedTaskId !== task.id) reorderTasks(draggedTaskId, task.id)
                  setDraggedTaskId(null)
                }}
              >
                <span
                  className={cn("mt-0.5 shrink-0 text-muted-foreground/60", draggable ? "cursor-grab" : "invisible")}
                  aria-hidden="true"
                >
                  <GripVertical className="h-4 w-4" />
                </span>
                <Checkbox
                  id={`focus-${task.id}`}
                  checked={task.completed}
                  onCheckedChange={() => toggleTask(task.id)}
                  className="mt-0.5"
                  aria-label={`Complete ${task.title}`}
                />
                <div className="min-w-0 flex-1">
                  <label htmlFor={`focus-${task.id}`} className="block cursor-pointer text-sm font-medium leading-snug">
                    {task.title}
                  </label>
                  <FocusTaskMeta task={task} linkedProject={linkedProject} timeSlot={taskTimeSlots[task.id]} />
                </div>
                {taskTimeSlots[task.id] ? null : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 shrink-0 gap-1 px-2 text-xs"
                    onClick={() => planInNextSlot(task)}
                    title="Put in the next free slot on the calendar"
                    aria-label={`Plan ${task.title} in the next free slot`}
                  >
                    <CalendarPlus className="h-3.5 w-3.5" />
                    Plan
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      ) : null}

      <OsPlanList plan={osPlan} tasks={tasks} className={chosen.length > 0 ? "mt-4" : undefined} />

      <SuggestedFocusList
        entries={suggested}
        taskTimeSlots={taskTimeSlots}
        onAdd={(taskId) => moveTaskToLane(taskId, "daily-focus")}
        className={chosen.length > 0 ? "mt-4" : undefined}
      />
    </div>
  )
}

/** Due date and, when it is today, the task's time, so a task reads the same here as in ToDo and Schedule. */
function FocusTaskMeta({ task, linkedProject, timeSlot }: { task: Task; linkedProject?: Project; timeSlot?: TaskTimeSlot }) {
  const dueToday = task.dueDate === localDateISO()
  return (
    <div className="mt-1 flex flex-wrap items-center gap-2">
      {linkedProject ? (
        <Badge variant="outline" className="text-[11px] font-normal">
          {linkedProject.title}
        </Badge>
      ) : null}
      {dueToday && timeSlot ? (
        <span className="text-xs tabular-nums text-muted-foreground">
          today {timeSlot.startTime}–{timeSlot.endTime}
        </span>
      ) : task.dueDate ? (
        <span className={cn("text-xs", isOverdue(task.dueDate) ? "font-medium text-destructive" : "text-muted-foreground")}>
          {isOverdue(task.dueDate) ? "overdue, " : ""}due {format(parseISO(task.dueDate), "d MMM")}
        </span>
      ) : null}
    </div>
  )
}

/**
 * P7: today's plan from AI-Business-OS, read-only. Not counted against the Daily Focus limit, no
 * actions, and hidden when the same task is already in Magic Kick. A failed fetch shows the last
 * plan with its date, never a blank.
 */
function OsPlanList({ plan, tasks, className }: { plan: PlanFeedResult | null; tasks: Task[]; className?: string }) {
  if (!plan || plan.status === "not-configured") return null

  if (plan.status === "missing") {
    return <p className={cn("text-xs text-muted-foreground", className)}>No plan for today yet.</p>
  }

  if (plan.status === "error" && !plan.stale) {
    return <p className={cn("text-xs text-muted-foreground", className)}>The plan could not be loaded.</p>
  }

  const entries = selectUnmatchedPlanTasks(plan.tasks, tasks)
  const staleNote =
    plan.stale && plan.date && plan.fetchedAt
      ? "Plan from " + format(parseISO(plan.date), "d MMM") + ", last fetched " + format(new Date(plan.fetchedAt), "HH:mm")
      : null
  if (entries.length === 0 && !staleNote) return null

  return (
    <div className={className}>
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">From plan</p>
      {staleNote ? <p className="mb-2 text-xs font-medium text-muted-foreground">{staleNote}</p> : null}
      <ul className="flex flex-col gap-2.5">
        {entries.map((planTask) => (
          <OsPlanRow key={planTask.id} planTask={planTask} />
        ))}
      </ul>
    </div>
  )
}

function OsPlanRow({ planTask }: { planTask: PlanTask }) {
  return (
    <li className="min-w-0">
      <p className={cn("text-sm leading-snug", planTask.done && "text-muted-foreground line-through")}>{planTask.title}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="text-[11px] font-normal">
          From plan
        </Badge>
        <Badge variant="outline" className="text-[11px] font-normal">
          {planTask.project}
        </Badge>
        {planTask.start ? (
          <span className="text-xs tabular-nums text-muted-foreground">
            {planTask.start}
            {planTask.end ? "–" + planTask.end : ""}
          </span>
        ) : null}
        {planTask.due ? (
          <span className={cn("text-xs", !planTask.done && isOverdue(planTask.due) ? "font-medium text-destructive" : "text-muted-foreground")}>
            {!planTask.done && isOverdue(planTask.due) ? "overdue, " : ""}due {format(parseISO(planTask.due), "d MMM")}
          </span>
        ) : null}
      </div>
    </li>
  )
}

/**
 * Tasks that would fill the free Daily Focus slots. They are not chosen: "Add" moves one into the
 * Daily Focus lane, which is what both the Command Center and ToDo list as today's focus.
 */
export function SuggestedFocusList({
  entries,
  taskTimeSlots,
  onAdd,
  className,
}: {
  entries: Array<{ task: Task; linkedProject?: Project }>
  taskTimeSlots: Record<string, TaskTimeSlot>
  onAdd: (taskId: string) => void
  className?: string
}) {
  if (entries.length === 0) return null
  return (
    <div className={className}>
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Suggested</p>
      <ul className="flex flex-col gap-2.5">
        {entries.map(({ task, linkedProject }) => (
          <li key={task.id} className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-snug text-muted-foreground">{task.title}</p>
              <FocusTaskMeta task={task} linkedProject={linkedProject} timeSlot={taskTimeSlots[task.id]} />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 shrink-0 gap-1 px-2 text-xs"
              onClick={() => onAdd(task.id)}
              aria-label={`Add ${task.title} to Daily Focus`}
            >
              <Plus className="h-3 w-3" />
              Add
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
