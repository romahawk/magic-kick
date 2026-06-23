# Magic Kick

## What this is

Magic Kick is a personal productivity planner I built for my own daily use. It is not a product, has no external users, and is not heading toward one. The repository is public for reference only.

It serves two purposes:

1. **Personal tool.** Daily command center for tasks, goals, projects, schedule, and journal — used by me, tuned for me.
2. **AI-SDLC sandbox.** A worked example for practicing AI-augmented software development workflows: Perplexity → ChatGPT → Obsidian → GitHub Issues → Claude Code → PR → Obsidian Review.

> Magic Kick is a personal planner and an AI-SDLC sandbox. It has no users, no
> roadmap, and no backlog. Changes are either (a) self-scratching an itch, or
> (b) a named, time-boxed AI-workflow experiment with a stated learning goal.
> Anything else is scope drift. The 9 existing modules are the ceiling; new
> work happens inside them, not alongside them.

![Magic Kick screenshot](./public/magic-kick-demo.jpg)

## Status

Personal use. Feature-frozen except for sandbox experiments. The 9 existing modules (Command Center, Goals, Todo, Projects, Achievements, Schedule, Resources, Journal, XP/Levels) are the current and final surface area.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui + Radix UI |
| State | Zustand with localStorage persistence |
| Backend | Firebase Auth + Cloud Firestore |
| Analytics | Vercel Analytics |
| Tooling | npm, TypeScript, ESLint, GitHub Actions |

## Setup

### Prerequisites

- Node.js 20+
- npm
- Firebase project credentials for local development

### Commands

```bash
npm install
npm run dev
npm run build
npm run test
```

### Environment

1. Copy `.env.example` to `.env.local`.
2. Fill in:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
3. Optional for emulator usage:
   - `NEXT_PUBLIC_FIREBASE_USE_EMULATOR=true`

### Local Development

```bash
npm run emulators
npm run dev
```

Open `http://localhost:3000`.

## Deployment

- Hosting target: Vercel for the web app, Firebase for auth and Firestore services
- Production URL: not published in this repository

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Decisions Log](docs/DECISIONS_LOG.md)
- [Firebase Architecture](docs/FIREBASE_ARCHITECTURE.md)
- [Workflow Automation Playbook](docs/WORKFLOW_AUTOMATION_PLAYBOOK.md)
- [Daily Checklist](docs/DAILY_CHECKLIST.md)
- [Sandbox Rules](docs/SANDBOX_RULES.md)
- [Changelog](CHANGELOG.md)

## Sandbox experiments

Each experiment is scoped before it starts: a name, a single learning question, and a time box (usually one session). The workflow is Perplexity for background research → ChatGPT for design discussion → Obsidian for notes → a GitHub Issue to frame the change → Claude Code to implement → PR for review → Obsidian to log what was learned. Experiments stay inside the 9 existing modules. What was tried, what was learned, and whether to keep the change is logged in [docs/DECISIONS_LOG.md](docs/DECISIONS_LOG.md).

## Workflow

- Create a feature branch from `main`
- Keep commits scoped and use `type(scope): short description`
- Run `npm run lint` and `npm run build` before committing
- Update `CHANGELOG.md` for user-facing changes

## License

Private repository. All rights reserved.
