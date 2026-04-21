"use client"

import { useAppStore } from "@/lib/store"
import {
  getActiveWeeklyPlan,
  getCurrentWeekStartISO,
  getWeekDates,
  selectProjectHours,
  selectTimeBlocksForDay,
  validateWeeklyPlan,
} from "@/lib/weekly-plan"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Clock3, FolderKanban, Gauge, Target } from "lucide-react"

export function CommandCenter() {
  const profile = useAppStore((s) => s.profile)
  const projects = useAppStore((s) => s.projects).filter((project) => !project.deleted)
  const weeklyPlans = useAppStore((s) => s.weeklyPlans)
  const timeBlocks = useAppStore((s) => s.timeBlocks)
  const executionLogs = useAppStore((s) => s.executionLogs)
  const setActiveModule = useAppStore((s) => s.setActiveModule)

  const weekStartISO = getCurrentWeekStartISO()
  const activePlan = getActiveWeeklyPlan(weeklyPlans, weekStartISO)
  const validation = activePlan ? validateWeeklyPlan(activePlan, projects) : null
  const todayISO = new Date().toISOString().slice(0, 10)
  const todayBlocks = selectTimeBlocksForDay(timeBlocks, todayISO, activePlan?.id)
  const projectHours = selectProjectHours(activePlan, timeBlocks, executionLogs)
  const weekDays = getWeekDates(weekStartISO)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight">Command Center</h1>
          <p className="text-sm text-muted-foreground">
            {activePlan
              ? `Execute the week you committed to, ${profile.name}.`
              : "Create a weekly plan before the week decides itself for you."}
          </p>
        </div>
        <Button onClick={() => setActiveModule("weekly-plan")}>{activePlan ? "Open weekly plan" : "Create weekly plan"}</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Capacity" value={activePlan ? `${activePlan.totalCapacityHours}h` : "0h"} />
        <MetricCard label="Allocated" value={activePlan ? `${validation?.allocatedHours ?? 0}h` : "0h"} />
        <MetricCard label="Today blocks" value={String(todayBlocks.length)} />
        <MetricCard label="Active projects" value={String(activePlan?.allocations.length ?? 0)} />
      </div>

      {!activePlan ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <Target className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-medium">No weekly plan yet</p>
              <p className="text-sm text-muted-foreground">Set capacity, choose up to three projects, and assign hours before scheduling blocks.</p>
            </div>
            <Button onClick={() => setActiveModule("weekly-plan")}>Set weekly plan</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FolderKanban className="h-4 w-4" />
                  Weekly Allocation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {projectHours.map((item) => {
                  const project = projects.find((projectEntry) => projectEntry.id === item.projectId)
                  const actualProgress = item.allocatedHours > 0 ? Math.min(100, (item.actualHours / item.allocatedHours) * 100) : 0
                  return (
                    <div key={item.projectId} className="rounded-xl border border-border/70 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{project?.title ?? "Unknown project"}</p>
                          <p className="text-xs text-muted-foreground">{item.weeklyOutcome}</p>
                        </div>
                        <Badge variant="outline">{item.priority}</Badge>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        <MiniMetric label="Allocated" value={`${item.allocatedHours}h`} />
                        <MiniMetric label="Planned" value={`${item.plannedHours}h`} />
                        <MiniMetric label="Actual" value={`${item.actualHours}h`} />
                      </div>
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Delivered against allocation</span>
                          <span>{Math.round(actualProgress)}%</span>
                        </div>
                        <Progress value={actualProgress} className="h-2" />
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            <div className="flex flex-col gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Clock3 className="h-4 w-4" />
                    Today&apos;s Blocks
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {todayBlocks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No time blocks yet for today. Add them from Schedule.</p>
                  ) : (
                    todayBlocks.map((block) => {
                      const project = projects.find((projectEntry) => projectEntry.id === block.projectId)
                      return (
                        <div key={block.id} className="rounded-xl border border-border/70 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium">{block.taskDescription}</p>
                              <p className="text-xs text-muted-foreground">
                                {project?.title ?? "Unknown project"} · {block.startTime} - {block.endTime}
                              </p>
                            </div>
                            <Badge variant={block.status === "done" ? "default" : "outline"}>{block.status}</Badge>
                          </div>
                        </div>
                      )
                    })
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Gauge className="h-4 w-4" />
                    Week Health
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-xl border border-border/70 bg-background/40 p-3">
                    <p className="text-xs text-muted-foreground">Remaining capacity</p>
                    <p className="mt-1 text-xl font-semibold">{validation?.remainingHours ?? 0}h</p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background/40 p-3">
                    <p className="text-xs text-muted-foreground">Plan status</p>
                    <p className="mt-1 text-sm font-medium">{validation?.isValid ? "Constrained and executable" : "Blocked by constraints"}</p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background/40 p-3">
                    <p className="text-xs text-muted-foreground">This week</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {weekDays.map((day) => (
                        <Badge key={day.iso} variant={day.iso === todayISO ? "default" : "secondary"}>
                          {day.label} {day.dayNumber}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  )
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/40 p-3">
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-base font-semibold">{value}</p>
    </div>
  )
}
