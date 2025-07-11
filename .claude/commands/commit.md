---
allowed-tools: Bash(git*,npm*)
description: Intelligently commit staged changes with generated message and pre-commit hook handling
---

# Commit Standards Reference

**This file defines the project-wide commit and PR standards used across all workflows.**

## Commit Message Format

**Structure**: `<type>: <description>`

**Types**: feat, fix, docs, style, refactor, test, chore

**Rules**:

- Keep description concise (under 50 chars), focus on purpose/benefit
- Add body only if needed to explain WHY or list distinct subsections
- Using bullet points, focus on functional changes and purpose, not technical implementation
- Use the minimum number of bullet points necessary
- NEVER mention specific files, methods, classes, or implementation details

## Issue Linking

**Commit body**: Include `Fixes #123` or `Closes #123` to auto-close issues
**Branch naming**: `issue-123-short-description`
**PR titles**: `<type>: <description> (fixes #123)`

---

# Task

Handle the complete commit workflow:

1. **Stage and analyze changes**:
   - Auto-stage relevant files with `git add .`
   - Analyze staged changes: !`git diff --cached`

2. **Generate commit message** using standards above:

3. **Handle pre-commit hooks**:
   - Attempt commit to trigger lefthook checks
   - If hooks fail, auto-fix when possible:
     - Format issues: `npm run format` → re-stage → retry
     - Lint issues: `npm run lint:fix` → re-stage → retry
     - TypeScript/test errors: show errors, ask user to fix manually
   - **NEVER use --no-verify** - always respect hooks

4. **Create clean commit** with generated message (no Claude branding)

5. **Verify success**: !`git log -1 --oneline`
