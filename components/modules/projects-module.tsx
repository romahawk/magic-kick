"use client"

import { useMemo, useState } from "react"
import type { Dispatch, SetStateAction } from "react"
import { addDays, format, isAfter, isBefore, parseISO, startOfWeek } from "date-fns"
import { useAppStore } from "@/lib/store"
import { calculateCognitiveLoad, getProjectStatus, hasDefinedWeeklyOutcome, selectActiveProjects, selectActiveProjectsMissingWeeklyOutcome } from "@/lib/execution-os"
import { getWeekDays } from "@/lib/game-utils"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { FolderKanban, Check, CheckCircle2, Plus, Pencil, Trash2, ExternalLink, X, CalendarRange, Rows3, Focus, Eye, EyeOff, ChevronDown, ChevronRight, Crosshair, PinOff } from "lucide-react"
import type { Project, ProjectMilestone, ProjectStatus, Task } from "@/lib/types"
import { ProjectsTimelineChart } from "./projects-timeline-chart"

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

function sortMilestonesByDay(milestones: ProjectMilestone[]) {
  return [...milestones].sort((a, b) => {
    if (a.dayIndex !== b.dayIndex) return a.dayIndex - b.dayIndex
    return a.title.localeCompare(b.title)
  })
}

const STATUS_SECTIONS: Array<{ id: ProjectStatus; label: string; description: string }> = [
  { id: "active", label: "Active", description: "Counts toward capacity and cognitive load." },
  { id: "paused", label: "Paused", description: "Temporarily inactive but still visible." },
  { id: "parked", label: "Parked", description: "Idea vault items that should not tax focus." },
]

const VIEW_CONTROLS = [
  { id: "weekly", label: "Weekly Gantt", icon: CalendarRange },
  { id: "yearly", label: "Yearly Timeline", icon: Rows3 },
] as const

