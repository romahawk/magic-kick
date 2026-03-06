"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { onAuthStateChanged, type User } from "firebase/auth"
import { auth } from "@/lib/firebase/client"
import { useAppStore } from "@/lib/store"
import { useSync } from "@/hooks/use-sync"

interface AuthContextValue {
  user: User | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(Boolean(auth))
  const setCurrentUid = useAppStore((s) => s.setCurrentUid)

  useEffect(() => {
    if (!auth) {
      setCurrentUid(null)
      return
    }
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setCurrentUid(nextUser?.uid ?? null)
      setLoading(false)
    })
    return unsubscribe
  }, [setCurrentUid])

  useSync(user?.uid ?? null)

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
    }),
    [user, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  return useContext(AuthContext)
}
