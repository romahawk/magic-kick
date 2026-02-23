"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useRequireAuth } from "@/hooks/use-require-auth"
import { useAppStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Goal } from "@/lib/types"

export default function OnboardingPage() {
  const router = useRouter()
  const { user, loading } = useRequireAuth()
  const profile = useAppStore((s) => s.profile)
  const completeOnboarding = useAppStore((s) => s.completeOnboarding)
  const addGoal = useAppStore((s) => s.addGoal)
  const addTask = useAppStore((s) => s.addTask)

  const [name, setName] = useState(profile.name === "New Player" ? "" : profile.name)
  const [firstGoal, setFirstGoal] = useState("")
  const [firstGoalHorizon, setFirstGoalHorizon] = useState<Goal["horizon"]>("mid")
  const [firstGoalStatus, setFirstGoalStatus] = useState<Goal["status"]>("active")
  const [firstTask, setFirstTask] = useState("")

  useEffect(() => {
    if (!loading && user && profile.onboardingCompleted) {
      router.replace("/")
    }
  }, [loading, profile.onboardingCompleted, router, user])

  if (loading || !user) {
    return <main className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">Loading...</main>
  }

  function handleContinue(event: React.FormEvent) {
    event.preventDefault()
    completeOnboarding(name)

    if (firstGoal.trim()) {
      addGoal({
        title: firstGoal.trim(),
        horizon: firstGoalHorizon,
        category: "General",
        priority: "medium",
        notes: "",
        status: firstGoalStatus,
        progress: 0,
      })
    }

    if (firstTask.trim()) {
      addTask({
        title: firstTask.trim(),
        category: "Learning",
        completed: false,
      })
    }

    router.replace("/")
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Welcome to Magic Kick</CardTitle>
          <CardDescription>Let&apos;s personalize your workspace before you start.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleContinue} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Display name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="How should we call you?" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal">First goal (optional)</Label>
              <Input id="goal" value={firstGoal} onChange={(e) => setFirstGoal(e.target.value)} placeholder="Example: Build my portfolio app" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Goal horizon</Label>
                <Select value={firstGoalHorizon} onValueChange={(v) => setFirstGoalHorizon(v as Goal["horizon"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mid">Mid-term</SelectItem>
                    <SelectItem value="long">Long-term</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Goal type</Label>
                <Select value={firstGoalStatus} onValueChange={(v) => setFirstGoalStatus(v as Goal["status"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active goal</SelectItem>
                    <SelectItem value="wishlist">Wishlist</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task">First task (optional)</Label>
              <Input id="task" value={firstTask} onChange={(e) => setFirstTask(e.target.value)} placeholder="Example: Create project repository" />
            </div>
            <p className="text-xs text-muted-foreground">
              Achievements are initialized during onboarding and unlock automatically as you add/complete work.
            </p>
            <Button type="submit" className="w-full">
              Continue
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
