"use client"

import { signOut } from "firebase/auth"
import { useEffect, useState } from "react"
import { useAppStore } from "@/lib/store"
import { levelFromXP } from "@/lib/game-utils"
import { auth } from "@/lib/firebase/client"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { QuickAddDialog } from "./quick-add-dialog"
import { SyncStatusButton, ThemeToggleButton, ThemeMenuGroup } from "./top-bar-status"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { usePageHeaderValue } from "@/lib/page-header"
import { CalendarDays, CircleHelp, Zap, Flame, Menu, LogOut } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { MobileNav } from "./mobile-nav"
import { CalendarMetadataDialog } from "./calendar-metadata-dialog"

// P32: the left side is the page header (the one h1: title, subtitle, optional (?) help), set by each
// module with usePageHeader; on mobile the title replaces the workspace mark and the subtitle is hidden.
// P31 (ADR-037), then: sync status · theme toggle · avatar menu · Quick Add.
// Sync is a status (icon when saved, text while syncing, red Retry on error); the toggle shows the
// rendered scheme. Avatar menu: email · Level/XP/streak · Calendar settings · Theme (System/Light/Dark) · Log out.
export function TopBar() {
  const { user } = useAuth()
  const profile = useAppStore((s) => s.profile)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [calendarDialogOpen, setCalendarDialogOpen] = useState(false)
  const { title, subtitle, help } = usePageHeaderValue()

  // Next applies the static metadata title after first paint and would overwrite this one: keep ours.
  useEffect(() => {
    const next = title ? `${title} · Magic Kick` : "Magic Kick"
    const apply = () => { if (document.title !== next) document.title = next }
    apply()
    const el = document.querySelector("title")
    if (!el) return
    const observer = new MutationObserver(apply)
    observer.observe(el, { childList: true, characterData: true, subtree: true })
    return () => observer.disconnect()
  }, [title])

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

      {/* Page header: the one h1. The workspace mark shows until a module has set a title. */}
      {title ? (
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="min-w-0">
            <h1 className="truncate font-serif text-lg font-bold leading-tight tracking-tight">{title}</h1>
            {subtitle ? <p className="hidden truncate text-xs leading-tight text-muted-foreground sm:block">{subtitle}</p> : null}
          </div>
          {help ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-muted-foreground" aria-label={`About this page: ${help}`}>
                  <CircleHelp className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{help}</TooltipContent>
            </Tooltip>
          ) : null}
        </div>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Zap className="h-4 w-4 text-primary md:hidden" />
          <span className="font-serif text-sm font-bold md:hidden">Magic Kick</span>
        </div>
      )}

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
