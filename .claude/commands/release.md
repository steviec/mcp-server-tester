---
description: Create a new release with AI-generated release notes
---

# Task

Create a new release with version type $ARGUMENTS (patch, minor, or major).

## Context

- Current git status: !`git status`
- Last release and commits: !`./.claude/commands/release-check.sh`

## Your task

1. **Analyze the commits and generate appropriately-sized release notes**:
   - **1-3 commits**: Single line per meaningful change
   - **5+ commits**: Group into categories (Features, Fixes, etc.)
   - **Internal/tooling changes**: Keep minimal unless user-facing
   - **Breaking changes**: Always highlight prominently

2. **Show preview** of the proposed version bump and release notes

3. **Ask user to confirm** before proceeding

4. **If confirmed, execute the release**:
   - Use !`npm version $ARGUMENTS`
   - Use !`git push && git push --tags`
   - Use !`gh release create v[NEW_VERSION] --notes "[GENERATED_NOTES]"`
