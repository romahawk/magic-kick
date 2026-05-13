"use client"

import { useState } from "react"
import { X, AlertTriangle, Lightbulb, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Insight } from "@/lib/types"

const VARIANT_CONFIG = {
  summary:    { icon: FileText,      border: "border-border/60",          bg: "bg-card",           label: "text-foreground" },
  warning:    { icon: AlertTriangle, border: "border-amber-500/40",       bg: "bg-amber-500/5",    label: "text-amber-500" },
  suggestion: { icon: Lightbulb,     border: "border-primary/30",         bg: "bg-primary/5",      label: "text-primary" },
}

interface InsightCardProps {
  insight: Insight
  onDismiss?: (id: string) => void
}

export function InsightCard({ insight, onDismiss }: InsightCardProps) {
  const { icon: Icon, border, bg, label } = VARIANT_CONFIG[insight.type]

  return (
    <div className={cn("flex items-start gap-3 rounded-lg border px-4 py-3", border, bg)}>
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", label)} />
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-medium", label)}>{insight.title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{insight.body}</p>
      </div>
      {onDismiss && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => onDismiss(insight.id)}
          aria-label="Dismiss insight"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  )
}

export function InsightCardSkeleton() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/40 bg-muted/30 px-4 py-3">
      <div className="mt-0.5 h-4 w-4 shrink-0 rounded bg-muted animate-pulse" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 w-32 rounded bg-muted animate-pulse" />
        <div className="h-3 w-48 rounded bg-muted animate-pulse" />
      </div>
    </div>
  )
}

export function InsightList({
  insights,
  loading,
  onDismiss,
}: {
  insights: Insight[]
  loading: boolean
  onDismiss?: (id: string) => void
}) {
  const [collapsed, setCollapsed] = useState(false)

  if (!loading && insights.length === 0) return null

  return (
    <div className="space-y-2">
      <button
        className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setCollapsed((c) => !c)}
      >
        AI Insights {collapsed ? "▸" : "▾"}
      </button>
      {!collapsed && (
        <div className="flex flex-col gap-2">
          {loading ? (
            <>
              <InsightCardSkeleton />
              <InsightCardSkeleton />
            </>
          ) : (
            insights.map((i) => (
              <InsightCard key={i.id} insight={i} onDismiss={onDismiss} />
            ))
          )}
        </div>
      )}
    </div>
  )
}
