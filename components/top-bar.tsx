"use client"

import { signOut } from "firebase/auth"
import { useState } from "react"
import { useAppStore } from "@/lib/store"
import { levelFromXP } from "@/lib/game-utils"
import { auth } from "@/lib/firebase/client"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { QuickAddDialog } from "./quick-add-dialog"
import { SyncStatusButton, ThemeToggleButton, ThemeMenuGroup } from "./top-bar-status"
import { TooltipProvider } from "@/components/ui/tooltip"
import { CalendarDays, Zap, Flame, Menu, LogOut } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { MobileNav } from "./mobile-nav"
import { CalendarMetadataDialog } from "./calendar-metadata-dialog"

// P31 (ADR-037), left to right: workspace mark · sync status · theme toggle · avatar menu · Quick Add.
// Sync is a status (icon when saved, text while syncing, red Retry on error); the toggle shows the
// rendered scheme. Avatar menu: email · Level/XP/streak · Calendar settings · Theme (System/Light/Dark) · Log out.
export function TopBar() {
  const { user } = useAuth()
  const profile = useAppStore((s) => s.profile)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [calendarDialogOpen, setCalendarDialogOpen] = useState(false)

  return (
    <TooltipProvider>
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

      <SyncStatusButton />
      <ThemeToggleButton />

      {/* Avatar dropdown — email, XP/streak, Calendar settings, Theme, logout */}
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
        <DropdownMenuContent align="end" className="w-60">
          {user?.email ? (
            <div className="truncate px-2 py-1.5 text-xs text-muted-foreground">{user.email}</div>
          ) : null}
          <DropdownMenuSeparator />
          <div className="flex items-center gap-4 whitespace-nowrap px-2 py-2">
            <div className="text-xs">Level {levelFromXP(profile.xpTotal).level}</div>
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
          <DropdownMenuItem
            onSelect={() => {
              setCalendarDialogOpen(true)
            }}
          >
            <CalendarDays className="mr-2 h-4 w-4" />
            Calendar settings
          </DropdownMenuItem>
          <ThemeMenuGroup />
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

      <CalendarMetadataDialog open={calendarDialogOpen} onOpenChange={setCalendarDialogOpen} />

      {/* Quick add */}
      <QuickAddDialog />
    </header>
    </TooltipProvider>
  )
}
