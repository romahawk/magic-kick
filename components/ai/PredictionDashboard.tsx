"use client"

import { TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Project } from "@/lib/types"
import type { ProjectPrediction } from "@/lib/ai/predictor"
import type { RiskyProject } from "@/lib/ai/risk"

function ProbabilityBadge({ probability }: { probability: number }) {
  const pct = Math.round(probability * 100)
  const color =
    pct >= 70 ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
    : pct >= 40 ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
    : "bg-destructive/15 text-destructive border-destructive/30"

  return (
    <Badge variant="outline" className={cn("text-[10px]", color)}>
      {pct}% on track
    </Badge>
  )
}

interface PredictionRowProps {
  project: Project
  prediction: ProjectPrediction
}

function PredictionRow({ project, prediction }: PredictionRowProps) {
  const pct = prediction.completionProbability
  const TrendIcon = pct >= 0.7 ? TrendingUp : pct >= 0.4 ? Minus : TrendingDown
  const trendColor = pct >= 0.7 ? "text-emerald-500" : pct >= 0.4 ? "text-amber-500" : "text-destructive"

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-card px-3 py-2.5">
      <div
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: project.color ?? "#888" }}
      />
      <span className="min-w-0 flex-1 truncate text-sm">{project.title}</span>
      <TrendIcon className={cn("h-4 w-4 shrink-0", trendColor)} />
      <ProbabilityBadge probability={pct} />
      {prediction.daysRemaining !== null && (
        <span className="text-[11px] text-muted-foreground shrink-0">
          {prediction.daysRemaining}d left
        </span>
      )}
    </div>
  )
}

interface PredictionDashboardProps {
  projects: Project[]
  predictions: ProjectPrediction[]
  riskyProjects: RiskyProject[]
}

export function PredictionDashboard({ projects, predictions, riskyProjects }: PredictionDashboardProps) {
  const predMap = new Map(predictions.map((p) => [p.projectId, p]))
  const projectsWithPredictions = projects
    .filter((p) => !p.deleted && (p.status ?? "active") === "active")
    .filter((p) => predMap.has(p.id))

  if (projectsWithPredictions.length === 0) return null

  return (
    <div className="space-y-2">
      {riskyProjects.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div className="text-sm">
            <span className="font-medium text-destructive">At-risk: </span>
            <span className="text-muted-foreground">
              {riskyProjects.map((r) => r.project.title).join(", ")} —
              deadline within 2 weeks with low completion probability.
            </span>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        {projectsWithPredictions.map((project) => (
          <PredictionRow key={project.id} project={project} prediction={predMap.get(project.id)!} />
        ))}
      </div>
    </div>
  )
}

export { ProbabilityBadge }
