# Decisions Log — Magic Kick

Architecture Decision Records (ADR-style). Each entry explains a real choice made in this codebase, why it was made, and what would trigger a revisit.

---

## ADR-001: Offline-First with Zustand + localStorage

**Date:** 2025 (initial build)
**Status:** Accepted

**Context:** The app must work without internet. Options: IndexedDB (complex), service worker cache (infrastructure overhead), or Zustand `persist` to localStorage (simple, synchronous).

**Decision:** Use Zustand `persist` middleware with localStorage as the local cache. All UI reads from the store. Firestore is the remote sync target, not the source of truth for the UI.

**Consequences:**
- Pro: Zero loading spinners for cached data; instant UI on return visits
- Pro: Simple implementation, easy to reason about
- Con: localStorage has a ~5MB limit — could be hit by power users with thousands of journal entries or tasks
- Con: Not shared across browser tabs (each tab has its own store hydration)

**Revisit trigger:** User data exceeds 2MB in localStorage, or multi-tab consistency bugs are reported.

---

## ADR-002: Firebase Auth Client-Only (No Server Session)

**Date:** 2025 (initial build)
**Status:** Accepted with known tradeoff

**Context:** Adding Firebase Admin SDK + session cookies requires server routes, middleware, and more complex deploy setup. For a solo-user V1 app, client-side auth is sufficient.

**Decision:** Use Firebase Auth client SDK only. Route protection is handled by `useRequireAuth` hook (client-side redirect). Firestore security rules enforce data isolation — even if a user reaches a protected page URL, they cannot read another user's data.

**Consequences:**
- Pro: No server infra, works on static/edge deploys
- Con: Server-rendered pages are not auth-protected at the HTTP level
- Con: `middleware.ts` is missing — SSR pages briefly render before redirect

**Revisit trigger:** Adding SSR data fetching, or security audit requires server-side session verification.

---

## ADR-003: Last-Write-Wins Conflict Resolution

**Date:** 2025 (sync engine design)
**Status:** Accepted

**Context:** Multi-device sync requires a conflict resolution strategy. Options: CRDTs (complex), operational transforms (very complex), last-write-wins by timestamp (simple and sufficient for single-user).

**Decision:** Conflicts resolved by comparing `clientUpdatedAt` (client-side timestamp in ms). Higher value wins. On tie, server `updatedAt` wins. Soft deletes (tombstones) are preserved across devices.

**Consequences:**
- Pro: Deterministic, easy to test, no merge complexity
- Con: If two devices edit the same entity with clock skew > sync interval (45s), one edit is silently dropped
- Con: Not suitable for collaborative/multi-user scenarios

**Revisit trigger:** Adding team/multi-user features, or users report lost edits.

---

## ADR-004: Hardcoded XP Category Base Values

**Date:** 2025 (xp-engine.ts)
**Status:** Technical debt — needs revisit

**Context:** Task XP is calculated from a category baseline (`CATEGORY_BASE_XP` in `lib/xp-engine.ts`). The hardcoded categories (Learning, Sport, Family/Home, Hobby, Travel) match the default task categories, but users can add custom categories that fall back to `15 XP`.

**Decision:** Ship with hardcoded values to unblock the XP loop. User-configurable category XP is deferred.

**Consequences:**
- Pro: Simple, deterministic
- Con: User-created categories always get 15 XP regardless of effort level
- Con: Hardcoded list diverges from user's actual category set over time

**Revisit trigger:** When user-configurable categories are more than 2 weeks old in production. Fix: store category base XP in `profile.taskCategoryXP` map, default to 15 if absent.

---

## ADR-005: Retroactive AI Production OS Adoption

**Date:** 2026-03-02
**Status:** Adopted

**Context:** Repo was built as a technical prototype without product documentation, workflow templates, or deployment discipline. Transitioning to solo remote-first employment requires the repo to function as production-grade proof-of-work.

**Decision:** Adopt AI Production OS v1 framework retroactively. Add: PRD, ARCHITECTURE, ROADMAP, DECISIONS_LOG, GitHub issue/PR templates, CHANGELOG, updated README. Enforce Issue → PR → Deploy discipline going forward.

**Consequences:**
- Pro: Repo becomes demonstrable proof-of-work for engineering/product credibility
- Pro: Establishes governance before scope expands further
- Con: Short-term overhead (docs sprint before feature sprint)

