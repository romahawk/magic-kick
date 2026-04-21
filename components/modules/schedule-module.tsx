"use client"

import { useState } from "react"
import { useAppStore } from "@/lib/store"
import {
  calculateTimeBlockHours,
  getActiveWeeklyPlan,
  getCurrentWeekStartISO,
  getWeekDates,
  selectProjectHours,
  selectTimeBlocksForDay,
} from "@/lib/weekly-plan"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarDays, CheckCircle2, Clock3, Plus } from "lucide-react"

export function ScheduleModule() {
  const projects = useAppStore((s) => s.projects).filter((project) => !project.deleted)
  const weeklyPlans = useAppStore((s) => s.weeklyPlans)
  const timeBlocks = useAppStore((s) => s.timeBlocks)
  const executionLogs = useAppStore((s) => s.executionLogs)
  const saveTimeBlock = useAppStore((s) => s.saveTimeBlock)
  const updateTimeBlock = useAppStore((s) => s.updateTimeBlock)
  const setActiveModule = useAppStore((s) => s.setActiveModule)

  const weekStartISO = getCurrentWeekStartISO()
  const activePlan = getActiveWeeklyPlan(weeklyPlans, weekStartISO)
  const weekDays = getWeekDates(weekStartISO)
  const [selectedDay, setSelectedDay] = useState(weekDays[0]?.iso ?? weekStartISO)
  const [projectId, setProjectId] = useState("")
  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("10:30")
  const [taskDescription, setTaskDescription] = useState("")
  const [error, setError] = useState<string | null>(null)

  const projectHours = selectProjectHours(activePlan, timeBlocks, executionLogs)
  const allowedProjects = activePlan
    ? activePlan.allocations
        .map((allocation) => projects.find((project) => project.id === allocation.projectId))
        .filter((project): project is NonNullable<typeof project> => Boolean(project))
    : []
  const dayBlocks = selectTimeBlocksForDay(timeBlocks, selectedDay, activePlan?.id)

  function handleAddTimeBlock() {
    if (!activePlan) {
      setError("Create a weekly plan before scheduling time blocks.")
      return
    }
    if (!projectId) {
      setError("Choose an allocated project.")
      return
    }
    if (!taskDescription.trim()) {
      setError("Add a task description for the block.")
      return
    }

    const durationHours = calculateTimeBlockHours(startTime, endTime)
    const metric = projectHours.find((item) => item.projectId === projectId)
    if (!metric) {
      setError("This project is not allocated in the active weekly plan.")
      return
    }
    if (metric.plannedHours + durationHours > metric.allocatedHours) {
      setError("This block would exceed the project's weekly allocation.")
      return
    }

    saveTimeBlock({
      weekPlanId: activePlan.id,
      projectId,
      dateISO: selectedDay,
      startTime,
      endTime,
      taskDescription: taskDescription.trim(),
      actualHours: undefined,
      status: "planned",
      deleted: false,
    })
    setTaskDescription("")
    setError(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight">Schedule</h1>
          <p className="text-sm text-muted-foreground">
            Turn weekly allocation into concrete blocks. Blocks can only be created against projects that already have time.
          </p>
        </div>
        <Button variant="outline" onClick={() => setActiveModule("weekly-plan")}>
          {activePlan ? "Edit weekly plan" : "Create weekly plan"}
        </Button>
      </div>

      {!activePlan ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <CalendarDays className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-medium">No active weekly plan</p>
              <p className="text-sm text-muted-foreground">Allocate the week first, then shape daily execution blocks.</p>
            </div>
            <Button onClick={() => setActiveModule("weekly-plan")}>Set weekly plan</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock3 className="h-4 w-4" />
                Add Time Block
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 lg:grid-cols-[1.3fr_1fr_120px_120px_auto]">
                <div className="space-y-2">
                  <Label>Project</Label>
                  <Select value={projectId || "none"} onValueChange={(value) => setProjectId(value === "none" ? "" : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select allocated project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select allocated project</SelectItem>
                      {allowedProjects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Day</Label>
                  <Select value={selectedDay} onValueChange={setSelectedDay}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {weekDays.map((day) => (
                        <SelectItem key={day.iso} value={day.iso}>
                          {day.label} {day.dayNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Start</Label>
                  <Input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>End</Label>
                  <Input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleAddTimeBlock}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add block
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="block-description">Block description</Label>
                <Input
                  id="block-description"
                  value={taskDescription}
                  onChange={(event) => setTaskDescription(event.target.value)}
                  placeholder="What exactly gets done in this block?"
                />
              </div>

              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">This Day&apos;s Blocks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {dayBlocks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No blocks scheduled for this day yet.</p>
                ) : (
                  dayBlocks.map((block) => {
                    const project = projects.find((item) => item.id === block.projectId)
                    return (
                      <div key={block.id} className="space-y-3 rounded-xl border border-border/70 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium">{block.taskDescription}</p>
                            <p className="text-xs text-muted-foreground">
                              {project?.title ?? "Unknown project"} · {block.startTime} - {block.endTime}
                            </p>
                          </div>
                          <Badge variant={block.status === "done" ? "default" : "outline"}>{block.status}</Badge>
                        </div>

                        <div className="grid gap-3 md:grid-cols-[140px_140px_auto]">
                          <div className="space-y-2">
                            <Label>Actual hours</Label>
                            <Input
                              type="number"
                              min={0}
                              step={0.25}
                              value={block.actualHours ?? block.plannedHours}
                              onChange={(event) => updateTimeBlock(block.id, { actualHours: Number(event.target.value) || 0 })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={block.status} onValueChange={(value) => updateTimeBlock(block.id, { status: value as "planned" | "done" | "missed" })}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="planned">Planned</SelectItem>
                                <SelectItem value="done">Done</SelectItem>
                                <SelectItem value="missed">Missed</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-end">
                            <Button
                              variant="outline"
                              onClick={() =>
                                updateTimeBlock(block.id, {
                                  status: "done",
                                  actualHours: block.actualHours ?? block.plannedHours,
                                })
                              }
                            >
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Mark done
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Project Hour Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {projectHours.map((item) => {
                  const project = projects.find((projectEntry) => projectEntry.id === item.projectId)
                  return (
                    <div key={item.projectId} className="rounded-xl border border-border/70 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium">{project?.title ?? "Unknown project"}</p>
                        <Badge variant="outline">{item.priority}</Badge>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        <HourMetric label="Allocated" value={`${item.allocatedHours}h`} />
                        <HourMetric label="Planned" value={`${item.plannedHours}h`} />
                        <HourMetric label="Actual" value={`${item.actualHours}h`} />
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

function HourMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/40 p-3">
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-base font-semibold">{value}</p>
    </div>
  )
}
