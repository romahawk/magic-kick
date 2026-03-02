# Roadmap — Magic Kick

**Last updated:** 2026-03-02
**Model:** Outcome-based, weekly shipping increments

---

## Freeze List (Do NOT touch until Month 3)

- Schedule module — calendar UI is low-leverage until core loop is proven
- Resources module — reference library is V2 scope
- Social/sharing features — out of scope
- AI task suggestions — post-MVP
- Native mobile app — web-first

---

## Week 1–2: Stabilize + Ship One Visible Improvement

**Outcome:** The repo is portfolio-credible and a stranger can set it up in under 10 minutes.

### Issues
1. Fix `package.json` name from `"my-project"` to `"magic-kick"`
2. Update README to product-pitch format (30-second pitch, stack, screenshot, deploy link, setup steps)
3. Create `/docs` folder with PRD, ARCHITECTURE, ROADMAP, DECISIONS_LOG
4. Add GitHub issue and PR templates
5. Add `CHANGELOG.md` with v0.1.1 entry
6. Fix: XP category base values don't cover user-created categories (fallback to 15 XP)

**Definition of Done:**
- [ ] `npm run build` passes with zero type errors
- [ ] README has a screenshot or GIF of the Command Center
- [ ] A new developer can clone, copy `.env.example`, and run locally with emulators in under 10 minutes
- [ ] All 6 issues above are merged as individual PRs

**Demo artifact:** Screenshot of Command Center (desktop + mobile) added to README

---

## Week 3–4: Add One "Signal" Feature (UX / Quality)

**Outcome:** The app is noticeably more polished and there is one shareable proof-of-work moment.

### Issues
1. Add UI error boundaries around each module (prevent full-app crash on module error)
2. Add empty-state illustrations/messages to all 5 MVP modules
3. Improve onboarding — pre-create a sample goal and task so Command Center isn't blank on first login
4. Add `middleware.ts` for server-side route protection (redirect unauthenticated requests from `/` to `/login`)
5. Move `firebase-admin` to `devDependencies` or add server route that justifies it
6. Add sync error toast with "Retry" action when sync status is `"error"`

**Definition of Done:**
- [ ] No full-page crashes when a single module throws (error boundary test)
- [ ] Onboarding creates at least 1 goal and 1 task automatically
- [ ] Unauthenticated GET to `/` returns redirect to `/login` (server-side verified in logs)
- [ ] Sync error is visible and actionable in UI

**Demo artifact:** Loom or GIF showing onboarding → Command Center → task completion → XP animation

---

## Month 2: Expand Core Loop Quality

**Outcome:** The three core modules (Todo, Goals, Projects) are tight, tested, and production-hardened.

### Milestones
- Add unit tests for `xp-engine.ts` and `achievement-engine.ts` (pure functions, easy wins)
- Add integration smoke test for sync engine using Firebase emulators
- Add Firestore security rules unit tests (`firebase-admin` test runner)
- Implement task recurrence (daily/weekly) — most-requested personal-productivity feature
- Improve Command Center: show "overdue tasks" section (tasks with past `dueDate` not completed)
- Add `streak at risk` warning if no task completed today and it's after 6pm

**Definition of Done:**
- [ ] Test coverage ≥ 70% on `lib/` (xp-engine, achievement-engine, sync/diff)
- [ ] CI runs on every PR (`npm run build` + `npm run lint` + tests)
- [ ] Task recurrence working end-to-end with sync

---

## Month 3: Ship and Signal

**Outcome:** The app is publicly deployed, demo-ready, and has at least 5 real sessions logged.

### Milestones
- Production Firebase project configured and deployed (Vercel + Firebase)
- Deploy link in README
- CHANGELOG updated with v0.2.0 release notes
- Lighthouse score ≥ 90 for Performance and Accessibility
- Journal module activated (daily/weekly reflections)
- XP category values made user-configurable in profile settings
- Analytics review: identify which modules users actually use

**Definition of Done:**
- [ ] Live deploy URL accessible without login gate on landing page
- [ ] Vercel Analytics shows at least 5 unique sessions
- [ ] Lighthouse CI passes in PR pipeline

---

## Versioning

| Version | Description |
|---|---|
| v0.1.1 | Current — auth, sync engine, all modules wired |
| v0.2.0 | Stabilized — docs, error boundaries, onboarding polish, middleware |
| v0.3.0 | Tested — unit tests, CI, task recurrence |
| v1.0.0 | Shipped — public deploy, Lighthouse ≥ 90, Journal active |
