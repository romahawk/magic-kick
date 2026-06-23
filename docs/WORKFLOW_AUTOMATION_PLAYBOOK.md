> This playbook is the real artifact of Magic Kick as a sandbox. The app is the worked example.

# Workflow Automation Playbook

Use these workflow files as the canonical automation set for this repository:

- `.github/workflows/ci.yml`
- `.github/workflows/policy-check.yml`

## What Each Workflow Does

### CI
- File: `.github/workflows/ci.yml`
- Runs install, lint, type-check, and build on pull requests and pushes to protected branches.

### Policy Check
- File: `.github/workflows/policy-check.yml`
- Verifies required governance/docs files exist before merge.

## Copy Checklist

When reusing this workflow set in another repo:
1. Copy both workflow files.
2. Update branch names if needed.
3. Confirm repo secrets cover the build environment.
