import type { ItemSource, Provenance } from "@/lib/types"

/**
 * Provenance (P4, ADR-018): every item has a source, and `source + sourceId` is idempotent.
 *
 * Items written before P4 carry no `source`; they read as "manual" here instead of being rewritten
 * by a store migration.
 */
export function sourceOf(item: Provenance): ItemSource {
  return item.source ?? "manual"
}

/** Label for a non-manual item ("Agent", "Import"); null for manual items, which show no label. */
export function sourceLabel(item: Provenance): string | null {
  const source = sourceOf(item)
  return source === "manual" ? null : source === "agent" ? "Agent" : "Import"
}

/**
 * The item already written for this `source + sourceId`, if any. Deleted items count: an agent or
 * import re-sending something the user deleted must not bring it back. Manual items, and items
 * without a `sourceId`, never match.
 */
export function findBySource<T extends Provenance>(items: T[], incoming: Provenance): T | undefined {
  const source = incoming.source ?? "manual"
  if (source === "manual" || !incoming.sourceId) return undefined
  return items.find((item) => sourceOf(item) === source && item.sourceId === incoming.sourceId)
}
