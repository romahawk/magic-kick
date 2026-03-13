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
  ProjectMilestone,
  Resource,
  ScheduleItem,
  SyncCollection,
  SyncState,
  Task,
} from "./types"
import { generateId } from "./game-utils"
import { normalizeSystemConfig } from "./execution-os"
import { getOrCreateDeviceId } from "@/lib/sync/deviceId"
import { applyTaskCompletionXP, calculateTaskXP, normalizeProfileForToday, rollbackTaskXP } from "@/lib/xp-engine"
import { levelFromXP } from "@/lib/game-utils"
import { buildAchievementCatalog, evaluateAchievementUnlocks } from "@/lib/achievement-engine"
import {
  seedAchievements,
  seedGoals,
  seedJournal,
  seedProfile,
  seedProjects,
  seedResources,
  seedSchedule,
  seedTasks,
} from "@/lib/seed-data"

export const STORE_KEY = "magic-kick-store"
const DEFAULT_TASK_CATEGORIES = ["Learning", "Sport", "Family/Home", "Hobby", "Travel"]
const DEFAULT_TASK_CATEGORY_COLORS: Record<string, string> = {
  Learning: "#22c55e",
  Sport: "#f97316",
  "Family/Home": "#06b6d4",
  Hobby: "#a855f7",
  Travel: "#f59e0b",
}

