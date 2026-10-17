import { beforeEach, describe, expect, it } from "vitest"
import { useAppStore } from "./store"
import { applyRemoteSnapshot } from "./sync/applyRemote"
import { berlinDateISO } from "./os-feed/daily-review"
import { ENTITY_COLLECTIONS } from "./db/types"
import type { RemoteSnapshot } from "./db/types"
import type { Task } from "./types"

const today = berlinDateISO()
const focus = (title: string): Task =>
  ({ id: title, title, category: "Work", completed: false, xpValue: 10, lane: "daily-focus", order: 1, deleted: false }) as Task

describe("Close day store actions (ADR-034)", () => {
  beforeEach(() => {
    useAppStore.setState((s) => ({
      tasks: [focus("Write ADR")],
      profile: { ...s.profile, dailyFocusSnapshots: [], closeDayChips: [] },
      sync: { ...s.sync, pending: { ...s.sync.pending, profile: {}, tasks: {} } },
    }))
  })

  it("saves today's snapshot on the profile and never touches a task", () => {
    const tasksBefore = useAppStore.getState().tasks
    useAppStore.getState().saveDailyFocusSnapshot()
    const state = useAppStore.getState()
    expect(state.tasks).toBe(tasksBefore)
    expect(state.sync.pending.tasks).toEqual({})
    expect(state.profile.dailyFocusSnapshots).toEqual([
      expect.objectContaining({ date: today, tasks: [{ id: "Write ADR", title: "Write ADR" }] }),
    ])
    expect(state.sync.pending.profile.profile).toBeTypeOf("number")
  })

  it("does not rewrite the profile when the lane is unchanged", () => {
    useAppStore.getState().saveDailyFocusSnapshot()
    const profile = useAppStore.getState().profile
    useAppStore.getState().saveDailyFocusSnapshot()
    expect(useAppStore.getState().profile).toBe(profile)
  })

  it("saves custom chips on the profile, marked for sync", () => {
    useAppStore.getState().addCloseDayChip("blockers", "Kids sick")
    expect(useAppStore.getState().profile.closeDayChips).toEqual([{ section: "blockers", text: "Kids sick" }])
    expect(useAppStore.getState().sync.pending.profile.profile).toBeTypeOf("number")
    useAppStore.getState().removeCloseDayChip("blockers", "Kids sick")
    expect(useAppStore.getState().profile.closeDayChips).toEqual([])
  })

  it("keeps the other device's newer day when the remote profile loses the sync", () => {
    const local = useAppStore.getState().profile
    useAppStore.setState({
      profile: { ...local, clientUpdatedAt: 200, dailyFocusSnapshots: [{ date: today, tasks: [], savedAt: 1 }] },
    })
    const remote = {
      ...local,
      clientUpdatedAt: 100,
      dailyFocusSnapshots: [{ date: today, tasks: [{ id: "r", title: "From laptop" }], savedAt: 50 }],
      closeDayChips: [{ section: "decisions" as const, text: "Remote chip" }],
    }
    const entities = Object.fromEntries(ENTITY_COLLECTIONS.map((name) => [name, []])) as unknown as RemoteSnapshot["entities"]
    applyRemoteSnapshot({ profile: remote, entities, cursor: 0 })
    const profile = useAppStore.getState().profile
    expect(profile.dailyFocusSnapshots?.[0].tasks[0].title).toBe("From laptop")
    // Chips follow the winning profile, like every other profile field.
    expect(profile.closeDayChips).toEqual([])
  })
})
