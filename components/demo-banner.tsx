"use client"

import { useRouter } from "next/navigation"
import { useAppStore } from "@/lib/store"
import { Button } from "@/components/ui/button"

export function DemoBanner() {
  const isDemoMode = useAppStore((s) => s.isDemoMode)
  const exitDemoMode = useAppStore((s) => s.exitDemoMode)
  const router = useRouter()

  if (!isDemoMode) return null

  function handleExit() {
    exitDemoMode()
    router.replace("/login")
  }

  return (
    <div className="flex shrink-0 items-center justify-between gap-4 border-b bg-amber-500/10 px-4 py-2 text-sm">
      <div className="flex items-center gap-2">
        <span className="rounded bg-amber-500 px-1.5 py-0.5 text-xs font-semibold text-white">DEMO</span>
        <span className="text-muted-foreground">Exploring with sample data — changes are local only and not saved.</span>
      </div>
      <Button variant="outline" size="sm" className="shrink-0" onClick={handleExit}>
        Exit Demo
      </Button>
    </div>
  )
}
