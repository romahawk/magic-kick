import type { Insight, Project, Task } from "@/lib/types"
import { calculateCognitiveLoad } from "@/lib/execution-os"
import type { SystemConfig } from "@/lib/types"

let _nextId = 1
function nextId() {
  return `insight-${Date.now()}-${_nextId++}`
}

export function detectAnomalies(input: {
  projects: Project[]
  tasks: Task[]
  config?: Partial<SystemConfig>
}): Insight[] {
  const load = calculateCognitiveLoad(input)
  const insights: Insight[] = []
  const now = Date.now()

  if (load.overCapacity) {
    insights.push({
      id: nextId(),
      type: "warning",
      title: "Over project capacity",
      body: `You have ${load.activeProjects} active projects but your limit is set to ${
        load.activeProjects - load.overload
      }. Consider parking a project to reduce cognitive load.`,
      createdAt: now,
    })
  }

  if (load.missedWeeklyOutcomes > 0) {
    insights.push({
      id: nextId(),
      type: "warning",
      title: `${load.missedWeeklyOutcomes} overdue weekly outcome${load.missedWeeklyOutcomes > 1 ? "s" : ""}`,
      body: "Some projects have weekly outcomes that are past their end date. Review and adjust in the Command Center.",
      createdAt: now,
    })
  }

  if (load.status === "Strained" || load.status === "Overloaded") {
    insights.push({
      id: nextId(),
      type: "suggestion",
      title: `Focus score is ${load.focusScore}%`,
      body: `Your execution system is ${load.status.toLowerCase()}. Try completing a daily focus task or parking a low-priority project.`,
      createdAt: now,
    })
  }

  return insights
}
