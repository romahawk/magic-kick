"use client"

import { useEffect, useState } from "react"
import { useAppStore } from "@/lib/store"
import { levelFromXP } from "@/lib/game-utils"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"
import type { ModuleId } from "@/lib/types"
import {
  LayoutDashboard,
  Target,
  CheckSquare,
  FolderKanban,
  Trophy,
  CalendarDays,
  BookOpen,
  BookHeart,
  Zap,
  Flame,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react"

const NAV_ITEMS: { id: ModuleId; label: string; icon: React.ElementType }[] = [
  { id: "command-center", label: "Command Center", icon: LayoutDashboard },
  { id: "schedule", label: "Schedule", icon: CalendarDays },
  { id: "goals", label: "Goals", icon: Target },
  { id: "todo", label: "ToDo", icon: CheckSquare },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "resources", label: "Resources", icon: BookOpen },
  { id: "journal", label: "Journal", icon: BookHeart },
  { id: "achievements", label: "Achievements", icon: Trophy },
]

export function Sidebar() {
  const activeModule = useAppStore((s) => s.activeModule)
  const setActiveModule = useAppStore((s) => s.setActiveModule)
  const profile = useAppStore((s) => s.profile)
  const xpInfo = levelFromXP(profile.xpTotal)
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false
    return window.localStorage.getItem("magic-kick-sidebar-collapsed") === "true"
  })

  useEffect(() => {
    window.localStorage.setItem("magic-kick-sidebar-collapsed", String(collapsed))
  }, [collapsed])

  return (
    <aside
      className={cn(
        "hidden flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Brand */}
      <div className={cn("flex items-center border-b border-sidebar-border py-4", collapsed ? "flex-col justify-center gap-2 px-3" : "gap-2 px-5")}>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
          <Zap className="h-4 w-4 text-sidebar-primary-foreground" />
        </div>
        {!collapsed ? <span className="font-serif text-lg font-bold tracking-tight">Magic Kick</span> : null}
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            collapsed ? "" : "ml-auto"
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      {/* Profile card */}
      <div className={cn("border-b border-sidebar-border", collapsed ? "px-3 py-4" : "p-4")}>
        <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sidebar-primary font-serif text-sm font-bold text-sidebar-primary-foreground">
            {profile.name.charAt(0)}
          </div>
          {!collapsed ? (
            <div className="flex-1">
              <p className="text-sm font-medium">{profile.name}</p>
              <p className="text-xs text-sidebar-foreground/60">Level {xpInfo.level}</p>
            </div>
          ) : null}
        </div>
        {!collapsed ? (
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-sidebar-foreground/70">
                <Zap className="h-3 w-3 text-xp" /> {xpInfo.current} / {xpInfo.needed} XP
              </span>
              <span className="flex items-center gap-1 text-sidebar-foreground/70">
                <Flame className="h-3 w-3 text-streak" /> {profile.streakDays}d
              </span>
            </div>
            <Progress value={xpInfo.progress} className="h-2 bg-sidebar-accent [&>div]:bg-sidebar-primary" />
          </div>
        ) : (
          <div className="mt-3 flex flex-col items-center gap-2 text-[10px] text-sidebar-foreground/70">
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-xp" /> {xpInfo.level}
            </span>
            <span className="flex items-center gap-1">
              <Flame className="h-3 w-3 text-streak" /> {profile.streakDays}d
            </span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className={cn("flex-1 overflow-y-auto", collapsed ? "p-2" : "p-3")} role="navigation" aria-label="Main navigation">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => setActiveModule(item.id)}
                className={cn(
                  "flex w-full items-center rounded-lg text-sm font-medium transition-colors",
                  collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5",
                  activeModule === item.id
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
                aria-label={item.label}
                title={item.label}
              >
                <item.icon className="h-4 w-4" />
                {!collapsed ? item.label : null}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
