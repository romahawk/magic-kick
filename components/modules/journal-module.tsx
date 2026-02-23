"use client"

import { useState } from "react"
import { useAppStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { format, parseISO, isToday } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookHeart, Plus, Smile, Flame, Calendar } from "lucide-react"

const MOOD_LABELS = ["", "Rough", "Meh", "Okay", "Good", "Amazing"]
const MOOD_COLORS = ["", "text-destructive", "text-chart-4", "text-muted-foreground", "text-chart-2", "text-primary"]

export function JournalModule() {
  const allJournal = useAppStore((s) => s.journal)
  const profile = useAppStore((s) => s.profile)
  const addJournalEntry = useAppStore((s) => s.addJournalEntry)
  const journal = allJournal.filter((j) => !j.deleted)
  const [open, setOpen] = useState(false)

  const [entryType, setEntryType] = useState<"daily" | "weekly">("daily")
  const [mood, setMood] = useState(3)
  const [highlights, setHighlights] = useState("")
  const [challenges, setChallenges] = useState("")
  const [nextSteps, setNextSteps] = useState("")
  const [gratitude, setGratitude] = useState("")

  const dailyEntries = journal.filter((j) => j.type === "daily")
  const weeklyEntries = journal.filter((j) => j.type === "weekly")
  const todayEntry = journal.find((j) => isToday(parseISO(j.dateISO)) && j.type === "daily")

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
