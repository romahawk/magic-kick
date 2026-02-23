"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"

export function useRequireAuth() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (loading) return
    if (!user && pathname !== "/login" && pathname !== "/signup") {
      router.replace("/login")
    }
  }, [loading, pathname, router, user])

  return { user, loading }
}
