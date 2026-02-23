import { useAppStore } from "@/lib/store"
import type { RemoteSnapshot } from "@/lib/db/types"
import type { Profile } from "@/lib/types"

function compareRemoteVsLocal(
  localClientUpdatedAt: number | undefined,
  remoteClientUpdatedAt: number | undefined,
  localUpdatedAt: number | undefined,
  remoteUpdatedAt: number | undefined
) {
  const localClient = localClientUpdatedAt ?? 0
  const remoteClient = remoteClientUpdatedAt ?? 0
  if (remoteClient > localClient) return "remote"
  if (remoteClient < localClient) return "local"
  const localServer = localUpdatedAt ?? 0
  const remoteServer = remoteUpdatedAt ?? 0
  if (remoteServer >= localServer) return "remote"
  return "local"
}

function mergeCollection<T extends { id: string; clientUpdatedAt?: number; updatedAt?: number }>(
  localItems: T[],
  remoteItems: T[]
) {
  const localById = new Map(localItems.map((item) => [item.id, item]))
  const mergedById = new Map<string, T>(localById)
  const overriddenIds: string[] = []

  for (const remoteItem of remoteItems) {
    const local = localById.get(remoteItem.id)
    if (!local) {
      mergedById.set(remoteItem.id, remoteItem)
      overriddenIds.push(remoteItem.id)
      continue
    }
    const winner = compareRemoteVsLocal(local.clientUpdatedAt, remoteItem.clientUpdatedAt, local.updatedAt, remoteItem.updatedAt)
    if (winner === "remote") {
      mergedById.set(remoteItem.id, remoteItem)
      overriddenIds.push(remoteItem.id)
    }
  }

  return {
    items: Array.from(mergedById.values()),
    overriddenIds,
  }
}

function mergeProfile(local: Profile, remote: Profile | null) {
  if (!remote) return { profile: local, remoteWon: false }
  const winner = compareRemoteVsLocal(local.clientUpdatedAt, remote.clientUpdatedAt, local.updatedAt, remote.updatedAt)
  return {
    profile: winner === "remote" ? remote : local,
    remoteWon: winner === "remote",
  }
}

export function applyRemoteSnapshot(snapshot: RemoteSnapshot) {
  const state = useAppStore.getState()
  const profileResult = mergeProfile(state.profile, snapshot.profile)
  const tasks = mergeCollection(state.tasks, snapshot.entities.tasks)
  const goals = mergeCollection(state.goals, snapshot.entities.goals)
  const projects = mergeCollection(state.projects, snapshot.entities.projects)
  const achievements = mergeCollection(state.achievements, snapshot.entities.achievements)
  const schedule = mergeCollection(state.schedule, snapshot.entities.schedule)
  const resources = mergeCollection(state.resources, snapshot.entities.resources)
  const journal = mergeCollection(state.journal, snapshot.entities.journal)

  useAppStore.setState((current) => {
    const nextPending = {
      ...current.sync.pending,
      profile: { ...current.sync.pending.profile },
      tasks: { ...current.sync.pending.tasks },
      goals: { ...current.sync.pending.goals },
      projects: { ...current.sync.pending.projects },
      achievements: { ...current.sync.pending.achievements },
      schedule: { ...current.sync.pending.schedule },
      resources: { ...current.sync.pending.resources },
      journal: { ...current.sync.pending.journal },
    }

    if (profileResult.remoteWon) {
      delete nextPending.profile.profile
    }
    for (const id of tasks.overriddenIds) delete nextPending.tasks[id]
    for (const id of goals.overriddenIds) delete nextPending.goals[id]
    for (const id of projects.overriddenIds) delete nextPending.projects[id]
    for (const id of achievements.overriddenIds) delete nextPending.achievements[id]
    for (const id of schedule.overriddenIds) delete nextPending.schedule[id]
    for (const id of resources.overriddenIds) delete nextPending.resources[id]
    for (const id of journal.overriddenIds) delete nextPending.journal[id]

    return {
      profile: profileResult.profile,
      tasks: tasks.items,
      goals: goals.items,
      projects: projects.items,
      achievements: achievements.items,
      schedule: schedule.items,
      resources: resources.items,
      journal: journal.items.sort((a, b) => b.dateISO.localeCompare(a.dateISO)),
      sync: {
        ...current.sync,
        pending: nextPending,
      },
    }
  })
}
