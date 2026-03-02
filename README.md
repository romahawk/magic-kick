# Magic Kick

Magic Kick is a Next.js App Router app with an offline-first Zustand store and Firebase backend sync.
![screenshot](./public/magic-kick-demo.jpg)
## Stack

- Next.js 16 + React 19 + TypeScript
- Tailwind + shadcn/ui
- Zustand (`persist`) + localStorage cache
- Firebase Auth (email/password + Google popup)
- Cloud Firestore (primary database)
- Cloud Storage client initialized (ready for image uploads)

## What Was Added

- Auth routes:
  - `/login`
  - `/signup`
  - `/logout`
  - `/onboarding`
- Global auth context:
  - `components/auth/AuthProvider.tsx`
  - `hooks/use-auth.ts`
  - `hooks/use-require-auth.ts`
- Firebase client:
  - `lib/firebase/client.ts`
- Firestore repository layer:
  - `lib/db/firestore.ts`
  - `lib/db/types.ts`
- Offline-first sync layer:
  - `lib/sync/deviceId.ts`
  - `lib/sync/diff.ts`
  - `lib/sync/applyRemote.ts`
  - `lib/sync/pullRemote.ts`
  - `lib/sync/pushLocal.ts`
  - `lib/sync/engine.ts`
- Store updates for sync metadata + soft deletes:
  - `lib/store.ts`
  - `lib/types.ts`
- XP generation engine:
  - `lib/xp-engine.ts`
- Firebase rules/config:
  - `firestore.rules`
  - `firestore.indexes.json`
  - `firebase.json`
  - `.firebaserc` (template)
- UI touches:
  - topbar user badge
  - logout button
  - sync status and manual sync button

## Environment Setup

1. Copy `.env.example` to `.env.local`.
2. Fill Firebase web app values:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
3. For local emulators set:
   - `NEXT_PUBLIC_FIREBASE_USE_EMULATOR=true`

## Firebase Project Setup

1. Create a Firebase project in the Firebase console.
2. Enable Authentication:
   - Email/Password provider
   - Google provider (optional but supported in UI)
3. Create Firestore database.
4. (Optional) Create Cloud Storage bucket.
5. Create a Web app in Firebase and copy config values into `.env.local`.

## Firestore Data Shape

Data is stored under:

- `users/{uid}/profile/profile`
- `users/{uid}/meta/state`
- `users/{uid}/goals/{goalId}`
- `users/{uid}/tasks/{taskId}`
- `users/{uid}/projects/{projectId}`
- `users/{uid}/achievements/{achievementId}`
- `users/{uid}/schedule/{scheduleItemId}`
- `users/{uid}/resources/{resourceId}`
- `users/{uid}/journal/{entryId}`

All entities include sync fields:

- `clientUpdatedAt` (number, conflict resolution)
- `createdAt` (server timestamp)
- `updatedAt` (server timestamp)
- `deleted` (soft delete)

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Run Firebase emulators:

```bash
npm run emulators
```

3. In another terminal, run app:

```bash
npm run dev
```

4. Open app at `http://localhost:3000`.

## Deploy Rules

```bash
npm run deploy:rules
```

## Offline-First Sync Behavior

- UI always reads Zustand store (cached in localStorage).
- When authenticated:
  - On login: pull remote -> merge -> push local pending writes.
  - Periodic sync every 45s.
  - Sync also runs on tab focus.
  - Manual sync available from top bar.
- Conflict strategy:
  - Last write wins using `clientUpdatedAt`.
  - If tied, server `updatedAt` wins.
  - Soft-deleted records are preserved for sync/tombstones.

## New User Experience

- Fresh accounts start with a clean workspace (no Kyryll demo data).
- After first login, users are redirected to `/onboarding`.
- Onboarding sets profile name and can create optional first goal/task.

## XP Engine

- Task XP is generated automatically from:
  - task category baseline
  - estimate minutes
  - planned pomodoros
  - linked project bonus
- Completing tasks:
  - awards task XP
  - applies streak bonus
  - updates level from total XP
- Uncompleting a task rolls back base task XP.

## Security Rules

`firestore.rules` enforces:

- Auth required for all access.
- Users can only access `users/{uid}/**` where `uid == request.auth.uid`.
- Deny-by-default for everything else.
- Basic sync field and profile shape checks.

## Sessions / Admin SDK Tradeoff

This implementation is client-auth only (no secure HTTP session cookies yet).  
It keeps integration lightweight and emulator-friendly, but server-side route/session verification is not implemented.

If needed later, add:

- Firebase Admin SDK init (`lib/firebase/admin.ts`)
- Session login/logout route handlers
- `middleware.ts` for cookie-based route protection
