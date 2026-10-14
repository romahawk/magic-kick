import { type NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken } from "@/lib/ai/auth"
import { fetchTodayPlan } from "@/lib/os-feed/github"

// P7: today's plan from AI-Business-OS, read-only. Missing, unconfigured or failing feeds come back
// as a status in the body, not as a 5xx.
export async function GET(req: NextRequest) {
  const uid = await verifyFirebaseToken(req)
  if (!uid) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const plan = await fetchTodayPlan()
  return NextResponse.json(plan, { headers: { "Cache-Control": "private, no-store" } })
}
