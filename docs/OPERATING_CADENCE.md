# Operating cadence — Magic Kick

How work gets planned and reviewed while the app itself cannot yet do it.
Manual first. Do not build tooling for this until it has run for four weeks.

---

## Principle

**One canonical queue: GitHub Issues.** Everything else is a *view* over it, never a second store of truth. If a plan exists in two places, one of them is already wrong.

---

## The three surfaces

| Surface | Horizon | Where | Time cost |
|---|---|---|---|
| Track board | Weeks | GitHub Project, one column per track status | Passive |
| Weekly plan | 1 week | GitHub Project milestone + Obsidian weekly note | 20 min Sunday |
| Daily focus | 1 day | Top of Obsidian weekly note | 3 min morning |

---

## Weekly planning — Sunday, 20 minutes

1. **Close the loop (5 min).** Move finished issues to Done. Anything untouched for two weeks: close it or explicitly park it with a reason. Stale issues are the main source of fake capacity.
2. **Pick the week's issues (10 min).** Choose **3–5 issues**, all from the *current* track. Do not pull from the next track because an issue looks easy — sequencing is the constraint, not effort.
3. **Assign each a session shape (5 min).** Every issue gets a time box and a learning question before the week starts, not at session time. If you cannot write the learning question, the issue is not ready.

**Capacity rule:** count real available focus blocks this week, then plan for 70% of them. The remaining 30% absorbs the overruns that always happen.

---

## Daily — 3 minutes, morning

Pick **one** issue. Not three. Sessions are 90 minutes and one issue per session is a hard rule in `CLAUDE.md`; planning three creates a backlog of guilt, not throughput.

Answer three questions in writing:

1. Which issue, and what is the time box?
2. What is blocking it, if anything?
3. What is the single verifiable outcome by end of session?

If you cannot answer 3, the issue is not scoped. Spend the session scoping it instead — that is legitimate work.

---

## Weekly review — Friday, 15 minutes

Five questions, written into the Obsidian weekly note:

1. What shipped? (merged PRs only — not "worked on")
2. What did not ship, and why? Name the actual cause, not "no time".
3. Did any session touch files outside declared scope? If yes, that is drift — log it.
4. Any decision made this week that belongs in `docs/DECISIONS_LOG.md` but is not there yet?
5. Track status: is the current track closable, or did it grow?

Question 3 is the one that matters most on this project. Drift is the recurring failure mode and it only becomes visible if you look for it deliberately.

---

## Templates

### Weekly note

```markdown
# Week of YYYY-MM-DD

**Track:** <current track>
**WIP status:** suspended until 2026-09-20 / reinstated
**Capacity:** <N> focus blocks available → planning for <N × 0.7>

## Issues this week
- [ ] #__ — <title> — box: __ min — learning Q: __
- [ ] #__ — <title> — box: __ min — learning Q: __
- [ ] #__ — <title> — box: __ min — learning Q: __

## Daily focus
- Mon: #__ →
- Tue: #__ →
- Wed: #__ →
- Thu: #__ →
- Fri: #__ →

## Friday review
1. Shipped:
2. Did not ship + real cause:
3. Scope drift observed:
4. Decisions owed to DECISIONS_LOG:
5. Track closable? y/n:
```

### GitHub issue

```markdown
**Track:** <0–7>
**Learning question:**
**Time box:** <minutes>

## Deliverables
-

## Out of scope
-

## Affected files / data models
-

## Acceptance criteria
- [ ]

## Security, permissions, error handling
-

## Rollback
-
```

---

## Quick overview — one command

Weekly and daily state should be readable without opening the app:

```bash
gh issue list --milestone "Week of YYYY-MM-DD" --state open
```

Alias it. If a five-second command answers "what am I doing this week", there is no case for building a status dashboard inside Magic Kick — that would be the Control Tower duplication problem again.

---

## Do not build this into the app yet

The Today Command Brief is Track 6, gated behind the dumb-Inbox usage test. Running this cadence manually for four weeks produces the requirements for it. Building it first produces guesses.
