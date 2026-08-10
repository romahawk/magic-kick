"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { GOOGLE_CALENDAR_IMPORT_WINDOW_DAYS, syncGoogleCalendarEvents } from "@/lib/calendar/google-calendar-sync"
import { fetchGoogleCalendarList, type GoogleCalendarListItem } from "@/lib/calendar/google-calendar-list"
import { requestGoogleCalendarAccessToken } from "@/lib/calendar/google-oauth"
import { useAppStore } from "@/lib/store"
import type { GoogleCalendarSyncStatus } from "@/lib/types"

interface CalendarMetadataDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function splitCalendarIds(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  )
}

export function CalendarMetadataDialog({ open, onOpenChange }: CalendarMetadataDialogProps) {
  const metadata = useAppStore((s) => s.profile.googleCalendar)
  const setMetadata = useAppStore((s) => s.setGoogleCalendarMetadata)
  const disconnectMetadata = useAppStore((s) => s.disconnectGoogleCalendarMetadata)
  const saveExternalCalendarBlock = useAppStore((s) => s.saveExternalCalendarBlock)
  const deleteExternalCalendarBlock = useAppStore((s) => s.deleteExternalCalendarBlock)
  const existingExternalCalendarBlocks = useAppStore((s) => s.externalCalendarBlocks)
  const [enabled, setEnabled] = useState(false)
  const [displayExternalBlocks, setDisplayExternalBlocks] = useState(true)
  const [selectedCalendarIds, setSelectedCalendarIds] = useState("")
  const [syncTokenJson, setSyncTokenJson] = useState("{}")
  const [status, setStatus] = useState<GoogleCalendarSyncStatus>("disconnected")
  const [lastError, setLastError] = useState("")
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [discovering, setDiscovering] = useState(false)
  const [importing, setImporting] = useState(false)
  const [lastImportCount, setLastImportCount] = useState<number | null>(null)
  const [discoveredCalendars, setDiscoveredCalendars] = useState<GoogleCalendarListItem[]>([])

  useEffect(() => {
    if (!open) return
    setEnabled(Boolean(metadata?.enabled))
    setDisplayExternalBlocks(metadata?.displayExternalBlocks ?? true)
    setSelectedCalendarIds((metadata?.selectedCalendarIds ?? []).join("\n"))
    setSyncTokenJson(JSON.stringify(metadata?.syncTokenByCalendarId ?? {}, null, 2))
    setStatus(metadata?.status ?? "disconnected")
    setLastError(metadata?.lastError ?? "")
    setJsonError(null)
    setLastImportCount(null)
    setDiscoveredCalendars([])
  }, [metadata, open])

  const calendarCount = useMemo(() => splitCalendarIds(selectedCalendarIds).length, [selectedCalendarIds])

  function save() {
    let syncTokenByCalendarId: Record<string, string>
    try {
      const parsed = JSON.parse(syncTokenJson || "{}") as unknown
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Sync tokens must be an object.")
      }
      syncTokenByCalendarId = Object.fromEntries(
        Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === "string")
      )
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : "Invalid JSON.")
      return
    }

    setMetadata({
      enabled,
      displayExternalBlocks,
      selectedCalendarIds: splitCalendarIds(selectedCalendarIds),
      syncTokenByCalendarId,
      status,
      lastError: lastError.trim() || undefined,
    })
    onOpenChange(false)
  }

  function disconnect() {
    disconnectMetadata()
    onOpenChange(false)
  }

  async function discoverCalendars() {
    setDiscovering(true)
    setJsonError(null)
    setStatus("syncing")
    setLastError("")
    setMetadata({ status: "syncing", lastError: undefined })
    try {
      const token = await requestGoogleCalendarAccessToken()
      const calendars = await fetchGoogleCalendarList(token)
      const defaultIds = calendars.filter((calendar) => calendar.primary || calendar.selected).map((calendar) => calendar.id)
      setMetadata({
        enabled: true,
        selectedCalendarIds: defaultIds,
        status: "connected",
        lastError: undefined,
      })
      setDiscoveredCalendars(calendars)
      setSelectedCalendarIds(defaultIds.join("\n"))
      setEnabled(true)
      setStatus("connected")
      setLastError("")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Calendar discovery failed."
      setStatus("error")
      setLastError(message)
      setMetadata({ status: "error", lastError: message })
    } finally {
      setDiscovering(false)
    }
  }

  async function importUpcomingEvents() {
    const calendarIds = splitCalendarIds(selectedCalendarIds)
    if (calendarIds.length === 0) {
      setStatus("error")
      setLastError("Select at least one calendar first.")
      return
    }

    setImporting(true)
    setJsonError(null)
    setLastImportCount(null)
    setStatus("syncing")
    setLastError("")
    setMetadata({
      enabled: true,
      selectedCalendarIds: calendarIds,
      status: "syncing",
      lastError: undefined,
    })
    try {
      const token = await requestGoogleCalendarAccessToken()
      const imported = await syncGoogleCalendarEvents({
        accessToken: token,
        calendarIds,
        existingBlocks: existingExternalCalendarBlocks,
        saveExternalCalendarBlock,
        deleteExternalCalendarBlock,
      })

      setMetadata({
        enabled: true,
        selectedCalendarIds: calendarIds,
        status: "connected",
        lastError: undefined,
        lastSyncedAt: Date.now(),
      })
      setLastImportCount(imported)
      setStatus("connected")
      setLastError("")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Event import failed."
      setStatus("error")
      setLastError(message)
      setMetadata({ status: "error", lastError: message })
    } finally {
      setImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Calendar metadata</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <div>
              <p className="text-sm font-medium">Enabled</p>
              <p className="text-xs text-muted-foreground">{calendarCount} selected calendars</p>
            </div>
            <Checkbox checked={enabled} onCheckedChange={(checked) => setEnabled(checked === true)} />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="calendar-ids">Selected calendar IDs</Label>
              <Button type="button" variant="outline" size="sm" onClick={discoverCalendars} disabled={discovering}>
                {discovering ? "Discovering..." : "Discover calendars"}
              </Button>
            </div>
            <Textarea
              id="calendar-ids"
              value={selectedCalendarIds}
              onChange={(event) => setSelectedCalendarIds(event.target.value)}
              rows={4}
              placeholder="primary"
              className="font-mono text-xs"
            />
          </div>

          {discoveredCalendars.length > 0 ? (
            <div className="space-y-2 rounded-md border px-3 py-2">
              <p className="text-sm font-medium">Discovered calendars</p>
              <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                {discoveredCalendars.map((calendar) => {
                  const selected = splitCalendarIds(selectedCalendarIds).includes(calendar.id)
                  return (
                    <label key={calendar.id} className="flex cursor-pointer items-start gap-2 text-sm">
                      <Checkbox
                        checked={selected}
                        onCheckedChange={(checked) => {
                          const current = splitCalendarIds(selectedCalendarIds)
                          const next =
                            checked === true
                              ? Array.from(new Set([...current, calendar.id]))
                              : current.filter((id) => id !== calendar.id)
                          setSelectedCalendarIds(next.join("\n"))
                        }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">
                          {calendar.summary}
                          {calendar.primary ? " (primary)" : ""}
                        </span>
                        <span className="block truncate font-mono text-[11px] text-muted-foreground">{calendar.id}</span>
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          ) : null}

          <div className="rounded-md border px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Upcoming events</p>
                <p className="text-xs text-muted-foreground">
                  Next {GOOGLE_CALENDAR_IMPORT_WINDOW_DAYS} days from selected calendars
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={importUpcomingEvents} disabled={importing}>
                {importing ? "Importing..." : "Import events"}
              </Button>
            </div>
            {lastImportCount !== null ? (
              <p className="mt-2 text-xs text-muted-foreground">Imported {lastImportCount} external blocks.</p>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as GoogleCalendarSyncStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="disconnected">Disconnected</SelectItem>
                  <SelectItem value="connected">Connected</SelectItem>
                  <SelectItem value="syncing">Syncing</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="calendar-error">Last error</Label>
              <Textarea
                id="calendar-error"
                value={lastError}
                onChange={(event) => setLastError(event.target.value)}
                placeholder="None"
                rows={3}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <div>
              <p className="text-sm font-medium">Display external blocks</p>
              <p className="text-xs text-muted-foreground">Stored preference only</p>
            </div>
            <Checkbox
              checked={displayExternalBlocks}
              onCheckedChange={(checked) => setDisplayExternalBlocks(checked === true)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sync-token-json">Sync token placeholders</Label>
            <Textarea
              id="sync-token-json"
              value={syncTokenJson}
              onChange={(event) => {
                setSyncTokenJson(event.target.value)
                setJsonError(null)
              }}
              rows={5}
              className="font-mono text-xs"
            />
            {jsonError ? <p className="text-xs text-destructive">{jsonError}</p> : null}
          </div>

          {metadata?.lastSyncedAt ? (
            <p className="text-xs text-muted-foreground">
              Last synced: {new Date(metadata.lastSyncedAt).toLocaleString()}
            </p>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={disconnect}>
            Disconnect
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={save}>
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
