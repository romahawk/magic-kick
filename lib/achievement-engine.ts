import { format } from "date-fns"
import type { Achievement, Goal, Profile, Project, Task } from "@/lib/types"

interface Rule {
  id: string
  type: Achievement["type"]
  title: string
  description: string
  xpAwarded: number
  when: (ctx: RuleContext) => boolean
}

interface RuleContext {
  profile: Profile
  tasks: Task[]
  goals: Goal[]
  projects: Project[]
}

export const ACHIEVEMENT_RULES: Rule[] = [
  {
    id: "ach_welcome",
    type: "badge",
    title: "Welcome Aboard",
    description: "Complete onboarding and start your command center.",
    xpAwarded: 20,
    when: (ctx) => ctx.profile.onboardingCompleted,
  },
  {
    id: "ach_first_task",
    type: "badge",
    title: "First Task Added",
    description: "Create your first task.",
    xpAwarded: 15,
    when: (ctx) => ctx.tasks.filter((t) => !t.deleted).length >= 1,
  },
  {
    id: "ach_first_completion",
    type: "badge",
    title: "First Completion",
    description: "Complete your first task.",
    xpAwarded: 25,
    when: (ctx) => ctx.tasks.filter((t) => !t.deleted && t.completed).length >= 1,
  },
  {
    id: "ach_three_done",
    type: "badge",
    title: "Productive Start",
    description: "Complete three tasks.",
    xpAwarded: 40,
    when: (ctx) => ctx.tasks.filter((t) => !t.deleted && t.completed).length >= 3,
  },
  {
    id: "ach_first_goal",
    type: "badge",
    title: "Goal Setter",
    description: "Create your first goal.",
    xpAwarded: 20,
    when: (ctx) => ctx.goals.filter((g) => !g.deleted).length >= 1,
  },
  {
    id: "ach_first_project",
    type: "badge",
    title: "Project Initiated",
    description: "Create your first project.",
    xpAwarded: 30,
    when: (ctx) => ctx.projects.filter((p) => !p.deleted).length >= 1,
  },
  {
    id: "ach_streak_3",
    type: "medal",
    title: "3-Day Streak",
    description: "Stay active for three days in a row.",
    xpAwarded: 60,
    when: (ctx) => ctx.profile.streakDays >= 3,
  },
]

export function buildAchievementCatalog(existing: Achievement[]) {
  const byId = new Map(existing.map((item) => [item.id, item]))
  const nowIso = format(new Date(), "yyyy-MM-dd")
  return ACHIEVEMENT_RULES.map((rule) => {
    const current = byId.get(rule.id)
    if (current) return current
    return {
      id: rule.id,
      type: rule.type,
      title: rule.title,
      description: rule.description,
      xpAwarded: rule.xpAwarded,
      unlocked: false,
      date: "",
      deleted: false,
      clientUpdatedAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      imageUrl: undefined,
    } as Achievement
  }).map((item) =>
    item.unlocked && !item.date
      ? {
          ...item,
          date: nowIso,
        }
      : item
  )
}

export function evaluateAchievementUnlocks(ctx: RuleContext, achievements: Achievement[]) {
  const nowTs = Date.now()
  const nowIso = format(new Date(), "yyyy-MM-dd")
  const byId = new Map(achievements.map((item) => [item.id, item]))
  let xpDelta = 0
  const unlockedIds: string[] = []
  const next = achievements.map((item) => {
    const rule = ACHIEVEMENT_RULES.find((candidate) => candidate.id === item.id)
    if (!rule) return item
    if (item.unlocked) return item
    if (!rule.when(ctx)) return item
    unlockedIds.push(item.id)
    xpDelta += item.xpAwarded
    return {
      ...item,
      unlocked: true,
      date: nowIso,
      updatedAt: nowTs,
      clientUpdatedAt: nowTs,
      deleted: false,
    }
  })

  return {
    achievements: next,
    xpDelta,
    unlockedIds,
  }
}
