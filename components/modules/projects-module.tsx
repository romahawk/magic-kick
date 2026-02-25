"use client"

import { useMemo, useState } from "react"
import { addDays, format, startOfWeek } from "date-fns"
import { useAppStore } from "@/lib/store"
import { getWeekDays } from "@/lib/game-utils"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FolderKanban, CheckCircle2, Plus, Pencil, Trash2, ExternalLink } from "lucide-react"
import type { Project } from "@/lib/types"

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const DEFAULT_PROJECT_COLOR = "#3b82f6"
const LEGACY_COLOR_MAP: Record<string, string> = {
  "bg-chart-1": "#3b82f6",
  "bg-chart-2": "#22c55e",
  "bg-chart-3": "#06b6d4",
  "bg-chart-4": "#f97316",
  "bg-chart-5": "#a855f7",
}

function normalizeUrl(url: string) {
  const trimmed = url.trim()
  if (!trimmed) return ""
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

function normalizeProjectColor(color: string | undefined) {
  const trimmed = color?.trim() ?? ""
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed
  return LEGACY_COLOR_MAP[trimmed] ?? DEFAULT_PROJECT_COLOR
}

function getProjectLinks(project: { url?: string; links?: Array<{ label: string; url: string }> }) {
  if (project.links && project.links.length > 0) return project.links
  if (project.url) return [{ label: "Link", url: project.url }]
  return []
}

function gradientStyleFromColor(color: string | undefined) {
  const safeColor = normalizeProjectColor(color)
  return {
    backgroundImage: `linear-gradient(135deg, ${safeColor}1f 0%, ${safeColor}08 100%)`,
    borderColor: `${safeColor}33`,
  }
}

export function ProjectsModule() {
  const allProjects = useAppStore((s) => s.projects)
  const allTasks = useAppStore((s) => s.tasks)
  const addProject = useAppStore((s) => s.addProject)
  const updateProject = useAppStore((s) => s.updateProject)
  const deleteProject = useAppStore((s) => s.deleteProject)
  const toggleMilestone = useAppStore((s) => s.toggleMilestone)
  const weekDays = getWeekDays()
  const projects = allProjects.filter((p) => !p.deleted)
  const tasks = allTasks.filter((t) => !t.deleted)

  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [objective, setObjective] = useState("")
  const [color, setColor] = useState(DEFAULT_PROJECT_COLOR)
  const [milestones, setMilestones] = useState("")
  const [newLinkLabel, setNewLinkLabel] = useState("")
  const [newLinkUrl, setNewLinkUrl] = useState("")
  const [newLinks, setNewLinks] = useState<Array<{ label: string; url: string }>>([])

  const defaultWeekRange = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 })
    const end = addDays(start, 6)
    return {
      start: format(start, "yyyy-MM-dd"),
      end: format(end, "yyyy-MM-dd"),
    }
  }, [])

  function openCreateDialog() {
    setEditingId(null)
    setTitle("")
    setObjective("")
    setColor(DEFAULT_PROJECT_COLOR)
    setMilestones("")
    setNewLinkLabel("")
    setNewLinkUrl("")
    setNewLinks([])
    setOpen(true)
  }

  function openEditDialog(project: Project) {
    setEditingId(project.id)
    setTitle(project.title)
    setObjective(project.objective)
    setColor(normalizeProjectColor(project.color))
    setMilestones(project.milestones.map((m) => `${DAY_LABELS[m.dayIndex]}:${m.title}`).join(", "))
    setNewLinkLabel("")
    setNewLinkUrl("")
    setNewLinks(getProjectLinks(project))
    setOpen(true)
  }

  function addStagedLink() {
    const url = normalizeUrl(newLinkUrl)
    if (!url) return
    const label = newLinkLabel.trim() || "Link"
    setNewLinks((prev) => [...prev, { label, url }])
    setNewLinkLabel("")
    setNewLinkUrl("")
  }

  function parseMilestones(input: string) {
    return input
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .map((entry, index) => {
        const parts = entry.split(":")
        if (parts.length === 2) {
          const label = parts[0].trim()
          const titleValue = parts[1].trim()
          const dayIndex = Math.max(0, DAY_LABELS.findIndex((day) => day.toLowerCase() === label.toLowerCase()))
          return { title: titleValue || `Milestone ${index + 1}`, dayIndex: dayIndex === -1 ? index % 7 : dayIndex }
        }
        return { title: entry, dayIndex: index % 7 }
      })
  }

  function saveProject() {
    if (!title.trim()) return
    const draftUrl = normalizeUrl(newLinkUrl)
    const draftLinks = draftUrl
      ? [...newLinks, { label: newLinkLabel.trim() || "Link", url: draftUrl }]
      : newLinks
    const normalizedLinks = draftLinks
      .map((link) => ({ label: link.label.trim() || "Link", url: normalizeUrl(link.url) }))
      .filter((link) => Boolean(link.url))
    const selectedColor = normalizeProjectColor(color)

    if (!editingId) {
      addProject({
        title: title.trim(),
        objective: objective.trim() || "Project objective",
        weekStartISO: defaultWeekRange.start,
        weekEndISO: defaultWeekRange.end,
        color: selectedColor,
        url: normalizedLinks[0]?.url,
        links: normalizedLinks.length > 0 ? normalizedLinks : undefined,
        milestones: parseMilestones(milestones),
      })
    } else {
      updateProject(editingId, {
        title: title.trim(),
        objective: objective.trim() || "Project objective",
        color: selectedColor,
        url: normalizedLinks[0]?.url,
        links: normalizedLinks.length > 0 ? normalizedLinks : undefined,
      })
    }
    setOpen(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">Weekly Gantt view of your active projects.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5" onClick={openCreateDialog}>
              <Plus className="h-4 w-4" /> New Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Project" : "Create Project"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="project-title">Title</Label>
                <Input id="project-title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="project-objective">Objective</Label>
                <Input id="project-objective" value={objective} onChange={(e) => setObjective(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="project-color">Card color</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Input
                    id="project-color"
                    type="color"
                    value={normalizeProjectColor(color)}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-10 w-14 cursor-pointer p-1"
                    aria-label="Pick project card color"
                  />
                  <Input
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="#3b82f6"
                    className="font-mono text-xs"
                  />
                </div>
              </div>
              <div>
                <Label>Links (optional)</Label>
                <div className="mt-1 flex gap-2">
                  <Input
                    value={newLinkLabel}
                    onChange={(e) => setNewLinkLabel(e.target.value)}
                    placeholder="Label (e.g. Figma)"
                  />
                  <Input
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    placeholder="https://..."
                  />
                  <Button type="button" variant="secondary" onClick={addStagedLink}>
                    Add
                  </Button>
                </div>
                {newLinks.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1.5">
                    {newLinks.map((link, index) => (
                      <div key={`${link.url}-${index}`} className="flex items-center justify-between rounded-md border px-2 py-1.5 text-xs">
                        <span className="truncate">
                          {link.label}: {link.url}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => setNewLinks((prev) => prev.filter((_, i) => i !== index))}
                          aria-label={`Remove ${link.label} link`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {!editingId ? (
                <div>
                  <Label htmlFor="project-milestones">Milestones (optional)</Label>
                  <Input
                    id="project-milestones"
                    value={milestones}
                    onChange={(e) => setMilestones(e.target.value)}
                    placeholder="Mon:Design, Wed:Build page, Fri:Deploy"
                  />
                </div>
              ) : null}
              <Button onClick={saveProject} className="w-full">
                {editingId ? "Save Changes" : "Create Project"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Weekly timeline header */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-4 grid grid-cols-[140px_1fr] gap-3 sm:grid-cols-[180px_1fr]">
            <div className="text-xs font-medium text-muted-foreground">Project</div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {weekDays.map((d) => (
                <div key={d.iso} className="flex flex-col items-center">
                  <span className="text-[10px] text-muted-foreground">{d.label}</span>
                  <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-xs", d.isToday ? "bg-primary text-primary-foreground font-bold" : "text-foreground")}>
                    {d.short}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {projects.length === 0 ? (
            <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
              No projects yet. Use <strong>New Project</strong> to create one and populate this timeline.
            </p>
          ) : null}

          {projects.map((project) => {
            const projectTasks = tasks.filter((t) => t.linkedProjectId === project.id)
            const completedTasks = projectTasks.filter((t) => t.completed).length
            const completedMilestones = project.milestones.filter((m) => m.completed).length
            const totalMilestones = project.milestones.length
            const progressPercent = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0

            return (
              <div key={project.id} className="mb-4 grid grid-cols-[140px_1fr] gap-3 sm:grid-cols-[180px_1fr]">
                <div className="flex flex-col justify-center">
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-medium truncate">{project.title}</p>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditDialog(project)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteProject(project.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">{project.objective}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Progress value={progressPercent} className="h-1.5 flex-1 [&>div]:bg-primary" />
                    <span className="text-[10px] text-muted-foreground">
                      {completedMilestones}/{totalMilestones}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {weekDays.map((_, i) => {
                    const milestone = project.milestones.find((m) => m.dayIndex === i)
                    return (
                      <div
                        key={i}
                        className={cn(
                          "flex h-14 flex-col items-center justify-center rounded-md border border-border text-center transition-colors",
                          milestone ? (milestone.completed ? "border-primary/50 bg-primary/15" : "border-primary/30 bg-primary/5 hover:bg-primary/10") : "bg-secondary/30"
                        )}
                      >
                        {milestone ? (
                          <button onClick={() => toggleMilestone(project.id, milestone.id)} className="flex flex-col items-center gap-0.5 p-1" aria-label={`Toggle milestone: ${milestone.title}`}>
                            <CheckCircle2 className={cn("h-4 w-4", milestone.completed ? "text-primary" : "text-muted-foreground")} />
                            <span className="text-[8px] leading-tight text-muted-foreground line-clamp-2">{milestone.title}</span>
                          </button>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Project details cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {projects.map((project) => {
          const projectTasks = tasks.filter((t) => t.linkedProjectId === project.id)
          const completedTasks = projectTasks.filter((t) => t.completed).length

          return (
            <Card key={project.id} style={gradientStyleFromColor(project.color)}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FolderKanban className="h-4 w-4" style={{ color: normalizeProjectColor(project.color) }} />
                  {project.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">{project.objective}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">
                    {projectTasks.length} tasks ({completedTasks} done)
                  </Badge>
                </div>
                <div>
                  {getProjectLinks(project).length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {getProjectLinks(project).map((link, index) => (
                        <a
                          key={`${project.id}-${link.url}-${index}`}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                        >
                          <span>{link.label || "Link"}</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ))}
                    </div>
                  )}
                  <p className="mb-1 text-xs font-medium">Milestones</p>
                  <div className="flex flex-col gap-1.5">
                    {project.milestones.map((m) => (
                      <div key={m.id} className="flex items-center gap-2">
                        <Checkbox checked={m.completed} onCheckedChange={() => toggleMilestone(project.id, m.id)} aria-label={`Toggle milestone: ${m.title}`} />
                        <span className={cn("text-sm", m.completed && "line-through text-muted-foreground")}>{m.title}</span>
                        <span className="ml-auto text-[10px] text-muted-foreground">{DAY_LABELS[m.dayIndex]}</span>
                      </div>
                    ))}
                    {project.milestones.length === 0 ? <p className="text-xs text-muted-foreground">No milestones yet.</p> : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
