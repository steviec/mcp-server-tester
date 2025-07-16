---
allowed-tools: Bash(git*,gh*)
description: Create streamlined pull request focused on changes made, not context repetition
---

# Task

Create a pull request using streamlined template: @.claude/commands2/PR_TEMPLATE.md.

## Context

- Implementation plan: !`cat .claude/plans/issue-*.md 2>/dev/null | tail -50 || echo "No implementation plan found"`
- Recent commits: !`git log --oneline -5`

## Your task

1. **Prepare branch for PR**:
   - Ensure current branch is pushed: !`git push -u origin HEAD`
   - Check git status: !`git status`

2. **Generate streamlined PR content**:
   - Create title using format: `<type>: <description> (fixes #issue)`
   - **Brief summary** of changes made (2-3 sentences max)
   - **Testing completed** - actual tests run, not generic checklist
   - **Breaking changes** or deployment notes if applicable
   - Reference issue for full context - don't repeat motivation

3. **Create pull request**:
   - Use !`gh pr create` with generated title and streamlined content
   - Focus on WHAT CHANGED, not why it was needed (issue has context)

## Streamlined Content Guidelines

### What to Include:

- Summary of changes made
- Actual testing performed
- Breaking changes or deployment considerations
- Issue reference for context

### What to Remove (vs current template):

- Motivation and context (reference issue instead)
- Generic testing checklists
- Repeated problem statements
- Implementation details already in commits

## Target Length

- 50-100 lines total (vs 200+ in current PRs)
- Focus on validation and changes, not justification
