"use client"

import { useAppStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import type { ModuleId } from "@/lib/types"
import {
  LayoutDashboard,
  CalendarRange,
  Target,
  CheckSquare,
  FolderKanban,
  Trophy,
  CalendarDays,
  BookOpen,
  BookHeart,
  Zap,
} from "lucide-react"

const NAV_ITEMS: { id: ModuleId; label: string; icon: React.ElementType }[] = [
  { id: "command-center", label: "Command Center", icon: LayoutDashboard },
  { id: "weekly-plan", label: "Weekly Plan", icon: CalendarRange },
  { id: "goals", label: "Goals", icon: Target },
  { id: "todo", label: "ToDo", icon: CheckSquare },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "achievements", label: "Achievements", icon: Trophy },
  { id: "schedule", label: "Schedule", icon: CalendarDays },
  { id: "resources", label: "Resources", icon: BookOpen },
  { id: "journal", label: "Journal", icon: BookHeart },
]

export function MobileNav({ onClose }: { onClose: () => void }) {
  const activeModule = useAppStore((s) => s.activeModule)
  const setActiveModule = useAppStore((s) => s.setActiveModule)

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-sidebar-border px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
          <Zap className="h-4 w-4 text-sidebar-primary-foreground" />
        </div>
        <span className="font-serif text-lg font-bold tracking-tight">Magic Kick</span>
      </div>
      <nav className="flex-1 p-3" role="navigation" aria-label="Mobile navigation">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => {
                  setActiveModule(item.id)
                  onClose()
                }}
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
    </div>
  )
}
