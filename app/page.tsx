"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { useRequireAuth } from "@/hooks/use-require-auth"
import { useAppStore } from "@/lib/store"

export default function Home() {
  const router = useRouter()
  const { user, loading } = useRequireAuth()
  const onboardingCompleted = useAppStore((s) => s.profile.onboardingCompleted)
  const isDemoMode = useAppStore((s) => s.isDemoMode)

  useEffect(() => {
    if (!loading && !isDemoMode && user && !onboardingCompleted) {
      router.replace("/onboarding")
    }
  }, [isDemoMode, loading, onboardingCompleted, router, user])

  if (loading || (!user && !isDemoMode)) {
    return <main className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">Loading...</main>
  }
  if (!onboardingCompleted && !isDemoMode) {
    return <main className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">Preparing onboarding...</main>
  }
  return <AppShell />
}
