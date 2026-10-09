"use client"

// P12 — Project roadmap (ADR-025). Lives inside the project detail Sheet; not a module.
// Milestones are embedded in the Project; tasks join them through Task.milestoneId;
// Resources are cross-linked by id from the project and from each milestone.

import { useMemo, useRef, useState } from "react"
import { format, parseISO } from "date-fns"
import { useAppStore } from "@/lib/store"
import { firstCategory } from "@/lib/categories"
import {
  buildProjectRoadmap,
  resolveResources,
  toggleId,
  type MilestoneSchedule,
  type RoadmapMilestone,
} from "@/lib/roadmap"
import type { Project, ProjectMilestone, Resource, Task } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  CalendarIcon,
  Check,
  ChevronRight,
  CornerDownRight,
  ExternalLink,
  Flag,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react"

// ─── helpers ────────────────────────────────────────────────────────────────

function relativeLabel(days: number | null) {
  if (days === null) return null
  if (days === 0) return "today"
  if (days > 0) return `in ${days}d`
  return `${Math.abs(days)}d late`
}

const SCHEDULE_TEXT: Record<MilestoneSchedule, string> = {
  done: "text-muted-foreground",
  overdue: "text-destructive",
  "due-soon": "text-amber-600 dark:text-amber-400",
  "on-track": "text-muted-foreground",
  unscheduled: "text-muted-foreground",
}

function resourceHref(resource: Resource) {
  return resource.links?.[0]?.url ?? resource.url
}

// ─── shared: resource picker ────────────────────────────────────────────────

