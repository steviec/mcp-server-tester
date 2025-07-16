---
description: Create commits with streamlined messages referencing implementation plans
---

# Task

Create a git commit following the template defined here: @.claude/context/COMMIT_MSG.md, with enhanced plan integration.

## Context

- Implementation plan: !`cat .claude/plans/issue-*.md 2>/dev/null | head -30 || echo "No implementation plan found"`

## Your task

1. **Stage and analyze changes**:
   - Auto-stage relevant files with !`git add .`
   - Analyze staged changes: !`git diff --cached`

2. **Generate commit message**:
   - Follow existing format: `<type>: <description>`
   - Reference implementation plan step if available
   - Focus on functional changes, minimal implementation details
   - NO agent signatures or Claude branding

3. **Attempt commit** with generated message:
   - Use !`git commit --no-gpg-sign` to bypass GPG signing requirements
   - **NEVER** use `--no-verify` flag - always respect hooks
   - **If hooks show "fixes applied and staged"**: Commit was aborted (not failed) - RETRY THE SAME COMMIT COMMAND
   - **If hooks show actual errors**: show errors, ask user to fix manually

4. **Push the changes** upstream:
   - Use !`git push` to push the changes to the remote repo

## Enhanced Message Format

**With implementation plan available:**

```
feat: implement user authentication system

Implements step 2 of issue-123 plan: add JWT token validation
and user session management

Fixes #123
```

**Without implementation plan (fallback to current format):**

```
feat: implement user authentication system

- Add JWT token validation
- Implement user session management

Fixes #123
```

## Benefits

- Commits reference specific plan steps for better traceability
- Maintains current format as fallback
- Links commits to technical planning decisions
