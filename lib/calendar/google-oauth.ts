import { GoogleAuthProvider, signInWithPopup } from "firebase/auth"
import { auth } from "@/lib/firebase/client"

const GOOGLE_IDENTITY_SCRIPT_SRC = "https://accounts.google.com/gsi/client"

export const GOOGLE_CALENDAR_READONLY_SCOPE = "https://www.googleapis.com/auth/calendar.readonly"

interface GoogleTokenResponse {
  access_token?: string
  error?: string
  error_description?: string
}

interface GoogleTokenClient {
  requestAccessToken: (overrideConfig?: { prompt?: string; scope?: string; include_granted_scopes?: boolean }) => void
}

interface GoogleOAuth2 {
  initTokenClient: (config: {
    client_id: string
    scope: string
    include_granted_scopes?: boolean
    callback: (response: GoogleTokenResponse) => void
    error_callback?: (error: { type?: string; message?: string }) => void
  }) => GoogleTokenClient
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: GoogleOAuth2
      }
    }
  }
}

let googleIdentityScriptPromise: Promise<void> | null = null
let cachedCalendarAccessToken: { token: string; expiresAt: number } | null = null

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function buildFirebaseCalendarProvider() {
  const provider = new GoogleAuthProvider()
  provider.addScope(GOOGLE_CALENDAR_READONLY_SCOPE)
  provider.setCustomParameters({
    prompt: "consent",
    include_granted_scopes: "true",
  })
  return provider
}

async function requestFirebaseCalendarAccessToken() {
  if (!auth) throw new Error("Firebase Auth is not configured.")

  const result = await signInWithPopup(auth, buildFirebaseCalendarProvider())
  const credential = GoogleAuthProvider.credentialFromResult(result)
  if (!credential?.accessToken) {
    throw new Error("Firebase Google sign-in completed without a Calendar access token.")
  }

  cachedCalendarAccessToken = {
    token: credential.accessToken,
    expiresAt: Date.now() + 50 * 60 * 1000,
  }
  return credential.accessToken
}

function loadGoogleIdentityScript() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Calendar OAuth is only available in the browser."))
  }

  if (window.google?.accounts?.oauth2) return Promise.resolve()
  if (googleIdentityScriptPromise) return googleIdentityScriptPromise

  googleIdentityScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GOOGLE_IDENTITY_SCRIPT_SRC}"]`)
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true })
      existing.addEventListener("error", () => reject(new Error("Google Identity Services failed to load.")), {
        once: true,
      })
      return
    }

    const script = document.createElement("script")
    script.src = GOOGLE_IDENTITY_SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Google Identity Services failed to load."))
    document.head.appendChild(script)
  })

  return googleIdentityScriptPromise
}

async function requestGoogleIdentityCalendarAccessToken() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID?.trim()
  if (!clientId) {
    throw new Error("NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID is not configured.")
  }

  await loadGoogleIdentityScript()
  const oauth2 = window.google?.accounts?.oauth2
  if (!oauth2) throw new Error("Google Identity Services OAuth client is unavailable.")

  return new Promise<string>((resolve, reject) => {
    const tokenClient = oauth2.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_CALENDAR_READONLY_SCOPE,
      include_granted_scopes: true,
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error))
          return
        }
        if (!response.access_token) {
          reject(new Error("Google did not return a Calendar access token."))
          return
        }
        cachedCalendarAccessToken = {
          token: response.access_token,
          expiresAt: Date.now() + 50 * 60 * 1000,
        }
        resolve(response.access_token)
      },
      error_callback: (error) => {
        const type = error.type ? ` (${error.type})` : ""
        reject(new Error(error.message || `Google Calendar consent was not completed${type}.`))
      },
    })

    tokenClient.requestAccessToken({ prompt: "consent" })
  })
}

export async function requestGoogleCalendarAccessToken() {
  const errors: string[] = []

  try {
    return await requestFirebaseCalendarAccessToken()
  } catch (error) {
    errors.push(`Firebase provider: ${errorMessage(error)}`)
  }

  if (process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID?.trim()) {
    try {
      return await requestGoogleIdentityCalendarAccessToken()
    } catch (error) {
      errors.push(`Google Identity Services: ${errorMessage(error)}`)
    }
  }

  throw new Error(`Google Calendar authorization failed. ${errors.join(" ")}`)
}

export function getCachedGoogleCalendarAccessToken() {
  if (!cachedCalendarAccessToken) return null
  if (cachedCalendarAccessToken.expiresAt <= Date.now()) {
    cachedCalendarAccessToken = null
    return null
  }
  return cachedCalendarAccessToken.token
}
