# Changelog

All notable changes to Magic Kick are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

---

## [Unreleased]

### Added
- repository operating docs: `CLAUDE.md`, sprint backlog, daily checklist, next-session guide, and workflow automation playbook
- policy-check and weekly roadmap-sync GitHub Actions workflows

### Changed
- CI now runs lint before type-check and build on pull requests
- README reorganized around product status, setup, deployment status, and documentation links

### Fixed
- resource editor modal layout now handles long links without overlapping controls

---

## [0.1.1] - 2026-03-03

### Added
- milestone CRUD on projects with Quick Add day/time task scheduling
- project links and color-gradient cards
- editable resource cards with multi-link support
- orbit favicon variant
- task category color management

---

## [0.1.0] - 2026-01-01

### Added
- Firebase Auth (email/password + Google) with onboarding flow
- Cloud Firestore as remote database
- offline-first Zustand store with localStorage persistence
- custom sync engine: pull -> merge -> push with last-write-wins conflict resolution
- soft delete support with tombstone propagation
- XP engine: category base XP + estimate bonus + pomodoro bonus + project bonus
- achievement engine: rule-based badge/medal/diploma unlocks
- 8 modules: Command Center, Goals, Todo, Projects, Achievements, Schedule, Resources, Journal
- Firestore security rules with per-user isolation
- `.env.example` for Firebase config
- Firebase emulator support for local development
