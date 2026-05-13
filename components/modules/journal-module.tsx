"use client"

import { useState } from "react"
import { useAppStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { format, parseISO, isToday } from "date-fns"
import { buildCurrentMonthRetrospective, buildCurrentWeekRetrospective, type RetrospectiveSummary } from "@/lib/retrospective"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookHeart, Plus, Smile, Flame, Calendar, Sparkles, Download } from "lucide-react"
import { auth } from "@/lib/firebase/client"
import { isAiEnabled } from "@/lib/ai/flags"
import { analyzeRetroPatterns } from "@/lib/ai/patterns"
import { AiFallback } from "@/components/ai/AiErrorBoundary"

const MOOD_LABELS = ["", "Rough", "Meh", "Okay", "Good", "Amazing"]
const MOOD_COLORS = ["", "text-destructive", "text-chart-4", "text-muted-foreground", "text-chart-2", "text-primary"]

export function JournalModule() {
  const allTasks = useAppStore((s) => s.tasks)
  const allGoals = useAppStore((s) => s.goals)
  const allProjects = useAppStore((s) => s.projects)
  const allJournal = useAppStore((s) => s.journal)
  const profile = useAppStore((s) => s.profile)
  const addJournalEntry = useAppStore((s) => s.addJournalEntry)
  const tasks = allTasks.filter((task) => !task.deleted)
  const goals = allGoals.filter((goal) => !goal.deleted)
  const projects = allProjects.filter((project) => !project.deleted)
  const journal = allJournal.filter((j) => !j.deleted)
  const [open, setOpen] = useState(false)
  const [aiDraftLoading, setAiDraftLoading] = useState(false)
  const [aiDraftError, setAiDraftError] = useState(false)

  const [entryType, setEntryType] = useState<"daily" | "weekly">("daily")
  const [mood, setMood] = useState(3)
  const [highlights, setHighlights] = useState("")
  const [challenges, setChallenges] = useState("")
  const [nextSteps, setNextSteps] = useState("")
  const [gratitude, setGratitude] = useState("")

  const dailyEntries = journal.filter((j) => j.type === "daily")
  const weeklyEntries = journal.filter((j) => j.type === "weekly")
  const todayEntry = journal.find((j) => isToday(parseISO(j.dateISO)) && j.type === "daily")
  const weeklyRetrospective = buildCurrentWeekRetrospective(tasks, goals, projects)
  const monthlyRetrospective = buildCurrentMonthRetrospective(tasks, goals, projects)
  const retroPatterns = analyzeRetroPatterns(journal)

  function handleAiDraft() {
    setAiDraftLoading(true)
    setAiDraftError(false)
    const completedTasks = tasks.filter((t) => t.completed)
    auth?.currentUser?.getIdToken().then((token) => {
      fetch("/api/ai/retro-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ completedTasks, journalEntries: journal.slice(-5) }),
      })
        .then((r) => r.json())
        .then((res) => {
          if (res.ok) {
            const d = res.data
            if (!highlights && d.wins?.[0]) setHighlights(d.wins.join("\n"))
            if (!challenges && d.friction?.[0]) setChallenges(d.friction.join("\n"))
            if (!nextSteps && d.nextWeekIntentions?.[0]) setNextSteps(d.nextWeekIntentions.join("\n"))
            setOpen(true)
          } else {
            setAiDraftError(true)
          }
        })
        .catch(() => setAiDraftError(true))
        .finally(() => setAiDraftLoading(false))
    }).catch(() => { setAiDraftLoading(false); setAiDraftError(true) })
  }

  function handleExportMarkdown() {
    const weekOf = format(new Date(), "yyyy-'W'II")
    const patterns = retroPatterns
    const lines = [
      `## Week of ${format(new Date(), "MMM d, yyyy")}`,
      "",
      "### Wins",
      weeklyRetrospective.completedTasks.slice(0, 5).map((t) => `- ${t.title}`).join("\n") || "- None logged yet",
      "",
      "### Friction",
      weeklyEntries.slice(-1)[0]?.challenges || "_No weekly entry yet_",
      "",
      "### Next Week",
      weeklyEntries.slice(-1)[0]?.nextSteps || "_No next steps logged_",
      "",
      ...(patterns
        ? [
            "### AI Patterns",
            `**Momentum:** ${patterns.momentumWins.join(", ")}`,
            `**Friction themes:** ${patterns.frictionThemes.join(", ")}`,
            `**Trend:** ${patterns.trendDirection}`,
          ]
        : []),
    ].join("\n")

    navigator.clipboard.writeText(lines).catch(() => {
      const blob = new Blob([lines], { type: "text/markdown" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `retro-${weekOf}.md`
      a.click()
      URL.revokeObjectURL(url)
    })
  }

  function handleSubmit() {
    if (!highlights.trim()) return
    addJournalEntry({
      dateISO: format(new Date(), "yyyy-MM-dd"),
      type: entryType,
      mood,
      highlights,
      challenges,
      nextSteps,
      gratitude,
    })
    setHighlights("")
    setChallenges("")
    setNextSteps("")
    setGratitude("")
    setMood(3)
    setOpen(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight">Journal</h1>
          <p className="text-sm text-muted-foreground">Reflect, learn, and grow.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> New Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>New Journal Entry</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <div>
                <Label>Type</Label>
                <Select value={entryType} onValueChange={(v) => setEntryType(v as "daily" | "weekly")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily Reflection</SelectItem>
                    <SelectItem value="weekly">Weekly Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Mood</Label>
                <div className="mt-1 flex gap-2">
                  {[1, 2, 3, 4, 5].map((m) => (
                    <button
                      key={m}
                      onClick={() => setMood(m)}
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors",
                        mood === m
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-secondary text-secondary-foreground hover:border-primary/50"
                      )}
                      aria-label={`Mood: ${MOOD_LABELS[m]}`}
                    >
                      {m}
                    </button>
                  ))}
                  <span className="flex items-center text-xs text-muted-foreground">{MOOD_LABELS[mood]}</span>
                </div>
              </div>

              <div>
                <Label htmlFor="j-highlights">Highlights</Label>
                <Textarea id="j-highlights" value={highlights} onChange={(e) => setHighlights(e.target.value)} placeholder="What went well?" rows={2} />
              </div>
              <div>
                <Label htmlFor="j-challenges">Challenges</Label>
                <Textarea id="j-challenges" value={challenges} onChange={(e) => setChallenges(e.target.value)} placeholder="What was hard?" rows={2} />
              </div>
              <div>
                <Label htmlFor="j-next">Next Steps</Label>
                <Textarea id="j-next" value={nextSteps} onChange={(e) => setNextSteps(e.target.value)} placeholder="What will you do next?" rows={2} />
              </div>
              {entryType === "daily" && (
                <div>
                  <Label htmlFor="j-gratitude">Gratitude</Label>
                  <Input id="j-gratitude" value={gratitude} onChange={(e) => setGratitude(e.target.value)} placeholder="What are you grateful for?" />
                </div>
              )}
              <Button onClick={handleSubmit}>Save Entry</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Streak & today status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 rounded-full bg-streak/15 px-3 py-1.5 text-sm font-medium">
          <Flame className="h-4 w-4 text-streak" />
          <span className="text-foreground">{profile.streakDays} day streak</span>
        </div>
        {todayEntry ? (
          <Badge className="bg-primary text-primary-foreground">Today logged</Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">Not logged today</Badge>
        )}
      </div>

      <Tabs defaultValue="daily">
        <TabsList>
          <TabsTrigger value="daily">Daily ({dailyEntries.length})</TabsTrigger>
          <TabsTrigger value="weekly">Weekly ({weeklyEntries.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="mt-4 flex flex-col gap-3">
          {dailyEntries.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-8">
                <BookHeart className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No journal entries yet. Start writing!</p>
              </CardContent>
            </Card>
          ) : (
            dailyEntries.map((entry) => (
              <JournalCard key={entry.id} entry={entry} />
            ))
          )}
        </TabsContent>

        <TabsContent value="weekly" className="mt-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            {isAiEnabled() && (
              <Button variant="outline" size="sm" disabled={aiDraftLoading} onClick={handleAiDraft}>
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                {aiDraftLoading ? "Drafting…" : "AI Draft"}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleExportMarkdown}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Export Markdown
            </Button>
            {aiDraftError && <AiFallback />}
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <RetrospectiveCard title="This Week" summary={weeklyRetrospective} emptyLabel="No completed work yet this week." />
            <RetrospectiveCard title="This Month" summary={monthlyRetrospective} emptyLabel="No completed work yet this month." />
          </div>
          {weeklyEntries.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-8">
                <BookHeart className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No weekly reviews yet.</p>
              </CardContent>
            </Card>
          ) : (
            weeklyEntries.map((entry) => (
              <JournalCard key={entry.id} entry={entry} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function RetrospectiveCard({ title, summary, emptyLabel }: { title: string; summary: RetrospectiveSummary; emptyLabel: string }) {
  const totalCompleted =
    summary.completedTasks.length +
    summary.completedGoals.length +
    summary.completedMilestones.length

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">{title} Retrospective</CardTitle>
          <Badge variant="outline" className="text-[10px]">
            {totalCompleted} wins
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {totalCompleted === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="secondary">{summary.completedTasks.length} tasks</Badge>
              <Badge variant="secondary">{summary.completedMilestones.length} milestones</Badge>
              <Badge variant="secondary">{summary.completedGoals.length} goals</Badge>
            </div>
            <RetrospectiveGroup
              label="Tasks by life category"
              items={summary.tasksByCategory.map((item) => `${item.category} (${item.count})`)}
            />
            {summary.completedTasks.length > 0 ? (
              <div>
                <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-primary">Completed tasks</p>
                <div className="flex flex-col gap-1.5">
                  {summary.completedTasks.map((task) => (
                    <div key={task.id} className="rounded-md border border-border/60 bg-background/40 px-2 py-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 flex-1 text-sm text-foreground">{task.title}</p>
                        {task.completedAt ? (
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {format(parseISO(task.completedAt), "MMM d")}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <Badge variant="outline" className="text-[10px]">{task.category}</Badge>
                        {task.linkedProjectId ? (
                          <Badge variant="secondary" className="text-[10px]">
                            {summary.tasksByProject.find((item) => item.projectId === task.linkedProjectId)?.projectTitle ?? "Project"}
                          </Badge>
                        ) : null}
                        {task.estimateMin ? (
                          <Badge variant="outline" className="text-[10px]">
                            {task.estimateMin} min
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <RetrospectiveGroup
              label="Completed project work"
              items={[
                ...summary.tasksByProject.map((item) => `${item.projectTitle}: ${item.count} tasks`),
                ...summary.milestonesByProject.map((item) => `${item.projectTitle}: ${item.count} milestones`),
              ]}
            />
            <RetrospectiveGroup
              label="Achieved goals by category"
              items={summary.goalsByCategory.map((item) => `${item.category} (${item.count})`)}
            />
          </>
        )}
      </CardContent>
    </Card>
  )
}

function RetrospectiveGroup({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <div>
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-primary">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <Badge key={item} variant="outline" className="text-[10px]">
            {item}
          </Badge>
        ))}
      </div>
    </div>
  )
}

function JournalCard({ entry }: { entry: ReturnType<typeof useAppStore.getState>["journal"][number] }) {
  const entryDate = parseISO(entry.dateISO)
  const isTodayEntry = isToday(entryDate)

  return (
    <Card className={cn(isTodayEntry && "ring-1 ring-primary/30")}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            {isTodayEntry ? "Today" : format(entryDate, "EEE, MMM d")}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px] capitalize">{entry.type}</Badge>
            <span className={cn("flex items-center gap-1 text-xs font-medium", MOOD_COLORS[entry.mood])}>
              <Smile className="h-3 w-3" />
              {MOOD_LABELS[entry.mood]}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {entry.highlights && (
          <div>
            <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">Highlights</p>
            <p className="text-sm text-foreground">{entry.highlights}</p>
          </div>
        )}
        {entry.challenges && (
          <div>
            <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-chart-4">Challenges</p>
            <p className="text-sm text-foreground">{entry.challenges}</p>
          </div>
        )}
        {entry.nextSteps && (
          <div>
            <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-chart-2">Next Steps</p>
            <p className="text-sm text-foreground">{entry.nextSteps}</p>
          </div>
        )}
        {entry.gratitude && (
          <div>
            <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-streak">Gratitude</p>
            <p className="text-sm text-foreground">{entry.gratitude}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
