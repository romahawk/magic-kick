"use client"

import { useEffect, useState } from "react"
import { useAppStore } from "@/lib/store"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus } from "lucide-react"
import type { TaskCategory } from "@/lib/types"

const DEFAULT_TASK_CATEGORIES = ["Learning", "Sport", "Family/Home", "Hobby", "Travel"]

export function QuickAddDialog() {
  const [open, setOpen] = useState(false)
  const addTask = useAppStore((s) => s.addTask)
  const addGoal = useAppStore((s) => s.addGoal)
  const addJournalEntry = useAppStore((s) => s.addJournalEntry)
  const taskCategories = useAppStore((s) => s.profile.taskCategories)
  const categories = taskCategories?.length ? taskCategories : DEFAULT_TASK_CATEGORIES

  const [taskTitle, setTaskTitle] = useState("")
  const [taskCategory, setTaskCategory] = useState<TaskCategory>("Learning")
  const [goalTitle, setGoalTitle] = useState("")
  const [journalHighlights, setJournalHighlights] = useState("")

  function handleAddTask() {
    if (!taskTitle.trim()) return
    addTask({ title: taskTitle, category: taskCategory, completed: false })
    setTaskTitle("")
    setOpen(false)
  }

  function handleAddGoal() {
    if (!goalTitle.trim()) return
    addGoal({ title: goalTitle, horizon: "mid", category: "General", priority: "medium", notes: "", status: "active", progress: 0 })
    setGoalTitle("")
    setOpen(false)
  }

  function handleAddJournal() {
    if (!journalHighlights.trim()) return
    addJournalEntry({ dateISO: format(new Date(), "yyyy-MM-dd"), type: "daily", mood: 3, highlights: journalHighlights, challenges: "", nextSteps: "", gratitude: "" })
    setJournalHighlights("")
    setOpen(false)
  }

  useEffect(() => {
    if (!categories.includes(taskCategory)) {
      setTaskCategory(categories[0] ?? "General")
    }
  }, [categories, taskCategory])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Quick Add</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Quick Add</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="task" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="task" className="flex-1">Task</TabsTrigger>
            <TabsTrigger value="goal" className="flex-1">Goal</TabsTrigger>
            <TabsTrigger value="journal" className="flex-1">Journal</TabsTrigger>
          </TabsList>

          <TabsContent value="task" className="mt-4 flex flex-col gap-3">
            <div>
              <Label htmlFor="task-title">Task title</Label>
              <Input id="task-title" placeholder="What needs to be done?" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddTask()} />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={taskCategory} onValueChange={(v) => setTaskCategory(v as TaskCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
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

          <TabsContent value="journal" className="mt-4 flex flex-col gap-3">
            <div>
              <Label htmlFor="journal-highlights">Today&apos;s highlights</Label>
              <Input id="journal-highlights" placeholder="What went well today?" value={journalHighlights} onChange={(e) => setJournalHighlights(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddJournal()} />
            </div>
            <Button onClick={handleAddJournal}>Add Entry</Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
