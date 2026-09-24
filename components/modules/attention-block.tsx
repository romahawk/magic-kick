"use client"

import { format } from "date-fns"
import { useAppStore } from "@/lib/store"
import {
  ATTENTION_LIMIT,
  TASK_LANE_LABELS,
  selectAttentionItems,
  selectDailyFocus,
  normalizeSystemConfig,
} from "@/lib/execution-os"
import type { AttentionItem } from "@/lib/execution-os"
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
export function AttentionBlock() {
  const profile = useAppStore((s) => s.profile)
  const tasks = useAppStore((s) => s.tasks)
  const projects = useAppStore((s) => s.projects)
  const toggleTask = useAppStore((s) => s.toggleTask)
  const setActiveModule = useAppStore((s) => s.setActiveModule)

  const config = normalizeSystemConfig(profile.systemConfig)
  const liveTasks = tasks.filter((task) => !task.deleted)
  const liveProjects = projects.filter((project) => !project.deleted)

  const focus = selectDailyFocus(liveTasks, liveProjects, config)
  const attention = selectAttentionItems({ projects: liveProjects, tasks: liveTasks, config })

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
            <span className="text-xs text-muted-foreground">
              {focus.length} of {config.dailyFocusLimit} today
            </span>
          </div>

          {focus.length === 0 ? (
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
          ) : (
            <ul className="flex flex-col gap-2.5">
              {focus.map(({ task, linkedProject }) => (
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
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {linkedProject ? (
                        <Badge variant="outline" className="text-[11px] font-normal">
                          {linkedProject.title}
                        </Badge>
                      ) : null}
                      {task.dueDate ? (
                        <span className="text-xs text-muted-foreground">
                          due {format(new Date(task.dueDate), "d MMM")}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Attention — what is wrong */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Needs attention
            </h3>
            {attention.length > 0 ? (
              <span className="text-xs text-muted-foreground">
                {attention.length}
                {attention.length === ATTENTION_LIMIT ? "+" : ""}
              </span>
            ) : null}
          </div>

          {attention.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing needs attention.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {attention.map((item) => (
                <AttentionRow key={item.id} item={item} onOpen={() => setActiveModule(item.module)} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}

function AttentionRow({ item, onOpen }: { item: AttentionItem; onOpen: () => void }) {
  return (
    <li className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
      <span
        aria-hidden
        className={cn(
          "mt-1.5 size-2 shrink-0 rounded-full",
          item.severity === "high" ? "bg-destructive" : "bg-muted-foreground",
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-snug">{item.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p>
      </div>
      <Button variant="outline" size="sm" className="h-7 shrink-0 px-2.5 text-xs" onClick={onOpen}>
        {item.actionLabel}
      </Button>
    </li>
  )
}
