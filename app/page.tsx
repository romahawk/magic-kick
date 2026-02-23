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

  useEffect(() => {
    if (!loading && user && !onboardingCompleted) {
      router.replace("/onboarding")
    }
  }, [loading, onboardingCompleted, router, user])

  if (loading || !user) {
    return <main className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">Loading...</main>
  }
  if (!onboardingCompleted) {
    return <main className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">Preparing onboarding...</main>
  }
  return <AppShell />
}
