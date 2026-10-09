// The single home for task and goal category rules (P14, ADR-029).
// Categories are defined in Magic Kick; the profile keeps the list, the colors and the OS domains.

import type { OsDomain } from "@/lib/types"

export const DEFAULT_TASK_CATEGORIES = ["Learning", "Sport", "Family/Home", "Hobby", "Travel"]
export const FALLBACK_CATEGORY = "General"

export const DEFAULT_TASK_CATEGORY_COLORS: Record<string, string> = {
  Learning: "#22c55e",
  Sport: "#f97316",
  "Family/Home": "#06b6d4",
  Hobby: "#a855f7",
  Travel: "#f59e0b",
}

/** The profile's list, or the defaults when it is empty or missing. */
export function resolveCategories(categories?: string[]) {
  return categories?.length ? categories : DEFAULT_TASK_CATEGORIES
}

/** The category new items get when nothing more specific applies. */
export function firstCategory(categories?: string[]) {
  return resolveCategories(categories)[0] ?? FALLBACK_CATEGORY
}

export function colorFromCategoryName(name: string) {
  const source = name.trim().toLowerCase()
  let hash = 0
  for (let i = 0; i < source.length; i++) {
    hash = source.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 70%, 50%)`
}

export function categoryColor(name: string, colors?: Record<string, string>) {
  return colors?.[name] ?? DEFAULT_TASK_CATEGORY_COLORS[name] ?? colorFromCategoryName(name)
}

export function buildCategoryColors(categories: string[], existing?: Record<string, string>) {
  const result: Record<string, string> = {}
  for (const category of categories) result[category] = categoryColor(category, existing)
  return result
}

/** Comparison key: case, spaces, "&", "/", "-" and "_" do not make a category different. */
export function categoryKey(name: string) {
  return name.trim().toLowerCase().replace(/[\s&/_-]+/g, "")
}

/** The existing category `name` would duplicate, if any. `ignore` is the category being renamed. */
export function findCategoryConflict(categories: string[], name: string, ignore?: string) {
  const key = categoryKey(name)
  return categories.find((item) => item !== ignore && categoryKey(item) === key)
}

/** The category a new task gets: its project's category when that still exists, else the first one. */
export function defaultTaskCategory(categories: string[] | undefined, project?: { category?: string }) {
  const list = resolveCategories(categories)
  return project?.category && list.includes(project.category) ? project.category : firstCategory(categories)
}

/** The four OS domains a category can map to (ADR-029). Hard-coded until P15 reads them from the OS. */
export const OS_DOMAINS: Array<{ id: OsDomain; label: string; covers: string }> = [
  { id: "work", label: "Work", covers: "projects, builds, career" },
  { id: "learning", label: "Learning", covers: "Master's, German, courses" },
  { id: "admin", label: "Admin", covers: "money, legal, bureaucracy" },
  { id: "life", label: "Life", covers: "health, family, home" },
]

/** The OS domain a category maps to, or undefined when it is unmapped. */
export function categoryDomain(name: string, domains?: Record<string, OsDomain | "">) {
  return domains?.[name] || undefined
}
