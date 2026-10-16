import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { closeDayAccess, commitDailyReview, getDailyReviewState } from "./github-write"
import { emptyDailyReviewFields } from "./daily-review"

const NOW = new Date("2026-10-15T18:00:00Z")
const fields = { ...emptyDailyReviewFields(), decisions: "- Ship Close day" }

function respond(status: number, body: unknown = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })
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

  it("reports an existing file without writing", async () => {
    fetchMock.mockResolvedValueOnce(respond(200, { html_url: "https://github.com/x/2026-10-15.md" }))
    const state = await getDailyReviewState(NOW)
    expect(state).toEqual({ ok: false, status: "exists", date: "2026-10-15", url: "https://github.com/x/2026-10-15.md" })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toContain("/contents/06_REVIEWS/daily/2026-10-15.md?ref=main")
  })

  it("treats a missing file as ok only when the token can read the repo", async () => {
    fetchMock.mockResolvedValueOnce(respond(404)).mockResolvedValueOnce(respond(200, { full_name: "romahawk/AI-Business-OS" }))
    expect(await getDailyReviewState(NOW)).toMatchObject({ ok: true, status: "ok", date: "2026-10-15" })
    expect(fetchMock.mock.calls[1][0]).toMatch(/\/repos\/romahawk\/AI-Business-OS$/)

    fetchMock.mockResolvedValueOnce(respond(404)).mockResolvedValueOnce(respond(404))
    expect(await getDailyReviewState(NOW)).toMatchObject({ ok: false, status: "no-access" })
  })

  it("creates the file on main without a sha, with the daily-close message", async () => {
    fetchMock.mockResolvedValueOnce(
      respond(201, { content: { html_url: "https://github.com/f" }, commit: { html_url: "https://github.com/c" } }),
    )
    const result = await commitDailyReview(fields, NOW)
    expect(result).toMatchObject({ ok: true, status: "ok", date: "2026-10-15", commitUrl: "https://github.com/c" })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/repos\/romahawk\/AI-Business-OS\/contents\/06_REVIEWS\/daily\/2026-10-15\.md$/)
    expect(init.method).toBe("PUT")
    expect(init.headers.Authorization).toBe("Bearer test-token")
    const body = JSON.parse(init.body)
    expect(body).not.toHaveProperty("sha")
    expect(body.branch).toBe("main")
    expect(body.message).toBe("daily-close: 2026-10-15 (Magic Kick)")
    expect(Buffer.from(body.content, "base64").toString("utf8")).toContain("## Decisions Made\n\n- Ship Close day")
  })

  it("never overwrites: a create refused because the file exists comes back as exists", async () => {
    fetchMock
      .mockResolvedValueOnce(respond(422, { message: '"sha" wasn\'t supplied.' }))
      .mockResolvedValueOnce(respond(200, { html_url: "https://github.com/existing" }))
    const result = await commitDailyReview(fields, NOW)
    expect(result).toMatchObject({ ok: false, status: "exists", url: "https://github.com/existing" })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1][1].method).toBeUndefined()
  })

  it("writes nothing when not configured, and reports GitHub errors without the token", async () => {
    vi.stubEnv("AIOS_GITHUB_WRITE_TOKEN", "")
    expect(await commitDailyReview(fields, NOW)).toMatchObject({ ok: false, status: "not-configured" })
    expect(fetchMock).not.toHaveBeenCalled()

    vi.stubEnv("AIOS_GITHUB_WRITE_TOKEN", "test-token")
    fetchMock.mockResolvedValueOnce(respond(403))
    const result = await commitDailyReview(fields, NOW)
    expect(result).toMatchObject({ ok: false, status: "error" })
    expect(JSON.stringify(result)).not.toContain("test-token")
  })
})
