"use client"

import { X, BrainCircuit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { CoachingMessage } from "@/lib/types"

interface CoachingBannerProps {
  message: CoachingMessage
  onDismiss: () => void
}

export function CoachingBanner({ message, onDismiss }: CoachingBannerProps) {
  const isCorrect = message.tone === "correct"

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-3",
        isCorrect
          ? "border-amber-500/40 bg-amber-500/5"
          : "border-primary/30 bg-primary/5"
      )}
    >
      <BrainCircuit
        className={cn("mt-0.5 h-4 w-4 shrink-0", isCorrect ? "text-amber-500" : "text-primary")}
      />
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-semibold", isCorrect ? "text-amber-500" : "text-primary")}>
          {message.headline}
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">{message.detail}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
        onClick={onDismiss}
        aria-label="Dismiss coaching message"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

export function CoachingBannerSkeleton() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/40 bg-muted/30 px-4 py-3">
      <div className="mt-0.5 h-4 w-4 shrink-0 rounded bg-muted animate-pulse" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 w-40 rounded bg-muted animate-pulse" />
        <div className="h-3 w-56 rounded bg-muted animate-pulse" />
      </div>
    </div>
  )
}
