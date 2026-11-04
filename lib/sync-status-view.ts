import { formatDistanceStrict } from "date-fns"

export type SyncStatus = "idle" | "syncing" | "error"
export type SyncTone = "default" | "destructive"
export type SyncIcon = "saved" | "syncing" | "error"

export interface SyncStatusView {
  icon: SyncIcon
  /** Visible text next to the icon; null when only the icon shows (saved). */
  text: string | null
  tone: SyncTone
  /** aria-label and tooltip. */
  label: string
  /** Screen-reader message for entering this state; null for "syncing" (never announced). */
  announce: string | null
}

/** P31: maps the store's sync state to what the top bar draws. Pure; `now` is passed in. */
export function syncStatusView(status: SyncStatus, lastSyncedAt: number | null, now: number): SyncStatusView {
  if (status === "syncing") {
    return { icon: "syncing", text: "Syncing…", tone: "default", label: "Syncing…", announce: null }
  }
  if (status === "error") {
    return {
      icon: "error",
      text: "Retry",
      tone: "destructive",
      label: "Sync failed · Click to retry",
      announce: "Sync failed. Retry available.",
    }
  }
  const label = lastSyncedAt
    ? `All changes saved · ${formatDistanceStrict(lastSyncedAt, now, { addSuffix: true })} · Click to sync now`
    : "Not synced yet · Click to sync"
  return { icon: "saved", text: null, tone: "default", label, announce: "All changes saved." }
}

/**
 * What to announce when the status changes. Only the move into "error" and the return to saved after
 * an error are announced, once each; "syncing" ticks and a plain saved state are silent.
 */
export function nextAnnouncement(
  prev: SyncStatus,
  next: SyncStatus,
  hadError: boolean,
): { message: string | null; hadError: boolean } {
  if (next === prev) return { message: null, hadError }
  if (next === "error") return { message: syncStatusView("error", null, 0).announce, hadError: true }
  if (next === "idle" && hadError) return { message: syncStatusView("idle", null, 0).announce, hadError: false }
  return { message: null, hadError }
}