**Revisit trigger:** Framework becomes obsolete or team grows beyond 1 person.

---

## ADR-006: Magic Kick Reframed as Personal Tool + AI-SDLC Sandbox

**Date:** 2026-06-23
**Status:** Accepted

**Context:** Product framing caused scope drift. AI routes were shipped against the Freeze List declared in ROADMAP.md. Phase 0 governance was abandoned mid-flight. The repo is not in the declared WIP-3 (AlphaRhythm, FlowLogix, LiveSurgery) and was effectively a 4th active project competing for limited solo build hours. Docs treated Magic Kick as a multi-phase product with sprints, a PRD, and a roadmap — none of which reflect the actual use of the tool.

**Decision:** Stop treating Magic Kick as a product. Adopt the governing rule now pinned in CLAUDE.md and README.md. Archive PRD, ROADMAP, SPRINT_BACKLOG, EXECUTION_OS_REFACTOR, and NEXT_SESSION_START. Cap surface area at the current 9 modules. AI routes remain behind feature flag; no new AI surface without a named, time-boxed experiment.

**Consequences:**
- No more phase plans or sprint backlogs.
- Future work is either personal-itch fixes or logged sandbox experiments.
- Existing AI code stays flagged; a separate ADR documenting the original out-of-scope AI ship is still required (track as follow-up issue).
- The WORKFLOW_AUTOMATION_PLAYBOOK.md is now the primary artifact — the app itself is the worked example.

**Revisit trigger:** Never, unless the project changes hands or purpose.

---

## ADR-007: Project data model — milestones only, sprint as separate object

**Date:** 2026-06-29
**Status:** Accepted

**Context:** The detail Sheet shows both "tasks" and "milestones" counts; the Edit modal shows neither, only a free-text "Weekly Outcome" field. Vocabulary is split across surfaces, blocking any coherent UI for progress tracking. The Edit modal conflated three cadences (identity, lifecycle, weekly operations) in one form, making every weekly edit scroll past rarely-changed identity fields.

**Decision:**
- Project hierarchy: **Project → Milestones** (no tasks layer). A Milestone is a binary done/not-done outcome with an optional target date. Type: `{ id, title, done, targetDate?, completedAt? }`.
- Sprint is a **separate object**, soft-linked from sprint outcomes to milestones via optional `linked_milestone?: string`. Sprint data model and persistence are deferred to session 2; this session does not introduce it.
- "Tasks" vocabulary is removed from all UI surfaces targeting the projects domain. Existing fields that conceptually represent tasks are either renamed to milestones or left untouched pending session 3 (the milestones UI session).

**Consequences:**
- Session 1 (this session): removes Weekly Outcome from Edit modal, moves Links to the detail Sheet, strips Edit modal to identity-only fields (Title, Objective, Duration, Color, Status).
- Session 2: introduces Sprint type + persistence + Sheet block.
- Session 3: milestones UI overhaul + vocabulary cleanup across surfaces.

**Revisit trigger:** Sprint data model introduced in session 2 conflicts with this structure, or session 3 vocabulary cleanup reveals that the `Project → Milestones` hierarchy is insufficient for the actual tracking workflow.

---

## ADR-008: Unfreeze read-only Google Calendar metadata

**Date:** 2026-08-10
**Status:** Accepted

**Context:** Google Calendar remains the source of truth for time commitments, but the current freeze list blocks all external connector work until Track 7. The next integration step needs only local connection metadata so Magic Kick can model selected calendars, sync cursors, and connection status before any event ingestion, webhook, OAuth scope expansion, or calendar writes are introduced.

**Decision:** Unfreeze **read-only Google Calendar metadata only**. This permits data model and persistence work for calendar connection state, selected calendar identifiers, sync cursor/token placeholders, last-sync timestamps, status/error fields, and display preferences. It does not permit reading Google Calendar events, creating OAuth flows beyond what is required to store metadata placeholders, adding webhooks, adding n8n or connector runtimes, importing events, exporting Magic Kick blocks, or writing to Google Calendar.

**Consequences:**
- Magic Kick can prepare a narrow, reviewable data boundary for a future read-only Calendar integration.
- The general external connector freeze remains in force.
- Event ingestion remains blocked until a separate ADR or Track 7 decision explicitly unfreezes it.
- Calendar writes remain out of scope; Google Calendar continues to own time commitments.

