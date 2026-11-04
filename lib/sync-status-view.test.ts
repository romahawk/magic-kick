import { describe, expect, it } from "vitest"
import { nextAnnouncement, syncStatusView } from "./sync-status-view"

const NOW = Date.UTC(2026, 10, 4, 12, 0, 0)

describe("syncStatusView", () => {
  it("idle with a last sync shows an icon only and the relative time", () => {
    const v = syncStatusView("idle", NOW - 61_000, NOW)
    expect(v).toMatchObject({ icon: "saved", text: null, tone: "default" })
    expect(v.label).toBe("All changes saved · 1 minute ago · Click to sync now")
  })

  it("idle without a last sync says not synced yet", () => {
    expect(syncStatusView("idle", null, NOW).label).toBe("Not synced yet · Click to sync")
  })

  it("relative time at 59 s, 61 s and 1 h", () => {
    expect(syncStatusView("idle", NOW - 59_000, NOW).label).toContain("59 seconds ago")
    expect(syncStatusView("idle", NOW - 61_000, NOW).label).toContain("1 minute ago")
    expect(syncStatusView("idle", NOW - 3_600_000, NOW).label).toContain("1 hour ago")
  })

  it("syncing shows text and is never announced", () => {
    expect(syncStatusView("syncing", NOW, NOW)).toEqual({
      icon: "syncing", text: "Syncing…", tone: "default", label: "Syncing…", announce: null,
    })
  })

  it("error shows a destructive Retry and an announcement", () => {
    expect(syncStatusView("error", NOW, NOW)).toMatchObject({
      icon: "error", text: "Retry", tone: "destructive", announce: "Sync failed. Retry available.",
    })
  })
})

describe("nextAnnouncement", () => {
  it("announces error once, then recovery once", () => {
    let hadError = false
    const said: Array<string | null> = []
    let prev: "idle" | "syncing" | "error" = "idle"
    for (const next of ["syncing", "error", "syncing", "idle", "syncing", "idle"] as const) {
      const r = nextAnnouncement(prev, next, hadError)
      hadError = r.hadError
      said.push(r.message)
      prev = next
    }
    expect(said).toEqual([null, "Sync failed. Retry available.", null, "All changes saved.", null, null])
  })

  it("stays silent when the status does not change", () => {
    expect(nextAnnouncement("error", "error", true)).toEqual({ message: null, hadError: true })
  })
})
