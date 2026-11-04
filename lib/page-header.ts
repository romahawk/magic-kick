import { useEffect, useSyncExternalStore } from "react"

/** P32: what the top bar shows for the active module. Plain strings, so it compares by value. */
export type PageHeader = { title: string; subtitle?: string; help?: string }

const EMPTY: PageHeader = { title: "" }
let current: PageHeader = EMPTY
const listeners = new Set<() => void>()

function publish(next: PageHeader) {
  if (next.title === current.title && next.subtitle === current.subtitle && next.help === current.help) return
  current = next
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Read by the top bar. */
export function usePageHeaderValue(): PageHeader {
  return useSyncExternalStore(subscribe, () => current, () => EMPTY)
}

/** Called by each module: sets the title, subtitle and optional help text shown in the top bar. */
export function usePageHeader({ title, subtitle, help }: PageHeader) {
  useEffect(() => {
    publish({ title, subtitle, help })
  }, [title, subtitle, help])
  // Clears on unmount; the next module's effect runs in the same commit, so the bar does not flash empty.
  useEffect(() => () => publish(EMPTY), [])
}
