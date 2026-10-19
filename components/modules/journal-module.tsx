"use client"

import { useEffect, useState } from "react"
import { useAppStore } from "@/lib/store"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"
import { CategoryBadge } from "@/components/category-badge"
import { CloseDayDialog } from "@/components/close-day-dialog"
import { endOfWeek, format, parseISO, isToday, startOfWeek } from "date-fns"
import { buildCurrentMonthRetrospective, buildCurrentWeekRetrospective, type RetrospectiveSummary } from "@/lib/retrospective"
import { selectClosedDayEntries, selectLegacyJournalEntries } from "@/lib/close-day"
import { DAILY_REVIEW_SECTIONS, type CloseDayOption, type DailyReviewState } from "@/lib/os-feed/daily-review"
import type { JournalEntry } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookHeart, Download, ExternalLink, MoonStar } from "lucide-react"

/**
 * P27: the Journal is the list of closed days. Close day writes each card when its commit to the OS
 * succeeds; the OS file stays the source of truth and each card links to it.
 */
export function JournalModule() {
  const { user } = useAuth()
  const allTasks = useAppStore((s) => s.tasks)
  const allGoals = useAppStore((s) => s.goals)
  const allProjects = useAppStore((s) => s.projects)
  const allJournal = useAppStore((s) => s.journal)
  const clearLegacy = useAppStore((s) => s.clearLegacyJournalEntries)
  const tasks = allTasks.filter((task) => !task.deleted)
  const goals = allGoals.filter((goal) => !goal.deleted)
  const projects = allProjects.filter((project) => !project.deleted)
  const [closingDay, setClosingDay] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [osDays, setOsDays] = useState<CloseDayOption[]>([])

  const closedDays = selectClosedDayEntries(allJournal)
  const legacyCount = selectLegacyJournalEntries(allJournal).length
  const weeklyRetrospective = buildCurrentWeekRetrospective(tasks, goals, projects)
  const monthlyRetrospective = buildCurrentMonthRetrospective(tasks, goals, projects)

  // Days closed in the OS before the Journal kept cards: listed as links, not imported. Refetched
  // when the dialog closes, so a day closed here is not listed twice.
  useEffect(() => {
    if (!user || closingDay) return
    let cancelled = false
    void (async () => {
      try {
        const token = await user.getIdToken()
        const response = await fetch("/api/os/daily-review", { headers: { Authorization: `Bearer ${token}` } })
        const state = (await response.json()) as DailyReviewState
        if (!cancelled) setOsDays(state.ok ? state.days : [])
      } catch {
        if (!cancelled) setOsDays([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user, closingDay])

  const cardDates = new Set(closedDays.map((entry) => entry.dateISO))
  const earlierDays = osDays.filter((day) => day.closed && day.url && !cardDates.has(day.date))

  function handleExportMarkdown() {
    const weekOf = format(new Date(), "yyyy-'W'II")
    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd")
    const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd")
    const thisWeek = closedDays.filter((entry) => entry.dateISO >= weekStart && entry.dateISO <= weekEnd)
    const blockers = thisWeek.map((entry) => entry.review?.blockers?.trim()).filter(Boolean)
    const lines = [
      `## Week of ${format(new Date(), "MMM d, yyyy")}`,
      "",
      "### Wins",
      weeklyRetrospective.completedTasks.slice(0, 5).map((t) => `- ${t.title}`).join("\n") || "- None logged yet",
      "",
      "### Friction",
      blockers.join("\n") || "_No blockers in this week's closed days_",
      "",
      "### Next Week",
      thisWeek[0]?.review?.carryForward?.trim() || "_Nothing carried forward_",
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight">Journal</h1>
          <p className="text-sm text-muted-foreground">Your closed days, as committed to the OS.</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setClosingDay(true)}>
          <MoonStar className="h-4 w-4" /> Close day
        </Button>
      </div>
      <CloseDayDialog open={closingDay} onOpenChange={setClosingDay} />

      {legacyCount > 0 ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm">
          <p className="min-w-0 flex-1 text-muted-foreground">
            {legacyCount === 1 ? "1 entry" : `${legacyCount} entries`} from the old journal {legacyCount === 1 ? "is" : "are"} hidden.
            Closed days replace them.
          </p>
          <Button variant="outline" size="sm" onClick={() => setConfirmClear(true)}>
            Clear old entries
          </Button>
        </div>
      ) : null}
      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear {legacyCount === 1 ? "1 old entry" : `${legacyCount} old entries`}?</AlertDialogTitle>
            <AlertDialogDescription>
              The manual entries (mood, highlights, challenges) are removed from the Journal on every device. They are
              marked deleted, not erased, so they can still be restored from the database. Closed days are not touched.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => clearLegacy()}>Clear old entries</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Tabs defaultValue="days">
        <TabsList>
          <TabsTrigger value="days">Closed days ({closedDays.length})</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
        </TabsList>

        <TabsContent value="days" className="mt-4 flex flex-col gap-3">
          {closedDays.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
                <BookHeart className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No closed days yet. Each day you close from the Command Center or here gets a card.
                </p>
              </CardContent>
            </Card>
          ) : (
            <ul className="flex flex-col gap-3" aria-label="Closed days">
              {closedDays.map((entry) => (
                <li key={entry.id}>
                  <ClosedDayCard entry={entry} />
                </li>
              ))}
            </ul>
          )}

          {earlierDays.length > 0 ? (
            <section aria-labelledby="journal-earlier" className="flex flex-col gap-1.5">
              <h2 id="journal-earlier" className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Closed before the Journal kept cards
              </h2>
              <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
                {earlierDays.map((day) => (
                  <li key={day.date} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                    <span>{format(parseISO(day.date), "EEE, MMM d")}</span>
                    <OsLink href={day.url!} label={`Open the review of ${format(parseISO(day.date), "MMMM d")} in the OS`} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </TabsContent>

        <TabsContent value="weekly" className="mt-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleExportMarkdown}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Export Markdown
            </Button>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <RetrospectiveCard title="This Week" summary={weeklyRetrospective} emptyLabel="No completed work yet this week." />
            <RetrospectiveCard title="This Month" summary={monthlyRetrospective} emptyLabel="No completed work yet this month." />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function OsLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className="inline-flex shrink-0 items-center gap-1 rounded-sm text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      Open in OS <ExternalLink className="h-3 w-3" aria-hidden />
    </a>
  )
}

function ClosedDayCard({ entry }: { entry: JournalEntry }) {
  const entryDate = parseISO(entry.dateISO)
  const isTodayEntry = isToday(entryDate)
  const sections = DAILY_REVIEW_SECTIONS.filter(({ key }) => entry.review?.[key]?.trim())

  return (
    <Card className={cn("gap-3 py-4", isTodayEntry && "ring-1 ring-primary/30")}>
      <CardHeader className="px-4">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <CardTitle className="text-sm">
            <h2>{isTodayEntry ? `Today, ${format(entryDate, "MMM d")}` : format(entryDate, "EEEE, MMM d")}</h2>
          </CardTitle>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {entry.doneCount ?? 0} done · {entry.openCount ?? 0} open
            </span>
            {entry.osUrl ? (
              <OsLink href={entry.osUrl} label={`Open the review of ${format(entryDate, "MMMM d")} in the OS`} />
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4">
        <dl className="grid gap-3 sm:grid-cols-2">
          {sections.map(({ key, label }) => (
            <div key={key} className={cn("min-w-0", (key === "completed" || key === "carryForward") && "sm:col-span-2")}>
              <dt className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</dt>
              <dd className="whitespace-pre-line break-words text-sm text-foreground">{entry.review?.[key]}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
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
                        <CategoryBadge category={task.category} className="text-[10px]" />
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
