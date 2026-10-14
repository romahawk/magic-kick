import "server-only"
import { berlinDateISO, parseDailyPlan } from "@/lib/os-feed/plan-parser"
import type { PlanFeedResult, PlanTask } from "@/lib/os-feed/plan-parser"

/**
 * P7: reads today's plan from AI-Business-OS through the GitHub API (ADR-024 §5, ADR-030).
 * Read-only. The token stays on the server: never returned, never logged.
 */
const OS_REPO_OWNER = "romahawk"
const OS_REPO_NAME = "AI-Business-OS"
const OS_PLANS_DIR = "07_INBOX/agent/plans"

interface GoodFetch {
  date: string
  fetchedAt: string
  tasks: PlanTask[]
  warnings: string[]
}

// Last good fetch, per server instance. Shown, marked stale, when GitHub fails.
let lastGood: GoodFetch | null = null

function result(status: PlanFeedResult["status"], date: string): PlanFeedResult {
  return { ok: false, status, date, fetchedAt: null, tasks: [], warnings: [], stale: false }
}

function failed(date: string): PlanFeedResult {
  if (!lastGood) return result("error", date)
  return { ok: false, status: "error", ...lastGood, stale: true }
}

export async function fetchTodayPlan(now: Date = new Date()): Promise<PlanFeedResult> {
  const date = berlinDateISO(now)
  const token = process.env.AIOS_GITHUB_TOKEN
  if (!token) return result("not-configured", date)

  const url = `https://api.github.com/repos/${OS_REPO_OWNER}/${OS_REPO_NAME}/contents/${OS_PLANS_DIR}/${date}.md?ref=main`
  let response: Response
  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github.raw+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      next: { revalidate: 300 },
    })
  } catch {
    console.warn("[os-feed] GitHub request failed")
    return failed(date)
  }

  if (response.status === 404) return result("missing", date)
  if (!response.ok) {
    console.warn(`[os-feed] GitHub responded ${response.status}`)
    return failed(date)
  }

  const parsed = parseDailyPlan(await response.text())
  const warnings = [...parsed.warnings]
  if (parsed.date && parsed.date !== date) warnings.push(`File date ${parsed.date} does not match ${date}.`)
  lastGood = { date, fetchedAt: new Date().toISOString(), tasks: parsed.tasks, warnings }
  return { ok: true, status: "ok", ...lastGood, stale: false }
}