export function ProjectsModule() {
  const allProjects = useAppStore((s) => s.projects)
  const allTasks = useAppStore((s) => s.tasks)
  const addProject = useAppStore((s) => s.addProject)
  const updateProject = useAppStore((s) => s.updateProject)
  const deleteProject = useAppStore((s) => s.deleteProject)
  const toggleMilestone = useAppStore((s) => s.toggleMilestone)
  const addMilestone = useAppStore((s) => s.addMilestone)
  const updateMilestone = useAppStore((s) => s.updateMilestone)
  const deleteMilestone = useAppStore((s) => s.deleteMilestone)
  const systemConfig = useAppStore((s) => s.profile.systemConfig)
  const focusedProjectId = useAppStore((s) => s.profile.focusedProjectId)
  const setFocusedProject = useAppStore((s) => s.setFocusedProject)
  const weekDays = getWeekDays()
  const projects = allProjects.filter((p) => !p.deleted)
  const tasks = allTasks.filter((t) => !t.deleted)
  const activeProjects = selectActiveProjects(projects)
  const activeProjectsMissingWeeklyOutcome = selectActiveProjectsMissingWeeklyOutcome(projects)
  const load = calculateCognitiveLoad({ projects, tasks, config: systemConfig })

  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [objective, setObjective] = useState("")
  const [weeklyOutcome, setWeeklyOutcome] = useState("")
  const [status, setStatus] = useState<Project["status"]>("active")
  const [color, setColor] = useState(DEFAULT_PROJECT_COLOR)
  const [milestones, setMilestones] = useState("")
  const [newLinkLabel, setNewLinkLabel] = useState("")
  const [newLinkUrl, setNewLinkUrl] = useState("")
  const [newLinks, setNewLinks] = useState<Array<{ label: string; url: string }>>([])
  const [newMilestoneByProject, setNewMilestoneByProject] = useState<Record<string, { title: string; dayIndex: number }>>({})
  const [editingMilestone, setEditingMilestone] = useState<{ projectId: string; milestoneId: string } | null>(null)
  const [editingMilestoneTitle, setEditingMilestoneTitle] = useState("")
  const [editingMilestoneDayIndex, setEditingMilestoneDayIndex] = useState(0)
  const [timelineView, setTimelineView] = useState<"weekly" | "yearly">("weekly")
  const [focusMode, setFocusMode] = useState(false)
  const [showDetails, setShowDetails] = useState(true)
  const [projectView, setProjectView] = useState<"all" | "split">("split")
  const [formError, setFormError] = useState<string | null>(null)
  const [openSections, setOpenSections] = useState<Record<ProjectStatus, boolean>>({
    active: true,
    paused: false,
    parked: false,
    completed: true,
  })

  const defaultWeekRange = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 })
    const end = addDays(start, 6)
    return {
      start: format(start, "yyyy-MM-dd"),
      end: format(end, "yyyy-MM-dd"),
    }
  }, [])

  const focusedProject = focusedProjectId ? projects.find((project) => project.id === focusedProjectId) : undefined

  const displayProjects = (() => {
    if (!focusMode) return projects
    if (focusedProject) return [focusedProject]
    const today = new Date()
    const current = [...projects].sort((a, b) => {
      const aStart = parseISO(a.weekStartISO)
      const aEnd = parseISO(a.weekEndISO)
      const bStart = parseISO(b.weekStartISO)
      const bEnd = parseISO(b.weekEndISO)
      const aCompleted = a.milestones.length > 0 && a.milestones.every((m) => m.completed)
      const bCompleted = b.milestones.length > 0 && b.milestones.every((m) => m.completed)

      const aPriority = aCompleted ? 3 : isBefore(aEnd, today) ? 0 : isAfter(aStart, today) ? 2 : 1
      const bPriority = bCompleted ? 3 : isBefore(bEnd, today) ? 0 : isAfter(bStart, today) ? 2 : 1
      if (aPriority !== bPriority) return aPriority - bPriority
      return aEnd.getTime() - bEnd.getTime()
    })
    return current.slice(0, 3)
  })()

  const hiddenProjectsCount = Math.max(0, projects.length - displayProjects.length)
  const statusBuckets = STATUS_SECTIONS.map((section) => ({
    ...section,
    projects: displayProjects.filter((project) => getProjectStatus(project) === section.id),
  }))

  function openCreateDialog() {
    setEditingId(null)
    setTitle("")
    setObjective("")
    setWeeklyOutcome("")
    setStatus("active")
    setColor(DEFAULT_PROJECT_COLOR)
    setMilestones("")
    setNewLinkLabel("")
    setNewLinkUrl("")
    setNewLinks([])
    setFormError(null)
    setOpen(true)
  }

  function openEditDialog(project: Project) {
    setEditingId(project.id)
    setTitle(project.title)
    setObjective(project.objective)
    setWeeklyOutcome(project.weeklyOutcome ?? "")
    setStatus(getProjectStatus(project))
    setColor(normalizeProjectColor(project.color))
    setMilestones(sortMilestonesByDay(project.milestones).map((m) => `${DAY_LABELS[m.dayIndex]}:${m.title}`).join(", "))
    setNewLinkLabel("")
    setNewLinkUrl("")
    setNewLinks(getProjectLinks(project))
    setFormError(null)
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
    const normalizedOutcome = weeklyOutcome.trim()
    if (status === "active" && !normalizedOutcome) {
      setFormError("Active projects must have exactly one weekly outcome.")
      return
    }
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
        weeklyOutcome: normalizedOutcome || undefined,
        status: status ?? "active",
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
        weeklyOutcome: normalizedOutcome || undefined,
        status: status ?? "active",
        color: selectedColor,
        url: normalizedLinks[0]?.url,
        links: normalizedLinks.length > 0 ? normalizedLinks : undefined,
      })
    }
    setFormError(null)
    setOpen(false)
  }

  function getMilestoneDraft(projectId: string) {
    return newMilestoneByProject[projectId] ?? { title: "", dayIndex: 0 }
  }

  function updateMilestoneDraft(projectId: string, updates: Partial<{ title: string; dayIndex: number }>) {
    setNewMilestoneByProject((prev) => ({
      ...prev,
      [projectId]: {
        ...getMilestoneDraft(projectId),
        ...updates,
      },
    }))
  }

  function handleAddMilestone(projectId: string) {
    const draft = getMilestoneDraft(projectId)
    if (!draft.title.trim()) return
    addMilestone(projectId, {
      title: draft.title.trim(),
      dayIndex: draft.dayIndex,
    })
    updateMilestoneDraft(projectId, { title: "", dayIndex: draft.dayIndex })
  }

  function startEditingMilestone(projectId: string, milestone: ProjectMilestone) {
    setEditingMilestone({ projectId, milestoneId: milestone.id })
    setEditingMilestoneTitle(milestone.title)
    setEditingMilestoneDayIndex(milestone.dayIndex)
  }

  function saveMilestoneEdit() {
    if (!editingMilestone || !editingMilestoneTitle.trim()) return
    updateMilestone(editingMilestone.projectId, editingMilestone.milestoneId, {
      title: editingMilestoneTitle.trim(),
      dayIndex: editingMilestoneDayIndex,
    })
    setEditingMilestone(null)
    setEditingMilestoneTitle("")
    setEditingMilestoneDayIndex(0)
  }

  function cancelMilestoneEdit() {
    setEditingMilestone(null)
    setEditingMilestoneTitle("")
    setEditingMilestoneDayIndex(0)
  }

  function toggleSection(sectionId: ProjectStatus) {
    setOpenSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">{timelineView === "weekly" ? "Weekly Gantt view of your active projects." : "Yearly timeline dashboard."}</p>
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
                <Label htmlFor="project-weekly-outcome">Weekly Outcome</Label>
                <Input
                  id="project-weekly-outcome"
                  value={weeklyOutcome}
                  onChange={(e) => setWeeklyOutcome(e.target.value)}
                  placeholder="One concrete result for this week"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Active projects require exactly one weekly outcome.
                </p>
              </div>
              <div>
                <Label>Project Status</Label>
                <Select value={status ?? "active"} onValueChange={(value) => setStatus(value as Project["status"])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="parked">Parked</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
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
                <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={newLinkLabel}
                    onChange={(e) => setNewLinkLabel(e.target.value)}
                    placeholder="Label (e.g. Figma)"
                    className="sm:w-44 sm:flex-none"
                  />
                  <Input
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    placeholder="https://..."
                    className="min-w-0"
                  />
                  <Button type="button" variant="secondary" onClick={addStagedLink} className="sm:flex-none">
                    Add
                  </Button>
                </div>
                {newLinks.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1.5">
                    {newLinks.map((link, index) => (
                      <div key={`${link.url}-${index}`} className="flex items-start gap-2 rounded-md border px-2 py-1.5 text-xs">
                        <span className="min-w-0 flex-1 break-all pr-1">
                          <span className="font-medium">{link.label}:</span> {link.url}
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
              {formError ? (
                <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {formError}
                </div>
              ) : null}
              <Button onClick={saveProject} className="w-full">
                {editingId ? "Save Changes" : "Create Project"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {VIEW_CONTROLS.map((control) => {
          const isActive = timelineView === control.id
          const Icon = control.icon
          return (
            <Tooltip key={control.id}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant={isActive ? "default" : "outline"}
                  onClick={() => setTimelineView(control.id)}
                  aria-label={control.label}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent sideOffset={8}>{control.label}</TooltipContent>
            </Tooltip>
          )
        })}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant={focusMode ? "default" : "outline"}
              onClick={() => setFocusMode((value) => !value)}
              aria-label={focusMode ? "Focused-only view on" : "Show focused only"}
            >
              <Focus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent sideOffset={8}>{focusMode ? "Focused-Only View On" : "Show Focused Only"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="button" size="icon" variant={projectView === "split" ? "default" : "outline"} onClick={() => setProjectView((value) => value === "split" ? "all" : "split")} aria-label={projectView === "split" ? "Split view on" : "Split by status"}>
              <Rows3 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent sideOffset={8}>{projectView === "split" ? "Split by Status On" : "Split by Status"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="button" size="icon" variant="outline" onClick={() => setShowDetails((value) => !value)} aria-label={showDetails ? "Hide details" : "Show details"}>
              {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent sideOffset={8}>{showDetails ? "Hide Details" : "Show Details"}</TooltipContent>
        </Tooltip>
      </div>
      {load.overCapacity ? (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <div>
              <p className="font-medium">Cognitive overload warning</p>
              <p className="text-muted-foreground">
                {activeProjects.length} active projects exceeds the limit of {systemConfig?.maxActiveProjects ?? 3}. Focus score reduced to {load.focusScore}.
              </p>
            </div>
            <Badge className="bg-amber-500 text-black">Over capacity</Badge>
          </CardContent>
        </Card>
      ) : null}
      {activeProjectsMissingWeeklyOutcome.length > 0 ? (
        <Card className="border-sky-500/30 bg-sky-500/10">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <div>
              <p className="font-medium">Weekly outcomes missing</p>
              <p className="text-muted-foreground">
                {activeProjectsMissingWeeklyOutcome.length} active {activeProjectsMissingWeeklyOutcome.length === 1 ? "project is" : "projects are"} missing a weekly outcome. Define one concrete result for each active project.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeProjectsMissingWeeklyOutcome.slice(0, 3).map((project) => (
                <Badge key={project.id} variant="outline" className="text-[10px]">
                  {project.title}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
      {focusedProject ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <div>
              <p className="font-medium">Focused project selected</p>
              <p className="text-muted-foreground">
                {focusedProject.title} is pinned and gets priority in daily focus task scoring.
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setFocusedProject(undefined)}>
              <PinOff className="mr-1.5 h-4 w-4" />
              Clear Focus
            </Button>
          </CardContent>
        </Card>
      ) : null}
      {focusMode && hiddenProjectsCount > 0 ? (
        <p className="text-xs text-muted-foreground">
          {focusedProject ? "Focused-only view shows your selected project." : `Focused-only view shows 3 current projects. Hidden: ${hiddenProjectsCount}.`}
        </p>
      ) : null}

      {/* Weekly timeline header */}
      {timelineView === "weekly" ? (
        projectView === "split" ? (
          <div className="flex flex-col gap-4">
            {statusBuckets.map((section) => (
              <Collapsible key={section.id} open={openSections[section.id]} onOpenChange={() => toggleSection(section.id)}>
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-3">
                      <CollapsibleTrigger asChild>
                        <button className="flex min-w-0 items-center gap-2 text-left">
                          {openSections[section.id] ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                          <CardTitle className="flex items-center gap-2 text-base">
                            <span>{section.label}</span>
                            <Badge variant="outline" className="text-[10px]">{section.projects.length}</Badge>
                          </CardTitle>
                        </button>
                      </CollapsibleTrigger>
                      <span className="text-xs text-muted-foreground">{section.description}</span>
                    </div>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="p-4 pt-0">
                      <WeeklyProjectGrid
                        projects={section.projects}
                        tasks={tasks}
                        weekDays={weekDays}
                        onEdit={openEditDialog}
                        focusedProjectId={focusedProjectId}
                        onSetFocusedProject={setFocusedProject}
                        onDelete={deleteProject}
                        onToggleMilestone={toggleMilestone}
                      />
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-4">
              <WeeklyProjectGrid
                projects={displayProjects}
                tasks={tasks}
                weekDays={weekDays}
                onEdit={openEditDialog}
                focusedProjectId={focusedProjectId}
                onSetFocusedProject={setFocusedProject}
                onDelete={deleteProject}
                onToggleMilestone={toggleMilestone}
              />
            </CardContent>
          </Card>
        )
      ) : (
        <ProjectsTimelineChart projects={displayProjects} />
      )}

      {/* Project details cards */}
      {showDetails ? (
        projectView === "split" ? (
          <div className="flex flex-col gap-6">
            {statusBuckets.map((section) => (
              <Collapsible key={`${section.id}-details`} open={openSections[section.id]} onOpenChange={() => toggleSection(section.id)}>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <CollapsibleTrigger asChild>
                      <button className="flex items-center gap-2 text-left">
                        {openSections[section.id] ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">{section.label}</h2>
                      </button>
                    </CollapsibleTrigger>
                    <Badge variant="outline" className="text-[10px]">{section.projects.length} projects</Badge>
                  </div>
                  <CollapsibleContent>
                    <ProjectDetailsGrid
                      projects={section.projects}
                      tasks={tasks}
                      onEdit={openEditDialog}
                      focusedProjectId={focusedProjectId}
                      onSetFocusedProject={setFocusedProject}
                      editingMilestone={editingMilestone}
                      editingMilestoneTitle={editingMilestoneTitle}
                      editingMilestoneDayIndex={editingMilestoneDayIndex}
                      getMilestoneDraft={getMilestoneDraft}
                      updateMilestoneDraft={updateMilestoneDraft}
                      handleAddMilestone={handleAddMilestone}
                      toggleMilestone={toggleMilestone}
                      startEditingMilestone={startEditingMilestone}
                      saveMilestoneEdit={saveMilestoneEdit}
                      cancelMilestoneEdit={cancelMilestoneEdit}
                      setEditingMilestoneTitle={setEditingMilestoneTitle}
                      setEditingMilestoneDayIndex={setEditingMilestoneDayIndex}
                      deleteMilestone={deleteMilestone}
                    />
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        ) : (
          <ProjectDetailsGrid
            projects={displayProjects}
            tasks={tasks}
            onEdit={openEditDialog}
            focusedProjectId={focusedProjectId}
            onSetFocusedProject={setFocusedProject}
            editingMilestone={editingMilestone}
            editingMilestoneTitle={editingMilestoneTitle}
            editingMilestoneDayIndex={editingMilestoneDayIndex}
            getMilestoneDraft={getMilestoneDraft}
            updateMilestoneDraft={updateMilestoneDraft}
            handleAddMilestone={handleAddMilestone}
            toggleMilestone={toggleMilestone}
            startEditingMilestone={startEditingMilestone}
            saveMilestoneEdit={saveMilestoneEdit}
            cancelMilestoneEdit={cancelMilestoneEdit}
            setEditingMilestoneTitle={setEditingMilestoneTitle}
            setEditingMilestoneDayIndex={setEditingMilestoneDayIndex}
            deleteMilestone={deleteMilestone}
          />
        )
      ) : null}
    </div>
  )
}

function WeeklyProjectGrid({
  projects,
  tasks,
  weekDays,
  onEdit,
  focusedProjectId,
  onSetFocusedProject,
  onDelete,
  onToggleMilestone,
}: {
  projects: Project[]
  tasks: Task[]
  weekDays: ReturnType<typeof getWeekDays>
  onEdit: (project: Project) => void
  focusedProjectId?: string
  onSetFocusedProject: (projectId?: string) => void
  onDelete: (projectId: string) => void
  onToggleMilestone: (projectId: string, milestoneId: string) => void
}) {
  return (
    <>
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
          No projects in this section.
        </p>
      ) : null}

      {projects.map((project) => {
        const sortedMilestones = sortMilestonesByDay(project.milestones)
        const openMilestones = sortedMilestones.filter((milestone) => !milestone.completed)
        const completedMilestones = sortedMilestones.filter((milestone) => milestone.completed)
        const projectTasks = tasks.filter((t) => t.linkedProjectId === project.id)
        const completedTasks = projectTasks.filter((t) => t.completed).length
        const completedMilestoneCount = project.milestones.filter((m) => m.completed).length
        const totalMilestones = project.milestones.length
        const progressPercent = totalMilestones > 0 ? (completedMilestoneCount / totalMilestones) * 100 : 0

        return (
          <div key={project.id} className="mb-4 grid grid-cols-[140px_1fr] gap-3 sm:grid-cols-[180px_1fr]">
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-1">
                <p className="text-sm font-medium truncate">{project.title}</p>
                <Button
                  type="button"
                  variant={focusedProjectId === project.id ? "default" : "ghost"}
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onSetFocusedProject(focusedProjectId === project.id ? undefined : project.id)}
                  aria-label={focusedProjectId === project.id ? `Clear focus from ${project.title}` : `Focus ${project.title}`}
                >
                  <Crosshair className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEdit(project)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => onDelete(project.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground truncate">{project.objective}</p>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] capitalize">{getProjectStatus(project)}</Badge>
                {focusedProjectId === project.id ? <Badge className="text-[10px]">focused</Badge> : null}
                <Progress value={progressPercent} className="h-1.5 flex-1 [&>div]:bg-primary" />
                <span className="text-[10px] text-muted-foreground">
                  {completedMilestoneCount}/{totalMilestones}
                </span>
                <span className="text-[10px] text-muted-foreground">{completedTasks} done</span>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map((_, i) => {
                const dayMilestones = sortedMilestones.filter((m) => m.dayIndex === i)
                return (
                  <div
                    key={i}
                    className={cn(
                      "min-h-14 rounded-md border border-border p-1 text-center transition-colors",
                      dayMilestones.length > 0 ? "border-primary/30 bg-primary/5" : "bg-secondary/30"
                    )}
                  >
                    {dayMilestones.length > 0 ? (
                      <div className="flex max-h-16 flex-col gap-1 overflow-y-auto pr-0.5">
                        {dayMilestones.map((milestone) => (
                          <button
                            key={milestone.id}
                            onClick={() => onToggleMilestone(project.id, milestone.id)}
                            className={cn(
                              "flex items-center gap-1 rounded px-1 py-0.5 text-left transition-colors",
                              milestone.completed ? "bg-primary/20" : "hover:bg-primary/10"
                            )}
                            aria-label={`Toggle milestone: ${milestone.title}`}
                          >
                            <CheckCircle2 className={cn("h-3.5 w-3.5 shrink-0", milestone.completed ? "text-primary" : "text-muted-foreground")} />
                            <span className="line-clamp-1 text-[9px] leading-tight text-muted-foreground">{milestone.title}</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </>
  )
}

function ProjectDetailsGrid({
  projects,
  tasks,
  onEdit,
  focusedProjectId,
  onSetFocusedProject,
  editingMilestone,
  editingMilestoneTitle,
  editingMilestoneDayIndex,
  getMilestoneDraft,
  updateMilestoneDraft,
  handleAddMilestone,
  toggleMilestone,
  startEditingMilestone,
  saveMilestoneEdit,
  cancelMilestoneEdit,
  setEditingMilestoneTitle,
  setEditingMilestoneDayIndex,
  deleteMilestone,
}: {
  projects: Project[]
  tasks: Task[]
  onEdit: (project: Project) => void
  focusedProjectId?: string
  onSetFocusedProject: (projectId?: string) => void
  editingMilestone: { projectId: string; milestoneId: string } | null
  editingMilestoneTitle: string
  editingMilestoneDayIndex: number
  getMilestoneDraft: (projectId: string) => { title: string; dayIndex: number }
  updateMilestoneDraft: (projectId: string, updates: Partial<{ title: string; dayIndex: number }>) => void
  handleAddMilestone: (projectId: string) => void
  toggleMilestone: (projectId: string, milestoneId: string) => void
  startEditingMilestone: (projectId: string, milestone: ProjectMilestone) => void
  saveMilestoneEdit: () => void
  cancelMilestoneEdit: () => void
  setEditingMilestoneTitle: Dispatch<SetStateAction<string>>
  setEditingMilestoneDayIndex: Dispatch<SetStateAction<number>>
  deleteMilestone: (projectId: string, milestoneId: string) => void
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {projects.map((project) => {
        const sortedMilestones = sortMilestonesByDay(project.milestones)
        const openMilestones = sortedMilestones.filter((milestone) => !milestone.completed)
        const completedMilestones = sortedMilestones.filter((milestone) => milestone.completed)
        const projectTasks = tasks.filter((t) => t.linkedProjectId === project.id)
        const completedTasks = projectTasks.filter((t) => t.completed).length

        return (
          <Card key={project.id} style={gradientStyleFromColor(project.color)}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FolderKanban className="h-4 w-4" style={{ color: normalizeProjectColor(project.color) }} />
                  {project.title}
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant={focusedProjectId === project.id ? "default" : "ghost"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onSetFocusedProject(focusedProjectId === project.id ? undefined : project.id)}
                    aria-label={focusedProjectId === project.id ? `Clear focus from ${project.title}` : `Focus ${project.title}`}
                  >
                    <Crosshair className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(project)} aria-label={`Edit ${project.title}`}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">{project.objective}</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] capitalize">{getProjectStatus(project)}</Badge>
                {focusedProjectId === project.id ? <Badge className="text-[10px]">focused</Badge> : null}
                <Badge variant="secondary" className="text-[10px]">
                  {projectTasks.length} tasks ({completedTasks} done)
                </Badge>
              </div>
              <div className="rounded-md border border-border/60 bg-background/60 p-2 text-xs text-muted-foreground">
                Weekly Outcome:{" "}
                <span className="font-medium text-foreground">
                  {hasDefinedWeeklyOutcome(project) ? project.weeklyOutcome!.trim() : "Not defined yet"}
                </span>
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
                        className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      >
                        <span className="truncate">{link.label || "Link"}</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ))}
                  </div>
                )}
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-xs font-medium">Milestones</p>
                  <Badge variant="outline" className="text-[10px]">
                    {openMilestones.length} open
                  </Badge>
                </div>
                <div className="mb-2 flex gap-1.5">
                  <Input
                    value={getMilestoneDraft(project.id).title}
                    onChange={(e) => updateMilestoneDraft(project.id, { title: e.target.value })}
                    placeholder="New milestone"
                    className="h-8 text-xs"
                  />
                  <select
                    value={getMilestoneDraft(project.id).dayIndex}
                    onChange={(e) => updateMilestoneDraft(project.id, { dayIndex: Number(e.target.value) })}
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                    aria-label="Milestone day"
                  >
                    {DAY_LABELS.map((day, index) => (
                      <option key={`${project.id}-draft-day-${day}`} value={index}>
                        {day}
                      </option>
                    ))}
                  </select>
                  <Button type="button" size="icon" variant="secondary" className="h-8 w-8" onClick={() => handleAddMilestone(project.id)} aria-label={`Add milestone to ${project.title}`}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex flex-col gap-1.5">
                  {openMilestones.map((m) => (
                    <div key={m.id} className="flex items-center gap-2 rounded-md border border-border/60 bg-background/40 px-2 py-2">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 shrink-0"
                        onClick={() => toggleMilestone(project.id, m.id)}
                        aria-label={`Complete milestone: ${m.title}`}
                      >
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      {editingMilestone?.projectId === project.id && editingMilestone.milestoneId === m.id ? (
                        <>
                          <Input value={editingMilestoneTitle} onChange={(e) => setEditingMilestoneTitle(e.target.value)} className="h-8 text-xs" />
                          <select
                            value={editingMilestoneDayIndex}
                            onChange={(e) => setEditingMilestoneDayIndex(Number(e.target.value))}
                            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                            aria-label="Edit milestone day"
                          >
                            {DAY_LABELS.map((day, index) => (
                              <option key={`${project.id}-${m.id}-day-${day}`} value={index}>
                                {day}
                              </option>
                            ))}
                          </select>
                          <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={saveMilestoneEdit} aria-label="Save milestone">
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={cancelMilestoneEdit} aria-label="Cancel milestone edit">
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm">{m.title}</p>
                            <div className="mt-1 flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px]">
                                {DAY_LABELS[m.dayIndex]}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">Ready to complete</span>
                            </div>
                          </div>
                          <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEditingMilestone(project.id, m)} aria-label={`Edit milestone: ${m.title}`}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteMilestone(project.id, m.id)} aria-label={`Delete milestone: ${m.title}`}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                  {openMilestones.length === 0 ? <p className="text-xs text-muted-foreground">No open milestones.</p> : null}
                </div>
                {completedMilestones.length > 0 ? (
                  <div className="mt-3 rounded-md border border-border/60 bg-background/40 p-2">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Completed milestones</p>
                      <Badge variant="secondary" className="text-[10px]">
                        {completedMilestones.length}
                      </Badge>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {completedMilestones.map((m) => (
                        <div key={m.id} className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-2 py-2">
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="h-8 w-8 shrink-0 border-emerald-500/40"
                            onClick={() => toggleMilestone(project.id, m.id)}
                            aria-label={`Reopen milestone: ${m.title}`}
                          >
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          </Button>
                          {editingMilestone?.projectId === project.id && editingMilestone.milestoneId === m.id ? (
                            <>
                              <Input value={editingMilestoneTitle} onChange={(e) => setEditingMilestoneTitle(e.target.value)} className="h-8 text-xs" />
                              <select
                                value={editingMilestoneDayIndex}
                                onChange={(e) => setEditingMilestoneDayIndex(Number(e.target.value))}
                                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                                aria-label="Edit milestone day"
                              >
                                {DAY_LABELS.map((day, index) => (
                                  <option key={`${project.id}-${m.id}-completed-day-${day}`} value={index}>
                                    {day}
                                  </option>
                                ))}
                              </select>
                              <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={saveMilestoneEdit} aria-label="Save milestone">
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                              <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={cancelMilestoneEdit} aria-label="Cancel milestone edit">
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm line-through text-muted-foreground">{m.title}</p>
                                <div className="mt-1 flex items-center gap-2">
                                  <Badge variant="outline" className="text-[10px]">
                                    {DAY_LABELS[m.dayIndex]}
                                  </Badge>
                                  <span className="text-[10px] text-emerald-300">Completed</span>
                                </div>
                              </div>
                              <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEditingMilestone(project.id, m)} aria-label={`Edit milestone: ${m.title}`}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteMilestone(project.id, m.id)} aria-label={`Delete milestone: ${m.title}`}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {project.milestones.length === 0 ? <p className="text-xs text-muted-foreground">No milestones yet.</p> : null}
                </div>
            </CardContent>
          </Card>
        )
      })}
      {projects.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">No projects in this section.</CardContent>
        </Card>
      ) : null}
    </div>
  )
}
