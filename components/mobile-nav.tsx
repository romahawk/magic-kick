"use client"

import { useAppStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { Zap } from "lucide-react"
import { NAV_GROUPS } from "./sidebar"

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
      <nav className="flex flex-1 flex-col gap-4 p-3" role="navigation" aria-label="Mobile navigation">
        {NAV_GROUPS.map((group) => {
          const secondary = group.id === "reference"
          return (
            <div key={group.id}>
              <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50" aria-hidden>
                {group.label}
              </p>
              <ul className="flex flex-col gap-1" aria-label={group.label}>
                {group.items.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => {
                        setActiveModule(item.id)
                        onClose()
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 transition-colors",
                        secondary ? "py-2 text-[13px] font-normal" : "py-2.5 text-sm font-medium",
                        activeModule === item.id
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : secondary
                            ? "text-sidebar-foreground/55 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                      aria-current={activeModule === item.id ? "page" : undefined}
                    >
                      <item.icon className={secondary ? "h-3.5 w-3.5" : "h-4 w-4"} />
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </nav>
    </div>
  )
}
