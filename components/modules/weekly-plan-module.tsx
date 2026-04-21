"use client"

import { useMemo, useState } from "react"
import { format } from "date-fns"
import { useAppStore } from "@/lib/store"
import {
  DEFAULT_WEEKLY_CAPACITY_HOURS,
  MAX_WEEKLY_PLAN_PROJECTS,
  emptyAllocation,
  getActiveWeeklyPlan,
  getCurrentWeekStartISO,
  getWeeklyReviewForPlan,
  selectProjectHours,
  validateWeeklyPlan,
} from "@/lib/weekly-plan"
import type { ProjectPriority, WeeklyAllocation } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { AlertTriangle, CheckCircle2, Clock3, Layers3, Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

const PRIORITY_OPTIONS: ProjectPriority[] = ["P1", "P2", "P3"]

export function WeeklyPlanModule() {
  const allProjects = useAppStore((s) => s.projects)
  const weeklyPlans = useAppStore((s) => s.weeklyPlans)
  const timeBlocks = useAppStore((s) => s.timeBlocks)
  const executionLogs = useAppStore((s) => s.executionLogs)
  const weeklyReviews = useAppStore((s) => s.weeklyReviews)
  const saveWeeklyPlan = useAppStore((s) => s.saveWeeklyPlan)
  const saveWeeklyReview = useAppStore((s) => s.saveWeeklyReview)

  const projects = allProjects.filter((project) => !project.deleted && (project.status ?? "active") === "active")
  const weekStartISO = getCurrentWeekStartISO()
  const activePlan = getActiveWeeklyPlan(weeklyPlans, weekStartISO)
  const existingReview = getWeeklyReviewForPlan(weeklyReviews, activePlan?.id)

  const [draftCapacity, setDraftCapacity] = useState(String(activePlan?.totalCapacityHours ?? DEFAULT_WEEKLY_CAPACITY_HOURS))
  const [draftAllocations, setDraftAllocations] = useState<WeeklyAllocation[]>(
    activePlan?.allocations.length ? activePlan.allocations : [emptyAllocation("P1")]
  )
  const [nextWeekCapacity, setNextWeekCapacity] = useState(String(existingReview?.nextWeekCapacityHours ?? ""))
  const [reviewState, setReviewState] = useState<Record<string, { achieved: boolean; decision: "continue" | "adjust" | "remove"; notes: string }>>(
    () =>
      Object.fromEntries(
        (existingReview?.summary ?? []).map((item) => [
          item.projectId,
          {
            achieved: item.outcomeAchieved,
            decision: item.decision,
            notes: item.notes ?? "",
          },
        ])
      )
  )

  const planDraft = useMemo(
    () => ({
      id: activePlan?.id ?? weekStartISO,
      weekStartISO,
      totalCapacityHours: Math.max(1, Number(draftCapacity) || 0),
      allocations: draftAllocations,
      status: existingReview?.completed ? "reviewed" as const : "active" as const,
      deleted: false,
    }),
    [activePlan?.id, draftAllocations, draftCapacity, existingReview?.completed, weekStartISO]
  )

  const validation = useMemo(() => validateWeeklyPlan(planDraft, projects), [planDraft, projects])
  const projectHours = useMemo(
    () => selectProjectHours(activePlan ?? planDraft, timeBlocks, executionLogs),
    [activePlan, executionLogs, planDraft, timeBlocks]
  )

  const projectOptions = projects.filter((project) => !draftAllocations.some((allocation) => allocation.projectId === project.id))

  function updateAllocation(index: number, updates: Partial<WeeklyAllocation>) {
    setDraftAllocations((current) =>
      current.map((allocation, allocationIndex) =>
        allocationIndex === index ? { ...allocation, ...updates } : allocation
      )
    )
  }

  function addAllocation() {
    if (draftAllocations.length >= MAX_WEEKLY_PLAN_PROJECTS) return
    setDraftAllocations((current) => [...current, emptyAllocation("P2")])
  }

  function removeAllocation(index: number) {
    setDraftAllocations((current) => current.filter((_, allocationIndex) => allocationIndex !== index))
  }

  function handleSavePlan() {
    if (!validation.isValid) return
    saveWeeklyPlan({
      id: activePlan?.id ?? weekStartISO,
      weekStartISO,
      totalCapacityHours: Number(draftCapacity) || DEFAULT_WEEKLY_CAPACITY_HOURS,
      allocations: draftAllocations,
      status: existingReview?.completed ? "reviewed" : "active",
      reviewedAt: activePlan?.reviewedAt,
      deleted: false,
    })
  }

  function updateReview(projectId: string, updates: Partial<{ achieved: boolean; decision: "continue" | "adjust" | "remove"; notes: string }>) {
    setReviewState((current) => ({
      ...current,
      [projectId]: {
        achieved: current[projectId]?.achieved ?? false,
        decision: current[projectId]?.decision ?? "continue",
        notes: current[projectId]?.notes ?? "",
        ...updates,
      },
    }))
  }

  function handleSaveReview() {
    if (!activePlan) return
    saveWeeklyReview({
      id: weekStartISO,
      weekPlanId: activePlan.id,
      weekStartISO,
      summary: activePlan.allocations.map((allocation) => {
        const projectMetric = projectHours.find((item) => item.projectId === allocation.projectId)
        const reviewEntry = reviewState[allocation.projectId]
        return {
          projectId: allocation.projectId,
          outcomePlanned: allocation.weeklyOutcome,
          outcomeAchieved: reviewEntry?.achieved ?? false,
          plannedHours: projectMetric?.plannedHours ?? 0,
          actualHours: projectMetric?.actualHours ?? 0,
          decision: reviewEntry?.decision ?? "continue",
          notes: reviewEntry?.notes?.trim() || undefined,
        }
      }),
      nextWeekCapacityHours: nextWeekCapacity ? Number(nextWeekCapacity) : undefined,
      completed: true,
      deleted: false,
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight">Weekly Plan</h1>
          <p className="text-sm text-muted-foreground">
            Set weekly capacity, allocate hours across at most three active projects, and close the week with decisions.
          </p>
        </div>
        <Badge variant="outline">{format(new Date(weekStartISO), "MMM d")} week</Badge>
      </div>

      <Tabs defaultValue="plan" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="plan">Plan</TabsTrigger>
          <TabsTrigger value="review">Review</TabsTrigger>
        </TabsList>

        <TabsContent value="plan" className="mt-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Capacity</p>
                <p className="mt-1 text-2xl font-semibold">{planDraft.totalCapacityHours}h</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Allocated</p>
                <p className="mt-1 text-2xl font-semibold">{validation.allocatedHours}h</p>
              </CardContent>
            </Card>
            <Card className={cn(validation.isOverCapacity && "border-amber-500/40 bg-amber-500/10")}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Remaining</p>
                <p className="mt-1 text-2xl font-semibold">{validation.remainingHours}h</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Layers3 className="h-4 w-4" />
                Capacity Guardrails
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-xs space-y-2">
                <Label htmlFor="weekly-capacity">Weekly capacity hours</Label>
                <Input
                  id="weekly-capacity"
                  type="number"
                  min={1}
                  max={80}
                  value={draftCapacity}
                  onChange={(event) => setDraftCapacity(event.target.value)}
                />
              </div>

              <div className="space-y-3">
                {draftAllocations.map((allocation, index) => (
                  <div key={`${allocation.projectId || "empty"}-${index}`} className="grid gap-3 rounded-xl border border-border/70 p-4 lg:grid-cols-[1.8fr_0.8fr_0.8fr_2fr_auto]">
                    <div className="space-y-2">
                      <Label>Project</Label>
                      <Select
                        value={allocation.projectId || "none"}
                        onValueChange={(value) => updateAllocation(index, { projectId: value === "none" ? "" : value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Select project</SelectItem>
                          {[allocation.projectId ? projects.find((project) => project.id === allocation.projectId) : undefined, ...projectOptions]
                            .filter((project, projectIndex, list): project is NonNullable<typeof project> =>
                              Boolean(project) && list.findIndex((item) => item?.id === project.id) === projectIndex
                            )
                            .map((project) => (
                              <SelectItem key={project.id} value={project.id}>
                                {project.title}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select value={allocation.priority} onValueChange={(value) => updateAllocation(index, { priority: value as ProjectPriority })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PRIORITY_OPTIONS.map((priority) => (
                            <SelectItem key={priority} value={priority}>
                              {priority}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Hours</Label>
                      <Input
                        type="number"
                        min={1}
                        max={40}
                        value={allocation.hoursAllocated || ""}
                        onChange={(event) => updateAllocation(index, { hoursAllocated: Number(event.target.value) || 0 })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Weekly outcome</Label>
                      <Input
                        value={allocation.weeklyOutcome}
                        onChange={(event) => updateAllocation(index, { weeklyOutcome: event.target.value })}
                        placeholder="One concrete result for this week"
                      />
                    </div>

                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAllocation(index)}
                        aria-label={`Remove allocation ${index + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" variant="outline" onClick={addAllocation} disabled={draftAllocations.length >= MAX_WEEKLY_PLAN_PROJECTS}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add project
                </Button>
                <Button type="button" onClick={handleSavePlan} disabled={!validation.isValid}>
                  Save weekly plan
                </Button>
              </div>

              {validation.errors.length > 0 ? (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-100">
                    <AlertTriangle className="h-4 w-4" />
                    Plan is blocked until these constraints are fixed
                  </div>
                  <div className="space-y-1 text-sm text-amber-50">
                    {Array.from(new Set(validation.errors)).map((error) => (
                      <p key={error}>{error}</p>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock3 className="h-4 w-4" />
                Planned vs Actual
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {projectHours.length === 0 ? (
                <p className="text-sm text-muted-foreground">Save a weekly plan to start shaping execution blocks against it.</p>
              ) : (
                projectHours.map((item) => {
                  const project = projects.find((projectEntry) => projectEntry.id === item.projectId)
                  return (
                    <div key={item.projectId} className="rounded-xl border border-border/70 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{project?.title ?? "Unknown project"}</p>
                          <p className="text-xs text-muted-foreground">{item.weeklyOutcome}</p>
                        </div>
                        <Badge variant="outline">{item.priority}</Badge>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        <Metric label="Allocated" value={`${item.allocatedHours}h`} />
                        <Metric label="Planned" value={`${item.plannedHours}h`} />
                        <Metric label="Actual" value={`${item.actualHours}h`} />
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="review" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle2 className="h-4 w-4" />
                Weekly Review
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!activePlan || activePlan.allocations.length === 0 ? (
                <p className="text-sm text-muted-foreground">Create and save a weekly plan before running the review loop.</p>
              ) : (
                <>
                  {activePlan.allocations.map((allocation) => {
                    const project = projects.find((item) => item.id === allocation.projectId)
                    const metric = projectHours.find((item) => item.projectId === allocation.projectId)
                    const currentReview = reviewState[allocation.projectId]
                    return (
                      <div key={allocation.projectId} className="space-y-3 rounded-xl border border-border/70 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium">{project?.title ?? "Unknown project"}</p>
                            <p className="text-xs text-muted-foreground">{allocation.weeklyOutcome}</p>
                          </div>
                          <Badge variant="outline">{allocation.priority}</Badge>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <Metric label="Allocated" value={`${allocation.hoursAllocated}h`} compact />
                          <Metric label="Planned" value={`${metric?.plannedHours ?? 0}h`} compact />
                          <Metric label="Actual" value={`${metric?.actualHours ?? 0}h`} compact />
                          <div className="space-y-2">
                            <Label>Outcome achieved</Label>
                            <Select
                              value={String(currentReview?.achieved ?? false)}
                              onValueChange={(value) => updateReview(allocation.projectId, { achieved: value === "true" })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="true">Yes</SelectItem>
                                <SelectItem value="false">No</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-[220px_1fr]">
                          <div className="space-y-2">
                            <Label>Decision</Label>
                            <Select
                              value={currentReview?.decision ?? "continue"}
                              onValueChange={(value) => updateReview(allocation.projectId, { decision: value as "continue" | "adjust" | "remove" })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="continue">Continue</SelectItem>
                                <SelectItem value="adjust">Adjust allocation</SelectItem>
                                <SelectItem value="remove">Remove</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Notes</Label>
                            <Textarea
                              value={currentReview?.notes ?? ""}
                              onChange={(event) => updateReview(allocation.projectId, { notes: event.target.value })}
                              placeholder="What should change next week?"
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  <div className="max-w-xs space-y-2">
                    <Label htmlFor="next-week-capacity">Suggested next week capacity</Label>
                    <Input
                      id="next-week-capacity"
                      type="number"
                      value={nextWeekCapacity}
                      onChange={(event) => setNextWeekCapacity(event.target.value)}
                      placeholder="Optional"
                    />
                  </div>

                  <Button type="button" onClick={handleSaveReview}>
                    Save weekly review
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Metric({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className={cn("rounded-xl border border-border/70 bg-background/40 p-3", compact && "p-2.5")}>
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  )
}
