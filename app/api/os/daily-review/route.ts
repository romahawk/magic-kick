import { type NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken } from "@/lib/ai/auth"
import { closeDayAccess, commitDailyReview, getDailyReviewState } from "@/lib/os-feed/github-write"
import {
  CLOSE_DAY_DAYS_BACK,
  berlinDateISO,
  hasDailyReviewContent,
  isClosableDate,
  sanitizeDailyReviewFields,
} from "@/lib/os-feed/daily-review"

// P11 Close day (ADR-032, ADR-033): GET lists today and the days before it that may still be closed,
// each marked closed or open; POST creates one day's review. Configuration and GitHub problems come
// back as a status in the body, not as a 5xx.
const NO_STORE = { "Cache-Control": "private, no-store" }

export async function GET(req: NextRequest) {
  const uid = await verifyFirebaseToken(req)
  if (!uid) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })

  const access = closeDayAccess(uid)
  if (access !== "ok") {
    return NextResponse.json({ ok: false, status: access, date: berlinDateISO(), days: [] }, { headers: NO_STORE })
  }
  return NextResponse.json(await getDailyReviewState(), { headers: NO_STORE })
}

export async function POST(req: NextRequest) {
  const uid = await verifyFirebaseToken(req)
  if (!uid) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })

  const access = closeDayAccess(uid)
  if (access !== "ok") {
    return NextResponse.json(
      { ok: false, status: access, date: null, url: null, commitUrl: null },
      { status: access === "forbidden" ? 403 : 200, headers: NO_STORE },
    )
  }

  let body: { date?: unknown; fields?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 })
  }
  // The date is checked here and again where the file is written; the server's Berlin date decides.
  const date = typeof body.date === "string" ? body.date : ""
  if (!isClosableDate(date, berlinDateISO())) {
    return NextResponse.json(
      { ok: false, error: `Only today and the ${CLOSE_DAY_DAYS_BACK} days before it can be closed.` },
      { status: 422 },
    )
  }
  const fields = sanitizeDailyReviewFields(body.fields)
  if (!fields || !hasDailyReviewContent(fields)) {
    return NextResponse.json({ ok: false, error: "Nothing to write" }, { status: 422 })
  }

  return NextResponse.json(await commitDailyReview(date, fields), { headers: NO_STORE })
}
