"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useAppStore } from "@/lib/store"

export function useRequireAuth() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const isDemoMode = useAppStore((s) => s.isDemoMode)

  useEffect(() => {
    if (loading) return
    if (isDemoMode) return
    if (!user && pathname !== "/login" && pathname !== "/signup") {
      router.replace("/login")
    }
  }, [isDemoMode, loading, pathname, router, user])

  return { user, loading }
}
