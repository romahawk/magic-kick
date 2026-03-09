"use client"

import { useAppStore } from "@/lib/store"
import { levelFromXP, getWeekDays, isDueToday } from "@/lib/game-utils"
import { calculateCognitiveLoad, selectActiveProjects, selectDailyFocus, selectWeeklyOutcomes } from "@/lib/execution-os"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { Zap, Flame, ListTodo, FolderKanban, Trophy, BrainCircuit, Target, Layers3, Gauge } from "lucide-react"

export function CommandCenter() {
  const profile = useAppStore((s) => s.profile)
  const allTasks = useAppStore((s) => s.tasks)
  const allProjects = useAppStore((s) => s.projects)
  const allAchievements = useAppStore((s) => s.achievements)
  const toggleTask = useAppStore((s) => s.toggleTask)

  const tasks = allTasks.filter((task) => !task.deleted)
  const projects = allProjects.filter((project) => !project.deleted)
  const achievements = allAchievements.filter((achievement) => !achievement.deleted)
  const systemConfig = profile.systemConfig
  const xpInfo = levelFromXP(profile.xpTotal)
  const weekDays = getWeekDays()

  const dailyFocus = selectDailyFocus(tasks, projects, systemConfig)
  const weeklyOutcomes = selectWeeklyOutcomes(projects, systemConfig)
  const activeProjects = selectActiveProjects(projects)
  const load = calculateCognitiveLoad({ projects, tasks, config: systemConfig })

  const todayDueCount = tasks.filter((task) => !task.completed && isDueToday(task.dueDate)).length
  const completedToday = tasks.filter((task) => task.completed && isDueToday(task.dueDate)).length
  const unlockedBadges = achievements.filter((achievement) => achievement.unlocked).length
  const dailyFocusLimit = systemConfig?.dailyFocusLimit ?? 3
  const maxActiveProjects = systemConfig?.maxActiveProjects ?? 3

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight">Command Center</h1>
        <p className="text-sm text-muted-foreground">Welcome back, {profile.name}. Keep the day small, visible, and executable.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Card className="border-none bg-primary/10">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{profile.xpThisWeek}</p>
              <p className="text-xs text-muted-foreground">XP this week</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none bg-streak/10">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-streak">
              <Flame className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{profile.streakDays}</p>
              <p className="text-xs text-muted-foreground">Day streak</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
              <ListTodo className="h-5 w-5 text-secondary-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{todayDueCount}</p>
              <p className="text-xs text-muted-foreground">Due today ({completedToday} done)</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
              <Trophy className="h-5 w-5 text-secondary-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{unlockedBadges}</p>
              <p className="text-xs text-muted-foreground">Achievements</p>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(load.overCapacity && "border-amber-500/40 bg-amber-500/5")}>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
              <BrainCircuit className="h-5 w-5 text-secondary-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{load.status}</p>
              <p className="text-xs text-muted-foreground">Focus Health {load.focusScore}/100</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium">Level {xpInfo.level}</p>
            <p className="text-xs text-muted-foreground">
              {xpInfo.current} / {xpInfo.needed} XP to Level {xpInfo.level + 1}
            </p>
          </div>
          <Progress value={xpInfo.progress} className="h-3 [&>div]:bg-primary" />
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4" />
                Today&apos;s Focus
              </CardTitle>
              <Badge variant="outline">{dailyFocus.length}/{dailyFocusLimit}</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {dailyFocus.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                All clear. Add or assign up to {dailyFocusLimit} focus tasks.
              </p>
            ) : (
              dailyFocus.map(({ task, linkedProject }, index) => (
                <div key={task.id} className="flex items-center gap-3 rounded-xl border border-border bg-secondary/20 p-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {index + 1}
                  </div>
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={() => toggleTask(task.id)}
                    aria-label={`Complete ${task.title}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{task.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {linkedProject ? (
                        <Badge variant="outline" className="text-[10px]">
                          {linkedProject.title}
                        </Badge>
                      ) : null}
                      <Badge variant="secondary" className="text-[10px]">
                        {task.category}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">+{task.xpValue} XP</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FolderKanban className="h-4 w-4" />
                  Weekly Outcomes
                </CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{weeklyOutcomes.length} outcomes</Badge>
                  {load.missedWeeklyOutcomes > 0 ? <Badge variant="outline">{load.missedWeeklyOutcomes} missed</Badge> : null}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/10 px-3 py-2">
                {weekDays.map((day) => (
                  <div key={day.iso} className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">{day.label}</span>
                    <span
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium",
                        day.isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                      )}
                    >
                      {day.short}
                    </span>
                  </div>
                ))}
              </div>

              {weeklyOutcomes.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No weekly outcomes yet. Add one on an active project.</p>
              ) : (
                weeklyOutcomes.map((outcome) => (
                  <div key={outcome.projectId} className="rounded-xl border border-border bg-secondary/10 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{outcome.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{outcome.projectTitle}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "shrink-0 text-[10px]",
                          outcome.overdue && "border-amber-500/40 text-amber-300"
                        )}
                      >
                        {outcome.overdue ? "Overdue" : outcome.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Gauge className="h-4 w-4" />
                  Execution State
                </CardTitle>
                <Badge
                  variant="outline"
                  className={cn(load.overCapacity && "border-amber-500/40 text-amber-300")}
                >
                  {load.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-border bg-secondary/10 p-3">
                  <p className="text-xs text-muted-foreground">Active projects</p>
                  <p className="mt-1 text-xl font-semibold">{activeProjects.length}/{maxActiveProjects}</p>
                </div>
                <div className="rounded-xl border border-border bg-secondary/10 p-3">
                  <p className="text-xs text-muted-foreground">Focus tasks today</p>
                  <p className="mt-1 text-xl font-semibold">{dailyFocus.length}/{dailyFocusLimit}</p>
                </div>
                <div className="rounded-xl border border-border bg-secondary/10 p-3">
                  <p className="text-xs text-muted-foreground">Missed outcomes</p>
                  <p className="mt-1 text-xl font-semibold">{load.missedWeeklyOutcomes}</p>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-secondary/10 p-3">
                <div className="mb-3 flex items-center gap-2">
                  <Layers3 className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Active Projects</p>
                </div>
                <div className="flex flex-col gap-2">
                  {activeProjects.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No active projects right now.</p>
                  ) : (
                    activeProjects.slice(0, maxActiveProjects + 1).map((project) => (
                      <div key={project.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/40 px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{project.title}</p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {project.weeklyOutcome?.trim() || "Weekly outcome not defined yet"}
                          </p>
                        </div>
                        <Badge variant="secondary" className="shrink-0 text-[10px]">
                          active
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
