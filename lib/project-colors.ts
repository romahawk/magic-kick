export const DEFAULT_PROJECT_COLOR = "#3b82f6"

/** Projects made before the color picker stored a Tailwind class instead of a hex color. */
const LEGACY_COLOR_MAP: Record<string, string> = {
  "bg-chart-1": "#3b82f6",
  "bg-chart-2": "#22c55e",
  "bg-chart-3": "#06b6d4",
  "bg-chart-4": "#f97316",
  "bg-chart-5": "#a855f7",
}

/** A project's color as hex. Every place that draws a project color reads it through this. */
export function normalizeProjectColor(color: string | undefined) {
  const trimmed = color?.trim() ?? ""
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed)) return trimmed
  return LEGACY_COLOR_MAP[trimmed] ?? DEFAULT_PROJECT_COLOR
}
