import "server-only"
import { OS_REPO_NAME, OS_REPO_OWNER } from "@/lib/os-feed/github"
import {
  CLOSE_DAY_DAYS_BACK,
  DAILY_REVIEW_DIR,
  berlinDateISO,
  buildDailyReview,
  closeDayDates,
  dailyReviewCommitMessage,
  dailyReviewPath,
  isClosableDate,
  isWritableOsPath,
} from "@/lib/os-feed/daily-review"
import type { DailyReviewCommitResult, DailyReviewFields, DailyReviewState } from "@/lib/os-feed/daily-review"

/**
 * P11, first slice: Close day writes a daily review to AI-Business-OS (ADR-032), for today or a
 * missed day up to `CLOSE_DAY_DAYS_BACK` days back (ADR-033). Uses its own token
 * (`AIOS_GITHUB_WRITE_TOKEN`), never P7's read-only one. The token stays on the server: never
 * returned, never logged.
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

function state(status: DailyReviewState["status"], date: string, days: DailyReviewState["days"] = []): DailyReviewState {
  return { ok: status === "ok", status, date, days }
}

/** Daily review files on OS `main`, by date, with their links. Null when GitHub fails. */
async function listDailyReviews(token: string): Promise<Map<string, string> | "no-access" | null> {
  const response = await fetch(`${contentsUrl(DAILY_REVIEW_DIR)}?ref=main`, { headers: headers(token), cache: "no-store" })
  // 404 is either "no folder yet" or "this token cannot see the repo"; only a readable repo makes it the first.
  if (response.status === 404) return (await canReadRepo(token)) ? new Map() : "no-access"
  if (!response.ok) {
    console.warn(`[os-write] GitHub responded ${response.status} listing daily reviews`)
    return null
  }
  const entries = (await response.json()) as Array<{ name?: string; type?: string; html_url?: string }>
  const files = new Map<string, string>()
  for (const entry of Array.isArray(entries) ? entries : []) {
    const match = entry.type === "file" ? /^(\d{4}-\d{2}-\d{2})\.md$/.exec(entry.name ?? "") : null
    if (match) files.set(match[1], entry.html_url ?? "")
  }
  return files
}

/**
 * Today and the days before it that Close day may write, each marked closed when its file exists on
 * OS `main`. Never cached: the answer decides whether a write may happen.
 */
export async function getDailyReviewState(now: Date = new Date()): Promise<DailyReviewState> {
  const config = writeConfig()
  const today = berlinDateISO(now)
  if (!config) return state("not-configured", today)

  try {
    const files = await listDailyReviews(config.token)
    if (files === "no-access") return state("no-access", today)
    if (!files) return state("error", today)
    return state(
      "ok",
      today,
      closeDayDates(today).map((date) => ({ date, closed: files.has(date), url: files.get(date) || null })),
    )
  } catch {
    console.warn("[os-write] GitHub request failed listing daily reviews")
    return state("error", today)
  }
}

/**
 * Creates the file for `dateISO`. No `sha` is sent, so GitHub refuses to replace a file that already
 * exists: Close day never overwrites (ADR-032 point 4). A missed day carries a "written on" line.
 */
export async function commitDailyReview(
  dateISO: string,
  fields: DailyReviewFields,
  now: Date = new Date(),
): Promise<DailyReviewCommitResult> {
  const today = berlinDateISO(now)
  const config = writeConfig()
  const result = (status: DailyReviewCommitResult["status"], extra: Partial<DailyReviewCommitResult> = {}) => ({
    ok: status === "ok",
    status,
    date: dateISO,
    url: null,
    commitUrl: null,
    ...extra,
  })
  if (!config) return result("not-configured")
  if (!isClosableDate(dateISO, today)) {
    return result("forbidden", { error: `Only today and the ${CLOSE_DAY_DAYS_BACK} days before it can be closed.` })
  }

  const path = dailyReviewPath(dateISO)
  if (!isWritableOsPath(path)) return result("forbidden", { error: "Path is not writable." })

  try {
    const response = await fetch(contentsUrl(path), {
      method: "PUT",
      headers: { ...headers(config.token), "Content-Type": "application/json" },
      body: JSON.stringify({
        message: dailyReviewCommitMessage(dateISO),
        content: Buffer.from(buildDailyReview(dateISO, fields, today), "utf8").toString("base64"),
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
      const existing = await fetch(`${contentsUrl(path)}?ref=main`, { headers: headers(config.token), cache: "no-store" })
      const url = existing.ok ? ((await existing.json()) as { html_url?: string }).html_url ?? null : null
      return result("exists", { url, error: `The review for ${dateISO} already exists; nothing was overwritten.` })
    }
    console.warn(`[os-write] GitHub responded ${response.status} writing a daily review`)
    return result("error", { error: `GitHub refused the write (${response.status}).` })
  } catch {
    console.warn("[os-write] GitHub request failed writing a daily review")
    return result("error", { error: "GitHub could not be reached." })
  }
}
