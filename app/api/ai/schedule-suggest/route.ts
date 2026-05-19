import { type NextRequest, NextResponse } from "next/server"
import { isAiEnabled } from "@/lib/ai/flags"
import { verifyFirebaseToken } from "@/lib/ai/auth"
import { callClaude, parseJsonResponse } from "@/lib/ai/service"
import { scoreTasks } from "@/lib/ai/scheduler"
import type { Goal, Project, SystemConfig, Task, TimeBlock } from "@/lib/types"

const SYSTEM_PROMPT = `You are a scheduling assistant for a solo builder.
Given a list of prioritised tasks and existing time blocks, suggest when to schedule unblocked tasks.
Respond ONLY with valid JSON: { "suggestions": [{ "taskId": string, "taskTitle": string, "dayOfWeek": number, "startTime": "HH:MM", "duration": number, "reasoning": string }] }
dayOfWeek: 0=Monday … 6=Sunday. duration in minutes. reasoning ≤ 10 words. Max 5 suggestions.`

export async function POST(req: NextRequest) {
  if (!isAiEnabled()) {
    return NextResponse.json({ ok: false, error: "AI features disabled" }, { status: 503 })
  }

  const uid = await verifyFirebaseToken(req)
  if (!uid) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  let body: {
    tasks?: Task[]
    goals?: Goal[]
    projects?: Project[]
    existingBlocks?: TimeBlock[]
    systemConfig?: Partial<SystemConfig>
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 })
  }

  const { tasks = [], goals = [], projects = [], existingBlocks = [], systemConfig } = body
  if (tasks.length === 0) {
    return NextResponse.json({ ok: false, error: "tasks must not be empty" }, { status: 422 })
  }

  const scored = scoreTasks(tasks, goals, projects)

  try {
    const raw = await callClaude(SYSTEM_PROMPT, [
      {
        role: "user",
        content: JSON.stringify({
          prioritisedTasks: scored.map((s) => ({
            taskId: s.task.id,
            title: s.task.title,
            estimateMin: s.task.estimateMin ?? 60,
            score: s.score,
          })),
          existingBlocks: existingBlocks.slice(0, 30).map((b) => ({
            dateISO: b.dateISO,
            startTime: b.startTime,
            endTime: b.endTime,
          })),
          constraints: {
            maxActiveProjects: systemConfig?.maxActiveProjects ?? 3,
            dailyFocusLimit: systemConfig?.dailyFocusLimit ?? 3,
          },
        }),
      },
    ])

    const parsed = parseJsonResponse(raw)
    return NextResponse.json({ ok: true, data: parsed })
  } catch (err) {
    console.error("[/api/ai/schedule-suggest]", err)
    return NextResponse.json({ ok: false, error: "AI call failed" }, { status: 500 })
  }
}
