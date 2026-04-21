"use client"

import { useAppStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import type { ModuleId } from "@/lib/types"
import {
  LayoutDashboard,
  CalendarRange,
  CheckSquare,
  FolderKanban,
  CalendarDays,
  BookHeart,
} from "lucide-react"

const BOTTOM_ITEMS: { id: ModuleId; label: string; icon: React.ElementType }[] = [
  { id: "command-center", label: "Home", icon: LayoutDashboard },
  { id: "weekly-plan", label: "Weekly", icon: CalendarRange },
  { id: "todo", label: "ToDo", icon: CheckSquare },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "schedule", label: "Schedule", icon: CalendarDays },
  { id: "journal", label: "Journal", icon: BookHeart },
]

export function BottomNav() {
  const activeModule = useAppStore((s) => s.activeModule)
  const setActiveModule = useAppStore((s) => s.setActiveModule)

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card md:hidden"
      role="navigation"
      aria-label="Bottom navigation"
    >
      <ul className="flex items-center justify-around px-1 py-1.5 [padding-bottom:calc(env(safe-area-inset-bottom)+0.375rem)]">
        {BOTTOM_ITEMS.map((item) => (
          <li key={item.id}>
            <button
              onClick={() => setActiveModule(item.id)}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[11px] transition-colors sm:px-3 sm:text-xs",
                activeModule === item.id
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
