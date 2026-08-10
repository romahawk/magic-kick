# CLAUDE.md — Magic Kick session governance

Governing rules for all Claude Code sessions in this repository.
Read this file at the start of every session. If a request conflicts with this file, stop and say so before writing code.

Last updated: 2026-08-09

---

## 1. Project framing

Magic Kick is a **personal execution OS** and an **AI-SDLC learning environment**. It has no commercial path and is not being built as a business. Every session is an experiment with a stated learning question, not a feature factory.

Operating loop the product exists to serve:

```text
Context → Goal → Inputs → Analysis → Decision → Action → Review → Archive
```

Magic Kick is the control plane for priorities, active projects, tasks, approvals, daily planning and weekly review. It does not replace Gmail, Google Calendar, Google Drive, GitHub or a knowledge-management system.

---

## 2. Tool division of labour

| Layer | Owner |
|---|---|
| Strategy, audits, issue specs, ADR drafts, diff review | Claude (chat project) |
| Implementation, tests, lint, typecheck, build | Claude Code (this file governs) |
| Work queue | GitHub Issues |
| Code, branches, PRs, history | GitHub |
| Architectural decisions | `docs/DECISIONS_LOG.md` |
| Retro and reflection | Obsidian (read/write review notes only — **not** a second work queue) |

**Retired:** ChatGPT Project as a strategy source. Codex as independent reviewer. Do not reintroduce a second canonical planning surface.

**No duplicate canonical sources.** If an object already lives in GitHub Issues or `docs/`, do not create a second authoritative copy of it inside the app or in Obsidian.

---

## 3. Session rules

Every Claude Code session must be framed as an experiment:

1. **Experiment name** — short identifier, becomes the branch name.
2. **Learning question** — what this session is meant to teach or prove.
3. **Time box** — hard stop. Default 90 minutes. If the box expires, commit work-in-progress and report status; do not extend silently.
4. **Deliverables** — explicit list.
5. **Out of scope** — explicit list. Anything not listed as a deliverable is out of scope by default.
6. **Acceptance criteria** — verifiable, not subjective.

### Hard rules

- **One issue per session.** No bundling.
- **Do not touch files outside declared scope.** If a fix requires it, stop and report; do not proceed.
- **No broad rewrites.** Refactors need an issue and an ADR.
- **No new dependencies** without stating the reason and the alternative considered.
- **No new Firestore collection** without updating `firestore.rules` and the shared collection definitions in the same commit.
- **No new AI route** until the Track 5 gate is passed (see §5).
- **Distinguish confirmed facts from assumptions** in every report. Label them.
- If the repository state contradicts the plan, **report the contradiction and stop.** Do not adapt the plan unilaterally.

---

## 4. Branch, commit and PR discipline

- Branch: `exp/<experiment-name>` or `fix/<issue-number>-<slug>`.
- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.
- One PR per issue. PR description states: issue link, what changed, what was verified, what was **not** verified.
- Never commit directly to `main`.
- Before opening a PR: `lint`, `typecheck`, `test` (if present), `build` must all pass locally. Paste the actual output into the PR, not a claim that they passed.

---

## 5. Current roadmap position

Active track order. Do not start a track before the previous one is closed.

- **Track 0** — Governance reset (ADRs, this file). *In progress.*
- **Track 1** — Session 0: repo truth. Read-only verification. No code changes.
- **Track 2** — Stabilisation. Fixes sized from the Track 1 report.
- **Track 3** — Finish in-flight redesign (Projects list, project detail Sheet, Edit Project modal).
- **Track 4** — Dumb Inbox. `InboxItem`, capture, list, convert-to-task. **No AI, no triage, no connectors, no approval state machine.** 14 days of real use follows.
- **Gate** — under ~10 captured items/week without prompting → stop, reinstate WIP limit, reassess.
- **Track 5** — AI triage + approval queue. Blocked by gate.
- **Track 6** — Today Command Brief. Blocked by Track 5.
- **Track 7** — n8n, Gmail label ingestion, read-only Calendar. Blocked by daily use of the brief.

---

## 6. Freeze list

Frozen until explicitly unfrozen by an ADR:

- New AI API routes and AI library modules.
- Any external connector (Gmail, Calendar, Drive, Notion, Trello, webhooks).
- n8n or any new runtime/orchestration dependency.
- Multi-user features, marketplace, plugin system, second-brain features.
- A second repository or platform.
- New dashboard modules unrelated to the core operating loop.

