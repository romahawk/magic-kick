import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { isAiEnabled } from "@/lib/ai/flags"
import { hasAnthropicConfig } from "@/lib/ai/client"
import { verifyFirebaseToken } from "@/lib/ai/auth"
import { callClaude } from "@/lib/ai/service"
import { fetchCanonFocus } from "@/lib/os-feed/github"
import {
  SYSTEM_PROMPT,
  buildUserContent,
  canonForFocus,
  createFocusLimiter,
  freeSlots,
  parseSuggestions,
  pickCandidates,
} from "@/lib/ai/daily-focus"

// P19 (ADR-038): rank open tasks against the OS canon for Daily Focus. Gated on the server: flag off or no
// key is a 404, no token a 401. Writes nothing; the client accepts per item through moveTaskToLane.
const DEFAULT_MODEL = "claude-haiku-5-5" // verified 2026-11-04; override with AI_DAILY_FOCUS_MODEL
const limiter = createFocusLimiter()

// Only these fields are read; zod strips the rest, so notes and descriptions never reach the prompt.
const bodySchema = z.object({
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dailyFocusLimit: z.number().int().min(1).max(10).optional(),
  tasks: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        dueDate: z.string().optional(),
        lane: z.string().optional(),
        completed: z.boolean().optional(),
        deleted: z.boolean().optional(),
        linkedProjectId: z.string().optional(),
      })
    )
    .max(5000),
  projects: z
    .array(z.object({ id: z.string(), title: z.string(), status: z.string().optional(), deleted: z.boolean().optional() }))
    .max(500),
})

const notFound = () => NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })
const unauthorized = () => NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
const gated = () => !isAiEnabled() || !hasAnthropicConfig

/** Availability for the UI: 200 when the flag is on and a key exists (never the key). */
export async function GET(req: NextRequest) {
  if (gated()) return notFound()
  if (!(await verifyFirebaseToken(req))) return unauthorized()
  return NextResponse.json({ ok: true, available: true })
}

export async function POST(req: NextRequest) {
  if (gated()) return notFound()
  const uid = await verifyFirebaseToken(req)
  if (!uid) return unauthorized()

  const parsedBody = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsedBody.success) return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 })
  const { tasks, projects, today = new Date().toISOString().slice(0, 10), dailyFocusLimit = 3 } = parsedBody.data

  const canon = canonForFocus(await fetchCanonFocus())
  if (!canon.usable) return NextResponse.json({ ok: true, canonUsed: false, suggestions: [] })

  const slots = freeSlots(tasks, dailyFocusLimit)
  const candidates = pickCandidates(tasks, projects, today)
  const done = { ok: true, canonUsed: true, stale: canon.stale, fetchedAt: canon.fetchedAt, packGenerated: canon.packGenerated }
  if (slots === 0 || candidates.length === 0) return NextResponse.json({ ...done, suggestions: [] })

  const limit = limiter.start(uid)
  if (limit !== "ok") {
    return NextResponse.json({ ok: false, error: limit === "busy" ? "Request in progress" : "Daily limit reached" }, { status: 429 })
  }
  try {
    // The count only: never the task text.
    console.log(`[ai/daily-focus] candidates=${candidates.length} slots=${slots}`)
    const raw = await callClaude(SYSTEM_PROMPT, [{ role: "user", content: buildUserContent(canon.outcomes, candidates, slots) }], {
      model: process.env.AI_DAILY_FOCUS_MODEL || DEFAULT_MODEL,
      maxTokens: 600,
      effort: "low",
      timeoutMs: 15_000,
    })
    const suggestions = parseSuggestions(raw, { taskIds: new Set(candidates.map((c) => c.id)), outcomes: canon.outcomes, slots })
    return NextResponse.json({ ...done, suggestions })
  } catch (err) {
    // The error type and message only (never the task text or the key), so a failure can be diagnosed.
    console.error(`[ai/daily-focus] call failed: ${err instanceof Error ? `${err.name}: ${err.message}` : "unknown"}`)
    return NextResponse.json({ ok: false, error: "AI call failed" }, { status: 502 })
  } finally {
    limiter.finish(uid)
  }
}
