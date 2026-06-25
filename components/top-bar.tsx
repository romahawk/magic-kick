"use client"

import { useTheme } from "next-themes"
import { signOut } from "firebase/auth"
import { useState } from "react"
import { useAppStore } from "@/lib/store"
import { auth } from "@/lib/firebase/client"
import { useAuth } from "@/hooks/use-auth"
import { syncNow } from "@/lib/sync/engine"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { QuickAddDialog } from "./quick-add-dialog"
import { Zap, Flame, Moon, Sun, Menu, RefreshCcw, LogOut } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { MobileNav } from "./mobile-nav"

// §4 — Top bar stripped to: workspace mark · sync · avatar menu · Quick Add
// XP, streak, email, theme toggle, logout moved into avatar dropdown
export function TopBar() {
  const { theme, setTheme } = useTheme()
  const { user } = useAuth()
  const syncStatus = useAppStore((s) => s.sync.status)
  const profile = useAppStore((s) => s.profile)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="flex min-h-14 flex-wrap items-center gap-2 border-b border-border bg-card px-3 py-2 md:flex-nowrap md:gap-3 md:px-6 md:py-0">
      {/* Mobile nav sheet */}
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

      {/* Workspace mark (mobile only) */}
      <div className="flex items-center gap-2 md:hidden">
        <Zap className="h-4 w-4 text-primary" />
        <span className="font-serif text-sm font-bold">Magic Kick</span>
      </div>

      <div className="hidden flex-1 md:block" />

      {/* Sync indicator */}
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 px-2 text-xs sm:px-3"
        onClick={() => {
          if (!user?.uid) return
          void syncNow(user.uid)
        }}
        aria-label={`Sync status: ${syncStatus}`}
      >
        <RefreshCcw className={syncStatus === "syncing" ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
        <span className="hidden sm:inline">{syncStatus}</span>
      </Button>

      {/* Avatar dropdown — contains email, XP/streak, theme toggle, logout */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" aria-label="User menu">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-xs">
                {user?.email?.[0]?.toUpperCase() ?? "U"}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {user?.email ? (
            <div className="truncate px-2 py-1.5 text-xs text-muted-foreground">{user.email}</div>
          ) : null}
          <DropdownMenuSeparator />
          <div className="flex items-center gap-4 px-2 py-2">
            <div className="flex items-center gap-1 text-xs">
              <Zap className="h-3 w-3 text-primary" />
              <span>{profile.xpThisWeek} XP</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <Flame className="h-3 w-3 text-streak" />
              <span>{profile.streakDays}d streak</span>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? (
              <Sun className="mr-2 h-4 w-4" />
            ) : (
              <Moon className="mr-2 h-4 w-4" />
            )}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => {
              if (!auth) return
              void signOut(auth)
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Quick add */}
      <QuickAddDialog />
    </header>
  )
}
