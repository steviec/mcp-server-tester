---
allowed-tools: Bash(git*,gh*)
description: Create pull request with proper title, description, and issue linking
---

# Task

Create a pull request using this template: @.claude/context/PULL_REQUEST_TEMPLATE.md.

1. **Prepare branch for PR**:
   - Ensure current branch is pushed: !`git push -u origin HEAD`
   - Check git status: !`git status`

2. **Generate PR content**:
   - Create title using format: `<type>: <description> (fixes #issue)`
   - Fill template sections based on commit history and changes
   - Focus on functional changes and purpose, not implementation details
   - Ensure issue linking is included in Related Issues section

3. **Create pull request**:
   - Use !`gh pr create` with generated title and template content
   - Populate all relevant template sections

4. **Verify PR creation**:
   - Display PR URL: !`gh pr view --web`
   - Confirm issue linking worked correctly
