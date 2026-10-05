"use client"

import { useMemo, useState } from "react"
import { addDays, differenceInCalendarDays, format, parseISO, startOfWeek } from "date-fns"
import { useAppStore } from "@/lib/store"
import { getProjectStatus, selectThisWeekOutcomes } from "@/lib/execution-os"
import { sourceLabel } from "@/lib/provenance"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Calendar } from "@/components/ui/calendar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Progress } from "@/components/ui/progress"
import { Sheet, SheetContent, SheetClose, SheetTitle } from "@/components/ui/sheet"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { AlertTriangle, CalendarIcon, Check, ExternalLink, Link as LinkIcon, MoreHorizontal, Pencil, Plus, Trash2, X } from "lucide-react"
import type { Project, ProjectStatus, Task } from "@/lib/types"
import { ProjectsTimelineChart } from "./projects-timeline-chart"
import { ProjectResourceLinks, ProjectRoadmap } from "./project-roadmap"

const DEFAULT_PROJECT_COLOR = "#3b82f6"
const LEGACY_COLOR_MAP: Record<string, string> = {
  "bg-chart-1": "#3b82f6",
  "bg-chart-2": "#22c55e",
  "bg-chart-3": "#06b6d4",
  "bg-chart-4": "#f97316",
  "bg-chart-5": "#a855f7",
}

const PRESET_COLORS = [
  { name: "blue",   value: "#3b82f6" },
  { name: "purple", value: "#8b5cf6" },
  { name: "yellow", value: "#eab308" },
  { name: "green",  value: "#22c55e" },
  { name: "pink",   value: "#ec4899" },
  { name: "orange", value: "#f97316" },
  { name: "red",    value: "#ef4444" },
  { name: "slate",  value: "#64748b" },
]

const STATUS_SECTIONS: Array<{ id: ProjectStatus; label: string }> = [
  { id: "active", label: "Active" },
  { id: "paused", label: "Paused" },
  { id: "parked", label: "Parked" },
  { id: "completed", label: "Completed" },
]

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

function parseMilestones(input: string) {
  return input
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((title) => ({ title, dayIndex: 0 }))
}

function isAtRisk(project: Project): boolean {
  if (getProjectStatus(project) !== "active") return false
  const today = new Date()
  const end = parseISO(project.weekEndISO)
  const daysLeft = differenceInCalendarDays(end, today)
  const total = project.milestones.length
  const done = project.milestones.filter((m) => m.completed).length
  if (total > 0 && done === total) return false
  if (daysLeft <= 2) return true
  const start = parseISO(project.weekStartISO)
  const totalDays = differenceInCalendarDays(end, start)
  if (totalDays <= 0) return false
  const elapsed = Math.max(0, differenceInCalendarDays(today, start))
  const expectedPct = elapsed / totalDays
  if (total === 0) return false
  return done / total < expectedPct
}

function daysLeftInfo(project: Project): { label: string; className: string } {
  const today = new Date()
  const end = parseISO(project.weekEndISO)
  const days = differenceInCalendarDays(end, today)
  if (days < 0) return { label: "Overdue", className: "text-destructive font-medium" }
  if (days === 0) return { label: "Today", className: "text-destructive font-medium" }
  if (days <= 2) return { label: `${days}d`, className: "text-destructive" }
  if (days <= 7) return { label: `${days}d`, className: "text-amber-500" }
  return { label: `${days}d`, className: "text-muted-foreground" }
}

