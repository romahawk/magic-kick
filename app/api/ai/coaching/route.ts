import { type NextRequest, NextResponse } from "next/server"
import { isAiEnabled } from "@/lib/ai/flags"
import { verifyFirebaseToken } from "@/lib/ai/auth"
import { callClaude, parseJsonResponse } from "@/lib/ai/service"
import type { Task } from "@/lib/types"
import { getCoachingContext } from "@/lib/ai/coaching"

const SYSTEM_PROMPT = `You are a motivational execution coach for a solo builder.
Given the user's current execution state, write a short daily coaching message.
Respond ONLY with valid JSON: { "tone": "encourage" | "correct", "headline": string, "detail": string }
headline ≤ 8 words. detail ≤ 25 words. Be direct, not generic.`

export async function POST(req: NextRequest) {
  if (!isAiEnabled()) {
    return NextResponse.json({ ok: false, error: "AI features disabled" }, { status: 503 })
  }

  const uid = await verifyFirebaseToken(req)
  if (!uid) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  let body: { tasks?: Task[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 })
  }

  const tasks = body.tasks ?? []
  const ctx = getCoachingContext(tasks)
  if (!ctx) {
    return NextResponse.json({ ok: false, error: "Insufficient context for coaching" }, { status: 422 })
  }

  try {
    const raw = await callClaude(SYSTEM_PROMPT, [
      {
        role: "user",
        content: JSON.stringify(ctx),
      },
    ])

    const parsed = parseJsonResponse(raw)
    return NextResponse.json({ ok: true, data: parsed })
  } catch (err) {
    console.error("[/api/ai/coaching]", err)
    return NextResponse.json({ ok: false, error: "AI call failed" }, { status: 500 })
  }
}
