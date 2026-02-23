"use client"

import { useTheme } from "next-themes"
import { signOut } from "firebase/auth"
import { useAppStore } from "@/lib/store"
import { auth } from "@/lib/firebase/client"
import { useAuth } from "@/hooks/use-auth"
import { syncNow } from "@/lib/sync/engine"
import { getCurrentWeekRange } from "@/lib/game-utils"
import { Button } from "@/components/ui/button"
import { QuickAddDialog } from "./quick-add-dialog"
import { Zap, Flame, Moon, Sun, Menu, RefreshCcw, LogOut } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { MobileNav } from "./mobile-nav"
import { useState } from "react"

export function TopBar() {
  const { theme, setTheme } = useTheme()
  const { user } = useAuth()
  const syncStatus = useAppStore((s) => s.sync.status)
  const profile = useAppStore((s) => s.profile)
  const weekRange = getCurrentWeekRange()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="flex h-14 items-center gap-3 border-b border-border bg-card px-4 md:px-6">
      {/* Mobile menu */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 bg-sidebar p-0 text-sidebar-foreground">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <MobileNav onClose={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Brand for mobile */}
      <div className="flex items-center gap-2 md:hidden">
        <Zap className="h-4 w-4 text-primary" />
        <span className="font-serif text-sm font-bold">Magic Kick</span>
      </div>

      {/* Week range */}
      <p className="hidden text-sm text-muted-foreground md:block">{weekRange.label}</p>

      <div className="flex-1" />

      {user ? (
        <div className="hidden max-w-40 truncate rounded-full border border-border px-3 py-1 text-xs text-muted-foreground sm:block">
          {user.email}
        </div>
      ) : null}

      {/* XP badge */}
      <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
        <Zap className="h-3 w-3" />
        {profile.xpThisWeek} XP
      </div>

      {/* Streak badge */}
      <div className="hidden items-center gap-1.5 rounded-full bg-streak/15 px-3 py-1 text-xs font-medium text-foreground sm:flex">
        <Flame className="h-3 w-3 text-streak" />
        {profile.streakDays}d
      </div>

      {/* Theme toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="h-8 w-8"
      >
        <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 text-xs"
        onClick={() => {
          if (!user?.uid) return
          void syncNow(user.uid)
        }}
      >
        <RefreshCcw className={syncStatus === "syncing" ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
        {syncStatus}
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => {
          if (!auth) return
          void signOut(auth)
        }}
        asChild={false}
      >
        <LogOut className="h-4 w-4" />
        <span className="sr-only">Log out</span>
      </Button>

      {/* Quick add */}
      <QuickAddDialog />
    </header>
  )
}
