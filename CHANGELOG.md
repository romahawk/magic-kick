# Changelog

All notable changes to Magic Kick are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

---

## [Unreleased]

### Added
- `/docs` folder: PRD, ARCHITECTURE, ROADMAP, DECISIONS_LOG
- GitHub issue templates (Feature, Bug)
- GitHub PR template
- CONTRIBUTING.md
- CHANGELOG.md (this file)
- AI Production OS v1 audit applied

### Changed
- README rewritten as product pitch with setup guide and doc links

### Fixed
- `package.json` name corrected from `"my-project"` to `"magic-kick"`

---

## [0.1.1] — 2026-02-xx

### Added
- Milestone CRUD on projects with Quick Add day/time task scheduling
- Project links and color-gradient cards
- Editable resource cards with multi-link support
- Orbit favicon variant
- Task category color management

---

## [0.1.0] — 2026-01 (Initial)

### Added
- Firebase Auth (email/password + Google) with onboarding flow
- Cloud Firestore as remote database
- Offline-first Zustand store with localStorage persistence
- Custom sync engine: pull → merge → push with last-write-wins conflict resolution
- Soft delete support with tombstone propagation
- XP engine: category base XP + estimate bonus + pomodoro bonus + project bonus
- Achievement engine: rule-based badge/medal/diploma unlocks
- 8 modules: Command Center, Goals, Todo, Projects, Achievements, Schedule, Resources, Journal
- Firestore security rules with per-user isolation
- `.env.example` for Firebase config
- Firebase emulator support for local development
