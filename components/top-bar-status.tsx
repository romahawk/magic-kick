"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { useTheme } from "next-themes"
import { CloudAlert, CloudCheck, Moon, RefreshCcw, Sun } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { useAuth } from "@/hooks/use-auth"
import { syncNow } from "@/lib/sync/engine"
import { cn } from "@/lib/utils"
import { nextAnnouncement, syncStatusView } from "@/lib/sync-status-view"
import { Button } from "@/components/ui/button"
import { DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

/** False on the server and during hydration, true afterwards (no hydration mismatch). */
function useMounted() {
  return useSyncExternalStore(() => () => {}, () => true, () => false)
}

/** Sync as a status (P31): icon when saved, text while syncing, a red Retry on error. Click syncs now. */
export function SyncStatusButton() {
  const { user } = useAuth()
  const mounted = useMounted()
  const status = useAppStore((s) => s.sync.status)
  const lastSyncedAt = useAppStore((s) => s.sync.lastSyncedAt)
  const [tipOpen, setTipOpen] = useState(false)
  const [, setTick] = useState(0)
  const [announcement, setAnnouncement] = useState("")

  // Re-render every 60 s only while the tooltip is open (it opens on hover and on focus).
  useEffect(() => {
    if (!tipOpen) return
    const id = setInterval(() => setTick((n) => n + 1), 60_000)
    return () => clearInterval(id)
  }, [tipOpen])

  // Announce only the move into "error" and the return to saved, not every "syncing" tick.
  useEffect(() => {
    let hadError = useAppStore.getState().sync.status === "error"
    return useAppStore.subscribe((state, prev) => {
      const r = nextAnnouncement(prev.sync.status, state.sync.status, hadError)
      hadError = r.hadError
      if (r.message) setAnnouncement(r.message)
    })
  }, [])

  // Date.now() is read each render on purpose: the label is refreshed by the tooltip's 60 s tick.
  // eslint-disable-next-line react-hooks/purity
  const view = syncStatusView(status, lastSyncedAt, Date.now())
  const label = mounted ? view.label : "Sync status"

  return (
    <>
      <Tooltip open={tipOpen} onOpenChange={setTipOpen}>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 gap-1.5 text-xs", view.text ? "w-auto px-2" : "w-8", view.tone === "destructive" && "text-destructive hover:text-destructive")}
            onClick={() => {
              if (user?.uid) void syncNow(user.uid)
            }}
            aria-label={label}
          >
            {view.icon === "syncing" ? (
              <RefreshCcw className="h-4 w-4 motion-safe:animate-spin" />
            ) : view.icon === "error" ? (
              <CloudAlert className="h-4 w-4" />
            ) : (
              <CloudCheck className="h-4 w-4" />
            )}
            {view.text ? <span className={view.icon === "syncing" ? "hidden sm:inline" : undefined}>{view.text}</span> : null}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <span aria-live="polite" role="status" className="sr-only">{announcement}</span>
    </>
  )
}

/** Shows the rendered scheme. Compares resolvedTheme, never `theme`, which can be "system". */
export function ThemeToggleButton() {
  const { resolvedTheme, systemTheme, setTheme } = useTheme()
  const mounted = useMounted()
  if (!mounted) return <div className="h-8 w-8 shrink-0" aria-hidden="true" />

  const dark = resolvedTheme === "dark"
  const target = dark ? "light" : "dark"
  const text = `Switch to ${target} theme`
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label={text}
          onClick={() => setTheme(target === systemTheme ? "system" : target)}
        >
          {dark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  )
}

/** Avatar-menu theme choice: System (with the OS scheme), Light, Dark. */
export function ThemeMenuGroup() {
  const { theme, systemTheme, setTheme } = useTheme()
  return (
    <>
      <DropdownMenuLabel className="text-xs text-muted-foreground">Theme</DropdownMenuLabel>
      <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={setTheme}>
        <DropdownMenuRadioItem value="system">
          System{systemTheme ? <span className="ml-1 whitespace-nowrap text-muted-foreground">· currently {systemTheme}</span> : null}
        </DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </>
  )
}
