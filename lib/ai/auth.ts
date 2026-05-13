import { type NextRequest } from "next/server"
import { adminAuth } from "@/lib/firebase/admin"

export async function verifyFirebaseToken(req: NextRequest): Promise<string | null> {
  const header = req.headers.get("authorization") ?? ""
  const token = header.startsWith("Bearer ") ? header.slice(7) : null
  if (!token || !adminAuth) return null
  try {
    const decoded = await adminAuth.verifyIdToken(token)
    return decoded.uid
  } catch {
    return null
  }
}