function colorFromCategoryName(name: string) {
  const source = name.trim().toLowerCase()
  let hash = 0
  for (let i = 0; i < source.length; i++) {
    hash = source.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 70%, 50%)`
}

function buildCategoryColors(categories: string[], existing?: Record<string, string>) {
  const result: Record<string, string> = {}
  for (const category of categories) {
    result[category] = existing?.[category] ?? DEFAULT_TASK_CATEGORY_COLORS[category] ?? colorFromCategoryName(category)
  }
  return result
}

function inferScheduleBlockTypeId(
  item: Pick<ScheduleItem, "hasExplicitTime" | "startISO" | "endISO" | "blockTypeId">,
  blockIds: string[]
) {
  if (item.blockTypeId && blockIds.includes(item.blockTypeId)) return item.blockTypeId
  if (item.hasExplicitTime === false || blockIds.length === 0) return undefined
  const start = parseISO(item.startISO).getTime()
  const end = parseISO(item.endISO).getTime()
  const durationMinutes = Math.round((end - start) / 60000)
  if (!Number.isFinite(durationMinutes) || durationMinutes < 45) return undefined
  if (durationMinutes >= 90) return blockIds[0]
  return blockIds[Math.min(2, blockIds.length - 1)] ?? blockIds[0]
}

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

function normalizeTimeHHmm(input?: string) {
  const trimmed = input?.trim()
  if (!trimmed) return undefined
  return /^\d{2}:\d{2}$/.test(trimmed) ? trimmed : undefined
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

function sortProjectMilestones<T extends Pick<ProjectMilestone, "dayIndex" | "title">>(milestones: T[]): T[] {
  return [...milestones].sort((a, b) => {
    if (a.dayIndex !== b.dayIndex) return a.dayIndex - b.dayIndex
    return a.title.localeCompare(b.title)
  })
}

function createInitialData() {
  const profile: Profile = {
    name: "New Player",
    onboardingCompleted: false,
    taskCategories: DEFAULT_TASK_CATEGORIES,
    taskCategoryColors: DEFAULT_TASK_CATEGORY_COLORS,
    systemConfig: normalizeSystemConfig(),
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
  updateSystemConfig: (updates: Partial<NonNullable<Profile["systemConfig"]>>) => void
  setFocusedProject: (projectId?: string) => void
  addCategory: (name: string) => void
  renameCategory: (from: string, to: string) => void
  deleteCategory: (name: string) => void
  setCategoryColor: (name: string, color: string) => void
  toggleTask: (id: string) => void
  addTask: (task: Omit<Task, "id" | "xpValue"> & Partial<Pick<Task, "xpValue">> & { timeHHmm?: string }) => void
  reorderTasks: (draggedTaskId: string, targetTaskId: string) => void
  updateTask: (
    id: string,
    updates: Partial<Omit<Task, "id" | "deleted" | "clientUpdatedAt">>,
    timing?: { startHHmm?: string; endHHmm?: string; blockTypeId?: string }
  ) => void
  unscheduleTask: (id: string) => void
  moveTaskToTodo: (id: string) => void
  deleteTask: (id: string) => void
  addGoal: (goal: Omit<Goal, "id">) => void
  updateGoal: (id: string, updates: Partial<Omit<Goal, "id" | "deleted" | "clientUpdatedAt">>) => void
  updateGoalProgress: (id: string, progress: number) => void
  reorderGoals: (draggedGoalId: string, targetGoalId: string) => void
  convertWishlistToGoal: (id: string) => void
  addProject: (project: Omit<Project, "id" | "milestones"> & { milestones?: Array<{ title: string; dayIndex: number }> }) => void
  updateProject: (projectId: string, updates: Partial<Omit<Project, "id" | "milestones">>) => void
  deleteProject: (projectId: string) => void
  addMilestone: (projectId: string, milestone: Pick<ProjectMilestone, "title" | "dayIndex">) => void
  updateMilestone: (
    projectId: string,
    milestoneId: string,
    updates: Partial<Pick<ProjectMilestone, "title" | "dayIndex" | "completed">>
  ) => void
  deleteMilestone: (projectId: string, milestoneId: string) => void
  addAchievement: (a: Omit<Achievement, "id">) => void
  addResource: (r: Omit<Resource, "id">) => void
  reorderResources: (draggedResourceId: string, targetResourceId: string) => void
  updateResource: (id: string, updates: Partial<Omit<Resource, "id" | "deleted" | "clientUpdatedAt">>) => void
  deleteResource: (id: string) => void
  addJournalEntry: (j: Omit<JournalEntry, "id">) => void
  addScheduleItem: (s: Omit<ScheduleItem, "id">) => void
  updateScheduleItem: (id: string, updates: Partial<Omit<ScheduleItem, "id" | "deleted" | "clientUpdatedAt">>) => void
  toggleMilestone: (projectId: string, milestoneId: string) => void

  setSyncStatus: (status: SyncState["status"], error?: string | null) => void
  markPending: (collection: SyncCollection, id: string, clientUpdatedAt?: number) => void
  clearPending: (changes: Array<{ collection: SyncCollection; id: string }>) => void
  setCurrentUid: (uid: string | null) => void
  setLastPulledAt: (timestamp: number | null) => void
  setLastSyncedAt: (timestamp: number | null) => void

  isDemoMode: boolean
  activateDemoMode: () => void
  exitDemoMode: () => void
}

const initialData = createInitialData()

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialData,
      activeModule: "command-center",
      sync: createInitialSyncState(),
      isDemoMode: false,

      setActiveModule: (m) => set({ activeModule: m }),

      activateDemoMode: () => {
        const ts = now()
        const profile: Profile = {
          ...seedProfile,
          taskCategories: DEFAULT_TASK_CATEGORIES,
          taskCategoryColors: DEFAULT_TASK_CATEGORY_COLORS,
          systemConfig: normalizeSystemConfig(seedProfile.systemConfig),
          deleted: false,
          clientUpdatedAt: ts,
          createdAt: ts,
          updatedAt: ts,
        }
        const achievements = buildAchievementCatalog(
          seedAchievements.map((a) => ({ ...a, clientUpdatedAt: ts, createdAt: ts, updatedAt: ts }))
        )
        set({
          isDemoMode: true,
          profile,
          tasks: seedTasks.map((t, i) => ({ ...t, lane: t.lane ?? "backlog", order: t.order ?? i + 1, deleted: false, clientUpdatedAt: ts, createdAt: ts, updatedAt: ts })),
          goals: seedGoals.map((g) => ({ ...g, deleted: false, clientUpdatedAt: ts, createdAt: ts, updatedAt: ts })),
          projects: seedProjects.map((p) => ({ ...p, deleted: false, clientUpdatedAt: ts, createdAt: ts, updatedAt: ts })),
          achievements,
          schedule: seedSchedule.map((s) => ({ ...s, deleted: false, clientUpdatedAt: ts, createdAt: ts, updatedAt: ts })),
          resources: seedResources.map((r, index) => ({ ...r, order: r.order ?? index + 1, deleted: false, clientUpdatedAt: ts, createdAt: ts, updatedAt: ts })),
          journal: seedJournal.map((j) => ({ ...j, deleted: false, clientUpdatedAt: ts, createdAt: ts, updatedAt: ts })),
          activeModule: "command-center",
          sync: createInitialSyncState(),
        })
      },

      exitDemoMode: () => {
        set({
          ...createInitialData(),
          isDemoMode: false,
          activeModule: "command-center",
          sync: createInitialSyncState(),
        })
      },

      completeOnboarding: (name) => {
        const ts = now()
        const safeName = name.trim() || "New Player"
        set((s) => {
          const baseProfile: Profile = {
            ...s.profile,
            name: safeName,
            onboardingCompleted: true,
            systemConfig: normalizeSystemConfig(s.profile.systemConfig),
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
              taskCategoryColors: {
                ...(s.profile.taskCategoryColors ?? DEFAULT_TASK_CATEGORY_COLORS),
                [normalized]: colorFromCategoryName(normalized),
              },
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
          const colors = s.profile.taskCategoryColors ?? DEFAULT_TASK_CATEGORY_COLORS
          const nextColors = { ...colors }
          nextColors[nextName] = colors[from] ?? colorFromCategoryName(nextName)
          delete nextColors[from]
          const changedTaskIds: string[] = []
          const changedGoalIds: string[] = []
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
          const nextGoals = s.goals.map((goal) => {
            if (goal.category !== from) return goal
            changedGoalIds.push(goal.id)
            return {
              ...goal,
              category: nextName,
              clientUpdatedAt: ts,
              deleted: false,
            }
          })
          const pendingTasks = { ...s.sync.pending.tasks }
          for (const taskId of changedTaskIds) pendingTasks[taskId] = ts
          const pendingGoals = { ...s.sync.pending.goals }
          for (const goalId of changedGoalIds) pendingGoals[goalId] = ts

          return {
            profile: {
              ...s.profile,
              taskCategories: nextCategories,
              taskCategoryColors: nextColors,
              clientUpdatedAt: ts,
              deleted: false,
            },
            tasks: nextTasks,
            goals: nextGoals,
            sync: {
              ...s.sync,
              pending: {
                ...s.sync.pending,
                profile: { ...s.sync.pending.profile, profile: ts },
                tasks: pendingTasks,
                goals: pendingGoals,
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
          const colors = s.profile.taskCategoryColors ?? DEFAULT_TASK_CATEGORY_COLORS
          const nextColors = { ...colors }
          delete nextColors[name]
          if (!nextColors[fallback]) {
            nextColors[fallback] = DEFAULT_TASK_CATEGORY_COLORS[fallback] ?? colorFromCategoryName(fallback)
          }

          const changedTaskIds: string[] = []
          const changedGoalIds: string[] = []
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
          const nextGoals = s.goals.map((goal) => {
            if (goal.category !== name) return goal
            changedGoalIds.push(goal.id)
            return {
              ...goal,
              category: fallback,
              clientUpdatedAt: ts,
              deleted: false,
            }
          })
          const pendingTasks = { ...s.sync.pending.tasks }
          for (const taskId of changedTaskIds) pendingTasks[taskId] = ts
          const pendingGoals = { ...s.sync.pending.goals }
          for (const goalId of changedGoalIds) pendingGoals[goalId] = ts

          return {
            profile: {
              ...s.profile,
              taskCategories: nextCategories,
              taskCategoryColors: nextColors,
              clientUpdatedAt: ts,
              deleted: false,
            },
            tasks: nextTasks,
            goals: nextGoals,
            sync: {
              ...s.sync,
              pending: {
                ...s.sync.pending,
                profile: { ...s.sync.pending.profile, profile: ts },
                tasks: pendingTasks,
                goals: pendingGoals,
              },
            },
          }
        })
      },

      setCategoryColor: (name, color) => {
        const normalized = color.trim()
        if (!name || !normalized) return
        const ts = now()
        set((s) => ({
          profile: {
            ...s.profile,
            taskCategoryColors: {
              ...(s.profile.taskCategoryColors ?? DEFAULT_TASK_CATEGORY_COLORS),
              [name]: normalized,
            },
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
        }))
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
        const { timeHHmm, ...taskInput } = task
        const id = generateId()
        const xpValue = taskInput.xpValue ?? calculateTaskXP(taskInput)
        set((s) => {
          const maxOrder = s.tasks.reduce((max, entry) => Math.max(max, entry.order ?? 0), 0)
          const item = touchEntity({ ...taskInput, lane: taskInput.lane ?? "backlog", id, xpValue, order: maxOrder + 1, deleted: false })
          const nextTasks = [...s.tasks, item]
          const nextSchedule = [...s.schedule]
          const ts = item.clientUpdatedAt ?? now()

          if (item.dueDate) {
            const startHHmm = normalizeTimeHHmm(timeHHmm)
            const scheduleId = `task-${item.id}`
            nextSchedule.push(
              touchEntity({
                id: scheduleId,
                title: item.title,
                type: "task",
                startISO: startHHmm ? format(parseISO(`${item.dueDate}T${startHHmm}`), "yyyy-MM-dd'T'HH:mm") : `${item.dueDate}T00:00`,
                endISO: startHHmm
                  ? format(addMinutes(parseISO(`${item.dueDate}T${startHHmm}`), item.estimateMin ?? 30), "yyyy-MM-dd'T'HH:mm")
                  : `${item.dueDate}T00:00`,
                hasExplicitTime: Boolean(startHHmm),
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
            const existingHasExplicitTime = existing?.hasExplicitTime ?? true
            const existingStart = existingHasExplicitTime && existing ? format(parseISO(existing.startISO), "HH:mm") : undefined
            const existingEnd = existingHasExplicitTime && existing ? format(parseISO(existing.endISO), "HH:mm") : undefined
            const requestedStart = normalizeTimeHHmm(timing?.startHHmm)
            const requestedEnd = normalizeTimeHHmm(timing?.endHHmm)
            const hasExplicitTime = Boolean(requestedStart || requestedEnd || existingStart || existingEnd)
            const startHHmm = requestedStart ?? existingStart ?? "09:00"
            const endHHmm =
              requestedEnd ??
              existingEnd ??
              format(addMinutes(parseISO(`${merged.dueDate}T${startHHmm}`), merged.estimateMin ?? 30), "HH:mm")

              const nextSchedule: ScheduleItem = {
                id: existing?.id ?? `task-${id}`,
                title: merged.title,
                type: "task",
                startISO: hasExplicitTime ? `${merged.dueDate}T${startHHmm}` : `${merged.dueDate}T00:00`,
                endISO: hasExplicitTime ? `${merged.dueDate}T${endHHmm}` : `${merged.dueDate}T00:00`,
                hasExplicitTime,
                color: existing?.color ?? "bg-chart-1",
                blockTypeId:
                  timing?.blockTypeId !== undefined
                    ? timing.blockTypeId || undefined
                    : existing?.blockTypeId,
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
        const current = get()
        const maxOrder = current.goals.reduce((max, entry) => Math.max(max, entry.order ?? 0), 0)
        const item = touchEntity({ ...goal, id, order: maxOrder + 1, deleted: false })
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

      updateSystemConfig: (updates) => {
        const ts = now()
        set((s) => ({
          profile: {
            ...s.profile,
            systemConfig: normalizeSystemConfig({
              ...s.profile.systemConfig,
              ...updates,
            }),
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
        }))
      },

      setFocusedProject: (projectId) => {
        const ts = now()
        set((s) => ({
          profile: {
            ...s.profile,
            focusedProjectId: projectId || undefined,
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
        }))
      },

      updateGoal: (id, updates) => {
        const ts = now()
        set((s) => ({
          goals: s.goals.map((goal) =>
            goal.id === id
              ? {
                  ...goal,
                  ...updates,
                  clientUpdatedAt: ts,
                  deleted: false,
                }
              : goal
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

      reorderGoals: (draggedGoalId, targetGoalId) => {
        if (draggedGoalId === targetGoalId) return
        const ts = now()
        set((s) => {
          const visibleGoals = s.goals.filter((goal) => !goal.deleted)
          const draggedGoal = visibleGoals.find((goal) => goal.id === draggedGoalId)
          const targetGoal = visibleGoals.find((goal) => goal.id === targetGoalId)
          if (!draggedGoal || !targetGoal) return {}
          if (draggedGoal.status !== targetGoal.status) return {}
          if (draggedGoal.status === "active" && draggedGoal.horizon !== targetGoal.horizon) return {}

          const groupGoals = visibleGoals
            .filter((goal) =>
              goal.status === draggedGoal.status &&
              (goal.status !== "active" || goal.horizon === draggedGoal.horizon)
            )
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          const fromIndex = groupGoals.findIndex((goal) => goal.id === draggedGoalId)
          const toIndex = groupGoals.findIndex((goal) => goal.id === targetGoalId)
          if (fromIndex < 0 || toIndex < 0) return {}

          const reordered = [...groupGoals]
          const [moved] = reordered.splice(fromIndex, 1)
          reordered.splice(toIndex, 0, moved)

          const nextOrderById = reordered.reduce<Record<string, number>>((acc, goal, index) => {
            acc[goal.id] = index + 1
            return acc
          }, {})

          const pendingGoals = { ...s.sync.pending.goals }
          for (const goalId of Object.keys(nextOrderById)) pendingGoals[goalId] = ts

          return {
            goals: s.goals.map((goal) =>
              nextOrderById[goal.id]
                ? {
                    ...goal,
                    order: nextOrderById[goal.id],
                    clientUpdatedAt: ts,
                    deleted: false,
                  }
                : goal
            ),
            sync: {
              ...s.sync,
              pending: {
                ...s.sync.pending,
                goals: pendingGoals,
              },
            },
          }
        })
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
        const milestones = sortProjectMilestones(
          (project.milestones ?? []).map((milestone) => ({
            id: generateId(),
            title: milestone.title,
            dayIndex: milestone.dayIndex,
            completed: false,
          }))
        )
        const item = touchEntity({
          id,
          title: project.title,
          objective: project.objective,
          status: project.status ?? "active",
          weeklyOutcome: project.weeklyOutcome?.trim() || undefined,
          weekStartISO: project.weekStartISO,
          weekEndISO: project.weekEndISO,
          color: project.color,
          url: project.url,
          links: project.links,
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
                  weeklyOutcome:
                    typeof updates.weeklyOutcome === "string" ? updates.weeklyOutcome.trim() || undefined : p.weeklyOutcome,
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
          profile: {
            ...s.profile,
            focusedProjectId: s.profile.focusedProjectId === projectId ? undefined : s.profile.focusedProjectId,
            clientUpdatedAt: ts,
            deleted: false,
          },
          sync: {
            ...s.sync,
            pending: {
              ...s.sync.pending,
              profile: { ...s.sync.pending.profile, profile: ts },
              projects: { ...s.sync.pending.projects, [projectId]: ts },
            },
          },
        }))
      },

      addMilestone: (projectId, milestone) => {
        const ts = now()
        const nextMilestone: ProjectMilestone = {
          id: generateId(),
          title: milestone.title.trim() || "Milestone",
          dayIndex: Math.max(0, Math.min(6, milestone.dayIndex)),
          completed: false,
        }
        set((s) => ({
          projects: s.projects.map((project) =>
            project.id === projectId
              ? {
                  ...project,
                  clientUpdatedAt: ts,
                  deleted: false,
                  milestones: sortProjectMilestones([...project.milestones, nextMilestone]),
                }
              : project
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

      updateMilestone: (projectId, milestoneId, updates) => {
        const ts = now()
        set((s) => ({
          projects: s.projects.map((project) =>
            project.id === projectId
              ? {
                  ...project,
                  clientUpdatedAt: ts,
                  deleted: false,
                  milestones: sortProjectMilestones(
                    project.milestones.map((milestone) =>
                      milestone.id === milestoneId
                        ? {
                            ...milestone,
                            ...(typeof updates.title === "string"
                              ? { title: updates.title.trim() || milestone.title }
                              : {}),
                            ...(typeof updates.dayIndex === "number"
                              ? { dayIndex: Math.max(0, Math.min(6, updates.dayIndex)) }
                              : {}),
                            ...(typeof updates.completed === "boolean" ? { completed: updates.completed } : {}),
                          }
                        : milestone
                    )
                  ),
                }
              : project
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

      deleteMilestone: (projectId, milestoneId) => {
        const ts = now()
        set((s) => ({
          projects: s.projects.map((project) =>
            project.id === projectId
              ? {
                  ...project,
                  clientUpdatedAt: ts,
                  deleted: false,
                  milestones: project.milestones.filter((milestone) => milestone.id !== milestoneId),
                }
              : project
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
        const maxOrder = get().resources.reduce((max, entry) => Math.max(max, entry.order ?? 0), 0)
        const item = touchEntity({ ...r, id, order: maxOrder + 1, deleted: false })
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

      reorderResources: (draggedResourceId, targetResourceId) => {
        if (draggedResourceId === targetResourceId) return
        const ts = now()
        set((s) => {
          const active = s.resources.filter((resource) => !resource.deleted).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          const draggedIndex = active.findIndex((resource) => resource.id === draggedResourceId)
          const targetIndex = active.findIndex((resource) => resource.id === targetResourceId)
          if (draggedIndex < 0 || targetIndex < 0) return {}

          const nextActive = [...active]
          const [dragged] = nextActive.splice(draggedIndex, 1)
          nextActive.splice(targetIndex, 0, dragged)

          const orderById = new Map<string, number>()
          nextActive.forEach((resource, index) => {
            orderById.set(resource.id, index + 1)
          })

          const resources = s.resources.map((resource) => {
            const nextOrder = orderById.get(resource.id)
            if (!nextOrder) return resource
            return {
              ...resource,
              order: nextOrder,
              clientUpdatedAt: ts,
              deleted: false,
            }
          })

          const pendingResources = { ...s.sync.pending.resources }
          for (const resource of nextActive) {
            pendingResources[resource.id] = ts
          }

          return {
            resources,
            sync: {
              ...s.sync,
              pending: {
                ...s.sync.pending,
                resources: pendingResources,
              },
            },
          }
        })
      },

      updateResource: (id, updates) => {
        const ts = now()
        set((s) => ({
          resources: s.resources.map((resource) =>
            resource.id === id
              ? {
                  ...resource,
                  ...updates,
                  clientUpdatedAt: ts,
                  deleted: false,
                }
              : resource
          ),
          sync: {
            ...s.sync,
            pending: {
              ...s.sync.pending,
              resources: { ...s.sync.pending.resources, [id]: ts },
            },
          },
        }))
      },

      deleteResource: (id) => {
        const ts = now()
        set((s) => ({
          resources: s.resources.map((resource) =>
            resource.id === id
              ? {
                  ...resource,
                  deleted: true,
                  clientUpdatedAt: ts,
                }
              : resource
          ),
          sync: {
            ...s.sync,
            pending: {
              ...s.sync.pending,
              resources: { ...s.sync.pending.resources, [id]: ts },
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

      updateScheduleItem: (id, updates) => {
        const ts = now()
        set((s) => ({
          schedule: s.schedule.map((item) =>
            item.id === id
              ? {
                  ...item,
                  ...updates,
                  deleted: false,
                  clientUpdatedAt: ts,
                }
              : item
          ),
          sync: {
            ...s.sync,
            pending: {
              ...s.sync.pending,
              schedule: { ...s.sync.pending.schedule, [id]: ts },
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
      version: 5,
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

        const normalizedConfig = normalizeSystemConfig(merged.profile?.systemConfig)

        const profile: Profile = {
          ...base.profile,
          ...merged.profile,
          name: merged.profile?.name?.trim() || "New Player",
          onboardingCompleted: Boolean(merged.profile?.onboardingCompleted),
          taskCategories: (() => {
            if (merged.profile?.taskCategories && merged.profile.taskCategories.length > 0) {
              return merged.profile.taskCategories.filter(Boolean)
            }
            return DEFAULT_TASK_CATEGORIES
          })(),
          taskCategoryColors: (() => {
            const categories =
              merged.profile?.taskCategories && merged.profile.taskCategories.length > 0
                ? merged.profile.taskCategories.filter(Boolean)
                : DEFAULT_TASK_CATEGORIES
            return buildCategoryColors(categories, merged.profile?.taskCategoryColors)
          })(),
          focusedProjectId: merged.profile?.focusedProjectId || undefined,
          systemConfig: normalizedConfig,
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
          lane: task.lane ?? "backlog",
          order: task.order ?? index + 1,
          xpValue: task.xpValue ?? calculateTaskXP(task),
        }))
        const goals = normalizeCollection(merged.goals).map((goal, index) => ({
          ...goal,
          order: goal.order ?? index + 1,
        }))
        const projects = normalizeCollection(merged.projects).map((project) => ({
          ...project,
          status: project.status ?? "active",
          weeklyOutcome: project.weeklyOutcome?.trim() || project.objective,
          milestones: sortProjectMilestones(
            (project.milestones ?? []).map((milestone) => ({
              id: milestone.id ?? generateId(),
              title: milestone.title ?? "Milestone",
              dayIndex: Math.max(0, Math.min(6, milestone.dayIndex ?? 0)),
              completed: Boolean(milestone.completed),
            }))
          ),
        }))
        const validFocusedProjectId =
          profile.focusedProjectId && projects.some((project) => !project.deleted && project.id === profile.focusedProjectId)
            ? profile.focusedProjectId
            : undefined
        const achievements = buildAchievementCatalog(normalizeCollection(merged.achievements))
        const scheduleBlockIds = normalizedConfig.executionBlocks.map((block) => block.id)
        const schedule = normalizeCollection(merged.schedule).map((item) => ({
          ...item,
          blockTypeId: inferScheduleBlockTypeId(item, scheduleBlockIds),
        }))
        const resources = normalizeCollection(merged.resources).map((resource, index) => ({
          ...resource,
          order: resource.order ?? index + 1,
        }))
        const journal = normalizeCollection(merged.journal)

        const next = {
          ...merged,
          profile: {
            ...profile,
            focusedProjectId: validFocusedProjectId,
          },
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
