import { pullUserSnapshot } from "@/lib/db/firestore"

export async function pullRemote(uid: string, lastPulledAt: number | null) {
  return pullUserSnapshot(uid, lastPulledAt)
}
