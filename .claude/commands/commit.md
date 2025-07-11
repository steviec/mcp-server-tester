---
allowed-tools: Bash(git*,npm*)
description: Intelligently commit staged changes with generated message and pre-commit hook handling
---

# Context

- Current git status: !`git status`
- Recent commits: !`git log --oneline -5`
- Package.json scripts: @`package.json` (scripts section)

# Task

Handle the complete commit workflow:

1. **Stage and analyze changes**:
   - Auto-stage relevant files with `git add .`
   - Analyze staged changes: !`git diff --cached`

2. **Generate commit message** based on changes:
   - Use conventional commit format: `<type>: <description>`
   - Types: feat, fix, docs, style, refactor, test, chore

3. **Handle pre-commit hooks**:
   - Attempt commit to trigger lefthook checks
   - If hooks fail, auto-fix when possible:
     - Format issues: `npm run format` → re-stage → retry
     - Lint issues: `npm run lint:fix` → re-stage → retry
     - TypeScript/test errors: show errors, ask user to fix manually
   - **NEVER use --no-verify** - always respect hooks

4. **Create clean commit** with generated message (no Claude branding)

5. **Verify success**: !`git log -1 --oneline`
