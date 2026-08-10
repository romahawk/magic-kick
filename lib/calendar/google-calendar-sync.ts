import { fetchGoogleEvents } from "@/lib/calendar/google-events"
import { externalBlockId, mapGoogleEventToExternalCalendarBlock } from "@/lib/calendar/google-event-mapper"
import type { ExternalCalendarBlock } from "@/lib/types"

export const GOOGLE_CALENDAR_IMPORT_WINDOW_DAYS = 14

interface SyncGoogleCalendarEventsInput {
  accessToken: string
  calendarIds: string[]
  existingBlocks: ExternalCalendarBlock[]
  saveExternalCalendarBlock: (block: ExternalCalendarBlock) => void
  deleteExternalCalendarBlock: (id: string) => void
  now?: Date
}

function blockOverlapsWindow(block: ExternalCalendarBlock, timeMin: Date, timeMax: Date) {
  if (!block.startISO || !block.endISO) return false
  const start = Date.parse(block.startISO)
  const end = Date.parse(block.endISO)
  if (!Number.isFinite(start) || !Number.isFinite(end)) return false
  return start < timeMax.getTime() && end > timeMin.getTime()
}

export async function syncGoogleCalendarEvents({
  accessToken,
  calendarIds,
  existingBlocks,
  saveExternalCalendarBlock,
  deleteExternalCalendarBlock,
  now = new Date(),
}: SyncGoogleCalendarEventsInput) {
  const timeMax = new Date(now)
  timeMax.setDate(timeMax.getDate() + GOOGLE_CALENDAR_IMPORT_WINDOW_DAYS)
  const selectedCalendars = new Set(calendarIds)
  const seenBlockIds = new Set<string>()
  let imported = 0

  for (const calendarId of calendarIds) {
    const events = await fetchGoogleEvents({
      accessToken,
      calendarId,
      timeMin: now.toISOString(),
      timeMax: timeMax.toISOString(),
    })

    for (const event of events) {
      if (event.id) seenBlockIds.add(externalBlockId(calendarId, event.id))
      const block = mapGoogleEventToExternalCalendarBlock({ calendarId, event })
      if (!block) continue
      saveExternalCalendarBlock(block)
      imported += 1
    }
  }

  for (const block of existingBlocks) {
    if (
      block.source === "google-calendar" &&
      !block.deleted &&
      selectedCalendars.has(block.externalCalendarId) &&
      blockOverlapsWindow(block, now, timeMax) &&
      !seenBlockIds.has(block.id)
    ) {
      deleteExternalCalendarBlock(block.id)
    }
  }

  return imported
}
