import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { closeDayAccess, commitDailyReview, getDailyReviewState } from "./github-write"
import { emptyDailyReviewFields } from "./daily-review"

// 20:00 in Berlin on Saturday 17 October.
const NOW = new Date("2026-10-17T18:00:00Z")
const fields = { ...emptyDailyReviewFields(), decisions: "- Ship Close day" }

function respond(status: number, body: unknown = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })
}

function file(name: string) {
  return { name, type: "file", html_url: `https://github.com/r/${name}` }
}

describe("github-write", () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubEnv("AIOS_GITHUB_WRITE_TOKEN", "test-token")
    vi.stubEnv("AIOS_WRITER_UID", "roman-uid")
    vi.stubGlobal("fetch", fetchMock)
    vi.spyOn(console, "warn").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    fetchMock.mockReset()
  })

  it("lets only the writer uid in, and says not-configured without token or uid", () => {
    expect(closeDayAccess("roman-uid")).toBe("ok")
    expect(closeDayAccess("someone-else")).toBe("forbidden")
    vi.stubEnv("AIOS_WRITER_UID", "")
    expect(closeDayAccess("roman-uid")).toBe("not-configured")
  })

  it("lists today and the six days before it, marking the closed ones", async () => {
    fetchMock.mockResolvedValueOnce(
      respond(200, [file("2026-08-18.md"), file("2026-10-15.md"), file("README.md"), { name: "2026-10-14.md", type: "dir" }]),
    )
    const state = await getDailyReviewState(NOW)
    expect(state.status).toBe("ok")
    expect(state.date).toBe("2026-10-17")
    expect(state.days.map((day) => day.date)).toEqual([
      "2026-10-17",
      "2026-10-16",
      "2026-10-15",
      "2026-10-14",
      "2026-10-13",
      "2026-10-12",
      "2026-10-11",
    ])
    expect(state.days.filter((day) => day.closed)).toEqual([
      { date: "2026-10-15", closed: true, url: "https://github.com/r/2026-10-15.md" },
    ])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toContain("/contents/06_REVIEWS/daily?ref=main")
  })

  it("treats a missing folder as all open only when the token can read the repo", async () => {
    fetchMock.mockResolvedValueOnce(respond(404)).mockResolvedValueOnce(respond(200, { full_name: "romahawk/AI-Business-OS" }))
    const state = await getDailyReviewState(NOW)
    expect(state).toMatchObject({ ok: true, status: "ok" })
    expect(state.days.every((day) => !day.closed)).toBe(true)
    expect(fetchMock.mock.calls[1][0]).toMatch(/\/repos\/romahawk\/AI-Business-OS$/)

    fetchMock.mockResolvedValueOnce(respond(404)).mockResolvedValueOnce(respond(404))
    expect(await getDailyReviewState(NOW)).toMatchObject({ ok: false, status: "no-access", days: [] })
  })

  it("creates today's file on main without a sha, with the daily-close message and no backfill line", async () => {
    fetchMock.mockResolvedValueOnce(
      respond(201, { content: { html_url: "https://github.com/f" }, commit: { html_url: "https://github.com/c" } }),
    )
    const result = await commitDailyReview("2026-10-17", fields, NOW)
    expect(result).toMatchObject({ ok: true, status: "ok", date: "2026-10-17", commitUrl: "https://github.com/c" })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/repos\/romahawk\/AI-Business-OS\/contents\/06_REVIEWS\/daily\/2026-10-17\.md$/)
    expect(init.method).toBe("PUT")
    expect(init.headers.Authorization).toBe("Bearer test-token")
    const body = JSON.parse(init.body)
    expect(body).not.toHaveProperty("sha")
    expect(body.branch).toBe("main")
    expect(body.message).toBe("daily-close: 2026-10-17 (Magic Kick)")
    const content = Buffer.from(body.content, "base64").toString("utf8")
    expect(content).toContain("## Decisions Made\n\n- Ship Close day")
    expect(content).not.toContain("Written on")
  })

  it("closes a missed day under its own date, saying when it was written", async () => {
    fetchMock.mockResolvedValueOnce(respond(201, { content: {}, commit: {} }))
    const result = await commitDailyReview("2026-10-16", fields, NOW)
    expect(result).toMatchObject({ ok: true, date: "2026-10-16" })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/06_REVIEWS\/daily\/2026-10-16\.md$/)
    const body = JSON.parse(init.body)
    expect(body.message).toBe("daily-close: 2026-10-16 (Magic Kick)")
    expect(Buffer.from(body.content, "base64").toString("utf8")).toMatch(
      /^# Daily Review - 2026-10-16\n\n_Written on 2026-10-17 for 2026-10-16\._\n\n## Primary Outcome/,
    )
  })

  it("refuses a day outside the window without calling GitHub", async () => {
    for (const date of ["2026-10-18", "2026-10-10", "2026-08-18", "../x", ""]) {
      expect(await commitDailyReview(date, fields, NOW), date).toMatchObject({ ok: false, status: "forbidden" })
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("never overwrites: a create refused because the file exists comes back as exists", async () => {
    fetchMock
      .mockResolvedValueOnce(respond(422, { message: '"sha" wasn\'t supplied.' }))
      .mockResolvedValueOnce(respond(200, { html_url: "https://github.com/existing" }))
    const result = await commitDailyReview("2026-10-16", fields, NOW)
    expect(result).toMatchObject({ ok: false, status: "exists", url: "https://github.com/existing" })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1][1].method).toBeUndefined()
  })

  it("writes nothing when not configured, and reports GitHub errors without the token", async () => {
    vi.stubEnv("AIOS_GITHUB_WRITE_TOKEN", "")
    expect(await commitDailyReview("2026-10-17", fields, NOW)).toMatchObject({ ok: false, status: "not-configured" })
    expect(fetchMock).not.toHaveBeenCalled()

    vi.stubEnv("AIOS_GITHUB_WRITE_TOKEN", "test-token")
    fetchMock.mockResolvedValueOnce(respond(403))
    const result = await commitDailyReview("2026-10-17", fields, NOW)
    expect(result).toMatchObject({ ok: false, status: "error" })
    expect(JSON.stringify(result)).not.toContain("test-token")
  })
})