export function ProjectsModule() {
  const allProjects = useAppStore((s) => s.projects)
  const allTasks = useAppStore((s) => s.tasks)
  const weeklyPlans = useAppStore((s) => s.weeklyPlans)
  const weekOutcomes = useMemo(() => selectThisWeekOutcomes(weeklyPlans), [weeklyPlans])
  const addProject = useAppStore((s) => s.addProject)
  const updateProject = useAppStore((s) => s.updateProject)
  const deleteProject = useAppStore((s) => s.deleteProject)

  const projects = allProjects.filter((p) => !p.deleted)
  const tasks = allTasks.filter((t) => !t.deleted)

  // Dialog state
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [objective, setObjective] = useState("")
  const [status, setStatus] = useState<Project["status"]>("active")
  const [color, setColor] = useState(DEFAULT_PROJECT_COLOR)
  const [milestones, setMilestones] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [formError, setFormError] = useState<string | null>(null)
  const [startDateOpen, setStartDateOpen] = useState(false)
  const [endDateOpen, setEndDateOpen] = useState(false)
  const [formSnapshot, setFormSnapshot] = useState<{ title: string; objective: string; status: string; startDate: string; endDate: string; color: string } | null>(null)

  // Module state
  const [view, setView] = useState<"list" | "timeline">("list")
  const [selectedStatus, setSelectedStatus] = useState<ProjectStatus>("active")
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)


  const defaultWeekRange = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 })
    const end = addDays(start, 6)
    return {
      start: format(start, "yyyy-MM-dd"),
      end: format(end, "yyyy-MM-dd"),
    }
  }, [])

  const statusBuckets = STATUS_SECTIONS.map((section) => ({
    ...section,
    projects: projects.filter((p) => getProjectStatus(p) === section.id),
  }))
  const selectedBucket = statusBuckets.find((s) => s.id === selectedStatus) ?? statusBuckets[0]
  const activeProjects = projects.filter((p) => getProjectStatus(p) === "active")
  const selectedProject = selectedProjectId ? projects.find((p) => p.id === selectedProjectId) ?? null : null

  function openCreateDialog() {
    setEditingId(null)
    setTitle("")
    setObjective("")
    setStatus("active")
    setColor(DEFAULT_PROJECT_COLOR)
    setStartDate(defaultWeekRange.start)
    setEndDate(defaultWeekRange.end)
    setMilestones("")
    setFormError(null)
    setFormSnapshot(null)
    setOpen(true)
  }

  function openEditDialog(project: Project) {
    const s = getProjectStatus(project)
    const c = normalizeProjectColor(project.color)
    setEditingId(project.id)
    setTitle(project.title)
    setObjective(project.objective)
    setStatus(s)
    setColor(c)
    setStartDate(project.weekStartISO)
    setEndDate(project.weekEndISO)
    setMilestones(project.milestones.map((m) => m.title).join(", "))
    setFormError(null)
    setFormSnapshot({ title: project.title, objective: project.objective, status: s, startDate: project.weekStartISO, endDate: project.weekEndISO, color: c })
    setOpen(true)
  }

  function saveProject() {
    if (!title.trim()) return
    const selectedColor = normalizeProjectColor(color)
    const weekStartISO = startDate || defaultWeekRange.start
    const weekEndISO = endDate || defaultWeekRange.end
    if (weekStartISO > weekEndISO) {
      setFormError("End date must be on or after start date.")
      return
    }
    if (!editingId) {
      addProject({
        title: title.trim(),
        objective: objective.trim() || "Project objective",
        showOnTimeline: true,
        status: status ?? "active",
        weekStartISO,
        weekEndISO,
        color: selectedColor,
        milestones: parseMilestones(milestones),
      })
    } else {
      updateProject(editingId, {
        title: title.trim(),
        objective: objective.trim() || "Project objective",
        status: status ?? "active",
        weekStartISO,
        weekEndISO,
        color: selectedColor,
      })
    }
    setFormError(null)
    setOpen(false)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* §1 — Header: title + CTA on one line */}
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold tracking-tight">Projects</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5" onClick={openCreateDialog}>
              <Plus className="h-4 w-4" /> New Project
            </Button>
          </DialogTrigger>
          <DialogContent
            className="flex flex-col gap-0 p-0 sm:max-w-[480px] max-h-[90vh]"
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault()
                const isDirty = !formSnapshot || title !== formSnapshot.title || objective !== formSnapshot.objective || status !== formSnapshot.status || startDate !== formSnapshot.startDate || endDate !== formSnapshot.endDate || color !== formSnapshot.color
                const isValid = !!title.trim() && (startDate <= endDate)
                if (isValid && (!editingId || isDirty)) saveProject()
              }
            }}
          >
            <DialogHeader className="px-5 pt-5 pb-4 shrink-0 border-b border-border">
              <DialogTitle className="text-base font-semibold">{editingId ? "Edit Project" : "Create Project"}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <div>
                <Label htmlFor="project-title" className="text-sm font-medium">Title</Label>
                <Input id="project-title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="project-objective" className="text-sm font-medium">Objective</Label>
                <Input id="project-objective" value={objective} onChange={(e) => setObjective(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label className="text-sm font-medium">Status</Label>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  value={status ?? "active"}
                  onValueChange={(v) => { if (v) setStatus(v as Project["status"]) }}
                  className="mt-1.5 w-full"
                >
                  {STATUS_SECTIONS.map((s) => (
                    <ToggleGroupItem key={s.id} value={s.id} className="text-xs">
                      {s.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
              <div>
                <Label className="text-sm font-medium">Duration</Label>
                <div className="mt-1.5 flex items-center gap-2">
                  <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="flex-1 justify-start text-left text-xs font-normal h-9">
                        <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        {startDate ? format(parseISO(startDate), "dd MMM yyyy") : "Start date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate ? parseISO(startDate) : undefined}
                        onSelect={(date) => {
                          if (date) { setStartDate(format(date, "yyyy-MM-dd")); setStartDateOpen(false) }
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  <span className="shrink-0 text-xs text-muted-foreground">→</span>
                  <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="flex-1 justify-start text-left text-xs font-normal h-9">
                        <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        {endDate ? format(parseISO(endDate), "dd MMM yyyy") : "End date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate ? parseISO(endDate) : undefined}
                        onSelect={(date) => {
                          if (date) { setEndDate(format(date, "yyyy-MM-dd")); setEndDateOpen(false) }
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                {formError ? (
                  <p className="mt-1.5 text-xs text-destructive">{formError}</p>
                ) : null}
              </div>
              <div>
                <Label className="text-sm font-medium">Color</Label>
                <div className="mt-1.5 flex items-center gap-2">
                  {PRESET_COLORS.map((c) => {
                    const active = normalizeProjectColor(color) === c.value
                    return (
                      <button
                        key={c.name}
                        type="button"
                        aria-label={c.name}
                        onClick={() => setColor(c.value)}
                        className={cn(
                          "h-6 w-6 rounded-full transition-all",
                          active ? "ring-2 ring-offset-2 ring-foreground/60" : "hover:scale-110"
                        )}
                        style={{ backgroundColor: c.value }}
                      />
                    )
                  })}
                </div>
              </div>
              {!editingId ? (
                <div>
                  <Label htmlFor="project-milestones" className="text-sm font-medium">Milestones (optional)</Label>
                  <Input
                    id="project-milestones"
                    value={milestones}
                    onChange={(e) => setMilestones(e.target.value)}
                    placeholder="Design, Build page, Deploy"
                    className="mt-1.5"
                  />
                </div>
              ) : null}
            </div>
            {/* §4 — sticky footer */}
            <div className="flex shrink-0 items-center justify-between border-t border-border px-5 py-4">
              {editingId ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button type="button" className="text-sm text-destructive/70 hover:text-destructive transition-colors">
                      Delete project
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete &quot;{title}&quot;?</AlertDialogTitle>
                      <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => { deleteProject(editingId); setOpen(false) }}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
                <Button
                  size="sm"
                  onClick={saveProject}
                  disabled={(() => {
                    const isDirty = !formSnapshot || title !== formSnapshot.title || objective !== formSnapshot.objective || status !== formSnapshot.status || startDate !== formSnapshot.startDate || endDate !== formSnapshot.endDate || color !== formSnapshot.color
                    const isValid = !!title.trim() && (startDate <= endDate)
                    return !isValid || (!!editingId && !isDirty)
                  })()}
                >
                  {editingId ? "Save" : "Create"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* §1 — Filter row + List/Timeline toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center text-sm">
          {statusBuckets.map((s, i) => (
            <span key={s.id} className="flex items-center">
              {i > 0 && <span className="mx-2.5 select-none text-muted-foreground/40">·</span>}
              <button
                type="button"
                onClick={() => setSelectedStatus(s.id)}
                className={cn(
                  "transition-colors",
                  selectedStatus === s.id
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {s.label} ({s.projects.length})
              </button>
            </span>
          ))}
        </div>
        <div className="flex overflow-hidden rounded-md border border-border text-sm">
          <button
            type="button"
            onClick={() => setView("list")}
            className={cn(
              "px-3 py-1 transition-colors",
              view === "list" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            List
          </button>
          <button
            type="button"
            onClick={() => setView("timeline")}
            className={cn(
              "border-l border-border px-3 py-1 transition-colors",
              view === "timeline" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Timeline
          </button>
        </div>
      </div>

      {/* §2 / §3 — Main view */}
      {view === "list" ? (
        <ProjectListView
          projects={selectedBucket.projects}
          tasks={tasks}
          onEdit={openEditDialog}
          onSelect={(id) => setSelectedProjectId(id)}
          onStatusChange={(id, nextStatus) => updateProject(id, { status: nextStatus })}
          onDelete={deleteProject}
        />
      ) : (
        <ProjectsTimelineChart projects={activeProjects} />
      )}

      {/* Detail sheet (click-to-open from list row) */}
      <Sheet open={!!selectedProject} onOpenChange={(isOpen) => !isOpen && setSelectedProjectId(null)}>
        <SheetContent
          className="w-full sm:max-w-xl flex flex-col gap-0 p-0 [&>button:last-child]:hidden"
          onEscapeKeyDown={(e) => {
            // Esc inside an inline editor cancels the edit, not the whole sheet.
            const target = e.target as HTMLElement | null
            if (target?.closest?.("input, textarea, [data-inline-edit]")) e.preventDefault()
          }}
        >
          <SheetTitle className="sr-only">{selectedProject?.title ?? "Project details"}</SheetTitle>
          {selectedProject ? (
            <ProjectDetailPanel
              project={selectedProject}
              weeklyOutcome={weekOutcomes.get(selectedProject.id)}
              tasks={tasks}
              onEdit={openEditDialog}
              onUpdateProject={updateProject}
              onStatusChange={(id, nextStatus) => updateProject(id, { status: nextStatus })}
              onDelete={deleteProject}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}

// §2 — Flat list view (one row per project)
function ProjectListView({
  projects,
  tasks,
  onEdit,
  onSelect,
  onStatusChange,
  onDelete,
}: {
  projects: Project[]
  tasks: Task[]
  onEdit: (project: Project) => void
  onSelect: (id: string) => void
  onStatusChange: (id: string, status: ProjectStatus) => void
  onDelete: (id: string) => void
}) {
  if (projects.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
        No projects in this section.
      </p>
    )
  }
  return (
    <div className="flex flex-col divide-y divide-border rounded-md border border-border">
      {projects.map((project) => (
        <ProjectRow
          key={project.id}
          project={project}
          tasks={tasks}
          onEdit={onEdit}
          onSelect={onSelect}
          onStatusChange={onStatusChange}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

// §2 — Individual row: color dot · name · description · tasks · days · progress · ⚠ · ⋯
function ProjectRow({
  project,
  tasks,
  onEdit,
  onSelect,
  onStatusChange,
  onDelete,
}: {
  project: Project
  tasks: Task[]
  onEdit: (project: Project) => void
  onSelect: (id: string) => void
  onStatusChange: (id: string, status: ProjectStatus) => void
  onDelete: (id: string) => void
}) {
  const projectTasks = tasks.filter((t) => t.linkedProjectId === project.id)
  const completedTasks = projectTasks.filter((t) => t.completed).length
  const completedMilestones = project.milestones.filter((m) => m.completed).length
  const totalMilestones = project.milestones.length
  const progressPct = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0
  const dotColor = normalizeProjectColor(project.color)
  const days = daysLeftInfo(project)
  const atRisk = isAtRisk(project)
  const currentStatus = getProjectStatus(project)

  return (
    <div
      className="group flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors hover:bg-secondary/30 focus-within:bg-secondary/20"
      onClick={() => onSelect(project.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onSelect(project.id)
        }
      }}
    >
      {/* §5 — color dot uses project color, not brand green */}
      <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />

      {/* §6 — text-sm for name */}
      <p className="w-36 shrink-0 truncate text-sm font-medium">{project.title}</p>
      {sourceLabel(project) ? (
        <Badge variant="outline" className="shrink-0 text-[10px]" title={project.sourceId}>{sourceLabel(project)}</Badge>
      ) : null}

      {/* §6 — text-xs for meta */}
      <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{project.objective}</p>
      <span className="w-10 shrink-0 text-right text-xs text-muted-foreground">
        {completedTasks}/{projectTasks.length}
      </span>
      <span className={cn("w-16 shrink-0 text-right text-xs", days.className)}>{days.label}</span>
      <div className="w-20 shrink-0">
        <Progress value={progressPct} className="h-1.5 [&>div]:bg-primary" />
      </div>
      <span className="w-8 shrink-0 text-right text-xs text-muted-foreground">{Math.round(progressPct)}%</span>

      {/* §2 — ⚠ only when at risk; no "on track" wording */}
      <div className="flex h-4 w-4 shrink-0 items-center justify-center">
        {atRisk ? <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> : null}
      </div>

      {/* §2 — hover ⋯ menu; zero inline action buttons */}
      <div
        className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label={`Actions for ${project.title}`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(project)}>Edit</DropdownMenuItem>
            <DropdownMenuSeparator />
            {currentStatus !== "active" && (
              <DropdownMenuItem onClick={() => onStatusChange(project.id, "active")}>Make Active</DropdownMenuItem>
            )}
            {currentStatus !== "paused" && (
              <DropdownMenuItem onClick={() => onStatusChange(project.id, "paused")}>Pause</DropdownMenuItem>
            )}
            {currentStatus !== "parked" && (
              <DropdownMenuItem onClick={() => onStatusChange(project.id, "parked")}>Park</DropdownMenuItem>
            )}
            {currentStatus !== "completed" && (
              <DropdownMenuItem onClick={() => onStatusChange(project.id, "completed")}>Complete</DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(project.id)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

// Detail panel fills SheetContent — header · scrollable body · footer actions
function ProjectDetailPanel({
  project,
  weeklyOutcome,
  tasks,
  onEdit,
  onUpdateProject,
  onStatusChange,
  onDelete,
}: {
  project: Project
  /** This week's outcome from the weekly plan (ADR-022), if the project is in it. */
  weeklyOutcome?: string
  tasks: Task[]
  onEdit: (project: Project) => void
  onUpdateProject: (id: string, updates: Partial<Project>) => void
  onStatusChange: (id: string, status: ProjectStatus) => void
  onDelete: (id: string) => void
}) {
  const [showAddLink, setShowAddLink] = useState(false)
  const [addLinkLabel, setAddLinkLabel] = useState("")
  const [addLinkUrl, setAddLinkUrl] = useState("")
  const [editingLinkIdx, setEditingLinkIdx] = useState<number | null>(null)
  const [editingLinkLabel, setEditingLinkLabel] = useState("")
  const [editingLinkUrl, setEditingLinkUrl] = useState("")
  const [deleteLinkIdx, setDeleteLinkIdx] = useState<number | null>(null)

  const dotColor = normalizeProjectColor(project.color)
  const currentStatus = getProjectStatus(project)
  const days = daysLeftInfo(project)
  const daysText = days.label === "Overdue" || days.label === "Today" ? days.label : `${days.label} left`
  const statusLine = `${currentStatus.charAt(0).toUpperCase()}${currentStatus.slice(1)} · ${daysText}`
  const weeklyLines = weeklyOutcome ? weeklyOutcome.split("\n").filter((l) => l.trim()) : []

  const projectLinks = getProjectLinks(project)

  function commitAddLink() {
    const url = normalizeUrl(addLinkUrl)
    if (!url) return
    const label = addLinkLabel.trim() || "Link"
    const next = [...projectLinks, { label, url }]
    onUpdateProject(project.id, { links: next, url: next[0]?.url })
    setAddLinkLabel("")
    setAddLinkUrl("")
    setShowAddLink(false)
  }

  function commitEditLink(idx: number) {
    const url = normalizeUrl(editingLinkUrl)
    if (!url) return
    const next = projectLinks.map((l, i) =>
      i === idx ? { label: editingLinkLabel.trim() || "Link", url } : l
    )
    onUpdateProject(project.id, { links: next, url: next[0]?.url })
    setEditingLinkIdx(null)
  }

  function commitDeleteLink(idx: number) {
    const next = projectLinks.filter((_, i) => i !== idx)
    onUpdateProject(project.id, { links: next.length > 0 ? next : undefined, url: next[0]?.url })
    setDeleteLinkIdx(null)
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header: ● title · status line · ⋯ · ✕ */}
      <div className="flex items-start gap-2 border-b border-border px-4 py-3">
        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-sm leading-tight">{project.title}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            {statusLine}
            {sourceLabel(project) ? (
              <Badge variant="outline" className="text-[10px]" title={project.sourceId}>{sourceLabel(project)}</Badge>
            ) : null}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" aria-label="More actions">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {currentStatus !== "active" && (
              <DropdownMenuItem onClick={() => onStatusChange(project.id, "active")}>Make Active</DropdownMenuItem>
            )}
            {currentStatus !== "parked" && (
              <DropdownMenuItem onClick={() => onStatusChange(project.id, "parked")}>Park</DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(project.id)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <SheetClose asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </SheetClose>
      </div>

      {/* Body — scrollable */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
        {/* Goal */}
        {project.objective ? (
          <p className="text-sm italic text-muted-foreground">{project.objective}</p>
        ) : null}

        {/* This week — weekly outcome as bullet lines */}
        {weeklyLines.length > 0 ? (
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium">This week</p>
            {weeklyLines.map((line, i) => (
              <p key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <span className="mt-px shrink-0 select-none">·</span>
                <span>{line.trim()}</span>
              </p>
            ))}
          </div>
        ) : null}

        {/* Roadmap — milestones with their tasks (P12, ADR-025) */}
        <ProjectRoadmap project={project} />

        {/* Resources — cross-links to the Resources library */}
        <ProjectResourceLinks project={project} />

        {/* Links — inline editable */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium">Links</p>
            {!showAddLink ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 gap-1 px-1.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setShowAddLink(true)}
              >
                <Plus className="h-3 w-3" /> Add
              </Button>
            ) : null}
          </div>

          {showAddLink ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex gap-1.5">
                <Input
                  value={addLinkLabel}
                  onChange={(e) => setAddLinkLabel(e.target.value)}
                  placeholder="Label"
                  aria-label="Link label"
                  className="h-7 w-28 shrink-0 text-xs"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitAddLink()
                    if (e.key === "Escape") setShowAddLink(false)
                  }}
                />
                <Input
                  value={addLinkUrl}
                  onChange={(e) => setAddLinkUrl(e.target.value)}
                  placeholder="https://..."
                  aria-label="Link URL"
                  className="h-7 min-w-0 flex-1 text-xs"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitAddLink()
                    if (e.key === "Escape") setShowAddLink(false)
                  }}
                  autoFocus
                />
              </div>
              <div className="flex gap-1.5">
                <Button type="button" size="sm" variant="secondary" className="h-7 text-xs" onClick={commitAddLink} disabled={!normalizeUrl(addLinkUrl)}>
                  Save
                </Button>
                <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setShowAddLink(false); setAddLinkLabel(""); setAddLinkUrl("") }}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}

          {projectLinks.length === 0 && !showAddLink ? (
            <p className="text-xs text-muted-foreground">No links yet. Add the repo, live app or design file.</p>
          ) : null}

          <div className="flex flex-col gap-1">
            {projectLinks.map((link, i) => (
              <div key={`${link.url}-${i}`} className="group flex items-center gap-2 rounded-md px-1 py-0.5 hover:bg-muted/40">
                {editingLinkIdx === i ? (
                  <>
                    <Input
                      value={editingLinkLabel}
                      onChange={(e) => setEditingLinkLabel(e.target.value)}
                      className="h-6 w-24 shrink-0 text-xs"
                    />
                    <Input
                      value={editingLinkUrl}
                      onChange={(e) => setEditingLinkUrl(e.target.value)}
                      className="h-6 min-w-0 flex-1 text-xs"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitEditLink(i)
                        if (e.key === "Escape") setEditingLinkIdx(null)
                      }}
                      autoFocus
                    />
                    <Button type="button" size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => commitEditLink(i)}>
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button type="button" size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => setEditingLinkIdx(null)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </>
                ) : (
                  <>
                    <LinkIcon className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-w-0 flex-1 truncate text-xs hover:underline"
                        >
                          {link.label || "Link"}
                        </a>
                      </TooltipTrigger>
                      <TooltipContent side="top">{link.url}</TooltipContent>
                    </Tooltip>
                    <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5"
                        onClick={() => { setEditingLinkIdx(i); setEditingLinkLabel(link.label); setEditingLinkUrl(link.url) }}
                        aria-label={`Edit ${link.label} link`}
                      >
                        <Pencil className="h-2.5 w-2.5" />
                      </Button>
                      {deleteLinkIdx === i ? (
                        <div className="flex items-center gap-0.5">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-5 w-5 text-destructive"
                            onClick={() => commitDeleteLink(i)}
                            aria-label="Confirm delete"
                          >
                            <Check className="h-2.5 w-2.5" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-5 w-5"
                            onClick={() => setDeleteLinkIdx(null)}
                            aria-label="Cancel delete"
                          >
                            <X className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-5 w-5 text-destructive"
                          onClick={() => setDeleteLinkIdx(i)}
                          aria-label={`Delete ${link.label} link`}
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex shrink-0 items-center justify-between border-t border-border px-4 py-3">
        {currentStatus !== "completed" ? (
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => onStatusChange(project.id, "completed")}
          >
            Mark complete
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => onStatusChange(project.id, "active")}
          >
            Reopen
          </Button>
        )}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-xs" onClick={() => onEdit(project)}>
            Edit
          </Button>
          {currentStatus === "active" ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => onStatusChange(project.id, "paused")}
            >
              Pause
            </Button>
          ) : null}
          {currentStatus === "paused" ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => onStatusChange(project.id, "active")}
            >
              Unpause
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
