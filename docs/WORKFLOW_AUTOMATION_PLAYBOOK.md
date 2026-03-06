# Workflow Automation Playbook

Use these workflow files as the canonical automation set for this repository:

- `.github/workflows/ci.yml`
- `.github/workflows/policy-check.yml`
- `.github/workflows/weekly-roadmap-sync.yml`

## What Each Workflow Does

### CI
- File: `.github/workflows/ci.yml`
- Runs install, lint, type-check, and build on pull requests and pushes to protected branches.

### Policy Check
- File: `.github/workflows/policy-check.yml`
- Verifies required governance/docs files exist before merge.

### Weekly Roadmap Sync
- File: `.github/workflows/weekly-roadmap-sync.yml`
- Runs every Monday and opens a planning issue for roadmap/backlog review.

## Copy Checklist

When reusing this workflow set in another repo:
1. Copy all three workflow files.
2. Update branch names and issue labels if needed.
3. Confirm repo secrets cover the build environment.
4. Verify the weekly issue title matches the roadmap cadence.