function ResourcePicker({
  selectedIds,
  onToggle,
  trigger,
  align = "end",
}: {
  selectedIds: string[] | undefined
  onToggle: (resourceId: string) => void
  trigger: React.ReactNode
  align?: "start" | "end"
}) {
  const resources = useAppStore((s) => s.resources)
  const live = useMemo(
    () => resources.filter((resource) => !resource.deleted).sort((a, b) => a.title.localeCompare(b.title)),
    [resources]
  )
  const grouped = useMemo(() => {
    const map = new Map<string, Resource[]>()
    for (const resource of live) {
      const key = resource.category || "Uncategorised"
      map.set(key, [...(map.get(key) ?? []), resource])
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [live])
  const selected = new Set(selectedIds ?? [])

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align={align} className="w-72 p-0">
        <Command>
          <CommandInput placeholder="Search resources…" className="h-9 text-sm" />
          <CommandList className="max-h-64">
            <CommandEmpty className="px-3 py-6 text-center text-xs text-muted-foreground">
              {live.length === 0 ? "No resources yet. Add them in Resources." : "No match."}
            </CommandEmpty>
            {grouped.map(([category, items]) => (
              <CommandGroup key={category} heading={category}>
                {items.map((resource) => {
                  const isOn = selected.has(resource.id)
                  return (
                    <CommandItem
                      key={resource.id}
                      value={`${resource.title} ${resource.category} ${resource.tags.join(" ")} ${resource.id}`}
                      onSelect={() => onToggle(resource.id)}
                      className="gap-2 text-sm"
                    >
                      <span
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border",
                          isOn ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
                        )}
                      >
                        {isOn ? <Check className="h-3 w-3" /> : null}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{resource.title}</span>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function ResourceChip({ resource, onRemove }: { resource: Resource; onRemove?: () => void }) {
  const setActiveModule = useAppStore((s) => s.setActiveModule)
  const href = resourceHref(resource)
  const body = (
    <>
      <BookOpen className="h-3 w-3 shrink-0 text-muted-foreground" />
      <span className="max-w-[11rem] truncate">{resource.title}</span>
      {href ? <ExternalLink className="h-2.5 w-2.5 shrink-0 text-muted-foreground" /> : null}
    </>
  )
  return (
    <span className="group/chip inline-flex h-6 items-center gap-1 rounded-md border border-border bg-background pl-1.5 pr-1 text-[11px] text-foreground/90 transition-colors hover:border-foreground/20">
      <Tooltip>
        <TooltipTrigger asChild>
          {href ? (
            <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1">
              {body}
            </a>
          ) : (
            <button type="button" className="inline-flex items-center gap-1" onClick={() => setActiveModule("resources")}>
              {body}
            </button>
          )}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="font-medium">{resource.title}</p>
          <p className="text-[11px] opacity-80">{resource.category}{href ? ` · ${href}` : " · open Resources"}</p>
        </TooltipContent>
      </Tooltip>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover/chip:opacity-100"
          aria-label={`Unlink ${resource.title}`}
        >
          <X className="h-2.5 w-2.5" />
        </button>
      ) : null}
    </span>
  )
}

// ─── project-level resources ────────────────────────────────────────────────

export function ProjectResourceLinks({ project }: { project: Project }) {
  const resources = useAppStore((s) => s.resources)
  const updateProject = useAppStore((s) => s.updateProject)
  const linked = resolveResources(project.resourceIds, resources)

  function toggle(resourceId: string) {
    updateProject(project.id, { resourceIds: toggleId(project.resourceIds, resourceId) })
  }

  return (
    <section className="flex flex-col gap-2" aria-label="Linked resources">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium">Resources</p>
        <ResourcePicker
          selectedIds={project.resourceIds}
          onToggle={toggle}
          trigger={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-3 w-3" /> Link
            </Button>
          }
        />
      </div>
      {linked.length === 0 ? (
        <p className="text-xs text-muted-foreground">No resources linked. Link references from your Resources library.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {linked.map((resource) => (
            <ResourceChip key={resource.id} resource={resource} onRemove={() => toggle(resource.id)} />
          ))}
        </div>
      )}
    </section>
  )
}

// ─── milestone dialog (create + edit details) ───────────────────────────────

interface MilestoneDraft {
  title: string
  targetDate: string
  note: string
  resourceIds: string[]
}

function MilestoneDialog({
  open,
  onOpenChange,
  initial,
  mode,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial: MilestoneDraft
  mode: "create" | "edit"
  onSubmit: (draft: MilestoneDraft) => void
}) {
  const resources = useAppStore((s) => s.resources)
  const [draft, setDraft] = useState<MilestoneDraft>(initial)
  const [dateOpen, setDateOpen] = useState(false)
  const linked = resolveResources(draft.resourceIds, resources)
  const canSave = draft.title.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New milestone" : "Edit milestone"}</DialogTitle>
          <DialogDescription>A milestone is an outcome on the way to the project objective.</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (canSave) onSubmit(draft)
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="milestone-title">Outcome</Label>
            <Input
              id="milestone-title"
              value={draft.title}
              maxLength={200}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder="e.g. Beta live with 10 users"
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Target date</Label>
            <div className="flex items-center gap-2">
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn("h-9 flex-1 justify-start gap-2 font-normal", !draft.targetDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="h-4 w-4" />
                    {draft.targetDate ? format(parseISO(draft.targetDate), "EEE, MMM d, yyyy") : "No target date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={draft.targetDate ? parseISO(draft.targetDate) : undefined}
                    onSelect={(date) => {
                      setDraft((d) => ({ ...d, targetDate: date ? format(date, "yyyy-MM-dd") : "" }))
                      setDateOpen(false)
                    }}
                  />
                </PopoverContent>
              </Popover>
              {draft.targetDate ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setDraft((d) => ({ ...d, targetDate: "" }))}
                  aria-label="Clear target date"
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="milestone-note">Definition of done <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Textarea
              id="milestone-note"
              value={draft.note}
              maxLength={2000}
              onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
              placeholder="What has to be true for this to count as done?"
              className="min-h-20 text-sm"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label>Resources</Label>
              <ResourcePicker
                selectedIds={draft.resourceIds}
                onToggle={(id) => setDraft((d) => ({ ...d, resourceIds: toggleId(d.resourceIds, id) }))}
                trigger={
                  <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs">
                    <Plus className="h-3 w-3" /> Link
                  </Button>
                }
              />
            </div>
            {linked.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {linked.map((resource) => (
                  <ResourceChip
                    key={resource.id}
                    resource={resource}
                    onRemove={() => setDraft((d) => ({ ...d, resourceIds: toggleId(d.resourceIds, resource.id) }))}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">None linked.</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSave}>
              {mode === "create" ? "Add milestone" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── task row ───────────────────────────────────────────────────────────────

function RoadmapTaskRow({
  task,
  milestones,
}: {
  task: Task
  milestones: ProjectMilestone[]
}) {
  const toggleTask = useAppStore((s) => s.toggleTask)
  const updateTask = useAppStore((s) => s.updateTask)
  const deleteTask = useAppStore((s) => s.deleteTask)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(task.title)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const today = format(new Date(), "yyyy-MM-dd")
  const overdue = !task.completed && task.dueDate ? task.dueDate < today : false

  function commit() {
    const next = title.trim()
    if (next && next !== task.title) updateTask(task.id, { title: next })
    else setTitle(task.title)
    setEditing(false)
  }

  return (
    <div className="group/task flex min-h-8 items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-muted/50">
      <Checkbox
        checked={task.completed}
        onCheckedChange={() => toggleTask(task.id)}
        aria-label={`${task.completed ? "Reopen" : "Complete"} task: ${task.title}`}
        className="shrink-0"
      />
      {editing ? (
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit()
            if (e.key === "Escape") {
              setTitle(task.title)
              setEditing(false)
            }
          }}
          className="h-7 flex-1 text-sm"
          aria-label="Task title"
          autoFocus
        />
      ) : (
        <button
          type="button"
          onDoubleClick={() => setEditing(true)}
          className={cn(
            "min-w-0 flex-1 truncate text-left text-sm",
            task.completed && "text-muted-foreground line-through decoration-muted-foreground/50"
          )}
          title={`${task.title} — double-click to rename`}
        >
          {task.title}
        </button>
      )}
      {task.dueDate && !editing ? (
        <span className={cn("shrink-0 text-[11px] tabular-nums", overdue ? "text-destructive" : "text-muted-foreground")}>
          {format(parseISO(task.dueDate), "MMM d")}
        </span>
      ) : null}
      {!editing ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 opacity-0 transition-opacity focus-visible:opacity-100 group-hover/task:opacity-100 data-[state=open]:opacity-100"
              aria-label={`Actions for ${task.title}`}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onSelect={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" /> Rename
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <CornerDownRight className="h-3.5 w-3.5" /> Move to
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-52">
                {milestones.map((milestone) => (
                  <DropdownMenuItem
                    key={milestone.id}
                    disabled={task.milestoneId === milestone.id}
                    onSelect={() => updateTask(task.id, { milestoneId: milestone.id })}
                  >
                    <Flag className="h-3.5 w-3.5" />
                    <span className="truncate">{milestone.title}</span>
                  </DropdownMenuItem>
                ))}
                {milestones.length > 0 ? <DropdownMenuSeparator /> : null}
                <DropdownMenuItem disabled={!task.milestoneId} onSelect={() => updateTask(task.id, { milestoneId: "" })}>
                  No milestone
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
              <Trash2 className="h-3.5 w-3.5" /> Delete task
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this task?</AlertDialogTitle>
            <AlertDialogDescription>
              “{task.title}” is removed from the project and from ToDo. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deleteTask(task.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── inline task composer ───────────────────────────────────────────────────

function AddTaskInline({ projectId, milestoneId }: { projectId: string; milestoneId?: string }) {
  const addTask = useAppStore((s) => s.addTask)
  const categories = useAppStore((s) => s.profile.taskCategories)
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  function submit() {
    const next = title.trim()
    if (!next) return
    addTask({
      title: next.slice(0, 300),
      category: firstCategory(categories),
      completed: false,
      lane: "backlog",
      linkedProjectId: projectId,
      milestoneId: milestoneId ?? "",
    })
    setTitle("")
    // Stay open for rapid entry.
    inputRef.current?.focus()
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-8 w-full items-center gap-2 rounded-md px-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5" /> Add task
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1.5 px-1">
      <Input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit()
          if (e.key === "Escape") {
            setTitle("")
            setOpen(false)
          }
        }}
        onBlur={() => {
          if (!title.trim()) setOpen(false)
        }}
        placeholder="Task title, Enter to add"
        className="h-8 text-sm"
        aria-label="New task title"
        autoFocus
      />
      <Button type="button" size="icon" variant="secondary" className="h-8 w-8 shrink-0" onClick={submit} aria-label="Add task">
        <Check className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

// ─── status node on the timeline rail ───────────────────────────────────────

function RailNode({ schedule, isNext, onToggle, label }: { schedule: MilestoneSchedule; isNext: boolean; onToggle: () => void; label: string }) {
  const done = schedule === "done"
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      className={cn(
        "relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 bg-background transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        done && "border-primary bg-primary text-primary-foreground",
        !done && schedule === "overdue" && "border-destructive",
        !done && schedule === "due-soon" && "border-amber-500",
        !done && schedule !== "overdue" && schedule !== "due-soon" && (isNext ? "border-primary" : "border-muted-foreground/40"),
        !done && "hover:border-primary hover:bg-primary/10"
      )}
    >
      {done ? <Check className="h-3 w-3" strokeWidth={3} /> : isNext ? <span className="h-1.5 w-1.5 rounded-full bg-primary" /> : null}
    </button>
  )
}

// ─── milestone block ────────────────────────────────────────────────────────

function MilestoneBlock({
  project,
  entry,
  index,
  count,
  isNext,
  isLast,
  expanded,
  onExpandedChange,
  milestones,
}: {
  project: Project
  entry: RoadmapMilestone
  index: number
  count: number
  isNext: boolean
  isLast: boolean
  expanded: boolean
  onExpandedChange: (open: boolean) => void
  milestones: ProjectMilestone[]
}) {
  const resources = useAppStore((s) => s.resources)
  const updateMilestone = useAppStore((s) => s.updateMilestone)
  const moveMilestone = useAppStore((s) => s.moveMilestone)
  const deleteMilestone = useAppStore((s) => s.deleteMilestone)
  const [editOpen, setEditOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { milestone, tasks, doneTasks, progress, schedule, daysToTarget } = entry
  const linked = resolveResources(milestone.resourceIds, resources)
  const rel = relativeLabel(daysToTarget)

  return (
    <li className="relative pl-8">
      {/* rail segment to the next node */}
      {!isLast ? (
        <span
          aria-hidden
          className={cn(
            "absolute left-[9px] top-6 bottom-0 w-0.5 rounded-full",
            milestone.completed ? "bg-primary/60" : "bg-border"
          )}
        />
      ) : null}
      <div className="absolute left-0 top-1.5">
        <RailNode
          schedule={schedule}
          isNext={isNext}
          onToggle={() => updateMilestone(project.id, milestone.id, { completed: !milestone.completed })}
          label={milestone.completed ? `Reopen milestone: ${milestone.title}` : `Complete milestone: ${milestone.title}`}
        />
      </div>

      <Collapsible open={expanded} onOpenChange={onExpandedChange}>
        <div
          className={cn(
            "group/ms rounded-lg border px-3 py-2 transition-colors",
            isNext ? "border-primary/30 bg-primary/[0.03]" : "border-transparent hover:border-border hover:bg-muted/30"
          )}
        >
          <div className="flex items-start gap-2">
            <button
              type="button"
              onClick={() => onExpandedChange(!expanded)}
              className="flex min-w-0 flex-1 items-start gap-1.5 text-left"
              aria-expanded={expanded}
            >
              <ChevronRight
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                  expanded && "rotate-90"
                )}
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span
                    className={cn(
                      "truncate text-sm font-medium",
                      milestone.completed && "text-muted-foreground line-through decoration-muted-foreground/50"
                    )}
                  >
                    {milestone.title}
                  </span>
                  {isNext ? (
                    <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-px text-[10px] font-medium text-primary">
                      Next
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                  {milestone.targetDate ? (
                    <span className={cn("inline-flex items-center gap-1 tabular-nums", SCHEDULE_TEXT[schedule])}>
                      <CalendarIcon className="h-3 w-3" />
                      {format(parseISO(milestone.targetDate), "MMM d")}
                      {!milestone.completed && rel ? <span>· {rel}</span> : null}
                    </span>
                  ) : null}
                  {milestone.completed && milestone.completedAt ? (
                    <span className="tabular-nums">Done {format(parseISO(milestone.completedAt), "MMM d")}</span>
                  ) : null}
                  <span className="tabular-nums">
                    {tasks.length > 0 ? `${doneTasks.length}/${tasks.length} tasks` : "No tasks"}
                  </span>
                  {linked.length > 0 ? (
                    <span className="inline-flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      {linked.length}
                    </span>
                  ) : null}
                </span>
              </span>
            </button>

            <div className="flex shrink-0 items-center gap-1 pt-0.5">
              {tasks.length > 0 && !milestone.completed ? (
                <div className="hidden h-1 w-14 overflow-hidden rounded-full bg-muted sm:block" aria-hidden>
                  <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${progress}%` }} />
                </div>
              ) : null}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-60 transition-opacity hover:opacity-100 focus-visible:opacity-100 group-hover/ms:opacity-100 data-[state=open]:opacity-100"
                    aria-label={`Actions for milestone ${milestone.title}`}
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel className="truncate text-xs text-muted-foreground">{milestone.title}</DropdownMenuLabel>
                  <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                    <Pencil className="h-3.5 w-3.5" /> Edit details
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => updateMilestone(project.id, milestone.id, { completed: !milestone.completed })}>
                    <Check className="h-3.5 w-3.5" /> {milestone.completed ? "Reopen" : "Mark done"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled={index === 0} onSelect={() => moveMilestone(project.id, milestone.id, -1)}>
                    <ArrowUp className="h-3.5 w-3.5" /> Move up
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={index === count - 1} onSelect={() => moveMilestone(project.id, milestone.id, 1)}>
                    <ArrowDown className="h-3.5 w-3.5" /> Move down
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
                    <Trash2 className="h-3.5 w-3.5" /> Delete milestone
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden">
            <div className="flex flex-col gap-2 pt-2 pl-5">
              {milestone.note ? (
                <p className="whitespace-pre-line rounded-md bg-muted/40 px-2.5 py-1.5 text-xs leading-relaxed text-muted-foreground">
                  {milestone.note}
                </p>
              ) : null}

              <div className="flex flex-col">
                {tasks.map((task) => (
                  <RoadmapTaskRow key={task.id} task={task} milestones={milestones} />
                ))}
                <AddTaskInline projectId={project.id} milestoneId={milestone.id} />
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {linked.map((resource) => (
                  <ResourceChip
                    key={resource.id}
                    resource={resource}
                    onRemove={() =>
                      updateMilestone(project.id, milestone.id, {
                        resourceIds: toggleId(milestone.resourceIds, resource.id),
                      })
                    }
                  />
                ))}
                <ResourcePicker
                  align="start"
                  selectedIds={milestone.resourceIds}
                  onToggle={(id) =>
                    updateMilestone(project.id, milestone.id, { resourceIds: toggleId(milestone.resourceIds, id) })
                  }
                  trigger={
                    <button
                      type="button"
                      className="inline-flex h-6 items-center gap-1 rounded-md border border-dashed border-border px-1.5 text-[11px] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                    >
                      <BookOpen className="h-3 w-3" /> Link resource
                    </button>
                  }
                />
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {editOpen ? (
        <MilestoneDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          mode="edit"
          initial={{
            title: milestone.title,
            targetDate: milestone.targetDate ?? "",
            note: milestone.note ?? "",
            resourceIds: milestone.resourceIds ?? [],
          }}
          onSubmit={(draft) => {
            updateMilestone(project.id, milestone.id, {
              title: draft.title,
              targetDate: draft.targetDate,
              note: draft.note,
              resourceIds: draft.resourceIds,
            })
            setEditOpen(false)
          }}
        />
      ) : null}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete milestone?</AlertDialogTitle>
            <AlertDialogDescription>
              “{milestone.title}” is removed from the roadmap.
              {tasks.length > 0
                ? ` Its ${tasks.length} task${tasks.length === 1 ? "" : "s"} stay on the project under “No milestone”.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deleteMilestone(project.id, milestone.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  )
}

// ─── roadmap section ────────────────────────────────────────────────────────

export function ProjectRoadmap({ project }: { project: Project }) {
  const tasks = useAppStore((s) => s.tasks)
  const addMilestone = useAppStore((s) => s.addMilestone)
  const roadmap = useMemo(() => buildProjectRoadmap(project, tasks), [project, tasks])
  const milestones = roadmap.milestones.map((entry) => entry.milestone)
  const [createOpen, setCreateOpen] = useState(false)
  const [createKey, setCreateKey] = useState(0)
  // Progressive disclosure: the next milestone and open milestones with open tasks start expanded.
  // Done and empty milestones start collapsed. User toggles win afterwards.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({})
  const isExpanded = (entry: RoadmapMilestone) =>
    overrides[entry.milestone.id] ??
    (!entry.milestone.completed && (roadmap.nextMilestoneId === entry.milestone.id || entry.openTasks.length > 0))
  const { totals } = roadmap
  const isEmpty = totals.milestones === 0 && roadmap.unassigned.length === 0

  function openCreate() {
    setCreateKey((k) => k + 1)
    setCreateOpen(true)
  }

  return (
    <section className="flex flex-col gap-3" aria-label="Roadmap">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium">Roadmap</p>
          <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
            {totals.milestonesDone}/{totals.milestones} milestones · {totals.tasksDone}/{totals.tasks} tasks
            {totals.milestones > 0 ? <> · {Math.round((totals.milestonesDone / totals.milestones) * 100)}%</> : null}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={openCreate}>
          <Plus className="h-3 w-3" /> Milestone
        </Button>
      </div>

      {/* Segmented strip: one segment per milestone, in roadmap order */}
      {totals.milestones > 0 ? (
        <div className="flex h-1.5 gap-0.5" aria-hidden>
          {roadmap.milestones.map((entry) => (
            <div key={entry.milestone.id} className="relative flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-500",
                  entry.schedule === "overdue" ? "bg-destructive/70" : "bg-primary"
                )}
                style={{ width: `${entry.progress}%` }}
              />
            </div>
          ))}
        </div>
      ) : null}

      {isEmpty ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-4 py-6 text-center">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
            <Flag className="h-4 w-4 text-muted-foreground" />
          </span>
          <p className="text-sm font-medium">Map the path to the objective</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            Break the project into a few outcome milestones, then hang next actions off each one.
          </p>
          <Button type="button" size="sm" className="mt-1 h-7 gap-1 text-xs" onClick={openCreate}>
            <Plus className="h-3 w-3" /> First milestone
          </Button>
        </div>
      ) : (
        <ol className="flex flex-col gap-1.5">
          {roadmap.milestones.map((entry, index) => (
            <MilestoneBlock
              key={entry.milestone.id}
              project={project}
              entry={entry}
              index={index}
              count={roadmap.milestones.length}
              isNext={roadmap.nextMilestoneId === entry.milestone.id}
              isLast={index === roadmap.milestones.length - 1}
              expanded={isExpanded(entry)}
              onExpandedChange={(open) => setOverrides((o) => ({ ...o, [entry.milestone.id]: open }))}
              milestones={milestones}
            />
          ))}
        </ol>
      )}

      {/* Tasks on the project without a milestone */}
      {!isEmpty ? (
        <div className="rounded-lg border border-dashed border-border/80 px-3 py-2">
          <p className="mb-1 flex items-center justify-between text-[11px] font-medium text-muted-foreground">
            <span>No milestone</span>
            {roadmap.unassigned.length > 0 ? <span className="tabular-nums">{roadmap.unassigned.length}</span> : null}
          </p>
          <div className="flex flex-col">
            {roadmap.unassigned.map((task) => (
              <RoadmapTaskRow key={task.id} task={task} milestones={milestones} />
            ))}
            <AddTaskInline projectId={project.id} />
          </div>
        </div>
      ) : null}

      {createOpen ? (
        <MilestoneDialog
          key={createKey}
          open={createOpen}
          onOpenChange={setCreateOpen}
          mode="create"
          initial={{ title: "", targetDate: "", note: "", resourceIds: [] }}
          onSubmit={(draft) => {
            const id = addMilestone(project.id, {
              title: draft.title,
              targetDate: draft.targetDate || undefined,
              note: draft.note || undefined,
              resourceIds: draft.resourceIds,
            })
            setOverrides((o) => ({ ...o, [id]: true }))
            setCreateOpen(false)
          }}
        />
      ) : null}
    </section>
  )
}