**Revisit trigger:** Metadata needs real Google API access, event import, webhook renewal, OAuth refresh-token storage, or any write capability.

---

## ADR-009: Unfreeze Google event to external block mapper

**Date:** 2026-08-10
**Status:** Accepted

**Context:** The next Calendar integration step is to define how a Google Calendar event would be represented inside Magic Kick without yet reading from Google APIs or rendering imported events. The mapper can be developed and tested as pure local code using the documented Google Calendar Events resource shape.

**Decision:** Unfreeze a **pure Google event to external calendar block mapper only**. This permits local TypeScript types for the subset of Google event fields Magic Kick needs and a deterministic mapper into an external calendar block model. It does not permit OAuth, Google API calls, event import jobs, Firestore persistence of imported events, webhooks, rendering external blocks in Schedule, feeding imported blocks into AI routes, or writing to Google Calendar.

**Consequences:**
- Magic Kick gets a stable data boundary for future read-only event ingestion.
- The mapper can be verified independently before any connector code exists.
- Cancelled or malformed events can be handled consistently before they reach UI or sync.
- External event rendering and AI scheduling remain separate future steps.

**Revisit trigger:** The mapper needs real API access, stored imported events, Schedule rendering, conflict detection integration, or any write/export behavior.

---

## ADR-010: Unfreeze read-only external calendar block rendering

**Date:** 2026-08-10
**Status:** Accepted

**Context:** Magic Kick now has read-only Calendar metadata and a pure Google event mapper, but the Schedule view cannot yet display external calendar commitments. Rendering already-present external blocks is useful before implementing OAuth or import jobs because it proves the visual and state boundary between Calendar-owned commitments and Magic Kick-owned planning blocks.

**Decision:** Unfreeze **read-only Schedule rendering of already-present external calendar blocks only**. This permits an `externalCalendarBlocks` synced collection, store actions for adding or tombstoning external blocks, Firestore rules/shared collection definitions, and read-only display in `ScheduleModule`. It does not permit OAuth, Google API calls, event import jobs, webhooks, AI route integration, or writing/exporting to Google Calendar.

**Consequences:**
- External calendar commitments can be visually tested without connecting to Google.
- Google-owned blocks remain non-editable and visually distinct from Magic Kick planning blocks.
- Future import work has a persistence target and display path ready.
- AI scheduling and Google writes remain separate future decisions.

**Revisit trigger:** Rendering needs live Google API access, automatic import/sync, conflict-detection integration, AI route input, or any write/export capability.

---

## ADR-011: Unfreeze external busy blocks for schedule suggestions

**Date:** 2026-08-10
**Status:** Accepted

**Context:** External calendar blocks can now be represented and rendered read-only, but AI schedule suggestions still only consider Magic Kick `TimeBlock` records. To keep scheduling useful, already-present external blocks that actually block time should be projected into the existing busy-block input shape for the existing `/api/ai/schedule-suggest` route and client-side conflict detection.

**Decision:** Unfreeze **external busy block input for the existing schedule-suggest flow only**. This permits projecting already-present `externalCalendarBlocks` into the existing `existingBlocks` request payload and using the same projected list for client conflict detection. It does not permit new AI routes, prompt expansion beyond busy context, OAuth, Google API calls, import jobs, webhooks, or calendar writes.

**Consequences:**
- AI scheduling can avoid already-present Calendar-owned commitments.
- No new AI surface or Google integration is introduced.
- The route contract remains stable because external blocks are reduced to date/start/end busy intervals.
- Calendar-owned event details are not sent beyond what the scheduler needs.

**Revisit trigger:** AI needs event titles/details, live Google data, automatic imports, prompt changes beyond busy intervals, or write/export behavior.

---

## ADR-012: Unfreeze read-only Google Calendar discovery

**Date:** 2026-08-10
**Status:** Accepted

**Context:** Calendar metadata can be edited manually, but selecting real calendar IDs by hand is brittle. Google Calendar's CalendarList API can return the user's calendar list with a narrow read-only scope, and Google Identity Services can provide a transient browser access token for that scope from a user-triggered consent flow.

**Decision:** Unfreeze **read-only Google Calendar discovery only**. This permits requesting a Google Calendar read-only scope, using a transient access token in the browser to call CalendarList `list`, showing discovered calendars in the existing metadata dialog, and saving selected calendar IDs into existing profile metadata. It does not permit importing events during discovery, storing OAuth access or refresh tokens, webhooks, AI changes, or calendar writes.

