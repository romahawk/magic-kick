import { getApps, initializeApp, cert, type App } from "firebase-admin/app"
import { getAuth, type Auth } from "firebase-admin/auth"

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n")

export const hasAdminConfig = Boolean(projectId && clientEmail && privateKey)

let adminInitError: string | null = null
let adminApp: App | null = null
let adminAuth: Auth | null = null

if (hasAdminConfig) {
  try {
    adminApp =
      getApps().find((a) => a.name === "admin") ??
      initializeApp({ credential: cert({ projectId: projectId!, clientEmail: clientEmail!, privateKey: privateKey! }) }, "admin")
    adminAuth = getAuth(adminApp)
  } catch (error) {
    adminInitError =
      error instanceof Error ? error.message : "Failed to initialize Firebase Admin"
  }
} else {
  adminInitError = "Firebase Admin environment variables are missing."
}

export { adminAuth, adminInitError }
