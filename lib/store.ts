import { addMinutes, format, parseISO } from "date-fns"
import { create } from "zustand"
import { persist } from "zustand/middleware"
import type {
  Achievement,
  Goal,
  JournalEntry,
  ModuleId,
  Profile,
  Project,
  Resource,
  ScheduleItem,
  SyncCollection,
  SyncState,
  Task,
} from "./types"
import { generateId } from "./game-utils"
import { getOrCreateDeviceId } from "@/lib/sync/deviceId"
import { applyTaskCompletionXP, calculateTaskXP, normalizeProfileForToday, rollbackTaskXP } from "@/lib/xp-engine"
import { levelFromXP } from "@/lib/game-utils"
import { buildAchievementCatalog, evaluateAchievementUnlocks } from "@/lib/achievement-engine"

export const STORE_KEY = "magic-kick-store"
const DEFAULT_TASK_CATEGORIES = ["Learning", "Sport", "Family/Home", "Hobby", "Travel"]

const ENTITY_COLLECTIONS: Exclude<SyncCollection, "profile">[] = [
  "tasks",
  "goals",
  "projects",
  "achievements",
  "schedule",
  "resources",
  "journal",
]

type PendingRecord = Record<SyncCollection, Record<string, number>>
type LocalEntity = Task | Goal | Project | Achievement | ScheduleItem | Resource | JournalEntry

function now() {
  return Date.now()
}

function createEmptyPending(): PendingRecord {
  return {
    profile: {},
    tasks: {},
    goals: {},
    projects: {},
    achievements: {},
    schedule: {},
    resources: {},
    journal: {},
  }
}

function touchEntity<T extends LocalEntity>(entity: T): T {
  return {
    ...entity,
    deleted: Boolean(entity.deleted),
    clientUpdatedAt: now(),
  }
}

function createInitialData() {
  const profile: Profile = {
    name: "New Player",
    onboardingCompleted: false,
    taskCategories: DEFAULT_TASK_CATEGORIES,
    level: 1,
    xpTotal: 0,
    xpThisWeek: 0,
    streakDays: 0,
    xpWeekKey: format(new Date(), "yyyy-MM-dd"),
    deleted: false,
    clientUpdatedAt: now(),
  }
  return {
    profile,
    tasks: [] as Task[],
    goals: [] as Goal[],
    projects: [] as Project[],
    achievements: [] as Achievement[],
    schedule: [] as ScheduleItem[],
    resources: [] as Resource[],
    journal: [] as JournalEntry[],
  }
}

function buildPendingFromState(state: Pick<AppState, "profile" | "tasks" | "goals" | "projects" | "achievements" | "schedule" | "resources" | "journal">): PendingRecord {
  const pending = createEmptyPending()
  if (state.profile.clientUpdatedAt) {
    pending.profile.profile = state.profile.clientUpdatedAt
  }
  for (const collectionName of ENTITY_COLLECTIONS) {
    for (const item of state[collectionName]) {
      pending[collectionName][item.id] = item.clientUpdatedAt ?? now()
    }
  }
  return pending
}

function looksLikeLegacyDemoState(state: Partial<AppState> | undefined) {
  if (!state) return false
  const name = state.profile?.name?.trim().toLowerCase()
  const hasDemoTaskIds = (state.tasks ?? []).some((task) => /^t\d+$/.test(task.id))
  return name === "kyryll" && hasDemoTaskIds
}

function createInitialSyncState(): SyncState {
  return {
    deviceId: getOrCreateDeviceId(),
    currentUid: null,
    status: "idle",
    lastError: null,
    lastPulledAt: null,
    lastSyncedAt: null,
    pending: createEmptyPending(),
  }
}

