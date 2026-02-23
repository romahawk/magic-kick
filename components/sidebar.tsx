"use client"

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
} from "lucide-react"

const NAV_ITEMS: { id: ModuleId; label: string; icon: React.ElementType }[] = [
  { id: "command-center", label: "Command Center", icon: LayoutDashboard },
  { id: "goals", label: "Goals", icon: Target },
  { id: "todo", label: "ToDo", icon: CheckSquare },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "achievements", label: "Achievements", icon: Trophy },
  { id: "schedule", label: "Schedule", icon: CalendarDays },
  { id: "resources", label: "Resources", icon: BookOpen },
  { id: "journal", label: "Journal", icon: BookHeart },
]

export function Sidebar() {
  const activeModule = useAppStore((s) => s.activeModule)
  const setActiveModule = useAppStore((s) => s.setActiveModule)
  const profile = useAppStore((s) => s.profile)
  const xpInfo = levelFromXP(profile.xpTotal)

  return (
    <aside className="hidden w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      {/* Brand */}
      <div className="flex items-center gap-2 border-b border-sidebar-border px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
          <Zap className="h-4 w-4 text-sidebar-primary-foreground" />
        </div>
        <span className="font-serif text-lg font-bold tracking-tight">Magic Kick</span>
      </div>

      {/* Profile card */}
      <div className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sidebar-primary font-serif text-sm font-bold text-sidebar-primary-foreground">
            {profile.name.charAt(0)}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{profile.name}</p>
            <p className="text-xs text-sidebar-foreground/60">Level {xpInfo.level}</p>
          </div>
        </div>
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
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3" role="navigation" aria-label="Main navigation">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => setActiveModule(item.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  activeModule === item.id
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
