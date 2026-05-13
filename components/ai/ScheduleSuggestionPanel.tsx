"use client"

import { Check, X, AlertTriangle, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ScheduleSuggestion } from "@/lib/types"

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

interface Props {
  suggestions: ScheduleSuggestion[]
  conflictingTaskIds: Set<string>
  onAccept: (suggestion: ScheduleSuggestion) => void
  onReject: (taskId: string) => void
  onClose: () => void
}

export function ScheduleSuggestionPanel({
  suggestions,
  conflictingTaskIds,
  onAccept,
  onReject,
  onClose,
}: Props) {
  if (suggestions.length === 0) return null

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-primary">AI Scheduling Suggestions</p>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {suggestions.map((s) => {
          const hasConflict = conflictingTaskIds.has(s.taskId)
          return (
            <div
              key={s.taskId}
              className={cn(
                "flex items-start gap-3 rounded-lg border bg-background px-3 py-2.5",
                hasConflict ? "border-amber-500/50" : "border-dashed border-primary/40"
              )}
            >
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{s.taskTitle}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary" className="text-[10px]">
                    {DAY_LABELS[s.dayOfWeek]} {s.startTime}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {s.duration}m
                  </Badge>
                  {hasConflict && (
                    <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-500">
                      <AlertTriangle className="mr-1 h-3 w-3" />
                      Conflict
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground italic">{s.reasoning}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-emerald-500 hover:text-emerald-400"
                  onClick={() => onAccept(s)}
                  disabled={hasConflict}
                  aria-label="Accept suggestion"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => onReject(s.taskId)}
                  aria-label="Reject suggestion"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