function runAchievementEngine(input: {
  profile: Profile
  tasks: Task[]
  goals: Goal[]
  projects: Project[]
  achievements: Achievement[]
}) {
  const catalog = buildAchievementCatalog(input.achievements)
  const result = evaluateAchievementUnlocks(
    {
      profile: input.profile,
      tasks: input.tasks,
      goals: input.goals,
      projects: input.projects,
    },
    catalog
  )
  if (result.xpDelta <= 0) {
    return {
      profile: input.profile,
      achievements: result.achievements,
      unlockedIds: result.unlockedIds,
    }
  }

  const xpTotal = input.profile.xpTotal + result.xpDelta
  const level = levelFromXP(xpTotal).level
  return {
    profile: {
      ...input.profile,
      xpTotal,
      xpThisWeek: input.profile.xpThisWeek + result.xpDelta,
      level,
      clientUpdatedAt: Date.now(),
      deleted: false,
    },
    achievements: result.achievements,
    unlockedIds: result.unlockedIds,
  }
}

export interface AppState {
  profile: Profile
  tasks: Task[]
  goals: Goal[]
  projects: Project[]
  achievements: Achievement[]
  schedule: ScheduleItem[]
  resources: Resource[]
  journal: JournalEntry[]
  activeModule: ModuleId
  sync: SyncState

  setActiveModule: (m: ModuleId) => void
  completeOnboarding: (name: string) => void
  addCategory: (name: string) => void
  renameCategory: (from: string, to: string) => void
  deleteCategory: (name: string) => void
  toggleTask: (id: string) => void
  addTask: (task: Omit<Task, "id" | "xpValue"> & Partial<Pick<Task, "xpValue">>) => void
  reorderTasks: (draggedTaskId: string, targetTaskId: string) => void
  updateTask: (
    id: string,
    updates: Partial<Omit<Task, "id" | "deleted" | "clientUpdatedAt">>,
    timing?: { startHHmm?: string; endHHmm?: string }
  ) => void
  unscheduleTask: (id: string) => void
  moveTaskToTodo: (id: string) => void
  deleteTask: (id: string) => void
  addGoal: (goal: Omit<Goal, "id">) => void
  updateGoalProgress: (id: string, progress: number) => void
  convertWishlistToGoal: (id: string) => void
  addProject: (project: Omit<Project, "id" | "milestones"> & { milestones?: Array<{ title: string; dayIndex: number }> }) => void
  updateProject: (projectId: string, updates: Partial<Omit<Project, "id" | "milestones">>) => void
  deleteProject: (projectId: string) => void
  addAchievement: (a: Omit<Achievement, "id">) => void
  addResource: (r: Omit<Resource, "id">) => void
  addJournalEntry: (j: Omit<JournalEntry, "id">) => void
  addScheduleItem: (s: Omit<ScheduleItem, "id">) => void
  toggleMilestone: (projectId: string, milestoneId: string) => void

  setSyncStatus: (status: SyncState["status"], error?: string | null) => void
  markPending: (collection: SyncCollection, id: string, clientUpdatedAt?: number) => void
  clearPending: (changes: Array<{ collection: SyncCollection; id: string }>) => void
  setCurrentUid: (uid: string | null) => void
  setLastPulledAt: (timestamp: number | null) => void
  setLastSyncedAt: (timestamp: number | null) => void
}

