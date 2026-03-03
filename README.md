# Magic Kick

**A gamified personal productivity OS** — unite your tasks, goals, projects, and journal into one command center that levels you up as you ship work.

> Built with Next.js 16 + Firebase + Zustand. Offline-first. Works on mobile and desktop.

---

## What It Does

Magic Kick replaces the scattered stack of Notion pages, Todoist lists, and forgotten habit apps with a single command center:

- **Command Center** — today's tasks, XP progress bar, streak counter, and weekly project horizon at a glance
- **Tasks + Goals** — capture what needs doing and why it matters, with priority and horizon labels
- **Projects** — week-scoped projects with a milestone grid mapped to calendar days
- **XP + Levels** — every completed task earns XP based on category, time estimate, and pomodoros; streaks multiply your gains
- **Achievements** — rule-based badges and medals unlock automatically as you hit milestones
- **Journal** — daily and weekly reflection entries with mood tracking
- **Offline-first** — works without internet; syncs to Firebase when connected, with last-write-wins conflict resolution

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui |
| State | Zustand v5 with `persist` (localStorage) |
| Auth | Firebase Auth — email/password + Google |
| Database | Cloud Firestore |
| Sync | Custom offline-first engine (`lib/sync/`) |
| Analytics | Vercel Analytics |

---

## Quick Setup

### Prerequisites
- Node.js 20+
- Firebase project (free tier works)
- `pnpm` or `npm`

### 1. Clone and install
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
git clone https://github.com/romahawk/magic-kick.git
cd magic-kick
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in your Firebase web app credentials in `.env.local`.

### 3. Firebase project setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication** → Email/Password + Google providers
3. Create a **Firestore** database (start in test mode, then deploy rules)
4. Create a **Web app** and copy the config values into `.env.local`

### 4. Run with local emulators (recommended)

```bash
# Terminal 1 — Firebase emulators
npm run emulators

# Terminal 2 — Next.js dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Set `NEXT_PUBLIC_FIREBASE_USE_EMULATOR=true` in `.env.local` to point at local emulators.

### 5. Deploy Firestore security rules

```bash
npm run deploy:rules
```

---

## Offline Sync Behavior

- UI always reads from Zustand store (cached in localStorage) — no loading states for cached data
- On login: pull remote → merge → push local pending writes
- Auto-sync every 45 seconds and on tab focus
- Manual sync available from the top bar
- Conflict strategy: last `clientUpdatedAt` timestamp wins; soft deletes are preserved as tombstones

---

## Docs

- [Product Requirements (PRD)](docs/PRD.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)
- [Decisions Log](docs/DECISIONS_LOG.md)
- [Changelog](CHANGELOG.md)

---

## Roadmap (next 4 weeks)

| Week | Outcome |
|---|---|
| 1–2 | Stabilize — docs, error boundaries, onboarding polish |
| 3–4 | Signal feature — middleware auth, sync error UX, empty states |

See [docs/ROADMAP.md](docs/ROADMAP.md) for full detail.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for branch naming, commit format, and PR checklist.

---

## License

Private — all rights reserved.
