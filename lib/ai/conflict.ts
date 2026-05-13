import type { ScheduleSuggestion, TimeBlock } from "@/lib/types"

function toMin(time: string) {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + m
}

// Day-of-week labels used to map suggestion dayOfWeek (0=Mon) to a date ISO in the given week
export function dayIndexToISO(weekStartISO: string, dayOfWeek: number): string {
  const d = new Date(`${weekStartISO}T00:00:00`)
  d.setDate(d.getDate() + dayOfWeek)
  return d.toISOString().slice(0, 10)
}

export interface Conflict {
  suggestion: ScheduleSuggestion
  conflictsWith: TimeBlock
}

export function detectConflicts(
  suggestions: ScheduleSuggestion[],
  existingBlocks: TimeBlock[],
  weekStartISO: string
): Conflict[] {
  const conflicts: Conflict[] = []

  for (const suggestion of suggestions) {
    const dateISO = dayIndexToISO(weekStartISO, suggestion.dayOfWeek)
    const suggStart = toMin(suggestion.startTime)
    const suggEnd = suggStart + suggestion.duration

    const dayBlocks = existingBlocks.filter((b) => b.dateISO === dateISO && !b.deleted)
    for (const block of dayBlocks) {
      const blockStart = toMin(block.startTime)
      const blockEnd = toMin(block.endTime)
      if (suggStart < blockEnd && suggEnd > blockStart) {
        conflicts.push({ suggestion, conflictsWith: block })
        break
      }
    }
  }

  return conflicts
}
