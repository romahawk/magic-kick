import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  type DocumentData,
} from "firebase/firestore"
import { db } from "@/lib/firebase/client"
import type { Profile } from "@/lib/types"
import type { CollectionEntityMap, EntityCollection, RemoteSnapshot } from "@/lib/db/types"
import { ENTITY_COLLECTIONS } from "@/lib/db/types"

const PROFILE_DOC_ID = "profile"
const META_DOC_ID = "state"

function requireDb() {
  if (!db) {
    throw new Error("Firebase Firestore is not initialized. Check Firebase environment variables.")
  }
  return db
}

function userRoot(uid: string) {
  return doc(requireDb(), "users", uid)
}

function profileRef(uid: string) {
  return doc(userRoot(uid), "profile", PROFILE_DOC_ID)
}

function metaRef(uid: string) {
  return doc(userRoot(uid), "meta", META_DOC_ID)
}

function entityCollectionRef(uid: string, collectionName: EntityCollection) {
  return collection(userRoot(uid), collectionName)
}

function normalizeTimestamp(input: unknown): number | undefined {
  if (!input) return undefined
  if (typeof input === "number") return input
  if (input instanceof Timestamp) return input.toMillis()
  if (typeof input === "object" && input !== null && "toMillis" in input && typeof (input as { toMillis?: unknown }).toMillis === "function") {
    return ((input as { toMillis: () => number }).toMillis)()
  }
  return undefined
}

function hydrateDoc<T extends DocumentData>(data: T): T {
  return {
    ...data,
    createdAt: normalizeTimestamp(data.createdAt),
    updatedAt: normalizeTimestamp(data.updatedAt),
  }
}

export async function pullUserSnapshot(uid: string, since: number | null): Promise<RemoteSnapshot> {
  const profileSnap = await getDoc(profileRef(uid))
  const profile = profileSnap.exists() ? (hydrateDoc(profileSnap.data()) as Profile) : null

  let cursor = since ?? 0
  const entities = {
    tasks: [] as CollectionEntityMap["tasks"][],
    goals: [] as CollectionEntityMap["goals"][],
    projects: [] as CollectionEntityMap["projects"][],
    achievements: [] as CollectionEntityMap["achievements"][],
    schedule: [] as CollectionEntityMap["schedule"][],
    weeklyPlans: [] as CollectionEntityMap["weeklyPlans"][],
    timeBlocks: [] as CollectionEntityMap["timeBlocks"][],
    executionLogs: [] as CollectionEntityMap["executionLogs"][],
    weeklyReviews: [] as CollectionEntityMap["weeklyReviews"][],
    resources: [] as CollectionEntityMap["resources"][],
    journal: [] as CollectionEntityMap["journal"][],
  }

  for (const name of ENTITY_COLLECTIONS) {
    const base = entityCollectionRef(uid, name)
    const q = since
      ? query(base, where("updatedAt", ">", Timestamp.fromMillis(since)), orderBy("updatedAt"), limit(500))
      : query(base, orderBy("updatedAt"), limit(500))
    const snap = await getDocs(q)
    snap.forEach((docItem) => {
      const data = hydrateDoc(docItem.data()) as CollectionEntityMap[typeof name]
      if (name === "tasks") entities.tasks.push(data as CollectionEntityMap["tasks"])
      if (name === "goals") entities.goals.push(data as CollectionEntityMap["goals"])
      if (name === "projects") entities.projects.push(data as CollectionEntityMap["projects"])
      if (name === "achievements") entities.achievements.push(data as CollectionEntityMap["achievements"])
      if (name === "schedule") entities.schedule.push(data as CollectionEntityMap["schedule"])
      if (name === "weeklyPlans") entities.weeklyPlans.push(data as CollectionEntityMap["weeklyPlans"])
      if (name === "timeBlocks") entities.timeBlocks.push(data as CollectionEntityMap["timeBlocks"])
      if (name === "executionLogs") entities.executionLogs.push(data as CollectionEntityMap["executionLogs"])
      if (name === "weeklyReviews") entities.weeklyReviews.push(data as CollectionEntityMap["weeklyReviews"])
      if (name === "resources") entities.resources.push(data as CollectionEntityMap["resources"])
      if (name === "journal") entities.journal.push(data as CollectionEntityMap["journal"])
      if (typeof data.updatedAt === "number" && data.updatedAt > cursor) {
        cursor = data.updatedAt
      }
    })
  }

  return {
    profile,
    entities,
    cursor,
  }
}

export interface PendingWrite {
  collection: EntityCollection | "profile"
  id: string
  data: Record<string, unknown>
}

export async function pushPendingWrites(uid: string, writes: PendingWrite[]) {
  if (writes.length === 0) return
  const batch = writeBatch(requireDb())

  for (const write of writes) {
    if (write.collection === "profile") {
      batch.set(
        profileRef(uid),
        {
          ...write.data,
          updatedAt: serverTimestamp(),
          createdAt: write.data.createdAt ?? serverTimestamp(),
        },
        { merge: true }
      )
      continue
    }
    const ref = doc(entityCollectionRef(uid, write.collection), write.id)
    batch.set(
      ref,
      {
        ...write.data,
        updatedAt: serverTimestamp(),
        createdAt: write.data.createdAt ?? serverTimestamp(),
      },
      { merge: true }
    )
  }

  await batch.commit()
}

export async function updateRemoteSyncMeta(uid: string, payload: Record<string, unknown>) {
  await setDoc(
    metaRef(uid),
    {
      ...payload,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}
