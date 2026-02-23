"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase/client"

export default function LogoutPage() {
  const router = useRouter()

  useEffect(() => {
    if (!auth) {
      router.replace("/login")
      return
    }
    void signOut(auth).finally(() => {
      router.replace("/login")
    })
  }, [router])

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4">
      <p className="text-sm text-muted-foreground">Signing out...</p>
    </main>
  )
}
