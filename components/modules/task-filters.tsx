"use client"

// P28: the filter controls of Schedule's Unscheduled tasks panel (P26), shared with ToDo.
// Controlled components; each tab keeps its own state and storage key.

import { useRef, useState } from "react"
import { Search, SlidersHorizontal, X } from "lucide-react"
import type { ProjectAllocation, ProjectFilter, ProjectRow } from "@/lib/unscheduled-filter"
import type { ProjectFilter, ProjectRow } from "@/lib/unscheduled-filter"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

/** A project list longer than this shows its first rows and "+N more", so the header stays short. */
const PROJECT_ROWS_MAX = 5

function hours(value: number) {
  return Math.round(value * 10) / 10
}

/** "4/6h" while nothing is done, then "✓1.5 · 4/6h": done, planned and allocated hours. */
export function allocationHoursText(allocation: ProjectAllocation) {
  const planned = `${hours(allocation.plannedHours)}/${hours(allocation.allocatedHours)}h`
  return allocation.doneHours > 0 ? `✓${hours(allocation.doneHours)} · ${planned}` : planned
}

export function allocationHoursLabel(allocation: ProjectAllocation) {
  return `${hours(allocation.plannedHours)} of ${hours(allocation.allocatedHours)} hours planned, ${hours(allocation.doneHours)} done`
}

/**
 * P28: the week-allocation bar, the same on Schedule, ToDo and the Command Center. The track is the
 * allocation, the light fill the planned hours, the solid fill the hours done; both stop at 100%.
 */
