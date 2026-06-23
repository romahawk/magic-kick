# Daily Checklist

## Start of Day

- Pull latest changes from `main`
- Name the itch or experiment for this session (if neither can be named, stop and work on a different repo)
- Confirm the working branch is not `main`
- Verify local setup still passes `npm run build`

## Before Opening a PR

- Scope-check the diff for unrelated files
- Run `npm run lint`
- Run `npm run build`
- Update `CHANGELOG.md` for user-facing behavior changes
- Add screenshots for UI changes

## End of Day

- Push the working branch or stash local changes cleanly
- Log what was learned in `docs/DECISIONS_LOG.md` if this was an experiment
