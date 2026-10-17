"use client"

import { useEffect, useState } from "react"
import { format, parseISO } from "date-fns"
import { Check } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { useAuth } from "@/hooks/use-auth"
import { localDateISO } from "@/lib/weekly-plan"
import {
  DAILY_REVIEW_FIELD_MAX,
  DAILY_REVIEW_SECTIONS,
  buildDailyReview,
  emptyDailyReviewFields,
  hasDailyReviewContent,
  selectCloseDayPrefill,
} from "@/lib/os-feed/daily-review"
import type { DailyReviewCommitResult, DailyReviewFields, DailyReviewState } from "@/lib/os-feed/daily-review"
import { Button } from "@/components/ui/button"
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

function dayLabel(dateISO: string) {
  return format(parseISO(dateISO), "EEE d")
}

/**
 * P11 Close day (ADR-032, ADR-033): a daily review for today or a missed day up to six days back,
 * written to AI-Business-OS as `06_REVIEWS/daily/<date>.md`. Text stays in this component; nothing is
 * written until "Commit to OS".
 */
export function CloseDayDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user } = useAuth()
  const tasks = useAppStore((s) => s.tasks)
  const [step, setStep] = useState<Step>("loading")
  const [state, setState] = useState<DailyReviewState | null>(null)
  const [date, setDate] = useState(localDateISO)
  const [fields, setFields] = useState<DailyReviewFields>(emptyDailyReviewFields)
  const [result, setResult] = useState<DailyReviewCommitResult | null>(null)

  const today = state?.date ?? localDateISO()
  const prefillFor = (dateISO: string) => selectCloseDayPrefill(tasks, dateISO, today, localDateISO)

  // Each open starts from the server's answer and today's tasks; earlier text is not kept.
  useEffect(() => {
    if (!open || !user) return
    let cancelled = false
    setStep("loading")
    setResult(null)
    void (async () => {
      try {
        const token = await user.getIdToken()
        const response = await fetch("/api/os/daily-review", { headers: { Authorization: `Bearer ${token}` } })
        const next = (await response.json()) as DailyReviewState
        if (cancelled) return
        const start = next.date ?? localDateISO()
        setState(next)
        setDate(start)
        setFields({ ...emptyDailyReviewFields(), ...selectCloseDayPrefill(tasks, start, start, localDateISO) })
        setStep(next.status === "ok" ? "edit" : "blocked")
      } catch {
        if (cancelled) return
        setState({ ok: false, status: "error", date: null, days: [] })
        setStep("blocked")
      }
    })()
    return () => {
      cancelled = true
    }
    // Prefill once per open, not on every task change while typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user])

  // Another day refills only the parts Magic Kick knows for that day; everything typed stays.
  function chooseDay(dateISO: string) {
    setDate(dateISO)
    setResult(null)
    setFields((current) => ({ ...current, ...prefillFor(dateISO) }))
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

  return (
    <Dialog open={open} onOpenChange={(next) => step !== "committing" && onOpenChange(next)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
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
          <div className="flex flex-col gap-3">
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
                    A missed day. Completed lists the tasks done on {dayLabel(date)}; Carry forward starts empty
                    because Magic Kick does not know that day&apos;s Daily Focus. The file will say it was written today.
                  </p>
                ) : null}
                {DAILY_REVIEW_SECTIONS.map(({ key, label }) => (
                  <div key={key} className="flex flex-col gap-1.5">
                    <Label htmlFor={`close-day-${key}`} className="text-xs">
                      {label}
                    </Label>
                    <Textarea
                      id={`close-day-${key}`}
                      value={fields[key]}
                      maxLength={DAILY_REVIEW_FIELD_MAX}
                      onChange={(e) => setFields((current) => ({ ...current, [key]: e.target.value }))}
                      placeholder={key === "decisions" ? "Decisions from that day's calls, one per line" : undefined}
                      className="min-h-16 text-sm"
                    />
                  </div>
                ))}
              </>
            )}
          </div>
        ) : null}

        {step === "review" || step === "committing" ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">This is the whole file. Nothing is written until you commit.</p>
            <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap rounded-md border bg-muted/40 p-3 text-xs">{preview}</pre>
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
            Committed to AI-Business-OS as <code className="font-mono text-xs">daily-close: {result.date}</code>.{" "}
            {result.commitUrl ? (
              <a href={result.commitUrl} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                View the commit
              </a>
            ) : null}
          </p>
        ) : null}

        <DialogFooter>
          {step === "edit" ? (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={() => setStep("review")} disabled={Boolean(selected?.closed) || !hasDailyReviewContent(fields)}>
                Review file
              </Button>
            </>
          ) : step === "review" || step === "committing" ? (
            <>
              <Button variant="ghost" onClick={() => setStep("edit")} disabled={step === "committing"}>
                Back
              </Button>
              <Button onClick={commit} disabled={step === "committing" || result?.status === "exists"}>
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
                  setDate(next.date)
                  setResult(null)
                  setFields({ ...emptyDailyReviewFields(), ...prefillFor(next.date) })
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
