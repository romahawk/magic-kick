import { type NextRequest, NextResponse } from "next/server"
import { isAiEnabled } from "@/lib/ai/flags"
import { verifyFirebaseToken } from "@/lib/ai/auth"
import { callClaude, parseJsonResponse } from "@/lib/ai/service"
import type { ExecutionLog, WeeklyPlan } from "@/lib/types"

const SYSTEM_PROMPT = `You are an execution coach for a solo builder using the Magic Kick productivity OS.
You receive a weekly plan and execution log, then produce a brief structured analysis.
Respond ONLY with valid JSON matching: { "summary": string, "warnings": string[], "suggestions": string[] }
Keep each field concise. summary ≤ 2 sentences. Each array ≤ 3 items, each ≤ 15 words.`

export async function POST(req: NextRequest) {
  if (!isAiEnabled()) {
    return NextResponse.json({ ok: false, error: "AI features disabled" }, { status: 503 })
  }

  const uid = await verifyFirebaseToken(req)
  if (!uid) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  let body: { weeklyPlan?: WeeklyPlan; executionLogs?: ExecutionLog[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 })
  }

  const { weeklyPlan, executionLogs = [] } = body
  if (!weeklyPlan) {
    return NextResponse.json({ ok: false, error: "weeklyPlan is required" }, { status: 422 })
  }

  try {
    const raw = await callClaude(SYSTEM_PROMPT, [
      {
        role: "user",
        content: JSON.stringify({
          weeklyPlan: {
            allocations: weeklyPlan.allocations,
            totalCapacityHours: weeklyPlan.totalCapacityHours,
            status: weeklyPlan.status,
          },
          recentLogs: executionLogs.slice(-20).map((l) => ({
            projectId: l.projectId,
            plannedHours: l.plannedHours,
            actualHours: l.actualHours,
            dateISO: l.dateISO,
          })),
        }),
      },
    ])

    const parsed = parseJsonResponse(raw)
    return NextResponse.json({ ok: true, data: parsed })
  } catch (err) {
    console.error("[/api/ai/weekly-summary]", err)
    return NextResponse.json({ ok: false, error: "AI call failed" }, { status: 500 })
  }
}
