# Sprint Backlog

**Sprint window:** 2026-03-02 to 2026-03-15
**Status:** Active

---

## Issue 12 — Harden repository workflow automation

**Outcome:** The repo enforces the same standards described in the docs.

### Acceptance Criteria
- [ ] CI runs both `npm run lint` and `npm run build` on every pull request
- [ ] A policy-check workflow validates required repo files and docs on pull requests
- [ ] A Monday weekly-sync workflow opens a planning issue automatically

---

## Issue 13 — Finish repository operating docs

**Outcome:** A new contributor or future AI session can resume work without tribal knowledge.

### Acceptance Criteria
- [ ] `CLAUDE.md` defines AI role boundaries and commit gates
- [ ] `docs/DAILY_CHECKLIST.md` exists with start-of-day and end-of-day checks
- [ ] `docs/NEXT_SESSION_START.md` exists with ordered startup steps
- [ ] `docs/WORKFLOW_AUTOMATION_PLAYBOOK.md` lists workflow files and usage

---

## Issue 14 — Close README compliance gaps

**Outcome:** The README reflects the real project status and local developer workflow.

### Acceptance Criteria
- [ ] README includes a 30-second pitch and current status section
- [ ] README documents `npm install`, `npm run dev`, `npm run build`, and `npm run test`
- [ ] README includes a documentation index linking core repo docs
- [ ] Deployment section states current hosting status and target platform
