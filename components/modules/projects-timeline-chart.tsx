"use client"

import { useMemo } from "react"
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns"
import { cn } from "@/lib/utils"
import type { Project, ProjectMilestone } from "@/lib/types"

const LEGACY_COLOR_MAP: Record<string, string> = {
  "bg-chart-1": "#3b82f6",
  "bg-chart-2": "#22c55e",
  "bg-chart-3": "#06b6d4",
  "bg-chart-4": "#f97316",
  "bg-chart-5": "#a855f7",
}

function normalizeColor(color: string | undefined) {
  const trimmed = color?.trim() ?? ""
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed
  return LEGACY_COLOR_MAP[trimmed] ?? "#3b82f6"
}

// §3 — Month-axis milestone timeline replacing the 52-week Gantt
export function ProjectsTimelineChart({ projects }: { projects: Project[] }) {
  const year = new Date().getFullYear()
  const yearStart = useMemo(() => new Date(year, 0, 1), [year])
  const yearEnd = useMemo(() => new Date(year, 11, 31), [year])
  const yearDays = useMemo(
    () => differenceInCalendarDays(yearEnd, yearStart) + 1,
    [yearStart, yearEnd]
  )
  const todayPct = useMemo(
    () => Math.max(0, Math.min(1, differenceInCalendarDays(new Date(), yearStart) / yearDays)),
    [yearStart, yearDays]
  )
  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        label: format(new Date(year, i, 1), "MMM"),
        pct: differenceInCalendarDays(new Date(year, i, 1), yearStart) / yearDays,
      })),
    [year, yearStart, yearDays]
  )

  function barPct(project: Project) {
    const start = parseISO(project.weekStartISO)
    const end = parseISO(project.weekEndISO)
    const startPct = Math.max(0, Math.min(1, differenceInCalendarDays(start, yearStart) / yearDays))
    const endPct = Math.max(
      startPct + 0.01,
      Math.min(1, (differenceInCalendarDays(end, yearStart) + 1) / yearDays)
    )
    return { startPct, endPct }
  }

  // Milestone dayIndex is relative to project start date
  function milestonePct(project: Project, milestone: ProjectMilestone) {
    const start = parseISO(project.weekStartISO)
    const milestoneDate = addDays(start, milestone.dayIndex)
    return Math.max(0, Math.min(1, differenceInCalendarDays(milestoneDate, yearStart) / yearDays))
  }

  const visibleProjects = projects.filter((p) => !p.deleted)

  if (visibleProjects.length === 0) {
    return (
      <div className="rounded-md border border-border py-8 text-center text-sm text-muted-foreground">
        No active projects to display on the timeline.
      </div>
    )
  }

  return (
    <div className="rounded-md border border-border p-4">
      {/* Month axis — aligned with the track area via the same flex layout as rows */}
      <div className="mb-2 flex items-center gap-3">
        <div className="w-36 shrink-0" />
        <div className="relative flex-1 h-4">
          {months.map((m) => (
            <span
              key={m.label}
              className="absolute -translate-x-1/2 select-none text-[10px] text-muted-foreground"
              style={{ left: `${m.pct * 100}%` }}
            >
              {m.label}
            </span>
          ))}
        </div>
      </div>

      {/* Project rows */}
      <div className="flex flex-col gap-2">
        {visibleProjects.map((project) => {
          const color = normalizeColor(project.color)
          const { startPct, endPct } = barPct(project)

          return (
            <div key={project.id} className="flex items-center gap-3">
              {/* §6 — text-xs label */}
              <p className="w-36 shrink-0 truncate text-xs font-medium">{project.title}</p>

              {/* Track */}
              <div className="relative flex-1 h-7 rounded-sm bg-secondary/30">
                {/* Today line */}
                <div
                  className="pointer-events-none absolute inset-y-0 z-10 w-px bg-primary/60"
                  style={{ left: `${todayPct * 100}%` }}
                />

                {/* Project span bar */}
                <div
                  className="absolute inset-y-1 rounded-sm"
                  style={{
                    left: `${startPct * 100}%`,
                    width: `${(endPct - startPct) * 100}%`,
                    backgroundColor: `${color}28`,
                    borderLeft: `3px solid ${color}99`,
                  }}
                />

                {/* Milestone dots — completed=green, open=muted */}
                {project.milestones.map((m) => {
                  const pct = milestonePct(project, m)
                  return (
                    <div
                      key={m.id}
                      title={m.title}
                      className={cn(
                        "absolute top-1/2 z-20 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background",
                        m.completed ? "bg-emerald-500" : "bg-muted-foreground/60"
                      )}
                      style={{ left: `${pct * 100}%` }}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Milestone done
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-muted-foreground/60" /> Milestone open
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-px bg-primary/60" /> Today
        </span>
      </div>
    </div>
  )
}