const initialData = createInitialData()

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialData,
      activeModule: "command-center",
      sync: createInitialSyncState(),

      setActiveModule: (m) => set({ activeModule: m }),

      completeOnboarding: (name) => {
        const ts = now()
        const safeName = name.trim() || "New Player"
        set((s) => {
          const baseProfile: Profile = {
            ...s.profile,
            name: safeName,
            onboardingCompleted: true,
            clientUpdatedAt: ts,
            deleted: false,
          }
          const evaluated = runAchievementEngine({
            profile: baseProfile,
            tasks: s.tasks,
            goals: s.goals,
            projects: s.projects,
            achievements: s.achievements,
          })
          const nextPending = { ...s.sync.pending.achievements }
          for (const item of evaluated.achievements) {
            nextPending[item.id] = item.clientUpdatedAt ?? ts
          }
          return {
            profile: evaluated.profile,
            achievements: evaluated.achievements,
            sync: {
              ...s.sync,
              pending: {
                ...s.sync.pending,
                profile: { ...s.sync.pending.profile, profile: evaluated.profile.clientUpdatedAt ?? ts },
                achievements: nextPending,
              },
            },
          }
        })
      },

      addCategory: (name) => {
        const normalized = name.trim()
        if (!normalized) return
        const ts = now()
        set((s) => {
          const categories = s.profile.taskCategories ?? DEFAULT_TASK_CATEGORIES
          if (categories.some((item) => item.toLowerCase() === normalized.toLowerCase())) return {}
          return {
            profile: {
              ...s.profile,
              taskCategories: [...categories, normalized],
              clientUpdatedAt: ts,
              deleted: false,
            },
            sync: {
              ...s.sync,
              pending: {
                ...s.sync.pending,
                profile: { ...s.sync.pending.profile, profile: ts },
              },
            },
          }
        })
      },

      renameCategory: (from, to) => {
        const nextName = to.trim()
        if (!nextName || from === nextName) return
        const ts = now()
        set((s) => {
          const categories = s.profile.taskCategories ?? DEFAULT_TASK_CATEGORIES
          if (!categories.includes(from)) return {}
          if (categories.some((item) => item.toLowerCase() === nextName.toLowerCase())) return {}

          const nextCategories = categories.map((item) => (item === from ? nextName : item))
          const changedTaskIds: string[] = []
          const nextTasks = s.tasks.map((task) => {
            if (task.category !== from) return task
            changedTaskIds.push(task.id)
            return {
              ...task,
              category: nextName,
              clientUpdatedAt: ts,
              deleted: false,
            }
          })
          const pendingTasks = { ...s.sync.pending.tasks }
          for (const taskId of changedTaskIds) pendingTasks[taskId] = ts

          return {
            profile: {
              ...s.profile,
              taskCategories: nextCategories,
              clientUpdatedAt: ts,
              deleted: false,
            },
            tasks: nextTasks,
            sync: {
              ...s.sync,
              pending: {
                ...s.sync.pending,
                profile: { ...s.sync.pending.profile, profile: ts },
                tasks: pendingTasks,
              },
            },
          }
        })
      },

      deleteCategory: (name) => {
        const ts = now()
        set((s) => {
          const categories = s.profile.taskCategories ?? DEFAULT_TASK_CATEGORIES
          if (!categories.includes(name)) return {}
          const remaining = categories.filter((item) => item !== name)
          const fallback = remaining[0] ?? "General"
          const nextCategories = remaining.length > 0 ? remaining : [fallback]

          const changedTaskIds: string[] = []
          const nextTasks = s.tasks.map((task) => {
            if (task.category !== name) return task
            changedTaskIds.push(task.id)
            return {
              ...task,
              category: fallback,
              clientUpdatedAt: ts,
              deleted: false,
            }
          })
          const pendingTasks = { ...s.sync.pending.tasks }
          for (const taskId of changedTaskIds) pendingTasks[taskId] = ts

          return {
            profile: {
              ...s.profile,
              taskCategories: nextCategories,
              clientUpdatedAt: ts,
              deleted: false,
            },
            tasks: nextTasks,
            sync: {
              ...s.sync,
              pending: {
                ...s.sync.pending,
                profile: { ...s.sync.pending.profile, profile: ts },
                tasks: pendingTasks,
              },
            },
          }
        })
      },

      toggleTask: (id) => {
        const ts = now()
        const current = get()
        const toggled = current.tasks.find((t) => t.id === id)
        if (!toggled) return

        const tasks = current.tasks.map((t) =>
          t.id === id ? { ...t, completed: !t.completed, clientUpdatedAt: ts, deleted: false } : t
        )

        let profile = normalizeProfileForToday(current.profile, new Date())
        if (!toggled.completed) {
          profile = applyTaskCompletionXP(profile, toggled.xpValue, new Date())
        } else {
          profile = rollbackTaskXP(profile, toggled.xpValue, new Date())
        }
        profile = { ...profile, clientUpdatedAt: ts, deleted: false }
        const evaluated = runAchievementEngine({
          profile,
          tasks,
          goals: current.goals,
          projects: current.projects,
          achievements: current.achievements,
        })

        set((state) => ({
          tasks,
          profile: evaluated.profile,
          achievements: evaluated.achievements,
          sync: {
            ...state.sync,
            pending: {
              ...state.sync.pending,
              profile: { ...state.sync.pending.profile, profile: evaluated.profile.clientUpdatedAt ?? ts },
              tasks: { ...state.sync.pending.tasks, [id]: ts },
              achievements: evaluated.achievements.reduce<Record<string, number>>((acc, item) => {
                acc[item.id] = item.clientUpdatedAt ?? ts
                return acc
              }, { ...state.sync.pending.achievements }),
            },
          },
        }))
      },

      addTask: (task) => {
        const id = generateId()
        const xpValue = task.xpValue ?? calculateTaskXP(task)
        set((s) => {
          const maxOrder = s.tasks.reduce((max, entry) => Math.max(max, entry.order ?? 0), 0)
          const item = touchEntity({ ...task, id, xpValue, order: maxOrder + 1, deleted: false })
          const nextTasks = [...s.tasks, item]
          const nextSchedule = [...s.schedule]
          const ts = item.clientUpdatedAt ?? now()

          if (item.dueDate) {
            const start = parseISO(`${item.dueDate}T09:00`)
            const end = addMinutes(start, item.estimateMin ?? 30)
            const scheduleId = `task-${item.id}`
            nextSchedule.push(
              touchEntity({
                id: scheduleId,
                title: item.title,
                type: "task",
                startISO: format(start, "yyyy-MM-dd'T'HH:mm"),
                endISO: format(end, "yyyy-MM-dd'T'HH:mm"),
                color: "bg-chart-1",
                linkedTaskId: item.id,
                deleted: false,
              })
            )
          }

          const evaluated = runAchievementEngine({
            profile: s.profile,
            tasks: nextTasks,
            goals: s.goals,
            projects: s.projects,
            achievements: s.achievements,
          })
          return {
            tasks: nextTasks,
            schedule: nextSchedule,
            profile: evaluated.profile,
            achievements: evaluated.achievements,
            sync: {
              ...s.sync,
              pending: {
                ...s.sync.pending,
                profile: { ...s.sync.pending.profile, profile: evaluated.profile.clientUpdatedAt ?? ts },
                tasks: { ...s.sync.pending.tasks, [id]: ts },
                schedule: nextSchedule.reduce<Record<string, number>>((acc, item) => {
                  if (item.id.startsWith("task-")) {
                    acc[item.id] = item.clientUpdatedAt ?? ts
                  }
                  return acc
                }, { ...s.sync.pending.schedule }),
                achievements: evaluated.achievements.reduce<Record<string, number>>((acc, achievement) => {
                  acc[achievement.id] = achievement.clientUpdatedAt ?? ts
                  return acc
                }, { ...s.sync.pending.achievements }),
              },
            },
          }
        })
      },

      reorderTasks: (draggedTaskId, targetTaskId) => {
        if (draggedTaskId === targetTaskId) return
        const ts = now()
        set((s) => {
          const active = s.tasks.filter((task) => !task.deleted).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          const draggedIndex = active.findIndex((task) => task.id === draggedTaskId)
          const targetIndex = active.findIndex((task) => task.id === targetTaskId)
          if (draggedIndex < 0 || targetIndex < 0) return {}

          const nextActive = [...active]
          const [dragged] = nextActive.splice(draggedIndex, 1)
          nextActive.splice(targetIndex, 0, dragged)

          const orderById = new Map<string, number>()
          nextActive.forEach((task, index) => {
            orderById.set(task.id, index + 1)
          })

          const tasks = s.tasks.map((task) => {
            const nextOrder = orderById.get(task.id)
            if (!nextOrder) return task
            return {
              ...task,
              order: nextOrder,
              clientUpdatedAt: ts,
              deleted: false,
            }
          })

          const pendingTasks = { ...s.sync.pending.tasks }
          for (const task of nextActive) {
            pendingTasks[task.id] = ts
          }

          return {
            tasks,
            sync: {
              ...s.sync,
              pending: {
                ...s.sync.pending,
                tasks: pendingTasks,
              },
            },
          }
        })
      },

      updateTask: (id, updates, timing) => {
        const ts = now()
        set((s) => {
          const current = s.tasks.find((t) => t.id === id)
          if (!current) return {}

          const mergedBase: Task = {
            ...current,
            ...updates,
            clientUpdatedAt: ts,
            deleted: false,
          }
          const shouldRecalculateXP =
            updates.category !== undefined ||
            updates.estimateMin !== undefined ||
            updates.pomodorosPlanned !== undefined ||
            updates.linkedProjectId !== undefined
          const nextXP = updates.xpValue ?? (shouldRecalculateXP ? calculateTaskXP(mergedBase) : current.xpValue)
          const merged: Task = {
            ...mergedBase,
            xpValue: nextXP,
          }

          let profile = s.profile
          if (current.completed) {
            const delta = merged.xpValue - current.xpValue
            if (delta !== 0) {
              const xpTotal = Math.max(0, profile.xpTotal + delta)
              const xpThisWeek = Math.max(0, profile.xpThisWeek + delta)
              profile = {
                ...profile,
                xpTotal,
                xpThisWeek,
                level: levelFromXP(xpTotal).level,
                clientUpdatedAt: ts,
                deleted: false,
              }
            }
          }

          const tasks = s.tasks.map((task) => (task.id === id ? merged : task))
          const schedule = [...s.schedule]
          const scheduleIndex = schedule.findIndex((item) => item.linkedTaskId === id)
          let scheduleTouchedId: string | null = null

          if (merged.dueDate) {
            const existing = scheduleIndex >= 0 ? schedule[scheduleIndex] : null
            const existingStart = existing ? format(parseISO(existing.startISO), "HH:mm") : undefined
            const existingEnd = existing ? format(parseISO(existing.endISO), "HH:mm") : undefined
            const startHHmm = timing?.startHHmm ?? existingStart ?? "09:00"
            const endHHmm =
              timing?.endHHmm ??
              existingEnd ??
              format(addMinutes(parseISO(`${merged.dueDate}T${startHHmm}`), merged.estimateMin ?? 30), "HH:mm")

            const nextSchedule: ScheduleItem = {
              id: existing?.id ?? `task-${id}`,
              title: merged.title,
              type: "task",
              startISO: `${merged.dueDate}T${startHHmm}`,
              endISO: `${merged.dueDate}T${endHHmm}`,
              color: existing?.color ?? "bg-chart-1",
              linkedTaskId: id,
              deleted: false,
              clientUpdatedAt: ts,
            }

            if (scheduleIndex >= 0) {
              schedule[scheduleIndex] = nextSchedule
            } else {
              schedule.push(nextSchedule)
            }
            scheduleTouchedId = nextSchedule.id
          } else if (scheduleIndex >= 0) {
            schedule[scheduleIndex] = {
              ...schedule[scheduleIndex],
              deleted: true,
              clientUpdatedAt: ts,
            }
            scheduleTouchedId = schedule[scheduleIndex].id
          }

          return {
            tasks,
            schedule,
            profile,
            sync: {
              ...s.sync,
              pending: {
                ...s.sync.pending,
                profile: profile.clientUpdatedAt ? { ...s.sync.pending.profile, profile: profile.clientUpdatedAt } : s.sync.pending.profile,
                tasks: { ...s.sync.pending.tasks, [id]: ts },
                schedule: scheduleTouchedId ? { ...s.sync.pending.schedule, [scheduleTouchedId]: ts } : s.sync.pending.schedule,
              },
            },
          }
        })
      },

      unscheduleTask: (id) => {
        const ts = now()
        set((s) => {
          const scheduleIndex = s.schedule.findIndex((item) => item.linkedTaskId === id && !item.deleted)
          if (scheduleIndex < 0) return {}
          const scheduleItem = s.schedule[scheduleIndex]
          const nextSchedule = [...s.schedule]
          nextSchedule[scheduleIndex] = {
            ...scheduleItem,
            deleted: true,
            clientUpdatedAt: ts,
          }
          return {
            schedule: nextSchedule,
            sync: {
              ...s.sync,
              pending: {
                ...s.sync.pending,
                schedule: { ...s.sync.pending.schedule, [scheduleItem.id]: ts },
              },
            },
          }
        })
      },

      moveTaskToTodo: (id) => {
        const ts = now()
        set((s) => {
          const task = s.tasks.find((entry) => entry.id === id)
          if (!task) return {}
          const nextTasks = s.tasks.map((entry) =>
            entry.id === id
              ? {
                  ...entry,
                  dueDate: undefined,
                  clientUpdatedAt: ts,
                  deleted: false,
                }
              : entry
          )
          const nextSchedule = s.schedule.map((item) =>
            item.linkedTaskId === id
              ? {
                  ...item,
                  deleted: true,
                  clientUpdatedAt: ts,
                }
              : item
          )
          const schedulePending = { ...s.sync.pending.schedule }
          for (const item of s.schedule) {
            if (item.linkedTaskId === id) {
              schedulePending[item.id] = ts
            }
          }
          return {
            tasks: nextTasks,
            schedule: nextSchedule,
            sync: {
              ...s.sync,
              pending: {
                ...s.sync.pending,
                tasks: { ...s.sync.pending.tasks, [id]: ts },
                schedule: schedulePending,
              },
            },
          }
        })
      },

      deleteTask: (id) => {
        const ts = now()
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, deleted: true, clientUpdatedAt: ts } : t)),
          schedule: s.schedule.map((item) =>
            item.linkedTaskId === id ? { ...item, deleted: true, clientUpdatedAt: ts } : item
          ),
          sync: {
            ...s.sync,
            pending: {
              ...s.sync.pending,
              tasks: { ...s.sync.pending.tasks, [id]: ts },
              schedule: s.schedule.reduce<Record<string, number>>((acc, item) => {
                if (item.linkedTaskId === id) {
                  acc[item.id] = ts
                }
                return acc
              }, { ...s.sync.pending.schedule }),
            },
          },
        }))
      },

      addGoal: (goal) => {
        const id = generateId()
        const item = touchEntity({ ...goal, id, deleted: false })
        set((s) => {
          const nextGoals = [...s.goals, item]
          const ts = item.clientUpdatedAt ?? now()
          const evaluated = runAchievementEngine({
            profile: s.profile,
            tasks: s.tasks,
            goals: nextGoals,
            projects: s.projects,
            achievements: s.achievements,
          })
          return {
            goals: nextGoals,
            profile: evaluated.profile,
            achievements: evaluated.achievements,
            sync: {
              ...s.sync,
              pending: {
                ...s.sync.pending,
                profile: { ...s.sync.pending.profile, profile: evaluated.profile.clientUpdatedAt ?? ts },
                goals: { ...s.sync.pending.goals, [id]: ts },
                achievements: evaluated.achievements.reduce<Record<string, number>>((acc, achievement) => {
                  acc[achievement.id] = achievement.clientUpdatedAt ?? ts
                  return acc
                }, { ...s.sync.pending.achievements }),
              },
            },
          }
        })
      },

      updateGoalProgress: (id, progress) => {
        const ts = now()
        set((s) => ({
          goals: s.goals.map((g) =>
            g.id === id ? { ...g, progress, status: progress >= 100 ? "completed" : g.status, clientUpdatedAt: ts, deleted: false } : g
          ),
          sync: {
            ...s.sync,
            pending: {
              ...s.sync.pending,
              goals: { ...s.sync.pending.goals, [id]: ts },
            },
          },
        }))
      },

      convertWishlistToGoal: (id) => {
        const ts = now()
        set((s) => ({
          goals: s.goals.map((g) => (g.id === id ? { ...g, status: "active", horizon: "mid", clientUpdatedAt: ts, deleted: false } : g)),
          sync: {
            ...s.sync,
            pending: {
              ...s.sync.pending,
              goals: { ...s.sync.pending.goals, [id]: ts },
            },
          },
        }))
      },

      addProject: (project) => {
        const id = generateId()
        const ts = now()
        const milestones = (project.milestones ?? []).map((milestone) => ({
          id: generateId(),
          title: milestone.title,
          dayIndex: milestone.dayIndex,
          completed: false,
        }))
        const item = touchEntity({
          id,
          title: project.title,
          objective: project.objective,
          weekStartISO: project.weekStartISO,
          weekEndISO: project.weekEndISO,
          color: project.color,
          milestones,
          deleted: false,
        })
        set((s) => {
          const nextProjects = [...s.projects, item]
          const evaluated = runAchievementEngine({
            profile: s.profile,
            tasks: s.tasks,
            goals: s.goals,
            projects: nextProjects,
            achievements: s.achievements,
          })
          return {
            projects: nextProjects,
            profile: evaluated.profile,
            achievements: evaluated.achievements,
            sync: {
              ...s.sync,
              pending: {
                ...s.sync.pending,
                profile: { ...s.sync.pending.profile, profile: evaluated.profile.clientUpdatedAt ?? ts },
                projects: { ...s.sync.pending.projects, [id]: ts },
                achievements: evaluated.achievements.reduce<Record<string, number>>((acc, achievement) => {
                  acc[achievement.id] = achievement.clientUpdatedAt ?? ts
                  return acc
                }, { ...s.sync.pending.achievements }),
              },
            },
          }
        })
      },

      updateProject: (projectId, updates) => {
        const ts = now()
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  ...updates,
                  clientUpdatedAt: ts,
                  deleted: false,
                }
              : p
          ),
          sync: {
            ...s.sync,
            pending: {
              ...s.sync.pending,
              projects: { ...s.sync.pending.projects, [projectId]: ts },
            },
          },
        }))
      },

      deleteProject: (projectId) => {
        const ts = now()
        set((s) => ({
          projects: s.projects.map((p) => (p.id === projectId ? { ...p, deleted: true, clientUpdatedAt: ts } : p)),
          sync: {
            ...s.sync,
            pending: {
              ...s.sync.pending,
              projects: { ...s.sync.pending.projects, [projectId]: ts },
            },
          },
        }))
      },

      addAchievement: (a) => {
        const id = generateId()
        const item = touchEntity({ ...a, id, deleted: false })
        set((s) => ({
          achievements: [...s.achievements, item],
          sync: {
            ...s.sync,
            pending: {
              ...s.sync.pending,
              achievements: { ...s.sync.pending.achievements, [id]: item.clientUpdatedAt ?? now() },
            },
          },
        }))
      },

      addResource: (r) => {
        const id = generateId()
        const item = touchEntity({ ...r, id, deleted: false })
        set((s) => ({
          resources: [...s.resources, item],
          sync: {
            ...s.sync,
            pending: {
              ...s.sync.pending,
              resources: { ...s.sync.pending.resources, [id]: item.clientUpdatedAt ?? now() },
            },
          },
        }))
      },

      addJournalEntry: (j) => {
        const id = generateId()
        const item = touchEntity({ ...j, id, deleted: false })
        set((s) => ({
          journal: [item, ...s.journal],
          sync: {
            ...s.sync,
            pending: {
              ...s.sync.pending,
              journal: { ...s.sync.pending.journal, [id]: item.clientUpdatedAt ?? now() },
            },
          },
        }))
      },

      addScheduleItem: (scheduleItem) => {
        const id = generateId()
        const item = touchEntity({ ...scheduleItem, id, deleted: false })
        set((s) => ({
          schedule: [...s.schedule, item],
          sync: {
            ...s.sync,
            pending: {
              ...s.sync.pending,
              schedule: { ...s.sync.pending.schedule, [id]: item.clientUpdatedAt ?? now() },
            },
          },
        }))
      },

      toggleMilestone: (projectId, milestoneId) => {
        const ts = now()
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  clientUpdatedAt: ts,
                  deleted: false,
                  milestones: p.milestones.map((m) =>
                    m.id === milestoneId ? { ...m, completed: !m.completed } : m
                  ),
                }
              : p
          ),
          sync: {
            ...s.sync,
            pending: {
              ...s.sync.pending,
              projects: { ...s.sync.pending.projects, [projectId]: ts },
            },
          },
        }))
      },

      setSyncStatus: (status, error = null) =>
        set((s) => ({
          sync: {
            ...s.sync,
            status,
            lastError: error,
          },
        })),

      markPending: (collection, id, clientUpdatedAt = now()) =>
        set((s) => ({
          sync: {
            ...s.sync,
            pending: {
              ...s.sync.pending,
              [collection]: {
                ...s.sync.pending[collection],
                [id]: clientUpdatedAt,
              },
            },
          },
        })),

      clearPending: (changes) =>
        set((s) => {
          const nextPending: PendingRecord = {
            ...s.sync.pending,
            profile: { ...s.sync.pending.profile },
            tasks: { ...s.sync.pending.tasks },
            goals: { ...s.sync.pending.goals },
            projects: { ...s.sync.pending.projects },
            achievements: { ...s.sync.pending.achievements },
            schedule: { ...s.sync.pending.schedule },
            resources: { ...s.sync.pending.resources },
            journal: { ...s.sync.pending.journal },
          }
          for (const change of changes) {
            delete nextPending[change.collection][change.id]
          }
          return {
            sync: {
              ...s.sync,
              pending: nextPending,
            },
          }
        }),

      setCurrentUid: (uid) =>
        set((s) => {
          if (s.sync.currentUid === uid) return {}
          const base = createInitialData()
          return {
            ...base,
            activeModule: "command-center",
            sync: {
              ...s.sync,
              currentUid: uid,
              status: "idle",
              lastError: null,
              lastPulledAt: null,
              lastSyncedAt: null,
              pending: createEmptyPending(),
            },
          }
        }),

      setLastPulledAt: (timestamp) =>
        set((s) => ({ sync: { ...s.sync, lastPulledAt: timestamp } })),

      setLastSyncedAt: (timestamp) =>
        set((s) => ({ sync: { ...s.sync, lastSyncedAt: timestamp } })),
    }),
    {
      name: STORE_KEY,
      version: 3,
      migrate: (persistedState) => {
        const state = persistedState as Partial<AppState> | undefined
        const base = createInitialData()
        if (!state) {
          return {
            ...base,
            activeModule: "command-center",
            sync: createInitialSyncState(),
          }
        }

        const merged = {
          ...base,
          ...state,
        } as AppState

        if (looksLikeLegacyDemoState(state)) {
          return {
            ...base,
            activeModule: "command-center",
            sync: {
              deviceId: state.sync?.deviceId ?? getOrCreateDeviceId(),
              currentUid: state.sync?.currentUid ?? null,
              status: "idle",
              lastError: null,
              lastPulledAt: null,
              lastSyncedAt: null,
              pending: createEmptyPending(),
            },
          }
        }

        const profile: Profile = {
          ...base.profile,
          ...merged.profile,
          name: merged.profile?.name?.trim() || "New Player",
          onboardingCompleted: Boolean(merged.profile?.onboardingCompleted),
          taskCategories:
            merged.profile?.taskCategories && merged.profile.taskCategories.length > 0
              ? merged.profile.taskCategories.filter(Boolean)
              : DEFAULT_TASK_CATEGORIES,
          deleted: false,
          clientUpdatedAt: merged.profile?.clientUpdatedAt ?? now(),
        }

        const normalizeCollection = <T extends LocalEntity>(items: T[] | undefined) =>
          (items ?? []).map((item) => ({
            ...item,
            deleted: Boolean(item.deleted),
            clientUpdatedAt: item.clientUpdatedAt ?? now(),
          }))

        const tasks = normalizeCollection(merged.tasks).map((task, index) => ({
          ...task,
          order: task.order ?? index + 1,
          xpValue: task.xpValue ?? calculateTaskXP(task),
        }))
        const goals = normalizeCollection(merged.goals)
        const projects = normalizeCollection(merged.projects)
        const achievements = buildAchievementCatalog(normalizeCollection(merged.achievements))
        const schedule = normalizeCollection(merged.schedule)
        const resources = normalizeCollection(merged.resources)
        const journal = normalizeCollection(merged.journal)

        const next = {
          ...merged,
          profile,
          tasks,
          goals,
          projects,
          achievements,
          schedule,
          resources,
          journal,
        }

        const pending = state.sync?.pending ?? buildPendingFromState(next)
        return {
          ...next,
          sync: {
            deviceId: state.sync?.deviceId ?? getOrCreateDeviceId(),
            currentUid: state.sync?.currentUid ?? null,
            status: "idle",
            lastError: null,
            lastPulledAt: state.sync?.lastPulledAt ?? null,
            lastSyncedAt: state.sync?.lastSyncedAt ?? null,
            pending,
          },
        }
      },
    }
  )
)
