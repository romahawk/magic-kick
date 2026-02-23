"use client"

import { useAppStore } from "@/lib/store"
import { levelFromXP } from "@/lib/game-utils"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Trophy, Lock, Medal, Award, Star, Zap } from "lucide-react"

const TYPE_ICONS = {
  badge: Star,
  diploma: Award,
  medal: Medal,
}

export function AchievementsModule() {
  const profile = useAppStore((s) => s.profile)
  const allAchievements = useAppStore((s) => s.achievements)
  const xpInfo = levelFromXP(profile.xpTotal)
  const achievements = allAchievements.filter((a) => !a.deleted)

  const unlocked = achievements.filter((a) => a.unlocked)
  const locked = achievements.filter((a) => !a.unlocked)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight">Achievements</h1>
        <p className="text-sm text-muted-foreground">Achievements unlock automatically as you use Magic Kick.</p>
      </div>

      <Card className="border-none bg-primary/10">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary">
              <Trophy className="h-8 w-8 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-lg font-bold">Level {xpInfo.level}</p>
              <p className="text-sm text-muted-foreground">{profile.xpTotal} total XP earned</p>
              <div className="mt-2">
                <div className="mb-1 flex justify-between text-xs">
                  <span>{xpInfo.current} XP</span>
                  <span>{xpInfo.needed} XP needed</span>
                </div>
                <Progress value={xpInfo.progress} className="h-3 [&>div]:bg-primary" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Earned ({unlocked.length})</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {unlocked.map((a) => {
            const Icon = TYPE_ICONS[a.type]
            return (
              <Card key={a.id} className="border-primary/20 bg-primary/5">
                <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium">{a.title}</p>
                  <p className="text-[10px] text-muted-foreground">{a.description}</p>
                  <div className="flex items-center gap-1 text-xs text-primary">
                    <Zap className="h-3 w-3" /> +{a.xpAwarded} XP
                  </div>
                  {a.date ? <p className="text-[10px] text-muted-foreground">{a.date}</p> : null}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {locked.length > 0 ? (
        <div>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Locked ({locked.length})</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {locked.map((a) => (
              <Card key={a.id} className="opacity-50">
                <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">{a.title}</p>
                  <p className="text-[10px] text-muted-foreground">{a.description}</p>
                  <Badge variant="secondary" className="text-[10px]"><Medal className="mr-1 h-3 w-3" /> Locked</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
