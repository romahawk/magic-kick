import { beforeEach, describe, expect, it } from "vitest"
import { DONE_MAX_KEYS, commitmentDoneKey, toggleDoneKey } from "./commitments"
import { useAppStore } from "./store"

describe("commitmentDoneKey (ADR-039)", () => {
  it("is date | start | lowercased trimmed title, and all-day for an untimed row", () => {
    expect(commitmentDoneKey({ date: "2026-11-05", start: "11:00", title: "  Isis call " })).toBe("2026-11-05|11:00|isis call")
    expect(commitmentDoneKey({ date: "2026-11-05", start: null, title: "Nexperia follow-up" })).toBe("2026-11-05|all-day|nexperia follow-up")
  })
  it("does not depend on the row number, so reordering rows keeps the mark", () => {
    const a = commitmentDoneKey({ date: "2026-11-05", start: "11:00", title: "Isis call" })
    expect(a).toBe(commitmentDoneKey({ date: "2026-11-05", start: "11:00", title: "Isis call" }))
  })
  it("a retitled or re-timed row is a different key", () => {
    const base = commitmentDoneKey({ date: "2026-11-05", start: "11:00", title: "Isis call" })
    expect(commitmentDoneKey({ date: "2026-11-05", start: "11:00", title: "Isis call moved" })).not.toBe(base)
    expect(commitmentDoneKey({ date: "2026-11-05", start: "12:00", title: "Isis call" })).not.toBe(base)
  })
})

describe("toggleDoneKey", () => {
  const today = "2026-11-05"
  it("adds a key, then removes it", () => {
    const added = toggleDoneKey(undefined, "2026-11-05|all-day|x", today)
    expect(added).toEqual(["2026-11-05|all-day|x"])
    expect(toggleDoneKey(added, "2026-11-05|all-day|x", today)).toEqual([])
  })
  it("drops keys dated more than 90 days before today, keeps the boundary day", () => {
    const keys = ["2026-08-07|all-day|boundary", "2026-08-06|all-day|old"]
    expect(toggleDoneKey(keys, "2026-11-05|all-day|new", today)).toEqual(["2026-08-07|all-day|boundary", "2026-11-05|all-day|new"])
  })
  it("keeps at most 500 keys, newest last", () => {
    const keys = Array.from({ length: DONE_MAX_KEYS }, (_, i) => `2026-11-05|all-day|k${i}`)
    const next = toggleDoneKey(keys, "2026-11-05|all-day|last", today)
    expect(next).toHaveLength(DONE_MAX_KEYS)
    expect(next[next.length - 1]).toBe("2026-11-05|all-day|last")
    expect(next).not.toContain("2026-11-05|all-day|k0")
  })
})

describe("toggleCommitmentDone store action", () => {
  beforeEach(() => {
    useAppStore.setState((s) => ({ profile: { ...s.profile, doneCommitments: [] } }))
  })
  it("saves the key on the profile, marked for sync, and untoggles it", () => {
    useAppStore.getState().toggleCommitmentDone("2026-11-05|11:00|isis call", "2026-11-05")
    expect(useAppStore.getState().profile.doneCommitments).toEqual(["2026-11-05|11:00|isis call"])
    expect(useAppStore.getState().sync.pending.profile.profile).toBeTypeOf("number")
    useAppStore.getState().toggleCommitmentDone("2026-11-05|11:00|isis call", "2026-11-05")
    expect(useAppStore.getState().profile.doneCommitments).toEqual([])
  })
})
