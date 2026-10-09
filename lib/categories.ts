// The single home for task and goal category rules (P14, ADR-029).
// Categories are defined in Magic Kick; the profile keeps the list and the colors.

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
