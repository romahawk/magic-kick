import type { ExternalCalendarBlock, ExternalCalendarBlockStatus } from "@/lib/types"

export interface GoogleCalendarEventDateTime {
  date?: string
  dateTime?: string
  timeZone?: string
}

export interface GoogleCalendarEventLike {
  id?: string
  etag?: string
  status?: string
  summary?: string
  htmlLink?: string
  location?: string
  updated?: string
  start?: GoogleCalendarEventDateTime
  end?: GoogleCalendarEventDateTime
  transparency?: string
  iCalUID?: string
  recurringEventId?: string
}

export interface GoogleEventMapperInput {
  calendarId: string
  event: GoogleCalendarEventLike
}

export function externalBlockId(calendarId: string, eventId: string) {
  return `gcal:${encodeURIComponent(calendarId)}:${encodeURIComponent(eventId)}`
}

function normalizeStatus(status?: string): ExternalCalendarBlockStatus {
  if (status === "tentative" || status === "cancelled") return status
  return "confirmed"
}

function parseEndpoint(endpoint?: GoogleCalendarEventDateTime) {
  if (!endpoint) return null
  if (endpoint.dateTime) {
    return {
      iso: endpoint.dateTime,
      allDay: false,
    }
  }
  if (endpoint.date) {
    return {
      iso: `${endpoint.date}T00:00:00`,
      allDay: true,
    }
  }
  return null
}

function parseUpdatedAt(updated?: string) {
  if (!updated) return undefined
  const timestamp = Date.parse(updated)
  return Number.isFinite(timestamp) ? timestamp : undefined
}

export function mapGoogleEventToExternalCalendarBlock({
  calendarId,
  event,
}: GoogleEventMapperInput): ExternalCalendarBlock | null {
  const safeCalendarId = calendarId.trim()
  const safeEventId = event.id?.trim()
  if (!safeCalendarId || !safeEventId) return null

  const status = normalizeStatus(event.status)
  const start = parseEndpoint(event.start)
  const end = parseEndpoint(event.end)
  const isCancelled = status === "cancelled"

  if ((!start || !end) && !isCancelled) return null

  return {
    id: externalBlockId(safeCalendarId, safeEventId),
    source: "google-calendar",
    externalCalendarId: safeCalendarId,
    externalEventId: safeEventId,
    externalRecurringEventId: event.recurringEventId?.trim() || undefined,
    externalICalUID: event.iCalUID?.trim() || undefined,
    externalEtag: event.etag?.trim() || undefined,
    title: event.summary?.trim() || "Untitled event",
    startISO: start?.iso,
    endISO: end?.iso,
    allDay: Boolean(start?.allDay || end?.allDay),
    blocksTime: !isCancelled && event.transparency !== "transparent",
    status,
    htmlLink: event.htmlLink?.trim() || undefined,
    location: event.location?.trim() || undefined,
    deleted: isCancelled,
    clientUpdatedAt: parseUpdatedAt(event.updated),
  }
}