Exception: ADR-008 unfreezes **read-only Google Calendar metadata only**. This permits calendar connection state, selected calendar IDs, sync cursor/token placeholders, last-sync/status/error fields, and display preferences. It does not permit Google event ingestion, webhooks, n8n, connector runtimes, calendar writes, or OAuth scope expansion beyond metadata placeholders.

Exception: ADR-009 unfreezes a **pure Google event to external calendar block mapper only**. This permits local mapper/model code for documented Google event fields. It does not permit OAuth, Google API calls, event import jobs, Firestore persistence of imported events, webhooks, Schedule rendering, AI route integration, or calendar writes.

Exception: ADR-010 unfreezes **read-only Schedule rendering of already-present external calendar blocks only**. This permits an `externalCalendarBlocks` synced collection, store actions for local add/tombstone, Firestore rules/shared collection definitions, and read-only Schedule display. It does not permit OAuth, Google API calls, event import jobs, webhooks, AI route integration, or calendar writes.

Exception: ADR-011 unfreezes **external busy block input for the existing schedule-suggest flow only**. This permits projecting already-present `externalCalendarBlocks` into existing busy interval payloads and client conflict detection. It does not permit new AI routes, event detail prompts, OAuth, Google API calls, import jobs, webhooks, or calendar writes.

Exception: ADR-012 unfreezes **read-only Google Calendar discovery only**. This permits requesting a Calendar read-only scope, using a transient browser access token to call CalendarList `list`, showing discovered calendars, and saving selected calendar IDs into existing metadata. It does not permit imports during discovery, token storage/refresh, webhooks, AI changes, or calendar writes.

Exception: ADR-013 unfreezes **bounded manual read-only Google event import only**. This permits requesting a Calendar read-only scope, using a transient browser access token to call Events `list` for selected calendars, mapping a fixed upcoming window into `externalCalendarBlocks`, and updating metadata status fields. It does not permit background sync, token storage/refresh, webhooks, AI prompt changes, or calendar writes.

Exception: ADR-014 permits using Firebase's existing Google provider as the primary transient access-token transport for ADR-012 discovery and ADR-013 manual import, with Google Identity Services as an optional browser-token fallback. It does not permit token storage/refresh, server-side OAuth, background sync, webhooks, or calendar writes.

Exception: ADR-015 permits browser-only Calendar auto-sync while a user-triggered short-lived access token remains cached in memory. It does not permit persisted tokens, refresh tokens, server-side OAuth, webhooks, workers, or calendar writes.

Existing AI routes (`weekly-summary`, `schedule-suggest`, `coaching`, `retro-summary`) are **parked behind their feature flag, default off** — see ADR on drifted AI routes. They may be read and maintained, not extended.

---

## 7. WIP limit — temporarily suspended

The three-active-project limit is **suspended until 2026-09-20** to concentrate effort on Magic Kick workflow optimisation.

- This is a calendar deadline, not a conditional one. It does not extend because work is unfinished.
- Dormant during suspension: AlphaRhythm, FlowLogix.
- **Not dormant:** LiveSurgery POC — it has external dependencies and continues regardless.
- On 2026-09-20 the limit is reinstated automatically and Magic Kick returns to sandbox status unless a new ADR says otherwise.

---

## 8. Design principles (UX work)

1. One canonical active view.
2. Data over chrome.
3. Colour as exception.
4. Progressive disclosure.
5. One control per row.

---

## 9. Review checklist

Reviews run in a **clean session**, never the session that wrote the code. Because there is no longer a cross-model reviewer, CI and this checklist are the substitute.

- [ ] Diff matches the issue scope. Nothing extra.
- [ ] No files touched outside declared scope.
- [ ] `firestore.rules` updated for any new or changed collection.
- [ ] Collection names come from the shared definitions module, not string literals.
- [ ] Error, empty and loading states present for any new surface.
- [ ] Rollback path stated (revert commit, feature flag, or migration reversal).
- [ ] No client-supplied application state trusted server-side.
- [ ] No secrets, keys or tokens in the diff.
- [ ] Lint, typecheck, build output pasted in the PR.
- [ ] Assumptions labelled as assumptions.
