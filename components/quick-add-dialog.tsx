"use client"

import { useMemo, useRef, useState } from "react"
import { useAppStore } from "@/lib/store"
import { findCategoryConflict, firstCategory, sortCategories, withUsedCategories } from "@/lib/categories"
import { isValidUrl, normalizeUrl } from "@/lib/url"
import { toast } from "sonner"
import { useCategories } from "@/hooks/use-categories"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronDown, Pencil, Plus, Settings2, Trash2 } from "lucide-react"
import type { TaskCategory, TaskRepeat } from "@/lib/types"
import { TASK_REPEAT_OPTIONS } from "@/lib/task-recurrence"


type QuickAddTab = "task" | "goal" | "resource"

/** P31: Quick Add as a split button. The main button opens the Task tab, the chevron picks the tab. */
export function QuickAddDialog() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<QuickAddTab>("task")
  const returnFocusTo = useRef<HTMLElement | null>(null)
  const addTask = useAppStore((s) => s.addTask)
  const addGoal = useAppStore((s) => s.addGoal)
  const addResource = useAppStore((s) => s.addResource)
  const profileCategories = useAppStore((s) => s.profile.taskCategories)
  const tasks = useAppStore((s) => s.tasks)
  const resources = useAppStore((s) => s.resources)
  const addCategory = useAppStore((s) => s.addCategory)
  const renameCategory = useAppStore((s) => s.renameCategory)
  const deleteCategory = useAppStore((s) => s.deleteCategory)
  const setCategoryColor = useAppStore((s) => s.setCategoryColor)
  const taskCategoryColors = useAppStore((s) => s.profile.taskCategoryColors)
  const categories = useCategories()

  const [taskTitle, setTaskTitle] = useState("")
  const [taskCategory, setTaskCategory] = useState<TaskCategory>("Learning")
  const [taskDay, setTaskDay] = useState("")
  const [taskTime, setTaskTime] = useState("")
  const [taskRepeat, setTaskRepeat] = useState<TaskRepeat>("none")
  const [goalTitle, setGoalTitle] = useState("")
  const [resTitle, setResTitle] = useState("")
  const [resUrl, setResUrl] = useState("")
  const [resCategory, setResCategory] = useState("")
  const [resUrlError, setResUrlError] = useState(false)

  const [managingCats, setManagingCats] = useState(false)
  const [newCatName, setNewCatName] = useState("")
  const [renamingCat, setRenamingCat] = useState<string | null>(null)
  const [renameVal, setRenameVal] = useState("")
  const renameInputRef = useRef<HTMLInputElement>(null)

  const activeTaskCategory = useMemo(
    () => (categories.includes(taskCategory) ? taskCategory : firstCategory(categories)),
    [categories, taskCategory]
  )
  const activeGoalCategory = firstCategory(categories)
  // The Resources module's own category list; "General" when there is none.
  const resourceCategories = useMemo(() => {
    const list = sortCategories(withUsedCategories(profileCategories, [...tasks, ...resources]))
    return list.length > 0 ? list : ["General"]
  }, [profileCategories, tasks, resources])
  const activeResCategory = resourceCategories.includes(resCategory) ? resCategory : resourceCategories[0]

  function openWith(next: QuickAddTab, from: HTMLElement | null) {
    returnFocusTo.current = from
    setTab(next)
    setOpen(true)
  }

  function handleAddResource() {
    if (!resTitle.trim()) return
    const url = normalizeUrl(resUrl)
    if (url && !isValidUrl(url)) {
      setResUrlError(true)
      return
    }
    addResource({
      category: activeResCategory,
      title: resTitle.trim(),
      url: url || undefined,
      links: url ? [{ label: "Link", url }] : undefined,
      description: "",
      tags: [],
    })
    toast.success("Resource added")
    setResTitle("")
    setResUrl("")
    setResUrlError(false)
    setOpen(false)
  }

  function handleAddTask() {
    if (!taskTitle.trim()) return
    addTask({
      title: taskTitle.trim(),
      category: activeTaskCategory,
      completed: false,
      dueDate: taskDay || undefined,
      repeat: taskRepeat,
      timeHHmm: taskDay ? taskTime || undefined : undefined,
    })
    setTaskTitle("")
    setTaskDay("")
    setTaskTime("")
    setTaskRepeat("none")
    setOpen(false)
  }

  function handleAddGoal() {
    if (!goalTitle.trim()) return
    addGoal({ title: goalTitle, horizon: "mid", category: activeGoalCategory, priority: "medium", notes: "", status: "active", progress: 0 })
    setGoalTitle("")
    setOpen(false)
  }

  function handleAddCategory() {
    const name = newCatName.trim()
    if (!name || findCategoryConflict(categories, name)) return
    addCategory(name)
    setNewCatName("")
  }

  function startRename(cat: string) {
    setRenamingCat(cat)
    setRenameVal(cat)
    setTimeout(() => renameInputRef.current?.focus(), 0)
  }

  function commitRename() {
    if (!renamingCat) return
    const next = renameVal.trim()
    if (next && next !== renamingCat && !findCategoryConflict(categories, next, renamingCat)) {
      renameCategory(renamingCat, next)
      if (taskCategory === renamingCat) setTaskCategory(next as TaskCategory)
    }
    setRenamingCat(null)
  }

  return (
    <>
      <div className="inline-flex">
        <Button
          size="sm"
          className="gap-1.5 rounded-r-none"
          aria-label="Quick add task"
          onClick={(e) => openWith("task", e.currentTarget)}
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Quick Add</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              className="rounded-l-none border-l border-primary-foreground/30 px-1.5"
              aria-label="Choose what to add"
              onClick={(e) => (returnFocusTo.current = e.currentTarget)}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
            <DropdownMenuItem onSelect={() => openWith("task", returnFocusTo.current)}>Task</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openWith("goal", returnFocusTo.current)}>Goal</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openWith("resource", returnFocusTo.current)}>Resource</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="sm:max-w-md"
        onCloseAutoFocus={(e) => {
          e.preventDefault()
          returnFocusTo.current?.focus()
        }}
      >
        <DialogHeader>
          <DialogTitle>Quick Add</DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as QuickAddTab)} className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="task" className="flex-1">Task</TabsTrigger>
            <TabsTrigger value="goal" className="flex-1">Goal</TabsTrigger>
            <TabsTrigger value="resource" className="flex-1">Resource</TabsTrigger>
          </TabsList>

          <TabsContent value="task" className="mt-4 flex flex-col gap-3">
            <div>
              <Label htmlFor="task-title">Task title</Label>
              <Input id="task-title" placeholder="What needs to be done?" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddTask()} />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <Label>Category</Label>
                <button
                  type="button"
                  onClick={() => { setManagingCats((v) => !v); setRenamingCat(null); setNewCatName("") }}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Manage categories"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  {managingCats ? "Done" : "Manage"}
                </button>
              </div>
              <Select value={activeTaskCategory} onValueChange={(v) => setTaskCategory(v as TaskCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {managingCats ? (
                <div className="mt-2 flex flex-col gap-1.5 rounded-md border border-border bg-secondary/20 p-2">
                  {/* Add new category */}
                  <div className="flex gap-1">
                    <Input
                      placeholder="New category name…"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                      className="h-7 text-xs"
                    />
                    <Button type="button" size="sm" className="h-7 px-2 text-xs" onClick={handleAddCategory} disabled={!newCatName.trim() || Boolean(findCategoryConflict(categories, newCatName))}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Existing categories */}
                  {categories.map((cat) => (
                    <div key={cat} className="flex items-center gap-1">
                      <label
                        className="relative h-5 w-5 shrink-0 cursor-pointer rounded-full border border-border"
                        style={{ background: taskCategoryColors?.[cat] ?? "#888" }}
                        title="Change color"
                      >
                        <input
                          type="color"
                          value={taskCategoryColors?.[cat] ?? "#888888"}
                          onChange={(e) => setCategoryColor(cat, e.target.value)}
                          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        />
                      </label>
                      {renamingCat === cat ? (
                        <Input
                          ref={renameInputRef}
                          value={renameVal}
                          onChange={(e) => setRenameVal(e.target.value)}
                          onBlur={commitRename}
                          onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenamingCat(null) }}
                          className="h-6 flex-1 text-xs"
                        />
                      ) : (
                        <span className="flex-1 truncate text-xs">{cat}</span>
                      )}
                      <button
                        type="button"
                        onClick={() => startRename(cat)}
                        className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground"
                        aria-label={`Rename ${cat}`}
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteCategory(cat)}
                        disabled={categories.length <= 1}
                        className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:pointer-events-none disabled:opacity-30"
                        aria-label={`Delete ${cat}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Label htmlFor="task-day">Day (optional)</Label>
                <Input id="task-day" type="date" value={taskDay} onChange={(e) => setTaskDay(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="task-time">Time (optional)</Label>
                <Input
                  id="task-time"
                  type="time"
                  value={taskTime}
                  onChange={(e) => setTaskTime(e.target.value)}
                  disabled={!taskDay}
                />
              </div>
            </div>
            <div>
              <Label>Repeat</Label>
              <Select value={taskRepeat} onValueChange={(value) => setTaskRepeat(value as TaskRepeat)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_REPEAT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddTask}>Add Task</Button>
          </TabsContent>

          <TabsContent value="goal" className="mt-4 flex flex-col gap-3">
            <div>
              <Label htmlFor="goal-title">Goal title</Label>
              <Input id="goal-title" placeholder="What do you want to achieve?" value={goalTitle} onChange={(e) => setGoalTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddGoal()} />
            </div>
            <Button onClick={handleAddGoal}>Add Goal</Button>
          </TabsContent>

          <TabsContent value="resource" className="mt-4 flex flex-col gap-3">
            <div>
              <Label htmlFor="resource-title">Resource title</Label>
              <Input id="resource-title" placeholder="What is it called?" value={resTitle} onChange={(e) => setResTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddResource()} />
            </div>
            <div>
              <Label htmlFor="resource-url">URL (optional)</Label>
              <Input
                id="resource-url"
                type="url"
                placeholder="example.com/page"
                value={resUrl}
                aria-invalid={resUrlError}
                aria-describedby={resUrlError ? "resource-url-error" : undefined}
                onChange={(e) => { setResUrl(e.target.value); setResUrlError(false) }}
                onKeyDown={(e) => e.key === "Enter" && handleAddResource()}
              />
              {resUrlError ? <p id="resource-url-error" className="mt-1 text-xs text-destructive">Enter a valid link, for example example.com/page.</p> : null}
            </div>
            <div>
              <Label>Category</Label>
              <Select value={activeResCategory} onValueChange={setResCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {resourceCategories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddResource}>Add Resource</Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
      </Dialog>
    </>
  )
}
