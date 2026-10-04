# Daily Checklist

## Start of Day

- Run `/session-start` (it covers the steps below and checks the last handoff)
- Pull latest changes from `main`
- Name the roadmap item or bug for this session (if neither can be named, stop)
- Confirm the working branch is not `main`
- Verify local setup still passes `npm run build`

## Before Opening a PR

- Scope-check the diff for unrelated files
- Run `npm run lint`
- Run `npm run build`
- Update `CHANGELOG.md` for user-facing behavior changes
- Add screenshots for UI changes

## End of Day

- Run `/session-close` to rewrite `docs/NEXT_SESSION_START.md` from the actual git state
- Push the working branch or stash local changes cleanly
- Update the item's `**Status:**` line in `docs/CONTROL_PLANE_UI_SPEC.md` if it moved
