"use client"

import { useEffect, useRef, useState } from "react"
import { format, parseISO } from "date-fns"
import { Check, ChevronDown, Plus, X } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { useAuth } from "@/hooks/use-auth"
import { localDateISO, selectDayAgenda, selectTaskTimeSlots } from "@/lib/weekly-plan"
import {
  DAILY_REVIEW_FIELD_MAX,
  DAILY_REVIEW_SECTIONS,
  berlinDateISO,
  buildDailyReview,
  closeDayDates,
  emptyDailyReviewFields,
  hasDailyReviewContent,
} from "@/lib/os-feed/daily-review"
import type { DailyReviewCommitResult, DailyReviewFields, DailyReviewKey, DailyReviewState } from "@/lib/os-feed/daily-review"
import {
  CLOSE_DAY_CHIP_FIELD,
  CLOSE_DAY_CHIP_MAX,
  CLOSE_DAY_MORE_KEYS,
  addReason,
  buildCloseDayChecklist,
  closeDayChipsFor,
  closeDayJournalEntry,
  composeCloseDayFields,
  findDailyFocusSnapshot,
  insertChip,
} from "@/lib/close-day"
import type { CloseDayItem } from "@/lib/close-day"
import type { CloseDayChipSection } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Kbd } from "@/components/ui/kbd"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

type Step = "loading" | "edit" | "review" | "committing" | "done" | "blocked"

const BLOCKED_TEXT: Record<string, string> = {
  "not-configured": "Close day is not set up: the OS write token or the writer is missing on the server.",
  forbidden: "Only Roman's account can write to AI-Business-OS.",
  "no-access": "The OS write token cannot see AI-Business-OS. Check its repository access on GitHub.",
  error: "GitHub could not be reached. Nothing was written; try again later.",
}

const SOURCE_LABEL: Record<CloseDayItem["source"], string> = { focus: "Focus", block: "Block", done: "Done" }

const PLACEHOLDER: Partial<Record<DailyReviewKey, string>> = {
  completed: "Anything else you finished, one per line",
  blockers: "What got in the way",
  decisions: "Decisions from the day's calls, one per line",
  carryForward: "Anything else to pick up next",
  learning: "What you would keep or change",
}

const LABEL = Object.fromEntries(DAILY_REVIEW_SECTIONS.map((section) => [section.key, section.label])) as Record<DailyReviewKey, string>

function dayLabel(dateISO: string) {
  return format(parseISO(dateISO), "EEE d")
}

/** Demo mode has no server: every day in the window is open and nothing can be committed. */
function demoState(): DailyReviewState {
  const date = berlinDateISO()
  return { ok: true, status: "ok", date, days: closeDayDates(date).map((day) => ({ date: day, closed: false, url: null })) }
}

/**
 * P11 Close day (ADR-032, ADR-033, ADR-034): a daily review for today or a missed day up to six
 * days back, written to AI-Business-OS as `06_REVIEWS/daily/<date>.md`. The day's plan comes in as
 * ticks; ticked lines go to Completed, the rest to Carry forward. Ticks shape only the text: no
 * task changes. Nothing is written until "Commit to OS".
 */
