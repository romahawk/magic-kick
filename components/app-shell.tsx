"use client"

import { useAppStore } from "@/lib/store"
import { Sidebar } from "./sidebar"
import { BottomNav } from "./bottom-nav"
import { TopBar } from "./top-bar"
import { CommandCenter } from "./modules/command-center"
import { WeeklyPlanModule } from "./modules/weekly-plan-module"
import { GoalsModule } from "./modules/goals-module"
import { TodoModule } from "./modules/todo-module"
import { ProjectsModule } from "./modules/projects-module"
import { AchievementsModule } from "./modules/achievements-module"
import { ScheduleModule } from "./modules/schedule-module"
import { ResourcesModule } from "./modules/resources-module"
import { JournalModule } from "./modules/journal-module"
import { DemoBanner } from "./demo-banner"
import { ErrorBoundary } from "./error-boundary"

const MODULE_MAP = {
  "command-center": CommandCenter,
  "weekly-plan": WeeklyPlanModule,
  goals: GoalsModule,
  todo: TodoModule,
  projects: ProjectsModule,
  achievements: AchievementsModule,
  schedule: ScheduleModule,
  resources: ResourcesModule,
  journal: JournalModule,
} as const

export function AppShell() {
  const activeModule = useAppStore((s) => s.activeModule)
  const ActiveComponent = MODULE_MAP[activeModule]

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <DemoBanner />
        <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 md:pb-6">
          <ErrorBoundary moduleName={activeModule}>
            <ActiveComponent />
          </ErrorBoundary>
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
