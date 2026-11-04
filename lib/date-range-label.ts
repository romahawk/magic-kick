import { format, getISOWeek, parseISO } from "date-fns"

const at = (iso: string) => parseISO(`${iso}T12:00:00`)

/** "Nov 2 – 8, 2026 · Week 45"; "Nov 28 – Dec 4, 2026 · Week 48" across months; "Dec 28, 2026 – Jan 3, 2027 · Week 53" across years. */
export function weekRangeLabel(startISO: string, endISO: string): string {
  const start = at(startISO)
  const end = at(endISO)
  const week = `Week ${getISOWeek(start)}`
  if (start.getFullYear() !== end.getFullYear()) {
    return `${format(start, "MMM d, yyyy")} – ${format(end, "MMM d, yyyy")} · ${week}`
  }
  const endPart = start.getMonth() === end.getMonth() ? format(end, "d, yyyy") : format(end, "MMM d, yyyy")
  return `${format(start, "MMM d")} – ${endPart} · ${week}`
}

/** "Wed, Nov 4, 2026 · Week 45" */
export function dayLabel(iso: string): string {
  const d = at(iso)
  return `${format(d, "EEE, MMM d, yyyy")} · Week ${getISOWeek(d)}`
}
