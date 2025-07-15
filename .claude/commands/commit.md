---
description: Intelligently commit staged changes with generated message and pre-commit hook handling
---

# Task

Create a new git commit following the template defined here: @.claude/context/COMMIT_MSG.md.

1. **Stage and analyze changes**:
   - Auto-stage relevant files with !`git add .`
   - Analyze staged changes: !`git diff --cached`

2. **Generate commit message**:
   - Populate the commit template based on the changes
   - NO agent signatures or Claude branding

3. **Attempt commit** with generated message:
   - Use !`git commit --no-gpg-sign` to bypass GPG signing requirements
   - **NEVER** use `--no-verify` flag - always respect hooks
   - **If hooks show "fixes applied and staged"**: Commit was aborted (not failed) - RETRY THE SAME COMMIT COMMAND
   - **If hooks show actual errors**: show errors, ask user to fix manually

4. **Push the changes** upstream:

- Use !`git push` to push the changes to the remote repo
