"use client"

import { useEffect, useState } from "react"
import { format, isToday, parseISO } from "date-fns"
import { CalendarPlus, ChevronRight, GripVertical, MoonStar, Plus } from "lucide-react"
import { CloseDayDialog } from "@/components/close-day-dialog"
import { useAppStore } from "@/lib/store"
import { isOverdue } from "@/lib/game-utils"
import {
  TASK_LANE_LABELS,
  selectAttentionItems,
  selectDailyFocus,
  normalizeSystemConfig,
} from "@/lib/execution-os"
import type { AttentionEffect, AttentionItem } from "@/lib/execution-os"
import { localDateISO, selectDayAgenda, selectTaskTimeSlots } from "@/lib/weekly-plan"
import type { DayAgendaEntry, TaskTimeSlot } from "@/lib/weekly-plan"
import { isPast } from "@/lib/time-blocks"
import type { Project, SystemConfig, Task, WeeklyPlan } from "@/lib/types"
import { usePlanInNextSlot } from "@/hooks/use-plan-next-slot"
import { useOsCanon } from "@/hooks/use-os-canon"
import type { CanonFeedResult } from "@/lib/os-feed/canon-parser"
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
  const [closingDay, setClosingDay] = useState(false)

  const config = normalizeSystemConfig(profile.systemConfig)
  const liveTasks = tasks.filter((task) => !task.deleted)
  const liveProjects = projects.filter((project) => !project.deleted)

  const taskTimeSlots = selectTaskTimeSlots(scheduleItems, timeBlocks)
  // Same list as the Schedule calendar for today (#158); Daily Focus is the one place it shows (P20).
  const todayBlocks = selectDayAgenda({ timeBlocks, tasks: liveTasks, taskTimeSlots, dateISO: localDateISO() })
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
        <Button variant="outline" size="sm" className="ml-auto h-7 gap-1.5 px-2.5 text-xs" onClick={() => setClosingDay(true)}>
          <MoonStar className="h-3.5 w-3.5" />
          Close day
        </Button>
      </div>
      <CloseDayDialog open={closingDay} onOpenChange={setClosingDay} />

      <div className="grid gap-3 md:grid-cols-2">
        {/* Focus — what next */}
        <DailyFocusCard
          tasks={liveTasks}
          projects={liveProjects}
          weeklyPlans={weeklyPlans}
          taskTimeSlots={taskTimeSlots}
          todayBlocks={todayBlocks}
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
  todayBlocks,
  dailyFocusLimit,
  systemConfig,
}: {
  tasks: Task[]
  projects: Project[]
  weeklyPlans: WeeklyPlan[]
  taskTimeSlots: Record<string, TaskTimeSlot>
  todayBlocks: DayAgendaEntry[]
  dailyFocusLimit: number
  systemConfig: SystemConfig
}) {
  const toggleTask = useAppStore((s) => s.toggleTask)
  const moveTaskToLane = useAppStore((s) => s.moveTaskToLane)
  const reorderTasks = useAppStore((s) => s.reorderTasks)
  const setActiveModule = useAppStore((s) => s.setActiveModule)
  const planInNextSlot = usePlanInNextSlot()
  const canon = useOsCanon()
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const now = useMinuteClock()

  const focus = selectDailyFocus(tasks, projects, systemConfig, { weeklyPlans, taskTimeSlots })
  const chosen = focus.filter((entry) => entry.chosen)
  const suggested = focus.filter((entry) => !entry.chosen)
  const todayISO = localDateISO()
  const isTimedToday = (task: Task) => task.dueDate === todayISO && Boolean(taskTimeSlots[task.id])
  const isTaskPast = (task: Task) => isTimedToday(task) && isPast(taskTimeSlots[task.id].endTime, todayISO, now)
  // Blocks whose task this card already lists are not listed again (P20: no block in two places).
  const listedTaskIds = new Set(focus.map((entry) => entry.task.id))
  const otherBlocks = todayBlocks.filter((block) => !block.linkedTaskId || !listedTaskIds.has(block.linkedTaskId))

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
                  <label
                    htmlFor={`focus-${task.id}`}
                    className={cn("block cursor-pointer text-sm font-medium leading-snug", isTaskPast(task) && "text-muted-foreground")}
                  >
                    {task.title}
                  </label>
                  <FocusTaskMeta task={task} linkedProject={linkedProject} timeSlot={taskTimeSlots[task.id]} past={isTaskPast(task)} />
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

      <SuggestedFocusList
        entries={suggested}
        taskTimeSlots={taskTimeSlots}
        onAdd={(taskId) => moveTaskToLane(taskId, "daily-focus")}
        isTaskPast={isTaskPast}
        className={chosen.length > 0 ? "mt-4" : undefined}
      />

      <ScheduledToday blocks={otherBlocks} todayISO={todayISO} now={now} className={focus.length > 0 ? "mt-4" : undefined} />

      <CanonFocus canon={canon} className="mt-4 border-t border-border pt-3" />
    </div>
  )
}