export function CloseDayDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user } = useAuth()
  const isDemoMode = useAppStore((s) => s.isDemoMode)
  const tasks = useAppStore((s) => s.tasks)
  const timeBlocks = useAppStore((s) => s.timeBlocks)
  const scheduleItems = useAppStore((s) => s.schedule)
  const snapshots = useAppStore((s) => s.profile.dailyFocusSnapshots)
  const saveJournalEntry = useAppStore((s) => s.saveCloseDayJournalEntry)
  const [step, setStep] = useState<Step>("loading")
  const [state, setState] = useState<DailyReviewState | null>(null)
  const [date, setDate] = useState(localDateISO)
  const [extras, setExtras] = useState<DailyReviewFields>(emptyDailyReviewFields)
  const [ticks, setTicks] = useState<Record<string, boolean>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [showMore, setShowMore] = useState(false)
  const [result, setResult] = useState<DailyReviewCommitResult | null>(null)
  const fieldRefs = useRef<Partial<Record<DailyReviewKey, HTMLTextAreaElement | null>>>({})
  const demo = !user && isDemoMode

  const today = state?.date ?? localDateISO()

  // Each open starts from the server's answer; earlier text is not kept.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    const start = (next: DailyReviewState) => {
      setState(next)
      setDate(next.date ?? localDateISO())
      setExtras(emptyDailyReviewFields())
      setTicks({})
      setNotes({})
      setShowMore(false)
      setStep(next.status === "ok" ? "edit" : "blocked")
    }
    // Signed out and not in demo mode, the form stays on "loading", which asks to sign in.
    if (!user && !demo) return
    void (async () => {
      setStep("loading")
      setResult(null)
      try {
        let next = demoState()
        if (user) {
          const token = await user.getIdToken()
          const response = await fetch("/api/os/daily-review", { headers: { Authorization: `Bearer ${token}` } })
          next = (await response.json()) as DailyReviewState
        }
        if (!cancelled) start(next)
      } catch {
        if (cancelled) return
        setState({ ok: false, status: "error", date: null, days: [] })
        setStep("blocked")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, user, demo])

  const agenda = selectDayAgenda({
    timeBlocks,
    tasks,
    taskTimeSlots: selectTaskTimeSlots(scheduleItems, timeBlocks),
    dateISO: date,
  })
  const checklist = buildCloseDayChecklist({
    tasks,
    dateISO: date,
    todayISO: today,
    toLocalDateISO: localDateISO,
    agenda,
    snapshot: findDailyFocusSnapshot(snapshots, date),
  })
  // Ticks and notes are kept per day, so moving between days loses nothing. An item not ticked or
  // unticked yet keeps its starting state: done items ticked.
  const dayKey = (key: string) => `${date}|${key}`
  const effectiveTicks = Object.fromEntries(checklist.items.map((item) => [item.key, ticks[dayKey(item.key)] ?? item.done]))
  const dayNotes = Object.fromEntries(checklist.items.map((item) => [item.key, notes[dayKey(item.key)] ?? ""]))
  const fields = composeCloseDayFields(extras, checklist.items, effectiveTicks, dayNotes)
  const doneCount = checklist.items.filter((item) => effectiveTicks[item.key]).length

  // Each day keeps its own ticks and notes; text typed in the sections stays.
  function chooseDay(dateISO: string) {
    setDate(dateISO)
    setResult(null)
  }

  function setExtra(key: DailyReviewKey, value: string) {
    setExtras((current) => ({ ...current, [key]: value }))
  }

  function pickChip(key: DailyReviewKey, chip: string) {
    const next = insertChip(extras[key], chip)
    setExtra(key, next)
    // Back to the text, caret at the end, so a starter like "Decided to " can be finished by typing.
    requestAnimationFrame(() => {
      const field = fieldRefs.current[key]
      field?.focus()
      field?.setSelectionRange(next.length, next.length)
    })
  }

  async function commit() {
    if (!user) return
    setStep("committing")
    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/os/daily-review", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ date, fields }),
      })
      const next = (await response.json()) as DailyReviewCommitResult
      setResult(next)
      if (next.ok) {
        // The Journal keeps a card of what was committed, linked to the OS file (P27).
        saveJournalEntry(
          closeDayJournalEntry({
            dateISO: date,
            fields,
            doneCount,
            openCount: checklist.items.length - doneCount,
            osUrl: next.url,
            commitUrl: next.commitUrl,
          }),
        )
        // Mark the day closed, so closing another missed day next starts from the right picture.
        setState((current) =>
          current && { ...current, days: current.days.map((day) => (day.date === date ? { ...day, closed: true, url: next.url } : day)) },
        )
      }
      setStep(next.ok ? "done" : "review")
    } catch {
      setResult({ ok: false, status: "error", date, url: null, commitUrl: null, error: "GitHub could not be reached." })
      setStep("review")
    }
  }

  const days = [...(state?.days ?? [])].reverse()
  const selected = state?.days.find((day) => day.date === date)
  const isPast = date !== today
  const preview = buildDailyReview(date, fields, today)
  const canReview = !selected?.closed && hasDailyReviewContent(fields)
  const canCommit = !demo && result?.status !== "exists"
  const moreFilled = CLOSE_DAY_MORE_KEYS.filter((key) => extras[key].trim()).length

  // Ctrl/Cmd+Enter moves on: from the form to the file, from the file to the commit.
  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key !== "Enter" || !(event.metaKey || event.ctrlKey)) return
    if (step === "edit" && canReview) {
      event.preventDefault()
      setStep("review")
    } else if (step === "review" && canCommit) {
      event.preventDefault()
      void commit()
    }
  }

  const sectionField = (key: DailyReviewKey, chips?: Exclude<CloseDayChipSection, "reasons">, hint?: string) => (
    <div key={key} className="flex flex-col gap-1.5">
      <Label htmlFor={`close-day-${key}`} className="text-xs">
        {LABEL[key]}
      </Label>
      {chips ? <ChipRow section={chips} onPick={(chip) => pickChip(CLOSE_DAY_CHIP_FIELD[chips], chip)} /> : null}
      <Textarea
        id={`close-day-${key}`}
        ref={(element) => {
          fieldRefs.current[key] = element
        }}
        value={extras[key]}
        maxLength={DAILY_REVIEW_FIELD_MAX}
        onChange={(e) => setExtra(key, e.target.value)}
        placeholder={PLACEHOLDER[key]}
        className="min-h-14 text-sm"
      />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={(next) => step !== "committing" && onOpenChange(next)}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
        onKeyDown={onKeyDown}
        // Escape in the "Save chip" field cancels the chip, not the whole form.
        onEscapeKeyDown={(event) => {
          if (event.target instanceof HTMLElement && event.target.dataset.chipInput) event.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>Close day</DialogTitle>
          <DialogDescription>
            {isPast ? "Review for a missed day" : "Today's review"} for AI-Business-OS:{" "}
            <code className="font-mono text-xs">06_REVIEWS/daily/{date}.md</code>
          </DialogDescription>
        </DialogHeader>

        {step === "loading" ? (
          <p className="text-sm text-muted-foreground">
            {user ? "Checking AI-Business-OS…" : "Sign in to close the day; demo mode cannot write to AI-Business-OS."}
          </p>
        ) : null}

        {step === "blocked" && state ? (
          <p className="text-sm text-muted-foreground">{BLOCKED_TEXT[state.status] ?? BLOCKED_TEXT.error}</p>
        ) : null}

        {step === "edit" ? (
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Day</Label>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Day to close">
                {days.map((day) => (
                  <button
                    key={day.date}
                    type="button"
                    role="radio"
                    aria-checked={day.date === date}
                    onClick={() => chooseDay(day.date)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs",
                      day.date === date
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-foreground hover:bg-muted",
                    )}
                  >
                    {day.date === today ? "Today" : dayLabel(day.date)}
                    {day.closed ? <Check className="h-3 w-3" aria-label="closed" /> : null}
                  </button>
                ))}
              </div>
            </div>

            {selected?.closed ? (
              <p className="text-sm">
                {isPast ? dayLabel(date) : "Today"} is already closed.{" "}
                {selected.url ? (
                  <a href={selected.url} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                    Open {date}.md on GitHub
                  </a>
                ) : null}{" "}
                Close day does not overwrite it.
              </p>
            ) : (
              <>
                {isPast ? (
                  <p className="text-xs text-muted-foreground">
                    {checklist.plan === "snapshot"
                      ? `A missed day. The list is ${dayLabel(date)}'s Daily Focus as Magic Kick saved it. `
                      : `A missed day. No Daily Focus was saved for ${dayLabel(date)}, so only the tasks done that day are listed and Carry forward starts empty. `}
                    The file will say it was written today.
                  </p>
                ) : null}

                <fieldset className="flex flex-col gap-2 rounded-lg border border-border p-3">
                  <legend className="flex items-baseline gap-2 px-1 text-xs font-medium">
                    {isPast ? "That day's plan" : "Today's plan"}
                    {checklist.items.length > 0 ? (
                      <span className="font-normal text-muted-foreground">
                        {doneCount} of {checklist.items.length} done
                      </span>
                    ) : null}
                  </legend>
                  {checklist.items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nothing was planned or done in Magic Kick for this day. Add what you did below.
                    </p>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground">
                        Ticked lines go to Completed, the rest to Carry forward. Your tasks do not change.
                      </p>
                      <ul className="flex flex-col divide-y divide-border">
                        {checklist.items.map((item) => (
                          <ChecklistRow
                            key={item.key}
                            item={item}
                            ticked={effectiveTicks[item.key]}
                            note={dayNotes[item.key]}
                            onTick={(ticked) => setTicks((current) => ({ ...current, [dayKey(item.key)]: ticked }))}
                            onNote={(note) => setNotes((current) => ({ ...current, [dayKey(item.key)]: note }))}
                          />
                        ))}
                      </ul>
                    </>
                  )}
                  {sectionField("completed")}
                </fieldset>

                {sectionField("blockers", "blockers")}
                {sectionField("decisions", "decisions")}
                {sectionField(
                  "carryForward",
                  undefined,
                  checklist.items.length > 0 ? "Unticked lines from the plan come first in the file." : undefined,
                )}

                <div className="flex flex-col gap-4">
                  <button
                    type="button"
                    aria-expanded={showMore}
                    aria-controls="close-day-more"
                    onClick={() => setShowMore((current) => !current)}
                    className="inline-flex w-fit items-center gap-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showMore && "rotate-180")} />
                    {showMore ? "Less" : "More"}: outcome, progress, learning, stop / avoid
                    {!showMore && moreFilled > 0 ? <span className="font-normal">({moreFilled} filled)</span> : null}
                  </button>
                  {showMore ? (
                    <div id="close-day-more" className="flex flex-col gap-4">
                      {sectionField("primaryOutcome")}
                      {sectionField("progress")}
                      {sectionField("learning", "learning")}
                      {sectionField("stopAvoid")}
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </div>
        ) : null}

        {step === "review" || step === "committing" ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">
              {demo
                ? "This is the whole file. Demo mode cannot write to AI-Business-OS; sign in to commit."
                : "This is the whole file. Nothing is written until you commit."}
            </p>
            <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap rounded-md border bg-muted/40 p-3 font-mono text-xs">{preview}</pre>
            {result && !result.ok ? (
              <p className="text-sm text-destructive">
                {result.error ?? "The commit failed."}{" "}
                {result.url ? (
                  <a href={result.url} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                    Open the existing file
                  </a>
                ) : null}
              </p>
            ) : null}
          </div>
        ) : null}

        {step === "done" && result ? (
          <p className="text-sm">
            Committed to AI-Business-OS as <code className="font-mono text-xs">daily-close: {result.date}</code>, and saved
            to the Journal.{" "}
            {result.commitUrl ? (
              <a href={result.commitUrl} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                View the commit
              </a>
            ) : null}
          </p>
        ) : null}

        <DialogFooter className="items-center">
          {step === "edit" || step === "review" ? (
            <span className="mr-auto hidden text-xs text-muted-foreground sm:inline-flex sm:items-center sm:gap-1">
              <Kbd>Ctrl</Kbd>
              <Kbd>Enter</Kbd>
              {step === "edit" ? "to review" : demo ? "" : "to commit"}
            </span>
          ) : null}
          {step === "edit" ? (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={() => setStep("review")} disabled={!canReview}>
                Review file
              </Button>
            </>
          ) : step === "review" || step === "committing" ? (
            <>
              <Button variant="ghost" onClick={() => setStep("edit")} disabled={step === "committing"}>
                Back
              </Button>
              <Button onClick={commit} disabled={step === "committing" || !canCommit}>
                {step === "committing" ? "Committing…" : "Commit to OS"}
              </Button>
            </>
          ) : step === "done" && state?.days.some((day) => !day.closed) ? (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  // A fresh form for the newest day still open; the text just committed is not reused.
                  const next = state.days.find((day) => !day.closed)
                  if (!next) return
                  chooseDay(next.date)
                  setExtras(emptyDailyReviewFields())
                  setTicks({})
                  setNotes({})
                  setStep("edit")
                }}
              >
                Close another day
              </Button>
            </>
          ) : (
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** One planned item: a tick, and for an unticked one a short reason with quick picks. */
function ChecklistRow({
  item,
  ticked,
  note,
  onTick,
  onNote,
}: {
  item: CloseDayItem
  ticked: boolean
  note: string
  onTick: (ticked: boolean) => void
  onNote: (note: string) => void
}) {
  const [noting, setNoting] = useState(false)
  const id = `close-day-item-${item.key}`
  return (
    <li className="flex flex-col gap-2 py-2 first:pt-0 last:pb-0">
      <div className="flex items-start gap-2.5">
        <Checkbox id={id} checked={ticked} onCheckedChange={(next) => onTick(next === true)} className="mt-0.5" />
        <label htmlFor={id} className={cn("min-w-0 flex-1 cursor-pointer text-sm leading-snug", ticked && "text-muted-foreground")}>
          {item.title}
        </label>
        <span className="shrink-0 text-[11px] text-muted-foreground">{ticked ? SOURCE_LABEL[item.source] : "Carry forward"}</span>
      </div>
      {ticked ? null : (
        <div className="flex flex-col gap-1.5 pl-6.5">
          <Input
            value={note}
            onChange={(e) => onNote(e.target.value)}
            onFocus={() => setNoting(true)}
            placeholder="Why it carries forward (optional)"
            aria-label={`Why ${item.title} carries forward`}
            maxLength={160}
            className="h-8 text-sm"
          />
          {noting || note ? <ChipRow section="reasons" onPick={(reason) => onNote(addReason(note, reason))} /> : null}
        </div>
      )}
    </li>
  )
}

/** Built-in chips, then Roman's saved ones (removable), then "Save chip". Saved chips sync with the profile. */
function ChipRow({ section, onPick }: { section: CloseDayChipSection; onPick: (chip: string) => void }) {
  const saved = useAppStore((s) => s.profile.closeDayChips)
  const addChip = useAppStore((s) => s.addCloseDayChip)
  const removeChip = useAppStore((s) => s.removeCloseDayChip)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState("")
  const { presets, custom } = closeDayChipsFor(section, saved)

  const chipClass =
    "inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-xs text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

  function save() {
    if (draft.trim()) addChip(section, draft)
    setDraft("")
    setAdding(false)
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={`Quick picks for ${section}`}>
      {presets.map((chip) => (
        <button key={chip} type="button" className={chipClass} onClick={() => onPick(chip)}>
          {/* A starter ("Decided to ", "Next time: ") reads as unfinished. */}
          {chip === chip.trimEnd() ? chip : `${chip.trim().replace(/:$/, "")}…`}
        </button>
      ))}
      {custom.map((chip) => (
        <span key={chip} className={cn(chipClass, "gap-0 p-0")}>
          <button type="button" className="rounded-l-full py-0.5 pl-2.5 pr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => onPick(chip)}>
            {chip}
          </button>
          <button
            type="button"
            className="rounded-r-full py-0.5 pl-0.5 pr-2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => removeChip(section, chip)}
            aria-label={`Remove saved chip ${chip}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      {adding ? (
        <Input
          autoFocus
          data-chip-input="true"
          value={draft}
          maxLength={CLOSE_DAY_CHIP_MAX}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              e.stopPropagation()
              save()
            } else if (e.key === "Escape") {
              e.preventDefault()
              e.stopPropagation()
              setDraft("")
              setAdding(false)
            }
          }}
          placeholder="New chip, Enter to save"
          aria-label="New chip"
          className="h-6 w-44 rounded-full px-2.5 text-xs"
        />
      ) : (
        <button
          type="button"
          className={cn(chipClass, "border-dashed text-muted-foreground")}
          onClick={() => setAdding(true)}
          aria-label="Save a chip of your own"
        >
          <Plus className="h-3 w-3" />
          Save chip
        </button>
      )}
    </div>
  )
}
