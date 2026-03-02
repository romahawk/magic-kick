# Architecture — Magic Kick

**Version:** 1.0
**Date:** 2026-03-02

---

## High-Level Overview

Magic Kick is a client-heavy, offline-first single-page application. The client holds the authoritative local state; Firebase serves as the remote sync target, not the primary data source.

```
Browser
  └─ Next.js App Router (app/)
      ├─ Auth layer (Firebase Auth + AuthProvider)
      ├─ Zustand store (lib/store.ts) ← source of truth for UI
      │   └─ persisted to localStorage via zustand/persist
      ├─ Sync engine (lib/sync/) ← pull → merge → push
      │   ├─ pullRemote.ts     (Firestore → local diff)
      │   ├─ applyRemote.ts    (merge remote into store)
      │   ├─ pushLocal.ts      (pending writes → Firestore)
      │   └─ engine.ts         (orchestration, 45s interval)
      └─ UI Modules (components/modules/)
          ├─ command-center
          ├─ goals
          ├─ todo
          ├─ projects
          ├─ achievements
          ├─ schedule
          ├─ resources
          └─ journal

Firebase (remote)
  ├─ Firebase Auth  (identity)
  └─ Cloud Firestore (remote state)
      └─ users/{uid}/
          ├─ profile/profile
          ├─ meta/state        (sync cursor, device info)
          ├─ goals/{id}
          ├─ tasks/{id}
          ├─ projects/{id}
          ├─ achievements/{id}
          ├─ schedule/{id}
          ├─ resources/{id}
          └─ journal/{id}
```

---

## Key Components

### State Management (`lib/store.ts`)
- Single Zustand store, persisted to `localStorage` under key `magic-kick-store`
- All UI reads from the store directly (no server-side props, no loading spinners for cached data)
- Store actions handle domain logic inline (XP calculation, achievement evaluation, sync-field stamping)
- Soft deletes: entities are marked `deleted: true` and filtered at render time, never removed from store until confirmed synced

### Sync Engine (`lib/sync/`)
| File | Role |
|---|---|
| `engine.ts` | Orchestrates pull→merge→push, manages `syncInFlight` flag, exposes `syncNow()` |
| `pullRemote.ts` | Fetches Firestore documents updated since `lastPulledAt` cursor |
| `diff.ts` | Compares remote vs local items by `clientUpdatedAt` |
| `applyRemote.ts` | Merges remote snapshot into Zustand store |
| `pushLocal.ts` | Writes pending local changes to Firestore |
| `deviceId.ts` | Stable per-browser device identifier (for multi-device tracking) |

**Conflict resolution:** Last-write-wins using `clientUpdatedAt` (client timestamp in ms). On tie, server `updatedAt` wins. This is intentional and acceptable for a solo-user app.

### XP + Gamification (`lib/xp-engine.ts`, `lib/achievement-engine.ts`, `lib/game-utils.ts`)
- XP is calculated deterministically from task properties (category, estimate, pomodoros, project link)
- Achievement rules are pure functions evaluated on every store mutation
- Level thresholds live in `levelFromXP()` in `game-utils.ts`

### Auth (`components/auth/AuthProvider.tsx`, `hooks/`)
- Firebase Auth client SDK only — no server session cookies
- `useRequireAuth` hook redirects unauthenticated users to `/login`
- Route protection is client-side only (no `middleware.ts`)

### Data Model (`lib/types.ts`)
All entities extend `SyncFields`:
```typescript
interface SyncFields {
  deleted?: boolean        // soft delete
  clientUpdatedAt?: number // conflict resolution key
  createdAt?: number
  updatedAt?: number
}
```

---

## Data Flow

```
User action
  → Store action (store.ts)
      → Mark entity as pending (sync.pending[collection][id] = clientUpdatedAt)
      → Update Zustand state
      → React re-renders

Background (every 45s / tab focus / post-login)
  → syncNow(uid)
      → pullRemote: fetch Firestore docs where updatedAt > cursor
      → applyRemoteSnapshot: merge into store (remote wins on conflict by clientUpdatedAt)
      → pushLocal: write all pending entities to Firestore
      → Update cursor, clear pending map, update sync meta doc
```

---

## Storage & Auth Choices

| Choice | Rationale |
|---|---|
| Zustand + localStorage | Enables offline-first without IndexedDB complexity; sufficient for this data volume |
| Firebase Auth (client-only) | Fastest path to email + Google auth; no server infra needed |
| Firestore (not Realtime DB) | Better querying, per-document security rules, easier cursor-based pull |
| No middleware.ts | Acceptable tradeoff for V1 — client-side guard is sufficient for single-user app |
| Soft deletes | Enables tombstone-based sync without complex delete propagation |

---

## Key Tradeoffs

1. **Client-only auth guard** — Server routes are not protected. An authenticated-but-wrong user cannot access another user's data (Firestore rules enforce this) but could theoretically reach a page URL. Acceptable for V1; add `middleware.ts` + Admin SDK in V2 if needed.

2. **No optimistic rollback on sync failure** — If a push fails, data stays in pending state and retries on next sync cycle. No explicit rollback UI shown to user beyond the sync error indicator.

3. **XP values hardcoded** — Category base XP in `xp-engine.ts` uses a static lookup table that doesn't align with user-configurable categories. User-added categories fall back to `15 XP`. Should be made user-configurable or derived dynamically.

4. **`firebase-admin` in production deps** — Admin SDK is installed but unused. Should be moved to `devDependencies` or server-only import until server-side routes are implemented.

---

## Future Scaling Notes

- **Multi-user / teams:** Would require data model restructure (org/workspace layer above `users/{uid}`)
- **Real-time collaboration:** Replace pull-interval sync with Firestore `onSnapshot` listeners
- **Server-side rendering:** Add `middleware.ts` + Admin SDK session verification for SSR pages
- **Mobile app:** Zustand store structure is compatible with React Native; sync engine is web-only and would need adaptation
- **AI features:** Current data model (goals + tasks + projects + journal) is well-structured for LLM context injection
