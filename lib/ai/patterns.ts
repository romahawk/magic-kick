import type { JournalEntry } from "@/lib/types"

export interface RetroPatterns {
  frictionThemes: string[]
  momentumWins: string[]
  trendDirection: "improving" | "declining" | "stable"
}

const MIN_ENTRIES = 4

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 4)
}

function topTerms(texts: string[], n: number): string[] {
  const counts = new Map<string, number>()
  for (const text of texts) {
    const unique = new Set(tokenize(text))
    for (const term of unique) {
      counts.set(term, (counts.get(term) ?? 0) + 1)
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([term]) => term)
}

export function analyzeRetroPatterns(
  entries: JournalEntry[]
): RetroPatterns | null {
  const weekly = entries.filter((e) => !e.deleted && e.type === "weekly")
  if (weekly.length < MIN_ENTRIES) return null

  const sorted = [...weekly].sort((a, b) => a.dateISO.localeCompare(b.dateISO))
  const frictionThemes = topTerms(sorted.map((e) => e.challenges), 3)
  const momentumWins = topTerms(sorted.map((e) => e.highlights), 3)

  const recent = sorted.slice(-2)
  const older = sorted.slice(0, -2)
  const avgMoodRecent = recent.reduce((s, e) => s + e.mood, 0) / recent.length
  const avgMoodOlder = older.reduce((s, e) => s + e.mood, 0) / older.length

  const trendDirection: RetroPatterns["trendDirection"] =
    avgMoodRecent > avgMoodOlder + 0.5
      ? "improving"
      : avgMoodRecent < avgMoodOlder - 0.5
      ? "declining"
      : "stable"

  return { frictionThemes, momentumWins, trendDirection }
}
