import "server-only"
import { OS_REPO_NAME, OS_REPO_OWNER } from "@/lib/os-feed/github"
import {
  berlinDateISO,
  buildDailyReview,
  dailyReviewCommitMessage,
  dailyReviewPath,
  isWritableOsPath,
} from "@/lib/os-feed/daily-review"
import type { DailyReviewCommitResult, DailyReviewFields, DailyReviewState } from "@/lib/os-feed/daily-review"

/**
 * P11, first slice: Close day writes today's daily review to AI-Business-OS (ADR-032).
 * Uses its own token (`AIOS_GITHUB_WRITE_TOKEN`), never P7's read-only one. The token stays on the
 * server: never returned, never logged.
 */

function contentsUrl(path: string) {
  return `https://api.github.com/repos/${OS_REPO_OWNER}/${OS_REPO_NAME}/contents/${path}`
}

function headers(token: string) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  }
}

/** Write token and writer uid, or null when Close day is not set up. */
function writeConfig(): { token: string; writerUid: string } | null {
  const token = process.env.AIOS_GITHUB_WRITE_TOKEN
  const writerUid = process.env.AIOS_WRITER_UID
  return token && writerUid ? { token, writerUid } : null
}

/** Shared gate for both routes: configured, and signed in as the writer. */
export function closeDayAccess(uid: string): "ok" | "not-configured" | "forbidden" {
  const config = writeConfig()
  if (!config) return "not-configured"
  return uid === config.writerUid ? "ok" : "forbidden"
}

async function canReadRepo(token: string): Promise<boolean> {
  const response = await fetch(`https://api.github.com/repos/${OS_REPO_OWNER}/${OS_REPO_NAME}`, {
    headers: headers(token),
    cache: "no-store",
  })
  if (!response.ok) console.warn(`[os-write] GitHub responded ${response.status} reading the repo`)
  return response.ok
}

function state(status: DailyReviewState["status"], date: string | null, url: string | null = null): DailyReviewState {
  return { ok: status === "ok", status, date, url }
}

/** Whether today's file exists on OS `main`. Never cached: the answer decides whether a write may happen. */
export async function getDailyReviewState(now: Date = new Date()): Promise<DailyReviewState> {
  const config = writeConfig()
  const date = berlinDateISO(now)
  if (!config) return state("not-configured", date)

  try {
    const response = await fetch(`${contentsUrl(dailyReviewPath(date))}?ref=main`, {
      headers: headers(config.token),
      cache: "no-store",
    })
    // GitHub answers 404 both for "no file yet" and for "this token cannot see the repo", so a missing
    // file is only "ok" once the repo itself is readable with this token.
    if (response.status === 404) return (await canReadRepo(config.token)) ? state("ok", date) : state("no-access", date)
    if (!response.ok) {
      console.warn(`[os-write] GitHub responded ${response.status} reading today's review`)
      return state("error", date)
    }
    const body = (await response.json()) as { html_url?: string }
    return state("exists", date, body.html_url ?? null)
  } catch {
    console.warn("[os-write] GitHub request failed reading today's review")
    return state("error", date)
  }
}

/**
 * Creates today's file. No `sha` is sent, so GitHub refuses to replace a file that already exists:
 * Close day never overwrites (ADR-032 point 4).
 */
export async function commitDailyReview(fields: DailyReviewFields, now: Date = new Date()): Promise<DailyReviewCommitResult> {
  const date = berlinDateISO(now)
  const config = writeConfig()
  const result = (status: DailyReviewCommitResult["status"], extra: Partial<DailyReviewCommitResult> = {}) => ({
    ok: status === "ok",
    status,
    date,
    url: null,
    commitUrl: null,
    ...extra,
  })
  if (!config) return result("not-configured")

  const path = dailyReviewPath(date)
  if (!isWritableOsPath(path)) return result("forbidden", { error: "Path is not writable." })

  try {
    const response = await fetch(contentsUrl(path), {
      method: "PUT",
      headers: { ...headers(config.token), "Content-Type": "application/json" },
      body: JSON.stringify({
        message: dailyReviewCommitMessage(date),
        content: Buffer.from(buildDailyReview(date, fields), "utf8").toString("base64"),
        branch: "main",
      }),
      cache: "no-store",
    })

    if (response.status === 201) {
      const body = (await response.json()) as { content?: { html_url?: string }; commit?: { html_url?: string } }
      return result("ok", { url: body.content?.html_url ?? null, commitUrl: body.commit?.html_url ?? null })
    }
    // A create without `sha` on an existing file comes back as 422 (or 409 on a race).
    if (response.status === 422 || response.status === 409) {
      const existing = await getDailyReviewState(now)
      return result("exists", { url: existing.url, error: "Today's review already exists; nothing was overwritten." })
    }
    console.warn(`[os-write] GitHub responded ${response.status} writing today's review`)
    return result("error", { error: `GitHub refused the write (${response.status}).` })
  } catch {
    console.warn("[os-write] GitHub request failed writing today's review")
    return result("error", { error: "GitHub could not be reached." })
  }
}