export function AllocationBar({ allocation, color, className }: { allocation: ProjectAllocation; color: string; className?: string }) {
  const pct = (value: number) => (allocation.allocatedHours > 0 ? Math.min(100, (value / allocation.allocatedHours) * 100) : 0)
  return (
    <span className={cn("relative block overflow-hidden rounded-full bg-muted", className)} aria-hidden="true">
      <span className="absolute inset-y-0 left-0 rounded-full opacity-35" style={{ width: `${pct(allocation.plannedHours)}%`, backgroundColor: color }} />
      <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct(allocation.doneHours)}%`, backgroundColor: color }} />
    </span>
  )
}

/** The project filter, kept in localStorage under `storageKey`. */
export function useStoredProjectFilter(storageKey: string) {
  const [stored, setStored] = useState<string | null>(() => {
    if (typeof window === "undefined") return null
    try {
      return window.localStorage.getItem(storageKey)
    } catch {
      return null
    }
  })
  function choose(key: string) {
    setStored(key)
    try {
      window.localStorage.setItem(storageKey, key)
    } catch {
      // Private mode or blocked storage: the filter still works for this visit.
    }
  }
  return [stored, choose] as const
}

export interface ScopeOption<T extends string> {
  key: T
  label: string
  count: number
  title?: string
}

export function ScopeSwitch<T extends string>({ options, value, onChange, label }: {
  options: ScopeOption<T>[]; value: T; onChange: (key: T) => void; label: string
}) {
  return (
    <div
      className={cn("grid min-w-0 flex-1 gap-0.5 rounded-lg bg-muted p-0.5", options.length === 3 ? "grid-cols-3" : "grid-cols-2")}
      role="group"
      aria-label={label}
    >
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          onClick={() => onChange(option.key)}
          aria-pressed={value === option.key}
          title={option.title}
          className={cn(
            "flex min-w-0 items-center justify-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium transition-colors",
            value === option.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <span className="truncate">{option.label}</span>
          <span className="tabular-nums text-muted-foreground">{option.count}</span>
        </button>
      ))}
    </div>
  )
}

/** A search button that opens an inline field; Esc clears, then closes. */
export function InlineSearch({ query, onQueryChange, label }: { query: string; onQueryChange: (value: string) => void; label: string }) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  if (!open && !query) {
    return (
      <Button
        ref={buttonRef}
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-muted-foreground"
        onClick={() => setOpen(true)}
        aria-label={label}
        title="Search"
      >
        <Search className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <div className="relative w-28 shrink-0">
      <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        autoFocus
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onBlur={() => !query && setOpen(false)}
        onKeyDown={(e) => {
          if (e.key !== "Escape") return
          if (query) return onQueryChange("")
          setOpen(false)
          requestAnimationFrame(() => buttonRef.current?.focus())
        }}
        placeholder="Search"
        aria-label={label}
        className="h-7 pl-7 pr-6 text-xs"
      />
      {query ? (
        <button
          type="button"
          onClick={() => onQueryChange("")}
          className="absolute right-1 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="h-3 w-3" />
        </button>
      ) : null}
    </div>
  )
}

/** Sort and category chips in a popover; the trigger shows how many are not at their default. */
export function FiltersPopover<S extends string>({
  sort,
  sortLabels,
  defaultSort,
  onSortChange,
  sortDisabled = false,
  sortLabel,
  categories,
  selectedCategories,
  onToggleCategory,
  onClearCategories,
  colorOf,
}: {
  sort: S
  sortLabels: Record<S, string>
  defaultSort: S
  onSortChange: (value: S) => void
  sortDisabled?: boolean
  sortLabel: string
  categories: { name: string; count: number }[]
  selectedCategories: string[]
  onToggleCategory: (name: string) => void
  onClearCategories: () => void
  colorOf: (category: string) => string
}) {
  const filterCount = selectedCategories.length + (sort !== defaultSort && !sortDisabled ? 1 : 0)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative h-7 w-7 shrink-0 text-muted-foreground"
          aria-label={filterCount > 0 ? `Filters, ${filterCount} active` : "Filters"}
          title="Sort and filter"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {filterCount > 0 ? (
            <Badge className="absolute -right-1 -top-1 h-4 min-w-4 rounded-full px-1 text-[9px] tabular-nums">{filterCount}</Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-3 p-3">
        <div className="space-y-1.5">
          <p className="text-xs font-medium">Sort</p>
          <Select value={sort} onValueChange={(v) => onSortChange(v as S)} disabled={sortDisabled}>
            <SelectTrigger size="sm" className="h-8 w-full text-xs" aria-label={sortLabel}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(sortLabels) as S[]).map((key) => (
                <SelectItem key={key} value={key} className="text-xs">
                  {sortLabels[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {sortDisabled ? <p className="text-[11px] text-muted-foreground">Done is always newest first.</p> : null}
        </div>
        {categories.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-xs font-medium">Category</p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by category">
              <button
                type="button"
                onClick={onClearCategories}
                aria-pressed={selectedCategories.length === 0}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                  selectedCategories.length === 0
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                )}
              >
                All
              </button>
              {categories.map(({ name, count }) => {
                const selected = selectedCategories.includes(name)
                const color = colorOf(name)
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => onToggleCategory(name)}
                    aria-pressed={selected}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                      selected ? "border-transparent text-white" : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                    )}
                    style={selected ? { backgroundColor: color } : undefined}
                  >
                    {!selected ? <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} /> : null}
                    {name}
                    <span className={cn("tabular-nums", selected ? "text-white/80" : "text-muted-foreground/70")}>{count}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}

/** The project radiogroup (P26): allocation bars, "+N more" past five rows, roving tabindex. */
export function ProjectFilterList({ rows, value, onChange }: { rows: ProjectRow[]; value: ProjectFilter; onChange: (key: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [focusedRowKey, setFocusedRowKey] = useState<string | null>(null)
  const rowRefs = useRef(new Map<string, HTMLButtonElement>())

  const collapse = rows.length > PROJECT_ROWS_MAX && !expanded
  const shownRows = collapse ? rows.filter((row, index) => index < PROJECT_ROWS_MAX - 1 || row.key === value) : rows
  const tabRowKey = shownRows.some((row) => row.key === focusedRowKey) ? focusedRowKey : value

  // Roving tabindex (WAI-ARIA radio group): arrows move focus, Space/Enter selects.
  function onRowKeyDown(e: React.KeyboardEvent, index: number) {
    const last = shownRows.length - 1
    const next =
      e.key === "ArrowDown" || e.key === "ArrowRight" ? Math.min(last, index + 1)
      : e.key === "ArrowUp" || e.key === "ArrowLeft" ? Math.max(0, index - 1)
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : null
    if (next === null) return
    e.preventDefault()
    const key = shownRows[next].key
    setFocusedRowKey(key)
    rowRefs.current.get(key)?.focus()
  }

  return (
    <div>
      <div role="radiogroup" aria-label="Filter by project" className="space-y-px">
        {shownRows.map((row, index) => {
          const selected = row.key === value
          const hoursText = row.allocation ? allocationHoursText(row.allocation) : null
          const pct = row.allocation && row.allocation.allocatedHours > 0 ? Math.min(100, (row.allocation.plannedHours / row.allocation.allocatedHours) * 100) : 0
          const hoursText = row.allocation ? `${hours(row.allocation.plannedHours)}/${hours(row.allocation.allocatedHours)}h` : null
          return (
            <button
              key={row.key}
              ref={(el) => {
                if (el) rowRefs.current.set(row.key, el)
                else rowRefs.current.delete(row.key)
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${row.label}, ${row.count} ${row.count === 1 ? "task" : "tasks"}${row.allocation ? `, ${allocationHoursLabel(row.allocation)}` : ""}`}
              aria-label={`${row.label}, ${row.count} ${row.count === 1 ? "task" : "tasks"}${row.allocation ? `, ${hours(row.allocation.plannedHours)} of ${hours(row.allocation.allocatedHours)} hours planned` : ""}`}
              tabIndex={row.key === tabRowKey ? 0 : -1}
              onClick={() => onChange(row.key)}
              onFocus={() => setFocusedRowKey(row.key)}
              onKeyDown={(e) => onRowKeyDown(e, index)}
              className={cn(
                "relative flex h-7 w-full items-center gap-2 overflow-hidden rounded-md px-2 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                row.count === 0 && !selected && "opacity-60"
              )}
            >
              {row.color ? <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: row.color }} aria-hidden="true" /> : null}
              <span className="min-w-0 flex-1 truncate">{row.label}</span>
              {hoursText ? <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">{hoursText}</span> : null}
              <span className="w-5 shrink-0 text-right tabular-nums">{row.count}</span>
              {row.allocation ? (
                <AllocationBar allocation={row.allocation} color={row.color ?? "currentColor"} className="absolute inset-x-2 bottom-0.5 h-0.5" />
                <span className="absolute inset-x-2 bottom-0.5 h-0.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                  <span className="block h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: row.color }} />
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
      {collapse ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex h-6 w-full items-center rounded-md px-2 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          +{rows.length - shownRows.length} more
        </button>
      ) : null}
    </div>
  )
}
