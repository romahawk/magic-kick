<!-- Standard: CLAUDE.md, "Commit, Push and PR Descriptions". Fill every section; write "N/A" rather than deleting one. -->

## What
<!-- One or two sentences: what does this PR change, as a user or the next session would see it? -->

## Why
<!-- Closes #___ — or the motivation / spec item (e.g. CONTROL_PLANE_UI_SPEC P1) if no issue exists -->

## Changes
<!-- Grouped by file or area, one line each. Written from the diff. -->
-

## Base and merge order
<!-- "main", or "stacked on #___ — merge that first". N/A if based on main with nothing pending. -->

## Verification

**Gates** (paste the last lines of each with the exit code, not a claim):

```text
npm run typecheck →
npm run lint      →
npm run build     →
```

**Manual checks done:**
-

**Not verified:**
<!-- Anything unchecked: acceptance criteria not tested, devices not tried, no screenshots. Required, even if "nothing outstanding". -->
-

## Screenshots (if UI change)
<!-- Before / After, mobile (375px) and desktop (1280px). If missing, say so under "Not verified". -->

## Checklist
- [ ] `npm run typecheck`, `npm run lint`, `npm run build` pass (output pasted above)
- [ ] Tested on mobile (375px) and desktop (1280px), or listed under "Not verified"
- [ ] Offline behavior verified (if touching store or sync)
- [ ] No `console.log` left in production code
- [ ] CHANGELOG.md updated (for user-facing changes)
- [ ] `docs/NEXT_SESSION_START.md` reflects this branch (session close)
