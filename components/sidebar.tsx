"use client"

import { useEffect, useState } from "react"
import { useAppStore } from "@/lib/store"
import { cn } from "@/lib/utils"
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
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react"

// Navigation weight (P5): execution surfaces first, reference surfaces grouped below and secondary.
// Shared with the mobile menu (mobile-nav.tsx) so both list the same eight destinations.
export const NAV_GROUPS: {
  id: "execution" | "reference"
  label: string
  items: { id: ModuleId; label: string; icon: React.ElementType }[]
}[] = [
  {
    id: "execution",
    label: "Execution",
    items: [
      { id: "command-center", label: "Command Center", icon: LayoutDashboard },
      { id: "schedule", label: "Schedule", icon: CalendarDays },
      { id: "todo", label: "ToDo", icon: CheckSquare },
      { id: "projects", label: "Projects", icon: FolderKanban },
    ],
  },
  {
    id: "reference",
    label: "Reference",
    items: [
      { id: "goals", label: "Goals", icon: Target },
      { id: "resources", label: "Resources", icon: BookOpen },
      { id: "journal", label: "Journal", icon: BookHeart },
      { id: "achievements", label: "Achievements", icon: Trophy },
    ],
  },
]

export function Sidebar() {
  const activeModule = useAppStore((s) => s.activeModule)
  const setActiveModule = useAppStore((s) => s.setActiveModule)
  const profile = useAppStore((s) => s.profile)
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

      {/* Profile card — name only (P6, OS DEC-2026-09-27-001). XP, level and streak live in
          Achievements and the avatar menu, not on the surface you look at every day. */}
      <div className={cn("border-b border-sidebar-border", collapsed ? "px-3 py-4" : "p-4")}>
        <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full bg-sidebar-primary font-serif text-sm font-bold text-sidebar-primary-foreground"
            title={collapsed ? profile.name : undefined}
          >
            {profile.name.charAt(0)}
          </div>
          {!collapsed ? <p className="flex-1 truncate text-sm font-medium">{profile.name}</p> : null}
        </div>
      </div>

      {/* Nav */}
      <nav className={cn("flex flex-1 flex-col gap-4 overflow-y-auto", collapsed ? "p-2" : "p-3")} role="navigation" aria-label="Main navigation">
        {NAV_GROUPS.map((group, groupIndex) => {
          const secondary = group.id === "reference"
          return (
            <div key={group.id}>
              {collapsed ? (
                groupIndex > 0 ? <div className="mx-2 mb-3 border-t border-sidebar-border" aria-hidden /> : null
              ) : (
                <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50" aria-hidden>
                  {group.label}
                </p>
              )}
              <ul className="flex flex-col gap-1" aria-label={group.label}>
                {group.items.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => setActiveModule(item.id)}
                      className={cn(
                        "flex w-full items-center rounded-lg transition-colors",
                        secondary ? "text-[13px] font-normal" : "text-sm font-medium",
                        collapsed ? "justify-center px-2" : "gap-3 px-3",
                        secondary ? "py-2" : "py-2.5",
                        activeModule === item.id
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : secondary
                            ? "text-sidebar-foreground/55 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                      aria-label={item.label}
                      aria-current={activeModule === item.id ? "page" : undefined}
                      title={item.label}
                    >
                      <item.icon className={secondary ? "h-3.5 w-3.5" : "h-4 w-4"} />
                      {!collapsed ? item.label : null}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
