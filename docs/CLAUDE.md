# CLAUDE.md — Magic Kick session governance

Governing rules for all Claude Code sessions in this repository.
Read this file at the start of every session. If a request conflicts with this file, stop and say so before writing code.

Last updated: 2026-10-04 (ADR-024: Magic Kick is the UI of AI-Business-OS)

---

## 1. Project framing

Magic Kick is the **UI of AI-Business-OS** and Roman's daily planner (ADR-024): the screen where the OS's tasks and context are reached, updated and used. It has no commercial path and is not being built as a business. Work follows the ranked roadmap in `docs/CONTROL_PLANE_UI_SPEC.md`, one item at a time. The AI-Business-OS repo stays the source of truth; Magic Kick reads and writes it only through server-side routes (ADR-024 §5).

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

Every Claude Code session must be framed before work starts:

1. **Item** — the roadmap item (e.g. P7) or the bug it works on; its slug becomes the branch name.
2. **Goal** — what the session must make true.
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
- **No new AI route** without its own ADR (still frozen under ADR-024, see §6).
- **Distinguish confirmed facts from assumptions** in every report. Label them.
- If the repository state contradicts the plan, **report the contradiction and stop.** Do not adapt the plan unilaterally.

---

## 4. Branch, commit and PR discipline

- Branch: `feat/<slug>`, `fix/<slug>` or `docs/<slug>`; put the roadmap item or issue number in the slug when there is one (e.g. `feat/p7-os-feed`, `fix/131-load-row`).
- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.
- One PR per issue. PR description states: issue link, what changed, what was verified, what was **not** verified.
- Commit bodies, push reports and PR bodies follow root `CLAUDE.md` → "Commit, Push and PR Descriptions".
- Never commit directly to `main`.
- Before opening a PR: `lint`, `typecheck`, `test` (if present), `build` must all pass locally. Paste the actual output into the PR, not a claim that they passed.

---

## 5. Current roadmap position

The roadmap is the working order in `docs/CONTROL_PLANE_UI_SPEC.md`, and each item's `**Status:**`
line is its state. One item is `open` at a time. Do not reorder without an ADR or a note in the spec.

The Track 0–7 plan from 2026-08-09 is retired (ADR-024). Its Inbox gate still governs triage, brief
and non-OS connector work (ADR-018).

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

Exception: ADR-024 permits **server-side routes that read and write the AI-Business-OS repo through the GitHub API**, with a fine-grained PAT held in a Vercel env var and never sent to the browser. Tasks and day-to-day context are committed directly; strategy files change only through a pull request Roman merges; writes against a file changed since it was read are refused. The writable paths are listed in P11. It does not permit any other connector, other repositories, webhooks, n8n or other runtimes, or new AI routes.

Existing AI routes (`weekly-summary`, `schedule-suggest`, `coaching`, `retro-summary`) are **parked behind their feature flag, default off** — see ADR on drifted AI routes. They may be read and maintained, not extended.

---

## 7. WIP limit

One roadmap item is `open` at a time (OS `DEC-2026-09-24-001`). Project-level WIP is set by the OS
lanes in `AI-Business-OS/01_CONTEXT/decision-rules.md`, not here.

The ADR-019 suspension ended on 2026-09-20 (ADR-021). Magic Kick's allocation is set by OS
`DEC-2026-09-23-001`, which reverts it to `limited` on 2026-10-21. Roman asked to remove that revert
(ADR-024 §8); until an OS decision does, the date stands.

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
