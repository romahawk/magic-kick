"use client"

import { useMemo, useState } from "react"
import { useAppStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { Target, ArrowRight, Sparkles, Plus, Pencil, Save, Tags, Trash2, Check, X } from "lucide-react"
import type { Goal } from "@/lib/types"

const PRIORITY_STYLES = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-streak/10 text-foreground border-streak/20",
  low: "bg-muted text-muted-foreground border-muted",
}

const DEFAULT_TASK_CATEGORIES = ["Learning", "Sport", "Family/Home", "Hobby", "Travel"]

export function GoalsModule() {
  const allGoals = useAppStore((s) => s.goals)
  const taskCategories = useAppStore((s) => s.profile.taskCategories)
  const taskCategoryColors = useAppStore((s) => s.profile.taskCategoryColors)
  const categories = taskCategories?.length ? taskCategories : DEFAULT_TASK_CATEGORIES
  const categoryColors = taskCategoryColors ?? {}
  const addGoal = useAppStore((s) => s.addGoal)
  const updateGoal = useAppStore((s) => s.updateGoal)
  const updateGoalProgress = useAppStore((s) => s.updateGoalProgress)
  const reorderGoals = useAppStore((s) => s.reorderGoals)
  const convertWishlistToGoal = useAppStore((s) => s.convertWishlistToGoal)
  const addCategory = useAppStore((s) => s.addCategory)
  const renameCategory = useAppStore((s) => s.renameCategory)
  const removeCategory = useAppStore((s) => s.deleteCategory)
  const setCategoryColor = useAppStore((s) => s.setCategoryColor)
  const goals = useMemo(
    () => allGoals.filter((g) => !g.deleted).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [allGoals]
  )

  const [open, setOpen] = useState(false)
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState(categories[0] ?? "General")
  const [notes, setNotes] = useState("")
  const [horizon, setHorizon] = useState<Goal["horizon"]>("mid")
  const [status, setStatus] = useState<Goal["status"]>("active")
  const [priority, setPriority] = useState<Goal["priority"]>("medium")
  const [targetDate, setTargetDate] = useState("")
  const [draggedGoalId, setDraggedGoalId] = useState<string | null>(null)
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editCategory, setEditCategory] = useState(categories[0] ?? "General")
  const [editNotes, setEditNotes] = useState("")
  const [editHorizon, setEditHorizon] = useState<Goal["horizon"]>("mid")
  const [editStatus, setEditStatus] = useState<Goal["status"]>("active")
  const [editPriority, setEditPriority] = useState<Goal["priority"]>("medium")
  const [editTargetDate, setEditTargetDate] = useState("")
  const [newCategory, setNewCategory] = useState("")
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState("")

  const activeCreateCategory = useMemo(
    () => (categories.includes(category) ? category : (categories[0] ?? "General")),
    [categories, category]
  )
  const activeEditCategory = useMemo(
    () => (categories.includes(editCategory) ? editCategory : (categories[0] ?? "General")),
    [categories, editCategory]
  )

  const midTermGoals = goals.filter((g) => g.horizon === "mid" && g.status === "active")
  const longTermGoals = goals.filter((g) => g.horizon === "long" && g.status === "active")
  const wishlist = goals.filter((g) => g.status === "wishlist")

  function resetCreateForm() {
    setTitle("")
    setCategory(categories[0] ?? "General")
    setNotes("")
    setHorizon("mid")
    setStatus("active")
    setPriority("medium")
    setTargetDate("")
  }

  function createGoal() {
    if (!title.trim()) return
    addGoal({
      title: title.trim(),
      horizon,
      category: activeCreateCategory,
      targetDate: targetDate || undefined,
      priority,
      notes: notes.trim(),
      status,
      progress: 0,
    })
    resetCreateForm()
    setOpen(false)
  }

  function openGoal(goal: Goal) {
    setSelectedGoal(goal)
    setIsEditing(false)
    setEditTitle(goal.title)
    setEditCategory(goal.category)
    setEditNotes(goal.notes)
    setEditHorizon(goal.horizon)
    setEditStatus(goal.status)
    setEditPriority(goal.priority)
    setEditTargetDate(goal.targetDate ?? "")
  }

  function saveGoalEdits() {
    if (!selectedGoal) return
    const nextUpdates: Partial<Omit<Goal, "id" | "deleted" | "clientUpdatedAt">> = {
      title: editTitle.trim() || selectedGoal.title,
      category: activeEditCategory,
      notes: editNotes.trim(),
      priority: editPriority,
      targetDate: editTargetDate || undefined,
      status: editStatus,
      horizon: editStatus === "wishlist" ? selectedGoal.horizon : editHorizon,
    }
    updateGoal(selectedGoal.id, nextUpdates)
    setSelectedGoal({
      ...selectedGoal,
      ...nextUpdates,
    })
    setIsEditing(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight">Goals</h1>
          <p className="text-sm text-muted-foreground">Stay focused on what matters most.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Tags className="h-4 w-4" />
                Categories
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Tags className="h-4 w-4" />
                  Categories
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                {categories.map((c) => (
                  <div key={c} className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5">
                    <input
                      type="color"
                      value={categoryColors[c] ?? "#64748b"}
                      onChange={(e) => setCategoryColor(c, e.target.value)}
                      className="h-6 w-6 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
                      aria-label={`Color for ${c}`}
                    />
                    {editingCategory === c ? (
                      <>
                        <Input
                          autoFocus
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          className="h-7 flex-1 text-sm"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && editingValue.trim()) {
                              renameCategory(c, editingValue.trim())
                              setEditingCategory(null)
                            }
                            if (e.key === "Escape") setEditingCategory(null)
                          }}
                        />
                        <Button
                          type="button"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          disabled={!editingValue.trim()}
                          onClick={() => {
                            if (!editingValue.trim()) return
                            renameCategory(c, editingValue.trim())
                            setEditingCategory(null)
                          }}
                          aria-label="Confirm rename"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 shrink-0"
                          onClick={() => setEditingCategory(null)}
                          aria-label="Cancel rename"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm">{c}</span>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                          onClick={() => { setEditingCategory(c); setEditingValue(c) }}
                          aria-label={`Rename ${c}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeCategory(c)}
                          disabled={categories.length <= 1}
                          aria-label={`Delete ${c}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2 border-t border-border pt-3">
                <Input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="New category name"
                  className="h-8 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newCategory.trim()) {
                      addCategory(newCategory.trim())
                      setNewCategory("")
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  className="shrink-0 gap-1"
                  disabled={!newCategory.trim()}
                  onClick={() => {
                    if (!newCategory.trim()) return
                    addCategory(newCategory.trim())
                    setNewCategory("")
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" /> Add Goal / Wishlist
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Goal</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="goal-title">Title</Label>
                  <Input id="goal-title" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Horizon</Label>
                    <Select value={horizon} onValueChange={(v) => setHorizon(v as Goal["horizon"])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mid">Mid-term</SelectItem>
                        <SelectItem value="long">Long-term</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={status} onValueChange={(v) => setStatus(v as Goal["status"])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active goal</SelectItem>
                        <SelectItem value="wishlist">Wishlist item</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Priority</Label>
                    <Select value={priority} onValueChange={(v) => setPriority(v as Goal["priority"])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="goal-date">Target date</Label>
                    <Input id="goal-date" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={activeCreateCategory} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.map((existingCategory) => (
                        <SelectItem key={existingCategory} value={existingCategory}>{existingCategory}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="goal-notes">Notes</Label>
                  <Textarea id="goal-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
                <Button onClick={createGoal} className="w-full">Create</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="mid">
        <TabsList>
          <TabsTrigger value="mid">Mid-term ({midTermGoals.length})</TabsTrigger>
          <TabsTrigger value="long">Long-term ({longTermGoals.length})</TabsTrigger>
          <TabsTrigger value="wishlist">Wishlist ({wishlist.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="mid" className="mt-4">
          <GoalList
            goals={midTermGoals}
            categoryColors={categoryColors}
            onProgressChange={updateGoalProgress}
            onEdit={openGoal}
            onDragStart={setDraggedGoalId}
            onDropOnGoal={(targetGoalId) => {
              if (!draggedGoalId || draggedGoalId === targetGoalId) return
              reorderGoals(draggedGoalId, targetGoalId)
              setDraggedGoalId(null)
            }}
            onDragEnd={() => setDraggedGoalId(null)}
          />
        </TabsContent>

        <TabsContent value="long" className="mt-4">
          <GoalList
            goals={longTermGoals}
            categoryColors={categoryColors}
            onProgressChange={updateGoalProgress}
            onEdit={openGoal}
            onDragStart={setDraggedGoalId}
            onDropOnGoal={(targetGoalId) => {
              if (!draggedGoalId || draggedGoalId === targetGoalId) return
              reorderGoals(draggedGoalId, targetGoalId)
              setDraggedGoalId(null)
            }}
            onDragEnd={() => setDraggedGoalId(null)}
          />
        </TabsContent>

        <TabsContent value="wishlist" className="mt-4">
          <GoalList
            goals={wishlist}
            categoryColors={categoryColors}
            onProgressChange={updateGoalProgress}
            onEdit={openGoal}
            onDragStart={setDraggedGoalId}
            onDropOnGoal={(targetGoalId) => {
              if (!draggedGoalId || draggedGoalId === targetGoalId) return
              reorderGoals(draggedGoalId, targetGoalId)
              setDraggedGoalId(null)
            }}
            onDragEnd={() => setDraggedGoalId(null)}
            onConvert={convertWishlistToGoal}
            emptyState={{
              icon: Sparkles,
              label: "No wishlist items yet. Use \"Add Goal / Wishlist\".",
            }}
          />
        </TabsContent>
      </Tabs>

      <Sheet open={!!selectedGoal} onOpenChange={(nextOpen) => !nextOpen && setSelectedGoal(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{selectedGoal?.title}</SheetTitle>
          </SheetHeader>
          {selectedGoal ? (
            <div className="mt-4 flex flex-col gap-4">
              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="edit-goal-title">Title</Label>
                    <Input id="edit-goal-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Status</Label>
                      <Select value={editStatus} onValueChange={(v) => setEditStatus(v as Goal["status"])}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active goal</SelectItem>
                          <SelectItem value="wishlist">Wishlist item</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Horizon</Label>
                      <Select value={editHorizon} onValueChange={(v) => setEditHorizon(v as Goal["horizon"])} disabled={editStatus === "wishlist"}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mid">Mid-term</SelectItem>
                          <SelectItem value="long">Long-term</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Priority</Label>
                      <Select value={editPriority} onValueChange={(v) => setEditPriority(v as Goal["priority"])}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="edit-goal-date">Target date</Label>
                      <Input id="edit-goal-date" type="date" value={editTargetDate} onChange={(e) => setEditTargetDate(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select value={activeEditCategory} onValueChange={setEditCategory}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {categories.map((existingCategory) => (
                          <SelectItem key={existingCategory} value={existingCategory}>{existingCategory}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="edit-goal-notes">Notes</Label>
                    <Textarea id="edit-goal-notes" rows={4} value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={cn("text-[10px]", PRIORITY_STYLES[selectedGoal.priority])}>
                  {selectedGoal.priority}
                </Badge>
                <Badge
                  variant="secondary"
                  className="text-[10px]"
                  style={categoryColors[selectedGoal.category] ? { backgroundColor: categoryColors[selectedGoal.category], color: "#ffffff" } : undefined}
                >
                  {selectedGoal.category}
                </Badge>
                <Badge variant="outline" className="text-[10px] capitalize">
                  {selectedGoal.status}
                </Badge>
                {selectedGoal.status !== "wishlist" ? (
                  <Badge variant="outline" className="text-[10px]">
                    {selectedGoal.horizon === "mid" ? "Mid-term" : "Long-term"}
                  </Badge>
                ) : null}
              </div>

              {selectedGoal.notes ? <p className="text-sm text-muted-foreground">{selectedGoal.notes}</p> : null}
              {selectedGoal.targetDate ? <p className="text-sm text-muted-foreground">Target: {selectedGoal.targetDate}</p> : null}

              {selectedGoal.status !== "wishlist" ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{selectedGoal.progress}%</span>
                  </div>
                  <Progress value={selectedGoal.progress} className="h-2 [&>div]:bg-primary" />
                  <Slider
                    value={[selectedGoal.progress]}
                    max={100}
                    step={5}
                    onValueChange={([value]) => {
                      updateGoalProgress(selectedGoal.id, value)
                      setSelectedGoal({
                        ...selectedGoal,
                        progress: value,
                        status: value >= 100 ? "completed" : selectedGoal.status,
                      })
                    }}
                    aria-label={`Update progress for ${selectedGoal.title}`}
                  />
                </div>
              ) : null}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (isEditing) {
                      saveGoalEdits()
                    } else {
                      setIsEditing(true)
                    }
                  }}
                >
                  {isEditing ? <Save className="mr-1 h-4 w-4" /> : <Pencil className="mr-1 h-4 w-4" />}
                  {isEditing ? "Save" : "Edit"}
                </Button>
                {selectedGoal.status === "wishlist" ? (
                  <Button
                    variant="default"
                    onClick={() => {
                      convertWishlistToGoal(selectedGoal.id)
                      setSelectedGoal({
                        ...selectedGoal,
                        status: "active",
                        horizon: "mid",
                      })
                    }}
                  >
                    Convert to Goal
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function GoalList({
  goals,
  categoryColors,
  onProgressChange,
  onEdit,
  onDragStart,
  onDropOnGoal,
  onDragEnd,
  onConvert,
  emptyState,
}: {
  goals: Goal[]
  categoryColors: Record<string, string>
  onProgressChange: (id: string, progress: number) => void
  onEdit: (goal: Goal) => void
  onDragStart: (goalId: string) => void
  onDropOnGoal: (goalId: string) => void
  onDragEnd: () => void
  onConvert?: (goalId: string) => void
  emptyState?: {
    icon: typeof Target
    label: string
  }
}) {
  if (goals.length === 0) {
    const EmptyIcon = emptyState?.icon ?? Target
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-8">
          <EmptyIcon className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{emptyState?.label ?? "No goals yet. Add one to get started!"}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {goals.map((goal) => (
        <Card
          key={goal.id}
          className="transition-colors hover:bg-secondary/20"
          draggable
          onDragStart={() => onDragStart(goal.id)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault()
            onDropOnGoal(goal.id)
          }}
          onDragEnd={onDragEnd}
        >
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="truncate text-base">{goal.title}</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={cn("text-[10px]", PRIORITY_STYLES[goal.priority])}>
                  {goal.priority}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(event) => {
                    event.stopPropagation()
                    onEdit(goal)
                  }}
                  aria-label={`Edit ${goal.title}`}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="min-h-4 text-xs text-muted-foreground">{goal.notes}</p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="secondary"
                className="text-[10px]"
                style={categoryColors[goal.category] ? { backgroundColor: categoryColors[goal.category], color: "#ffffff" } : undefined}
              >
                {goal.category}
              </Badge>
              {goal.targetDate ? <span className="text-[10px] text-muted-foreground">Target: {goal.targetDate}</span> : null}
              {goal.status === "wishlist" ? <Badge variant="outline" className="text-[10px]">Wishlist</Badge> : null}
            </div>

            {goal.status !== "wishlist" ? (
              <>
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{goal.progress}%</span>
                  </div>
                  <Progress value={goal.progress} className="h-2 [&>div]:bg-primary" />
                </div>
                <Slider value={[goal.progress]} max={100} step={5} onValueChange={([value]) => onProgressChange(goal.id, value)} className="mt-1" aria-label={`Update progress for ${goal.title}`} />
              </>
            ) : onConvert ? (
              <Button variant="outline" size="sm" onClick={() => onConvert(goal.id)} className="gap-1 self-start">
                Convert to Goal <ArrowRight className="h-3 w-3" />
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
