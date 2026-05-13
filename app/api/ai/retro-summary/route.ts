import { type NextRequest, NextResponse } from "next/server"
import { isAiEnabled } from "@/lib/ai/flags"
import { verifyFirebaseToken } from "@/lib/ai/auth"
import { callClaude, parseJsonResponse } from "@/lib/ai/service"
import type { ExecutionLog, JournalEntry, Task, WeeklyPlan } from "@/lib/types"

const SYSTEM_PROMPT = `You are a retrospective coach for a solo builder.
Given this week's execution data, draft a concise retrospective.
Respond ONLY with valid JSON: { "wins": string[], "friction": string[], "nextWeekIntentions": string[], "summary": string }
Each array ≤ 3 items, each item ≤ 15 words. summary ≤ 2 sentences. Total response ≤ 400 tokens.`

export async function POST(req: NextRequest) {
  if (!isAiEnabled()) {
    return NextResponse.json({ ok: false, error: "AI features disabled" }, { status: 503 })
  }

  const uid = await verifyFirebaseToken(req)
  if (!uid) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  let body: {
    weeklyPlan?: WeeklyPlan
    executionLogs?: ExecutionLog[]
    completedTasks?: Task[]
    journalEntries?: JournalEntry[]
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 })
  }

  const { weeklyPlan, executionLogs = [], completedTasks = [], journalEntries = [] } = body

  try {
    const raw = await callClaude(SYSTEM_PROMPT, [
      {
        role: "user",
        content: JSON.stringify({
          weeklyPlan: weeklyPlan
            ? { allocations: weeklyPlan.allocations, totalCapacityHours: weeklyPlan.totalCapacityHours }
            : null,
          hoursLogged: executionLogs.reduce((s, l) => s + l.actualHours, 0),
          completedTaskTitles: completedTasks.slice(0, 10).map((t) => t.title),
          journalHighlights: journalEntries.slice(0, 5).map((e) => e.highlights),
          journalChallenges: journalEntries.slice(0, 5).map((e) => e.challenges),
        }),
      },
    ])

    const parsed = parseJsonResponse(raw)
    return NextResponse.json({ ok: true, data: parsed })
  } catch (err) {
    console.error("[/api/ai/retro-summary]", err)
    return NextResponse.json({ ok: false, error: "AI call failed" }, { status: 500 })
  }
}
