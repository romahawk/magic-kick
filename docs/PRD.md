# Product Requirements Document — Magic Kick

**Version:** 1.0
**Date:** 2026-03-02
**Status:** Active
**Owner:** Solo founder

---

## Problem

Knowledge workers and solo founders struggle to maintain momentum across the many fronts of their life — tasks pile up in separate tools, goals sit forgotten in Notion pages, and there's no feedback loop that makes daily execution feel meaningful. Existing tools either track tasks (Todoist) or life goals (Notion) or habits (Habitica) — but none unify them into a single, daily-use command center with a progress feedback loop.

---

## Target User

**Primary:** Solo founder or remote-first professional transitioning careers
**Profile:**
- Manages 3–10 active areas of life simultaneously (work, learning, health, projects)
- Already uses some combination of Notion, Todoist, calendar apps, and journals
- Motivated by progress visibility and streaks
- Needs to operate across devices without constant internet access

**Out of scope for MVP:** Teams, students, enterprise users

---

## Killer Feature

A unified command center that turns your daily tasks, goals, and projects into a leveling game — with offline-first sync so it works anywhere.

---

## Core Loop

1. **Open** → Command Center shows today's tasks, XP progress, streak, and weekly project horizon
2. **Execute** → Complete a task → earn XP + streak bonus → achievements unlock automatically
3. **Plan** → Add/update goals and projects → milestone grid populates the weekly horizon view
4. **Reflect** → End-of-day journal entry with mood, highlights, challenges, next steps
5. **Sync** → All changes persist locally first, then sync to Firestore when online (auto every 45s or on tab focus)

---

## MVP Scope

The following must be fully functional for MVP:

| Module | Required for MVP | Notes |
|---|---|---|
| Auth (login/signup/onboarding) | Yes | Email + Google |
| Command Center | Yes | KPIs + today's focus + weekly horizon |
| Todo / Tasks | Yes | CRUD, categories, XP values, due dates |
| Goals | Yes | CRUD, horizons, priority, status |
| Projects | Yes | CRUD, milestones, weekly grid |
| XP + Leveling | Yes | Auto-calculated on task completion |
| Achievements | Yes | Rule-based unlocks, badge/medal/diploma |
| Offline sync | Yes | localStorage → Firestore, conflict resolution |
| Journal | No | V2 — capture loop works without it |
| Schedule | No | V2 — calendar view is enhancement |
| Resources | No | V2 — nice to have |

---

## Non-Goals

- No team or multi-user features
- No native mobile app (responsive web only)
- No AI-generated task suggestions or smart scheduling
- No social features, sharing, or leaderboards
- No third-party calendar integrations (Google Calendar, etc.)

---

## Acceptance Criteria for MVP

1. **Auth:** New user can sign up, complete onboarding, and land on Command Center within 2 minutes
2. **Task loop:** User can create a task, complete it, and see XP + streak update immediately without refresh
3. **Offline:** User can create and complete tasks with no internet connection; data syncs correctly when reconnected
4. **Sync:** Sync cycle completes without error in < 5 seconds on typical home broadband
5. **Goals/Projects:** User can create a goal and a project with milestones; both appear on Command Center weekly horizon
6. **Achievements:** At least 3 achievements unlock naturally during a typical first session
7. **Responsive:** App is usable on mobile (375px+) and desktop (1280px+) without horizontal scroll
8. **Security:** Firestore rules prevent cross-user data access (verified by emulator rules test)

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Sync conflicts corrupt user data | Low | High | Last-write-wins + soft deletes + cursor-based pull already implemented |
| Module sprawl dilutes core loop | Medium | High | Freeze Journal, Schedule, Resources until post-MVP |
| Cold-start UX confusion (empty state) | Medium | Medium | Onboarding creates first goal/task; Command Center shows empty-state guidance |
| Firebase Auth token expiry breaks sync silently | Medium | Medium | Add token refresh detection in sync engine error handler |
| XP values feel arbitrary, not motivating | Medium | Medium | Validate category base XP values with 5 user sessions; tune in V1.1 |
