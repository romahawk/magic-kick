"use client"

import { format, isToday, parseISO } from "date-fns"
import { Plus } from "lucide-react"
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
import type { Project, Task } from "@/lib/types"
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
  const toggleTask = useAppStore((s) => s.toggleTask)
  const moveTaskToLane = useAppStore((s) => s.moveTaskToLane)
  const updateProject = useAppStore((s) => s.updateProject)
  const setActiveModule = useAppStore((s) => s.setActiveModule)

  const config = normalizeSystemConfig(profile.systemConfig)
  const liveTasks = tasks.filter((task) => !task.deleted)
  const liveProjects = projects.filter((project) => !project.deleted)

  const focus = selectDailyFocus(liveTasks, liveProjects, config, { weeklyPlans })
  const chosen = focus.filter((entry) => entry.chosen)
  const suggested = focus.filter((entry) => !entry.chosen)
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
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {TASK_LANE_LABELS["daily-focus"]}
            </h3>
            <span className={cn("text-xs", chosen.length > config.dailyFocusLimit ? "font-medium text-destructive" : "text-muted-foreground")}>
              {chosen.length} of {config.dailyFocusLimit} chosen
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
                Pick up to {config.dailyFocusLimit} tasks
              </button>
              .
            </p>
          ) : null}

          {chosen.length > 0 ? (
            <ul className="flex flex-col gap-2.5">
              {chosen.map(({ task, linkedProject }) => (
                <li key={task.id} className="flex items-start gap-3">
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
                      className="block cursor-pointer text-sm font-medium leading-snug"
                    >
                      {task.title}
                    </label>
                    <FocusTaskMeta task={task} linkedProject={linkedProject} timeSlot={taskTimeSlots[task.id]} />
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          <SuggestedFocusList
            entries={suggested}
            taskTimeSlots={taskTimeSlots}
            onAdd={(taskId) => moveTaskToLane(taskId, "daily-focus")}
            className={chosen.length > 0 ? "mt-4" : undefined}
          />
        </div>

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