/** Due date and, when it is today, the task's time, so a task reads the same here as in ToDo and Schedule. */
function FocusTaskMeta({
  task,
  linkedProject,
  timeSlot,
  past,
}: {
  task: Task
  linkedProject?: Project
  timeSlot?: TaskTimeSlot
  past?: boolean
}) {
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
          {past ? <PastLabel /> : null}
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
 * P7: current focus from AI-Business-OS canon (ADR-031), read-only: the primary outcomes and the
 * lanes at primary or protected. Outcomes, not tasks, so no actions and not counted against the
 * Daily Focus limit. A failed fetch shows the last known canon with its fetch time, never a blank.
 */
function CanonFocus({ canon, className }: { canon: CanonFeedResult | null; className?: string }) {
  if (!canon || canon.status === "not-configured") return null

  if (canon.status === "missing") {
    return <p className={cn("text-xs text-muted-foreground", className)}>Current focus not found in canon.</p>
  }

  if (canon.status === "error" && !canon.stale) {
    return <p className={cn("text-xs text-muted-foreground", className)}>Canon could not be loaded.</p>
  }

  const lanes = canon.allocation.filter((lane) => lane.level === "primary" || lane.level === "protected")
  const asOf = [
    canon.packGenerated ? "Canon as of " + canon.packGenerated : null,
    canon.reconciledWithGit ? "reconciled " + canon.reconciledWithGit : null,
  ].filter(Boolean)
  const asOfLine = asOf.join(", ")

  // Read-only and slow to change, so it is folded away by default (P20); the summary says what is inside.
  const outcomes = canon.outcomes.length
  return (
    <details className={cn("group", className)}>
      <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-sm text-[11px] font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <ChevronRight aria-hidden className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
        Canon · {outcomes} {outcomes === 1 ? "outcome" : "outcomes"}
        {canon.stale ? <span className="font-normal normal-case tracking-normal"> · last known</span> : null}
      </summary>
      <div className="mt-2">
        {canon.stale && canon.fetchedAt ? (
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Last known, fetched {format(new Date(canon.fetchedAt), "d MMM HH:mm")}
          </p>
        ) : null}
        {canon.outcomes.length > 0 ? (
          <ul className="flex flex-col gap-1">
            {canon.outcomes.map((outcome) => (
              <li key={outcome.id} className="text-sm leading-snug">
                {outcome.title}
              </li>
            ))}
          </ul>
        ) : null}
        {lanes.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {lanes.map((lane) => (
              <Badge
                key={lane.id}
                variant={lane.level === "primary" ? "secondary" : "outline"}
                className="text-[11px] font-normal"
                title={lane.level}
              >
                {lane.lane.replace(/_/g, " ")}
                {lane.level === "protected" ? " · protected" : ""}
              </Badge>
            ))}
          </div>
        ) : null}
        {asOfLine ? (
          <p className="mt-2 text-xs text-muted-foreground">{asOfLine.charAt(0).toUpperCase() + asOfLine.slice(1)}</p>
        ) : null}
      </div>
    </details>
  )
}

/** The current time, updated once a minute, so rows turn "past" without a reload (P20). */
function useMinuteClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])
  return now
}

function PastLabel() {
  return <span className="ml-1.5 rounded-sm bg-muted px-1 py-px text-[10px] font-medium text-muted-foreground">past</span>
}

/**
 * Today's time blocks that the card does not already list as a task: blocks without a task, and
 * blocks of tasks outside Daily Focus. The status shows only when it is not "planned".
 */
function ScheduledToday({
  blocks,
  todayISO,
  now,
  className,
}: {
  blocks: DayAgendaEntry[]
  todayISO: string
  now: Date
  className?: string
}) {
  if (blocks.length === 0) return null
  return (
    <div className={className}>
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Also scheduled</p>
      <ul className="flex flex-col gap-1.5">
        {blocks.map((block) => {
          const past = isPast(block.endTime, todayISO, now)
          return (
            <li key={block.id} className="flex items-baseline gap-3 text-sm">
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {block.startTime}–{block.endTime}
              </span>
              <span className={cn("min-w-0 flex-1 truncate leading-snug", past && "text-muted-foreground")}>{block.title}</span>
              {block.status !== "planned" ? (
                <Badge variant={block.status === "done" ? "default" : "outline"} className="text-[10px]">
                  {block.status}
                </Badge>
              ) : null}
              {past && block.status === "planned" ? <PastLabel /> : null}
            </li>
          )
        })}
      </ul>
    </div>
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
  isTaskPast,
  className,
}: {
  entries: Array<{ task: Task; linkedProject?: Project }>
  taskTimeSlots: Record<string, TaskTimeSlot>
  onAdd: (taskId: string) => void
  /** P20: a suggestion whose slot today has ended reads as past; it can still be added. */
  isTaskPast?: (task: Task) => boolean
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
              <p className={cn("text-sm leading-snug text-muted-foreground", isTaskPast?.(task) && "text-muted-foreground/70")}>{task.title}</p>
              <FocusTaskMeta task={task} linkedProject={linkedProject} timeSlot={taskTimeSlots[task.id]} past={isTaskPast?.(task)} />
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
