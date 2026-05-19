import type { Project } from "@/lib/types"
import type { ProjectPrediction } from "./predictor"

const RISK_PROBABILITY_THRESHOLD = 0.3
const RISK_DAYS_THRESHOLD = 14

export interface RiskyProject {
  project: Project
  prediction: ProjectPrediction
}

export function detectRiskyProjects(
  projects: Project[],
  predictions: ProjectPrediction[]
): RiskyProject[] {
  const predMap = new Map(predictions.map((p) => [p.projectId, p]))

  return projects
    .filter((p) => !p.deleted && (p.status ?? "active") === "active")
    .flatMap((project) => {
      const pred = predMap.get(project.id)
      if (!pred) return []
      const isRisky =
        pred.completionProbability < RISK_PROBABILITY_THRESHOLD &&
        pred.daysRemaining !== null &&
        pred.daysRemaining <= RISK_DAYS_THRESHOLD
      return isRisky ? [{ project, prediction: pred }] : []
    })
}
