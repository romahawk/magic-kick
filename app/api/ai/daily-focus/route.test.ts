import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  hasKey: true,
  uid: "u1" as string | null,
  canon: { ok: true, status: "ok", fetchedAt: "t", packGenerated: "g", reconciledWithGit: null, outcomes: [{ id: "o1", title: "Outcome" }], allocation: [], warnings: [], stale: false } as unknown,
  callClaude: vi.fn(),
}))

vi.mock("@/lib/ai/client", () => ({
  get hasAnthropicConfig() {
    return mocks.hasKey
  },
}))
vi.mock("@/lib/ai/auth", () => ({ verifyFirebaseToken: async () => mocks.uid }))
vi.mock("@/lib/ai/service", () => ({ callClaude: mocks.callClaude }))
vi.mock("@/lib/os-feed/github", () => ({ fetchCanonFocus: async () => mocks.canon }))

import { GET, POST } from "./route"

const post = (body: unknown) => new Request("http://x/api/ai/daily-focus", { method: "POST", body: JSON.stringify(body) }) as unknown as NextRequest
const get = () => new Request("http://x/api/ai/daily-focus") as unknown as NextRequest
const body = { today: "2026-11-04", tasks: [{ id: "t1", title: "Task one" }], projects: [] }

describe("/api/ai/daily-focus", () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.stubEnv("NEXT_PUBLIC_AI_FEATURES_ENABLED", "true")
    mocks.hasKey = true
    mocks.uid = "u1"
    mocks.callClaude.mockReset()
    mocks.callClaude.mockResolvedValue(JSON.stringify({ suggestions: [{ taskId: "t1", outcomeId: "o1", reason: "Serves it" }] }))
  })

  it("is 404 when the flag is off, without calling the model", async () => {
    vi.stubEnv("NEXT_PUBLIC_AI_FEATURES_ENABLED", undefined)
    expect((await GET(get())).status).toBe(404)
    expect((await POST(post(body))).status).toBe(404)
    expect(mocks.callClaude).not.toHaveBeenCalled()
  })

  it("is 404 when the key is missing", async () => {
    mocks.hasKey = false
    expect((await GET(get())).status).toBe(404)
    expect((await POST(post(body))).status).toBe(404)
  })

  it("is 401 without a valid token", async () => {
    mocks.uid = null
    expect((await GET(get())).status).toBe(401)
    expect((await POST(post(body))).status).toBe(401)
  })

  it("answers availability, never the key", async () => {
    const res = await GET(get())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, available: true })
  })

  it("makes no model call when canon is unavailable", async () => {
    mocks.canon = { ok: false, status: "missing", fetchedAt: null, packGenerated: null, reconciledWithGit: null, outcomes: [], allocation: [], warnings: [], stale: false }
    const res = await POST(post(body))
    expect(await res.json()).toEqual({ ok: true, canonUsed: false, suggestions: [] })
    expect(mocks.callClaude).not.toHaveBeenCalled()
  })

  it("runs on a stale canon and returns validated suggestions", async () => {
    mocks.canon = { ok: false, status: "error", fetchedAt: "2026-11-04T08:00:00Z", packGenerated: null, reconciledWithGit: null, outcomes: [{ id: "o1", title: "Outcome" }], allocation: [], warnings: [], stale: true }
    const data = await (await POST(post(body))).json()
    expect(mocks.callClaude).toHaveBeenCalledTimes(1)
    expect(data).toMatchObject({ ok: true, canonUsed: true, stale: true, fetchedAt: "2026-11-04T08:00:00Z" })
    expect(data.suggestions).toEqual([{ taskId: "t1", outcomeId: "o1", outcomeTitle: "Outcome", reason: "Serves it" }])
  })

  it("drops an id the model invented and never sends notes", async () => {
    mocks.canon = { ok: true, status: "ok", fetchedAt: "t", packGenerated: "g", reconciledWithGit: null, outcomes: [{ id: "o1", title: "Outcome" }], allocation: [], warnings: [], stale: false }
    mocks.callClaude.mockResolvedValue(JSON.stringify({ suggestions: [{ taskId: "ghost", outcomeId: "o1", reason: "x" }] }))
    const data = await (await POST(post({ ...body, tasks: [{ id: "t1", title: "T", notes: "PRIVATE" }] }))).json()
    expect(data.suggestions).toEqual([])
    expect(JSON.stringify(mocks.callClaude.mock.calls[0][1])).not.toContain("PRIVATE")
  })
})
