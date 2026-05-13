"use client"

import { useEffect, useState } from "react"
import type { Dispatch, SetStateAction } from "react"
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
import type { Project, ProjectPriority, WeeklyAllocation } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { AlertTriangle, CheckCircle2, Plus, Target, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { auth } from "@/lib/firebase/client"
import { isAiEnabled } from "@/lib/ai/flags"
import { detectAnomalies } from "@/lib/ai/insights"
import { InsightList } from "@/components/ai/InsightCard"
import { CoachingBanner, CoachingBannerSkeleton } from "@/components/ai/CoachingBanner"
import type { CoachingMessage, Insight } from "@/lib/types"

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
  const insights = useAppStore((s) => s.insights)
  const insightsLoading = useAppStore((s) => s.insightsLoading)
  const insightsFetchedWeek = useAppStore((s) => s.insightsFetchedWeek)
  const setInsights = useAppStore((s) => s.setInsights)
  const setInsightsLoading = useAppStore((s) => s.setInsightsLoading)
  const dismissInsight = useAppStore((s) => s.dismissInsight)
  const coaching = useAppStore((s) => s.coaching)
  const coachingLoading = useAppStore((s) => s.coachingLoading)
  const coachingDismissedDate = useAppStore((s) => s.coachingDismissedDate)
  const setCoaching = useAppStore((s) => s.setCoaching)
  const setCoachingLoading = useAppStore((s) => s.setCoachingLoading)
  const dismissCoaching = useAppStore((s) => s.dismissCoaching)

  const projects = allProjects.filter((p) => !p.deleted)
  const activeProjects = projects.filter((p) => (p.status ?? "active") === "active")

  const weekStartISO = getCurrentWeekStartISO()
  const activePlan = getActiveWeeklyPlan(weeklyPlans, weekStartISO)
  const existingReview = getWeeklyReviewForPlan(weeklyReviews, activePlan?.id)
  const weekDays = getWeekDates(weekStartISO)
  const todayISO = new Date().toISOString().slice(0, 10)
  const todayBlocks = selectTimeBlocksForDay(timeBlocks, todayISO, activePlan?.id)
  const projectHours = selectProjectHours(activePlan, timeBlocks, executionLogs)
  const activePlanValidation = activePlan
    ? validateWeeklyPlan(activePlan, activeProjects)
    : { isValid: false, errors: [], allocatedHours: 0, remainingHours: 0, isOverCapacity: false }

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
  const [planSaveModal, setPlanSaveModal] = useState<{
    open: boolean
    status: "success" | "error"
    title: string
    description: string
  }>({
    open: false,
    status: "success",
    title: "",
    description: "",
  })

  const todayDateISO = new Date().toISOString().slice(0, 10)
  const coachingDismissedToday = coachingDismissedDate === todayDateISO
  const coachingMessage = coachingDismissedToday ? null : coaching

  useEffect(() => {
    if (!isAiEnabled() || insightsFetchedWeek === weekStartISO) return
    const localInsights = detectAnomalies({ projects: allProjects, tasks: useAppStore.getState().tasks, config: profile.systemConfig })
    if (localInsights.length > 0) {
      setInsights(localInsights, weekStartISO)
      return
    }
    if (!activePlan) return
    setInsightsLoading(true)
    auth?.currentUser?.getIdToken().then((token) => {
      fetch("/api/ai/weekly-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ weeklyPlan: activePlan, executionLogs }),
      })
        .then((r) => r.json())
        .then((res) => {
          if (res.ok) {
            const remoteInsights: Insight[] = [
              { id: "ai-summary", type: "summary", title: "Weekly summary", body: res.data.summary, createdAt: Date.now() },
              ...res.data.warnings.map((w: string, i: number) => ({ id: `ai-warn-${i}`, type: "warning" as const, title: "Heads up", body: w, createdAt: Date.now() })),
              ...res.data.suggestions.map((s: string, i: number) => ({ id: `ai-sug-${i}`, type: "suggestion" as const, title: "Suggestion", body: s, createdAt: Date.now() })),
            ]
            setInsights(remoteInsights, weekStartISO)
          }
        })
        .catch(() => {})
        .finally(() => setInsightsLoading(false))
    }).catch(() => setInsightsLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStartISO, insightsFetchedWeek])

  useEffect(() => {
    if (!isAiEnabled() || coachingDismissedToday || coaching || coachingLoading) return
    const dow = new Date().getDay()
    if (dow === 0 || dow === 6) return
    setCoachingLoading(true)
    auth?.currentUser?.getIdToken().then((token) => {
      fetch("/api/ai/coaching", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tasks: useAppStore.getState().tasks }),
      })
        .then((r) => r.json())
        .then((res) => {
          if (res.ok) {
            const msg: CoachingMessage = { ...res.data, fetchedDateISO: todayDateISO }
            setCoaching(msg)
          }
        })
        .catch(() => {})
        .finally(() => setCoachingLoading(false))
    }).catch(() => setCoachingLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      summary: activePlan.allocations.map((allocation) => {
        const metric = projectHours.find((item) => item.projectId === allocation.projectId)
        const entry = reviewState[allocation.projectId]
        return {
          projectId: allocation.projectId,
          outcomePlanned: allocation.weeklyOutcome,
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
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight">Command Center</h1>
        <p className="text-sm text-muted-foreground">
          {activePlan
            ? `Execute the week you committed to, ${profile.name}.`
            : "Set your weekly plan before the week decides itself for you."}
        </p>
      </div>

      <Tabs defaultValue="week" className="w-full">
        <TabsList className="grid w-full max-w-sm grid-cols-3">
          <TabsTrigger value="week">Week</TabsTrigger>
          <TabsTrigger value="plan">Plan</TabsTrigger>
          <TabsTrigger value="review">Review</TabsTrigger>
        </TabsList>

        <TabsContent value="week" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-border/60 bg-card px-4 py-2.5 text-sm">
            <div className="flex flex-wrap gap-1.5">
              {weekDays.map((day) => (
                <Badge key={day.iso} variant={day.iso === todayISO ? "default" : "secondary"} className="text-[11px]">
                  {day.label} {day.dayNumber}
                </Badge>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-5">
              <StatusPill label="Capacity" value={activePlan ? `${activePlan.totalCapacityHours}h` : "—"} />
              <StatusPill
                label="Free"
                value={activePlan ? `${activePlanValidation.remainingHours}h` : "—"}
                highlight={activePlan ? (activePlanValidation.isOverCapacity ? "warn" : "ok") : undefined}
              />
              <StatusPill label="Today" value={`${todayBlocks.length} blocks`} />
            </div>
          </div>

          {coachingLoading && <CoachingBannerSkeleton />}
          {coachingMessage && <CoachingBanner message={coachingMessage} onDismiss={dismissCoaching} />}

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
            <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
              <div className="space-y-1.5">
                <p className="px-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Committed this week
                </p>
                {projectHours.map((item) => {
                  const project = projects.find((p) => p.id === item.projectId)
                  const deliveredPct =
                    item.allocatedHours > 0 ? Math.min(100, (item.actualHours / item.allocatedHours) * 100) : 0
                  return (
                    <div key={item.projectId} className="flex items-center gap-3 rounded-lg border border-border/60 bg-card px-3 py-2.5">
                      <PriorityDot priority={item.priority} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium leading-tight">{project?.title ?? "Unknown"}</p>
                        <p className="truncate text-xs text-muted-foreground">{item.weeklyOutcome}</p>
                      </div>
                      <div className="w-36 shrink-0">
                        <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>{item.actualHours}h / {item.allocatedHours}h</span>
                          <span>{Math.round(deliveredPct)}%</span>
                        </div>
                        <Progress value={deliveredPct} className="h-1" />
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="space-y-1.5">
                <p className="px-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Today — {format(new Date(`${todayISO}T12:00:00`), "EEE d")}
                </p>
                {todayBlocks.length === 0 ? (
                  <div className="flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">
                    No blocks yet. Open{" "}
                    <button className="underline underline-offset-2 hover:text-foreground" onClick={() => setActiveModule("schedule")}>
                      Schedule
                    </button>.
                  </div>
                ) : (
                  todayBlocks.map((block) => (
                    <div key={block.id} className="flex items-center gap-3 rounded-lg border border-border/60 bg-card px-3 py-2">
                      <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{block.startTime}–{block.endTime}</span>
                      <span className="flex-1 truncate text-sm">{block.taskDescription}</span>
                      <Badge variant={block.status === "done" ? "default" : "outline"} className="text-[10px]">{block.status}</Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <InsightList insights={insights} loading={insightsLoading} onDismiss={dismissInsight} />
        </TabsContent>

        <TabsContent value="plan" className="mt-4">
          <PlanTabContent
            key={`${activePlan?.id ?? weekStartISO}:${activePlan?.clientUpdatedAt ?? 0}`}
            activePlan={activePlan}
            activeProjects={activeProjects}
            existingReviewCompleted={existingReview?.completed}
            saveWeeklyPlan={saveWeeklyPlan}
            weekStartISO={weekStartISO}
            onPlanSaveResult={setPlanSaveModal}
          />
        </TabsContent>

        <TabsContent value="review" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle2 className="h-4 w-4" />Weekly Review
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!activePlan || activePlan.allocations.length === 0 ? (
                <p className="text-sm text-muted-foreground">Save a weekly plan first, then close the week here.</p>
              ) : (
                <>
                  {activePlan.allocations.map((allocation) => {
                    const project = projects.find((p) => p.id === allocation.projectId)
                    const metric = projectHours.find((item) => item.projectId === allocation.projectId)
                    const entry = reviewState[allocation.projectId]
                    return (
                      <div key={allocation.projectId} className="space-y-2 rounded-lg border border-border/70 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <PriorityDot priority={allocation.priority} />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{project?.title ?? "Unknown"}</p>
                              <p className="truncate text-xs text-muted-foreground">{allocation.weeklyOutcome}</p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                            <span>{allocation.hoursAllocated}h alloc</span>
                            <span>{metric?.plannedHours ?? 0}h planned</span>
                            <span className="font-medium text-foreground">{metric?.actualHours ?? 0}h done</span>
                          </div>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-[auto_1fr_2fr]">
                          <div className="space-y-1">
                            <Label className="text-xs">Achieved?</Label>
                            <Select value={String(entry?.achieved ?? false)} onValueChange={(value) => updateReview(allocation.projectId, { achieved: value === "true" })}>
                              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="true">Yes</SelectItem>
                                <SelectItem value="false">No</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Decision</Label>
                            <Select value={entry?.decision ?? "continue"} onValueChange={(value) => updateReview(allocation.projectId, { decision: value as "continue" | "adjust" | "remove" })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="continue">Continue</SelectItem>
                                <SelectItem value="adjust">Adjust</SelectItem>
                                <SelectItem value="remove">Remove</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Notes</Label>
                            <Textarea value={entry?.notes ?? ""} onChange={(e) => updateReview(allocation.projectId, { notes: e.target.value })} placeholder="What should change next week?" className="min-h-9 resize-none" rows={1} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div className="flex items-center gap-3">
                    <Label htmlFor="next-week-capacity" className="shrink-0 text-sm">Next week hours</Label>
                    <Input id="next-week-capacity" type="number" value={nextWeekCapacity} onChange={(e) => setNextWeekCapacity(e.target.value)} placeholder="Optional" className="w-24" />
                  </div>
                  <Button type="button" onClick={handleSaveReview}>Save review</Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={planSaveModal.open} onOpenChange={(open) => setPlanSaveModal((current) => ({ ...current, open }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {planSaveModal.status === "success" ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              )}
              {planSaveModal.title}
            </DialogTitle>
            <DialogDescription className="pt-1 text-sm leading-6">
              {planSaveModal.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" onClick={() => setPlanSaveModal((current) => ({ ...current, open: false }))}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PlanTabContent({
  activePlan,
  activeProjects,
  existingReviewCompleted,
  saveWeeklyPlan,
  weekStartISO,
  onPlanSaveResult,
}: {
  activePlan: ReturnType<typeof getActiveWeeklyPlan>
  activeProjects: Project[]
  existingReviewCompleted?: boolean
  saveWeeklyPlan: ReturnType<typeof useAppStore.getState>["saveWeeklyPlan"]
  weekStartISO: string
  onPlanSaveResult: Dispatch<
    SetStateAction<{
      open: boolean
      status: "success" | "error"
      title: string
      description: string
    }>
  >
}) {
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
    status: existingReviewCompleted ? ("reviewed" as const) : ("active" as const),
    deleted: false,
  }

  const validation = validateWeeklyPlan(planDraft, activeProjects)
  const projectOptions = activeProjects.filter((project) => !draftAllocations.some((allocation) => allocation.projectId === project.id))

  function updateAllocation(index: number, updates: Partial<WeeklyAllocation>) {
    setDraftAllocations((current) => current.map((allocation, allocationIndex) => (allocationIndex === index ? { ...allocation, ...updates } : allocation)))
  }

  function addAllocation() {
    if (draftAllocations.length >= MAX_WEEKLY_PLAN_PROJECTS) return
    setDraftAllocations((current) => [...current, emptyAllocation("P2")])
  }

  function removeAllocation(index: number) {
    setDraftAllocations((current) => current.filter((_, allocationIndex) => allocationIndex !== index))
  }

  function handleSavePlan() {
    if (!validation.isValid) {
      onPlanSaveResult({
        open: true,
        status: "error",
        title: "Plan not saved",
        description: Array.from(new Set(validation.errors)).join(" "),
      })
      return
    }

    try {
      saveWeeklyPlan({
        id: activePlan?.id ?? weekStartISO,
        weekStartISO,
        totalCapacityHours: Number(draftCapacity) || DEFAULT_WEEKLY_CAPACITY_HOURS,
        allocations: draftAllocations,
        status: existingReviewCompleted ? "reviewed" : "active",
        reviewedAt: activePlan?.reviewedAt,
        deleted: false,
      })

      onPlanSaveResult({
        open: true,
        status: "success",
        title: "Plan saved",
        description: `Your week for ${format(new Date(`${weekStartISO}T12:00:00`), "MMM d")} is locked in and ready to execute.`,
      })
    } catch (error) {
      onPlanSaveResult({
        open: true,
        status: "error",
        title: "Save failed",
        description: error instanceof Error ? error.message : "Something went wrong while saving your weekly plan.",
      })
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">Capacity &amp; Allocation</CardTitle>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">{planDraft.totalCapacityHours}h capacity</span>
              <span className="text-muted-foreground">{validation.allocatedHours}h allocated</span>
              <span className={cn("font-medium", validation.isOverCapacity ? "text-amber-400" : "text-emerald-400")}>
                {validation.remainingHours}h free
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Label htmlFor="weekly-capacity" className="shrink-0">Weekly hours</Label>
            <Input id="weekly-capacity" type="number" min={1} max={80} value={draftCapacity} onChange={(e) => setDraftCapacity(e.target.value)} className="w-24" />
          </div>

          <div className="space-y-2">
            {draftAllocations.map((allocation, index) => (
              <div key={`${allocation.projectId || "empty"}-${index}`} className="grid gap-2 rounded-lg border border-border/70 p-3 lg:grid-cols-[1.8fr_0.7fr_0.7fr_2fr_auto]">
                <div className="space-y-1">
                  <Label className="text-xs">Project</Label>
                  <Select value={allocation.projectId || "none"} onValueChange={(value) => updateAllocation(index, { projectId: value === "none" ? "" : value })}>
                    <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select project</SelectItem>
                      {[
                        allocation.projectId ? activeProjects.find((project) => project.id === allocation.projectId) : undefined,
                        ...projectOptions,
                      ]
                        .filter((project, projectIndex, list): project is Project => Boolean(project) && list.findIndex((entry) => entry?.id === project?.id) === projectIndex)
                        .map((project) => <SelectItem key={project.id} value={project.id}>{project.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Priority</Label>
                  <Select value={allocation.priority} onValueChange={(value) => updateAllocation(index, { priority: value as ProjectPriority })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PRIORITY_OPTIONS.map((priority) => <SelectItem key={priority} value={priority}>{priority}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Hours</Label>
                  <Input type="number" min={1} max={40} value={allocation.hoursAllocated || ""} onChange={(e) => updateAllocation(index, { hoursAllocated: Number(e.target.value) || 0 })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Weekly outcome</Label>
                  <Input value={allocation.weeklyOutcome} onChange={(e) => updateAllocation(index, { weeklyOutcome: e.target.value })} placeholder="One concrete result for this week" />
                </div>
                <div className="flex items-end">
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeAllocation(index)} aria-label={`Remove allocation ${index + 1}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" onClick={addAllocation} disabled={draftAllocations.length >= MAX_WEEKLY_PLAN_PROJECTS}>
              <Plus className="mr-2 h-4 w-4" />Add project
            </Button>
            <Button type="button" onClick={handleSavePlan}>Save plan</Button>
          </div>

          {validation.errors.length > 0 && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
              <div className="mb-1 flex items-center gap-2 text-sm font-medium text-amber-100">
                <AlertTriangle className="h-4 w-4" />Fix before saving
              </div>
              <div className="space-y-0.5 text-sm text-amber-50">
                {Array.from(new Set(validation.errors)).map((error) => <p key={error}>{error}</p>)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

    </>
  )
}

function PriorityDot({ priority }: { priority: string }) {
  const color = priority === "P1" ? "bg-red-500" : priority === "P2" ? "bg-amber-400" : "bg-slate-500"
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn("h-2 w-2 shrink-0 rounded-full", color)} />
      </TooltipTrigger>
      <TooltipContent side="right">{priority}</TooltipContent>
    </Tooltip>
  )
}

function StatusPill({ label, value, highlight }: { label: string; value: string; highlight?: "ok" | "warn" }) {
  return (
    <span className="text-sm">
      <span className="text-muted-foreground">{label} </span>
      <span className={cn("font-medium", highlight === "ok" && "text-emerald-400", highlight === "warn" && "text-amber-400")}>
        {value}
      </span>
    </span>
  )
}
