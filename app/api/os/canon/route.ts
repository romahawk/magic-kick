import { type NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken } from "@/lib/ai/auth"
import { fetchCanonFocus } from "@/lib/os-feed/github"

// P7: current focus from AI-Business-OS canon, read-only. Missing, unconfigured or failing feeds come
// back as a status in the body, not as a 5xx.
export async function GET(req: NextRequest) {
  const uid = await verifyFirebaseToken(req)
  if (!uid) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const canon = await fetchCanonFocus()
  return NextResponse.json(canon, { headers: { "Cache-Control": "private, no-store" } })
}
