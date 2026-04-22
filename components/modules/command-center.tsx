"use client"

import { useState } from "react"
import { format } from "date-fns"
import { useAppStore } from "@/lib/store"
import {
  DEFAULT_WEEKLY_CAPACITY_HOURS,
  MAX_WEEKLY_PLAN_PROJECTS,
  emptyAllocation,
  getActiveWeeklyPlan,
  getCurrentWeekStartISO,
  getWeekDates,
  getWeeklyReviewForPlan,
  selectProjectHours,
  selectTimeBlocksForDay,
  validateWeeklyPlan,
} from "@/lib/weekly-plan"
import type { ProjectPriority, WeeklyAllocation } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FolderKanban,
  Gauge,
  Layers3,
  Plus,
  Target,
  Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"

const PRIORITY_OPTIONS: ProjectPriority[] = ["P1", "P2", "P3"]

export function CommandCenter() {
  const profile = useAppStore((s) => s.profile)
  const allProjects = useAppStore((s) => s.projects)
  const weeklyPlans = useAppStore((s) => s.weeklyPlans)
  const timeBlocks = useAppStore((s) => s.timeBlocks)
  const executionLogs = useAppStore((s) => s.executionLogs)
  const weeklyReviews = useAppStore((s) => s.weeklyReviews)
  const saveWeeklyPlan = useAppStore((s) => s.saveWeeklyPlan)
  const saveWeeklyReview = useAppStore((s) => s.saveWeeklyReview)
  const setActiveModule = useAppStore((s) => s.setActiveModule)

  const projects = allProjects.filter((p) => !p.deleted)
  const activeProjects = projects.filter((p) => (p.status ?? "active") === "active")

  const weekStartISO = getCurrentWeekStartISO()
  const activePlan = getActiveWeeklyPlan(weeklyPlans, weekStartISO)
  const existingReview = getWeeklyReviewForPlan(weeklyReviews, activePlan?.id)
  const weekDays = getWeekDates(weekStartISO)
  const todayISO = new Date().toISOString().slice(0, 10)
  const todayBlocks = selectTimeBlocksForDay(timeBlocks, todayISO, activePlan?.id)
  const projectHours = selectProjectHours(activePlan, timeBlocks, executionLogs)

  // ── Plan tab draft state ─────────────────────────────────────────────────
  const [draftCapacity, setDraftCapacity] = useState(
    String(activePlan?.totalCapacityHours ?? DEFAULT_WEEKLY_CAPACITY_HOURS)
  )
  const [draftAllocations, setDraftAllocations] = useState<WeeklyAllocation[]>(
    activePlan?.allocations.length ? activePlan.allocations : [emptyAllocation("P1")]
  )

  const planDraft = {
    id: activePlan?.id ?? weekStartISO,
    weekStartISO,
    totalCapacityHours: Math.max(1, Number(draftCapacity) || 0),
    allocations: draftAllocations,
    status: existingReview?.completed ? ("reviewed" as const) : ("active" as const),
    deleted: false,
  }

  const validation = validateWeeklyPlan(planDraft, activeProjects)
  const projectOptions = activeProjects.filter((p) => !draftAllocations.some((a) => a.projectId === p.id))

  function updateAllocation(index: number, updates: Partial<WeeklyAllocation>) {
    setDraftAllocations((cur) => cur.map((a, i) => (i === index ? { ...a, ...updates } : a)))
  }
  function addAllocation() {
    if (draftAllocations.length >= MAX_WEEKLY_PLAN_PROJECTS) return
    setDraftAllocations((cur) => [...cur, emptyAllocation("P2")])
  }
  function removeAllocation(index: number) {
    setDraftAllocations((cur) => cur.filter((_, i) => i !== index))
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

  // ── Review tab state ─────────────────────────────────────────────────────
  const [nextWeekCapacity, setNextWeekCapacity] = useState(
    String(existingReview?.nextWeekCapacityHours ?? "")
  )
  const [reviewState, setReviewState] = useState<
    Record<string, { achieved: boolean; decision: "continue" | "adjust" | "remove"; notes: string }>
  >(() =>
    Object.fromEntries(
      (existingReview?.summary ?? []).map((item) => [
        item.projectId,
        { achieved: item.outcomeAchieved, decision: item.decision, notes: item.notes ?? "" },
      ])
    )
  )
  function updateReview(
    projectId: string,
    updates: Partial<{ achieved: boolean; decision: "continue" | "adjust" | "remove"; notes: string }>
  ) {
    setReviewState((cur) => ({
      ...cur,
      [projectId]: {
        achieved: cur[projectId]?.achieved ?? false,
        decision: cur[projectId]?.decision ?? "continue",
        notes: cur[projectId]?.notes ?? "",
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
      summary: activePlan.allocations.map((a) => {
        const metric = projectHours.find((m) => m.projectId === a.projectId)
        const entry = reviewState[a.projectId]
        return {
          projectId: a.projectId,
          outcomePlanned: a.weeklyOutcome,
          outcomeAchieved: entry?.achieved ?? false,
          plannedHours: metric?.plannedHours ?? 0,
          actualHours: metric?.actualHours ?? 0,
          decision: entry?.decision ?? "continue",
          notes: entry?.notes?.trim() || undefined,
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
          <h1 className="font-serif text-2xl font-bold tracking-tight">Command Center</h1>
          <p className="text-sm text-muted-foreground">
            {activePlan
              ? `Execute the week you committed to, ${profile.name}.`
              : "Set your weekly plan before the week decides itself for you."}
          </p>
        </div>
        <Badge variant="outline">{format(new Date(weekStartISO), "MMM d")} week</Badge>
      </div>

      <Tabs defaultValue="week" className="w-full">
        <TabsList className="grid w-full max-w-sm grid-cols-3">
          <TabsTrigger value="week">Week</TabsTrigger>
          <TabsTrigger value="plan">Plan</TabsTrigger>
          <TabsTrigger value="review">Review</TabsTrigger>
        </TabsList>

        {/* ── Week tab: operational dashboard ── */}
        <TabsContent value="week" className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <MetricCard label="Capacity" value={activePlan ? `${activePlan.totalCapacityHours}h` : "—"} />
            <MetricCard label="Allocated" value={activePlan ? `${validation?.allocatedHours ?? 0}h` : "—"} />
            <MetricCard label="Today blocks" value={String(todayBlocks.length)} />
            <MetricCard label="Focused projects" value={String(activePlan?.allocations.length ?? 0)} />
          </div>

          {!activePlan ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                <Target className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">No weekly plan yet</p>
                  <p className="text-sm text-muted-foreground">
                    Set capacity, pick up to three projects, assign hours — then go execute.
                  </p>
                </div>
                <Button onClick={() => setActiveModule("command-center")}>Set weekly plan</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              {/* Weekly allocation with progress */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FolderKanban className="h-4 w-4" />
                    Weekly Allocation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {projectHours.map((item) => {
                    const project = projects.find((p) => p.id === item.projectId)
                    const deliveredPct =
                      item.allocatedHours > 0
                        ? Math.min(100, (item.actualHours / item.allocatedHours) * 100)
                        : 0
                    const plannedPct =
                      item.allocatedHours > 0
                        ? Math.min(100, (item.plannedHours / item.allocatedHours) * 100)
                        : 0
                    return (
                      <div key={item.projectId} className="rounded-xl border border-border/70 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium">{project?.title ?? "Unknown"}</p>
                            <p className="text-xs text-muted-foreground">{item.weeklyOutcome}</p>
                          </div>
                          <Badge variant="outline">{item.priority}</Badge>
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-3">
                          <MiniMetric label="Allocated" value={`${item.allocatedHours}h`} />
                          <MiniMetric label="Planned" value={`${item.plannedHours}h`} />
                          <MiniMetric label="Actual" value={`${item.actualHours}h`} />
                        </div>
                        <div className="mt-3 space-y-1.5">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Planned</span>
                            <span>{Math.round(plannedPct)}%</span>
                          </div>
                          <Progress value={plannedPct} className="h-1.5" />
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Delivered</span>
                            <span>{Math.round(deliveredPct)}%</span>
                          </div>
                          <Progress value={deliveredPct} className="h-1.5" />
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>

              <div className="flex flex-col gap-6">
                {/* Today's blocks */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Clock3 className="h-4 w-4" />
                      Today&apos;s Blocks
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {todayBlocks.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No blocks yet. Open{" "}
                        <button
                          className="underline underline-offset-2 hover:text-foreground"
                          onClick={() => setActiveModule("schedule")}
                        >
                          Schedule
                        </button>{" "}
                        to add them.
                      </p>
                    ) : (
                      todayBlocks.map((block) => {
                        const project = projects.find((p) => p.id === block.projectId)
                        return (
                          <div key={block.id} className="rounded-xl border border-border/70 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium">{block.taskDescription}</p>
                                <p className="text-xs text-muted-foreground">
                                  {project?.title ?? "Unknown"} · {block.startTime}–{block.endTime}
                                </p>
                              </div>
                              <Badge variant={block.status === "done" ? "default" : "outline"}>
                                {block.status}
                              </Badge>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </CardContent>
                </Card>

                {/* Week health */}
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
                      <p className="mt-1 text-sm font-medium">
                        {validation?.isValid ? "Constrained and executable" : "Blocked by constraints"}
                      </p>
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
          )}
        </TabsContent>

        {/* ── Plan tab: capacity + allocation editing ── */}
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
                Capacity &amp; Allocation
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
                  onChange={(e) => setDraftCapacity(e.target.value)}
                />
              </div>

              <div className="space-y-3">
                {draftAllocations.map((allocation, index) => (
                  <div
                    key={`${allocation.projectId || "empty"}-${index}`}
                    className="grid gap-3 rounded-xl border border-border/70 p-4 lg:grid-cols-[1.8fr_0.8fr_0.8fr_2fr_auto]"
                  >
                    <div className="space-y-2">
                      <Label>Project</Label>
                      <Select
                        value={allocation.projectId || "none"}
                        onValueChange={(v) => updateAllocation(index, { projectId: v === "none" ? "" : v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Select project</SelectItem>
                          {[
                            allocation.projectId
                              ? activeProjects.find((p) => p.id === allocation.projectId)
                              : undefined,
                            ...projectOptions,
                          ]
                            .filter(
                              (p, i, list): p is NonNullable<typeof p> =>
                                Boolean(p) && list.findIndex((x) => x?.id === p?.id) === i
                            )
                            .map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.title}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select
                        value={allocation.priority}
                        onValueChange={(v) => updateAllocation(index, { priority: v as ProjectPriority })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PRIORITY_OPTIONS.map((p) => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
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
                        onChange={(e) => updateAllocation(index, { hoursAllocated: Number(e.target.value) || 0 })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Weekly outcome</Label>
                      <Input
                        value={allocation.weeklyOutcome}
                        onChange={(e) => updateAllocation(index, { weeklyOutcome: e.target.value })}
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={addAllocation}
                  disabled={draftAllocations.length >= MAX_WEEKLY_PLAN_PROJECTS}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add project
                </Button>
                <Button type="button" onClick={handleSavePlan} disabled={!validation.isValid}>
                  Save weekly plan
                </Button>
              </div>

              {validation.errors.length > 0 && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-100">
                    <AlertTriangle className="h-4 w-4" />
                    Fix these before saving
                  </div>
                  <div className="space-y-1 text-sm text-amber-50">
                    {Array.from(new Set(validation.errors)).map((e) => (
                      <p key={e}>{e}</p>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Review tab ── */}
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
                <p className="text-sm text-muted-foreground">
                  Save a weekly plan first, then close the week here.
                </p>
              ) : (
                <>
                  {activePlan.allocations.map((allocation) => {
                    const project = projects.find((p) => p.id === allocation.projectId)
                    const metric = projectHours.find((m) => m.projectId === allocation.projectId)
                    const entry = reviewState[allocation.projectId]
                    return (
                      <div key={allocation.projectId} className="space-y-3 rounded-xl border border-border/70 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium">{project?.title ?? "Unknown"}</p>
                            <p className="text-xs text-muted-foreground">{allocation.weeklyOutcome}</p>
                          </div>
                          <Badge variant="outline">{allocation.priority}</Badge>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <ReviewMetric label="Allocated" value={`${allocation.hoursAllocated}h`} />
                          <ReviewMetric label="Planned" value={`${metric?.plannedHours ?? 0}h`} />
                          <ReviewMetric label="Actual" value={`${metric?.actualHours ?? 0}h`} />
                          <div className="space-y-2">
                            <Label>Outcome achieved</Label>
                            <Select
                              value={String(entry?.achieved ?? false)}
                              onValueChange={(v) =>
                                updateReview(allocation.projectId, { achieved: v === "true" })
                              }
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
                              value={entry?.decision ?? "continue"}
                              onValueChange={(v) =>
                                updateReview(allocation.projectId, {
                                  decision: v as "continue" | "adjust" | "remove",
                                })
                              }
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
                              value={entry?.notes ?? ""}
                              onChange={(e) => updateReview(allocation.projectId, { notes: e.target.value })}
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
                      onChange={(e) => setNextWeekCapacity(e.target.value)}
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

function ReviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/40 p-2.5">
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  )
}
