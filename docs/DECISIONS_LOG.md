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
