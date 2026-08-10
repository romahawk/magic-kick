import type { GoogleCalendarEventLike } from "@/lib/calendar/google-event-mapper"

interface GoogleEventsResponse {
  nextPageToken?: string
  items?: GoogleCalendarEventLike[]
}

async function googleApiError(response: Response) {
  try {
    const data = (await response.json()) as { error?: { message?: string } }
    return data.error?.message ? `${response.status}: ${data.error.message}` : String(response.status)
  } catch {
    return String(response.status)
  }
}

export interface FetchGoogleEventsInput {
  accessToken: string
  calendarId: string
  timeMin: string
  timeMax: string
}

export async function fetchGoogleEvents({
  accessToken,
  calendarId,
  timeMin,
  timeMax,
}: FetchGoogleEventsInput): Promise<GoogleCalendarEventLike[]> {
  const events: GoogleCalendarEventLike[] = []
  let pageToken: string | undefined

  do {
    const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`)
    url.searchParams.set("maxResults", "250")
    url.searchParams.set("singleEvents", "true")
    url.searchParams.set("showDeleted", "true")
    url.searchParams.set("orderBy", "startTime")
    url.searchParams.set("timeMin", timeMin)
    url.searchParams.set("timeMax", timeMax)
    if (pageToken) url.searchParams.set("pageToken", pageToken)

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Event import failed for ${calendarId} (${await googleApiError(response)})`)
    }

    const data = (await response.json()) as GoogleEventsResponse
    events.push(...(data.items ?? []))
    pageToken = data.nextPageToken
  } while (pageToken)

  return events
}
