import "server-only"
import { parseCurrentFocus, parseFrontMatterGenerated } from "@/lib/os-feed/canon-parser"
import type { CanonFeedResult } from "@/lib/os-feed/canon-parser"

/**
 * P7: reads current focus from AI-Business-OS canon through the GitHub API (ADR-024 §5, ADR-031).
 * Read-only. The token stays on the server: never returned, never logged.
 */
const OS_REPO_OWNER = "romahawk"
const OS_REPO_NAME = "AI-Business-OS"
const CURRENT_FOCUS_PATH = "01_CONTEXT/current-focus.md"
const CONTEXT_PACK_PATH = "00_HOME/context-pack.md"

type GoodFetch = Omit<CanonFeedResult, "ok" | "status" | "stale">
type FileResult = { status: "ok"; text: string } | { status: "missing" } | { status: "error" }

// Last good fetch, per server instance. Shown, marked stale, when GitHub fails.
let lastGood: GoodFetch | null = null

function result(status: CanonFeedResult["status"]): CanonFeedResult {
  return {
    ok: false,
    status,
    fetchedAt: null,
    packGenerated: null,
    reconciledWithGit: null,
    outcomes: [],
    allocation: [],
    warnings: [],
    stale: false,
  }
}

function failed(): CanonFeedResult {
  if (!lastGood) return result("error")
  return { ok: false, status: "error", ...lastGood, stale: true }
}

async function getFile(path: string, token: string): Promise<FileResult> {
  const url = `https://api.github.com/repos/${OS_REPO_OWNER}/${OS_REPO_NAME}/contents/${path}?ref=main`
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github.raw+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      next: { revalidate: 300 },
    })
    if (response.status === 404) return { status: "missing" }
    if (!response.ok) {
      console.warn(`[os-feed] GitHub responded ${response.status} for ${path}`)
      return { status: "error" }
    }
    return { status: "ok", text: await response.text() }
  } catch {
    console.warn(`[os-feed] GitHub request failed for ${path}`)
    return { status: "error" }
  }
}

export async function fetchCanonFocus(): Promise<CanonFeedResult> {
  const token = process.env.AIOS_GITHUB_TOKEN
  if (!token) return result("not-configured")

  const [focus, pack] = await Promise.all([getFile(CURRENT_FOCUS_PATH, token), getFile(CONTEXT_PACK_PATH, token)])
  if (focus.status === "missing") return result("missing")
  if (focus.status === "error") return failed()

  const parsed = parseCurrentFocus(focus.text)
  const warnings = [...parsed.warnings]
  // The context pack only dates the canon; without it the focus still shows, unstamped.
  const packGenerated = pack.status === "ok" ? parseFrontMatterGenerated(pack.text) : null
  if (pack.status !== "ok") warnings.push("Context pack could not be read; no canon date.")
  else if (!packGenerated) warnings.push("Context pack has no generated date.")

  lastGood = {
    fetchedAt: new Date().toISOString(),
    packGenerated,
    reconciledWithGit: parsed.reconciledWithGit,
    outcomes: parsed.outcomes,
    allocation: parsed.allocation,
    warnings,
  }
  return { ok: true, status: "ok", ...lastGood, stale: false }
}
