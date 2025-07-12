---
allowed-tools: Bash(gh*,git*,npm*), WebFetch, Grep, Glob, Read, Edit, MultiEdit
description: Review PR comments and implement only the requested fixes
---

# PR Comment Fix Command

**Analyzes PR review comments and implements only the specific fixes requested by reviewers.**

You are an expert software engineer tasked with addressing PR review feedback. Your goal is to analyze review comments on a GitHub PR and implement only the specific changes requested by reviewers, without making additional modifications.

First, you will be given a PR ID for the current repository:

<pr_id>$ARGUMENTS</pr_id>

To complete this task, follow these steps:

1. **Extract PR information**:
   - Use GitHub CLI to fetch PR details and review comments
   - Identify all actionable review feedback

2. **Analyze review comments**:
   - Focus only on comments that request specific code changes
   - Ignore general discussion or approved comments
   - Categorize feedback by file and line number where applicable
   - Distinguish between suggestions, required fixes, and questions

3. **Plan implementation**:
   - Create a focused plan addressing only the requested changes
   - Avoid scope creep - do not implement unrequested improvements
   - Prioritize critical issues and blocking feedback first

4. **Implement fixes**:
   - Make minimal, targeted changes that directly address reviewer feedback
   - Preserve existing code style and patterns
   - Ensure changes are focused and don't introduce unrelated modifications
   - Test changes if testing commands are available

5. **Verify and commit**:
   - Review that all requested changes have been addressed
   - Use commit standards from @.claude/commands/commit.md
   - Include reference to the original PR in commit message

## GitHub CLI Commands

**Fetch PR information:**

```bash
# Use the provided PR ID for the current repository
PR_NUM="$ARGUMENTS"

# Get all line-by-line review comments (critical for detailed feedback)
gh api repos/:owner/:repo/pulls/$PR_NUM/comments
```

**Check current repository context:**

```bash
# Fetch latest changes from origin
git fetch origin

# Checkout the PR branch
gh pr checkout $PR_NUM
```

## Implementation Guidelines

- **Scope limitation**: Address only explicitly requested changes in review comments
- **Code preservation**: Maintain existing code style, patterns, and architecture
- **Minimal changes**: Make the smallest possible changes to satisfy reviewer requests
- **Testing**: Run existing tests if available, don't add new tests unless specifically requested
- **Documentation**: Update only if reviewers specifically request documentation changes

## Output Format

Provide your response in this format:

<analysis>
- Summary of PR and review feedback
- List of specific changes requested by reviewers
- Plan for addressing each piece of feedback
</analysis>

<implementation>
- Actual code changes made
- Files modified and rationale for each change
- Any testing performed
</implementation>

<commit_info>

- Commit message following project standards
- Summary of changes implemented
  </commit_info>

**Important**: Focus exclusively on addressing reviewer feedback. Do not implement additional improvements, refactoring, or optimizations unless specifically requested in the review comments.
