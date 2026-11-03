import { type NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken } from "@/lib/ai/auth"
import { fetchDatedCommitments } from "@/lib/os-feed/github"

// P30: dated commitments from AI-Business-OS, read-only (ADR-036). Missing, unconfigured or failing
// files come back as a status in the body, not as a 5xx. There is no POST: nothing writes back.
export async function GET(req: NextRequest) {
  const uid = await verifyFirebaseToken(req)
  if (!uid) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const result = await fetchDatedCommitments()
  return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } })
}
