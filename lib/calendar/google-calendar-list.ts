export interface GoogleCalendarListItem {
  id: string
  summary: string
  primary?: boolean
  selected?: boolean
  accessRole?: string
  backgroundColor?: string
}

interface GoogleCalendarListResponse {
  nextPageToken?: string
  items?: Array<Partial<GoogleCalendarListItem>>
}

async function googleApiError(response: Response) {
  try {
    const data = (await response.json()) as { error?: { message?: string } }
    return data.error?.message ? `${response.status}: ${data.error.message}` : String(response.status)
  } catch {
    return String(response.status)
  }
}

export async function fetchGoogleCalendarList(accessToken: string): Promise<GoogleCalendarListItem[]> {
  const calendars: GoogleCalendarListItem[] = []
  let pageToken: string | undefined

  do {
    const url = new URL("https://www.googleapis.com/calendar/v3/users/me/calendarList")
    url.searchParams.set("maxResults", "250")
    if (pageToken) url.searchParams.set("pageToken", pageToken)

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Calendar discovery failed (${await googleApiError(response)})`)
    }

    const data = (await response.json()) as GoogleCalendarListResponse
    for (const item of data.items ?? []) {
      if (!item.id || !item.summary) continue
      calendars.push({
        id: item.id,
        summary: item.summary,
        primary: Boolean(item.primary),
        selected: Boolean(item.selected),
        accessRole: item.accessRole,
        backgroundColor: item.backgroundColor,
      })
    }
    pageToken = data.nextPageToken
  } while (pageToken)

  return calendars
}
