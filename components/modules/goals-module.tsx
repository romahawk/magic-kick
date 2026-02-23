"use client"

import { useState } from "react"
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
import { cn } from "@/lib/utils"
import { Target, ArrowRight, Sparkles, Plus } from "lucide-react"
import type { Goal } from "@/lib/types"

const PRIORITY_STYLES = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-streak/10 text-foreground border-streak/20",
  low: "bg-muted text-muted-foreground border-muted",
}

export function GoalsModule() {
  const allGoals = useAppStore((s) => s.goals)
  const addGoal = useAppStore((s) => s.addGoal)
  const updateGoalProgress = useAppStore((s) => s.updateGoalProgress)
  const convertWishlistToGoal = useAppStore((s) => s.convertWishlistToGoal)
  const goals = allGoals.filter((g) => !g.deleted)

  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("General")
  const [notes, setNotes] = useState("")
  const [horizon, setHorizon] = useState<Goal["horizon"]>("mid")
  const [status, setStatus] = useState<Goal["status"]>("active")
  const [priority, setPriority] = useState<Goal["priority"]>("medium")
  const [targetDate, setTargetDate] = useState("")

  const midTermGoals = goals.filter((g) => g.horizon === "mid" && g.status === "active")
  const longTermGoals = goals.filter((g) => g.horizon === "long" && g.status === "active")
  const wishlist = goals.filter((g) => g.status === "wishlist")

  function createGoal() {
    if (!title.trim()) return
    addGoal({
      title: title.trim(),
      horizon,
      category: category.trim() || "General",
      targetDate: targetDate || undefined,
      priority,
      notes: notes.trim(),
      status,
      progress: 0,
    })
    setTitle("")
    setCategory("General")
    setNotes("")
    setHorizon("mid")
    setStatus("active")
    setPriority("medium")
    setTargetDate("")
    setOpen(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight">Goals</h1>
          <p className="text-sm text-muted-foreground">Stay focused on what matters most.</p>
        </div>
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
                <Label htmlFor="goal-category">Category</Label>
                <Input id="goal-category" value={category} onChange={(e) => setCategory(e.target.value)} />
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

      <Tabs defaultValue="mid">
        <TabsList>
          <TabsTrigger value="mid">Mid-term ({midTermGoals.length})</TabsTrigger>
          <TabsTrigger value="long">Long-term ({longTermGoals.length})</TabsTrigger>
          <TabsTrigger value="wishlist">Wishlist ({wishlist.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="mid" className="mt-4">
          <GoalList goals={midTermGoals} onProgressChange={updateGoalProgress} />
        </TabsContent>

        <TabsContent value="long" className="mt-4">
          <GoalList goals={longTermGoals} onProgressChange={updateGoalProgress} />
        </TabsContent>

        <TabsContent value="wishlist" className="mt-4">
          {wishlist.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-8">
                <Sparkles className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No wishlist items yet. Use "Add Goal / Wishlist".</p>
              </CardContent>
            </Card>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {wishlist.map((goal) => (
              <Card key={goal.id}>
                <CardContent className="p-4">
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <p className="font-medium">{goal.title}</p>
                      <p className="text-xs text-muted-foreground">{goal.notes}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{goal.category}</Badge>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => convertWishlistToGoal(goal.id)} className="gap-1">
                    Convert to Goal <ArrowRight className="h-3 w-3" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function GoalList({
  goals,
  onProgressChange,
}: {
  goals: ReturnType<typeof useAppStore.getState>["goals"]
  onProgressChange: (id: string, progress: number) => void
}) {
  if (goals.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-8">
          <Target className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No goals yet. Add one to get started!</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {goals.map((goal) => (
        <Card key={goal.id}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <CardTitle className="text-base">{goal.title}</CardTitle>
              <Badge variant="outline" className={cn("text-[10px]", PRIORITY_STYLES[goal.priority])}>
                {goal.priority}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">{goal.notes}</p>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px]">{goal.category}</Badge>
              {goal.targetDate && <span className="text-[10px] text-muted-foreground">Target: {goal.targetDate}</span>}
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{goal.progress}%</span>
              </div>
              <Progress value={goal.progress} className="h-2 [&>div]:bg-primary" />
            </div>
            <Slider value={[goal.progress]} max={100} step={5} onValueChange={([v]) => onProgressChange(goal.id, v)} className="mt-1" aria-label={`Update progress for ${goal.title}`} />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
