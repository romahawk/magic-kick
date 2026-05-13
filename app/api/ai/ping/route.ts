import { type NextRequest, NextResponse } from "next/server"
import { isAiEnabled } from "@/lib/ai/flags"
import { verifyFirebaseToken } from "@/lib/ai/auth"
import { hasAnthropicConfig } from "@/lib/ai/client"

export async function GET(req: NextRequest) {
  if (!isAiEnabled()) {
    return NextResponse.json({ ok: false, error: "AI features disabled" }, { status: 503 })
  }

  const uid = await verifyFirebaseToken(req)
  if (!uid) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  return NextResponse.json({ ok: true, data: { configured: hasAnthropicConfig } })
}
