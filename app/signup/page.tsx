"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth"
import { auth, firebaseInitError } from "@/lib/firebase/client"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function SignupPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && user) {
      router.replace("/")
    }
  }, [loading, router, user])

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!auth) {
      setError(firebaseInitError ?? "Firebase Auth is not configured.")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password)
      if (name.trim()) {
        await updateProfile(credential.user, { displayName: name.trim() })
      }
      router.replace("/")
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Signup failed")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create account</CardTitle>
          <CardDescription>Use email/password to unlock cross-device sync.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {!auth && firebaseInitError ? <p className="text-sm text-destructive">{firebaseInitError}</p> : null}
            <Button type="submit" className="w-full" disabled={submitting || !auth}>
              {submitting ? "Creating account..." : "Create account"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link className="text-primary underline-offset-4 hover:underline" href="/login">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
