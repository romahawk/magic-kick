"use client"

import { useAppStore } from "@/lib/store"
import { levelFromXP, isDueToday, getWeekDays } from "@/lib/game-utils"
import { calculateCognitiveLoad, selectActiveProjects, selectDailyFocus, selectWeeklyOutcomes } from "@/lib/execution-os"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { Zap, Flame, ListTodo, FolderKanban, Trophy, BrainCircuit } from "lucide-react"

export function CommandCenter() {
  const profile = useAppStore((s) => s.profile)
  const allTasks = useAppStore((s) => s.tasks)
  const allProjects = useAppStore((s) => s.projects)
  const toggleTask = useAppStore((s) => s.toggleTask)
  const allAchievements = useAppStore((s) => s.achievements)
  const tasks = allTasks.filter((t) => !t.deleted)
  const projects = allProjects.filter((p) => !p.deleted)
  const achievements = allAchievements.filter((a) => !a.deleted)
  const xpInfo = levelFromXP(profile.xpTotal)
  const systemConfig = profile.systemConfig

  const todayTasks = tasks.filter((t) => isDueToday(t.dueDate) && !t.completed)
  const todayDueCount = todayTasks.length
  const completedToday = tasks.filter((t) => isDueToday(t.dueDate) && t.completed).length
  const unlockedBadges = achievements.filter((a) => a.unlocked).length
  const weekDays = getWeekDays()
  const activeProjects = selectActiveProjects(projects)
  const weeklyOutcomes = selectWeeklyOutcomes(projects, systemConfig)
  const dailyFocus = selectDailyFocus(tasks, projects, systemConfig)
  const load = calculateCognitiveLoad({ projects, tasks, config: systemConfig })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight">Command Center</h1>
        <p className="text-sm text-muted-foreground">Welcome back, {profile.name}. Let&apos;s make today count.</p>
      </div>

      {/* KPI cards */}
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

      {/* Level progress */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium">Level {xpInfo.level}</p>
            <p className="text-xs text-muted-foreground">{xpInfo.current} / {xpInfo.needed} XP to Level {xpInfo.level + 1}</p>
          </div>
          <Progress value={xpInfo.progress} className="h-3 [&>div]:bg-primary" />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's focus */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Today&apos;s Focus</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {dailyFocus.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">All clear! Add some tasks to get started.</p>
            )}
            {dailyFocus.map(({ task, linkedProject }) => (
              <div key={task.id} className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 p-3">
                <Checkbox
                  checked={task.completed}
                  onCheckedChange={() => toggleTask(task.id)}
                  aria-label={`Complete ${task.title}`}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">{task.title}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">{task.category}</Badge>
                    {linkedProject ? <Badge variant="outline" className="text-[10px]">{linkedProject.title}</Badge> : null}
                    <span className="text-[10px] text-muted-foreground">+{task.xpValue} XP</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Weekly Horizon */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FolderKanban className="h-4 w-4" />
              Weekly Outcomes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-wrap gap-2">
              <Badge variant="outline">{activeProjects.length} active projects</Badge>
              <Badge variant="outline">{load.missedWeeklyOutcomes} missed outcomes</Badge>
              {load.overCapacity ? <Badge className="bg-amber-500 text-black">Over capacity</Badge> : null}
            </div>
            <div className="mb-3 grid grid-cols-7 gap-1 text-center">
              {weekDays.map((d) => (
                <div key={d.iso} className="flex flex-col items-center">
                  <span className="text-[10px] text-muted-foreground">{d.label}</span>
                  <span className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                    d.isToday ? "bg-primary text-primary-foreground" : "text-foreground"
                  )}>
                    {d.short}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              {weeklyOutcomes.map((outcome) => (
                <div key={outcome.projectId} className="rounded-lg border border-border bg-secondary/20 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{outcome.title}</p>
                    <Badge variant={outcome.completed ? "default" : "secondary"} className="text-[10px]">
                      {outcome.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{outcome.projectTitle}</p>
                </div>
              ))}
              {weeklyOutcomes.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No weekly outcomes yet. Add one on a project.</p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
