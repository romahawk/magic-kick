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
