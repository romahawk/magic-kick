"use client"

import { useAppStore } from "@/lib/store"
import { levelFromXP, isDueToday, getWeekDays } from "@/lib/game-utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { Zap, Flame, ListTodo, FolderKanban, Trophy } from "lucide-react"

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

  const todayTasks = tasks.filter((t) => isDueToday(t.dueDate) && !t.completed)
  const todayDueCount = todayTasks.length
  const completedToday = tasks.filter((t) => isDueToday(t.dueDate) && t.completed).length
  const unlockedBadges = achievements.filter((a) => a.unlocked).length
  const weekDays = getWeekDays()

  const topFocus = tasks.filter((t) => !t.completed).slice(0, 3)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight">Command Center</h1>
        <p className="text-sm text-muted-foreground">Welcome back, {profile.name}. Let&apos;s make today count.</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
            {topFocus.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">All clear! Add some tasks to get started.</p>
            )}
            {topFocus.map((task) => (
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
              Weekly Horizon
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Day headers */}
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
            {/* Project bars */}
            {projects.map((project) => {
              const completedMilestones = project.milestones.filter((m) => m.completed).length
              const totalMilestones = project.milestones.length
              return (
                <div key={project.id} className="mb-2">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-medium">{project.title}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {completedMilestones}/{totalMilestones}
                    </span>
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {weekDays.map((_, i) => {
                      const milestone = project.milestones.find((m) => m.dayIndex === i)
                      return (
                        <div
                          key={i}
                          className={cn(
                            "h-6 rounded-sm",
                            milestone
                              ? milestone.completed
                                ? "bg-primary/60"
                                : "bg-primary/20 ring-1 ring-primary/40"
                              : "bg-secondary/50"
                          )}
                          title={milestone?.title}
                        />
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