**Consequences:**
- Calendar IDs can be selected from real Google Calendar data instead of typed manually.
- The app still stores only metadata, not OAuth tokens or event data.
- Event ingestion remains blocked until a separate ADR.
- Users may see a Google consent screen for calendar-list read-only access.

**Revisit trigger:** Discovery needs event reads, token persistence/refresh, server-side OAuth, imports, webhooks, or write/export behavior.

---

## ADR-013: Unfreeze bounded read-only Google event import

**Date:** 2026-08-10
**Status:** Accepted

**Context:** Magic Kick can discover calendar IDs and can render/schedule around already-present external calendar blocks, but there is still no manual path to populate those blocks from real Google events. The next useful step is a bounded, user-triggered import that reads upcoming events from selected calendars, maps them through the existing pure mapper, and stores them as `externalCalendarBlocks`.

**Decision:** Unfreeze **bounded manual read-only Google event import only**. This permits requesting a Google Calendar read-only scope, using a transient browser access token to call Events `list` for selected calendars, importing a fixed upcoming window, mapping events into `ExternalCalendarBlock`, saving them locally/Firestore via the existing collection, and updating metadata status/last sync/error fields. It does not permit background sync, token storage/refresh, webhooks, incremental sync automation, AI prompt changes, or calendar writes.

**Consequences:**
- The full read-only path can be tested manually end to end.
- Imported Google commitments appear in Schedule and are considered by schedule suggestions through existing external busy projection.
- OAuth tokens remain transient and are not persisted.
- Stale imported events may remain until the next manual bounded import; background sync is still a separate decision.

**Revisit trigger:** The import needs background scheduling, token refresh, webhook renewal, deletion reconciliation beyond the bounded window, AI detail prompts, or write/export behavior.

---

## ADR-014: Use Google Identity Services for Calendar read tokens

**Date:** 2026-08-10
**Status:** Accepted

**Context:** Firebase Auth sign-in can authenticate the user but did not reliably return a Google Calendar OAuth access token after redirect/popup flows in the local browser. Discovery and manual import need a short-lived Calendar API bearer token, not another Firebase identity session.

**Decision:** Use Firebase's existing Google provider as the primary transient access-token source for Calendar discovery and manual event import, and allow Google Identity Services' browser token client as an optional fallback when `NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID` is configured. Both paths request only `https://www.googleapis.com/auth/calendar.readonly` from a user-triggered button click, use the returned token immediately for Calendar REST calls, and never store the token.

**Consequences:**
- Calendar discovery/import use the existing Firebase Google sign-in configuration by default.
- A separate Google OAuth Web Client ID with the local origin configured can be added as a fallback, but is not required for the default path.
- Tokens remain transient; the integration is still manual and read-only.
- Google app verification may still show a warning until the OAuth consent screen is verified or the account is added as a test user.

**Revisit trigger:** The integration needs server-side OAuth, refresh tokens, background sync, webhooks, or any Calendar write/export capability.

---

## ADR-015: Browser-only Calendar auto-sync while token is live

**Date:** 2026-08-10
**Status:** Accepted

**Context:** Manual event import proves the read-only Calendar path, but Google Calendar edits are stale in Magic Kick until the user clicks Import again. Full automatic sync would normally require stored refresh tokens, a server-side OAuth flow, and/or Google push notification channels, which is beyond the current read-only browser integration.

**Decision:** Add browser-only Calendar auto-sync for the existing bounded import window. After a successful user-triggered Calendar authorization, Magic Kick caches the short-lived access token in memory only and uses it to poll selected calendars while Schedule is open. The same reconciler is used for manual Import and auto-sync: returned events are mapped/upserted, cancelled events are tombstoned, and previously imported Google blocks missing from the selected 14-day window are tombstoned. No token is persisted.

**Consequences:**
- Google Calendar edits can update Magic Kick automatically while the app is open and the access token remains valid.
- Auto-sync stops after page reload or token expiry until the user performs another Discover/Import action.
- No refresh tokens, background workers, webhooks, or Calendar writes are introduced.
- The imported window remains intentionally bounded to the next 14 days.

**Revisit trigger:** The user needs sync after page reload without interaction, long-running background sync, webhook latency, or one-way export/write behavior.
