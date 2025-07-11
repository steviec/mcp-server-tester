# PR Creation Standards

**Reusable GitHub CLI workflow for creating pull requests with proper formatting and issue linking.**

## PR Title Format

Follow commit standards from `commit.md`:

- **Structure**: `<type>: <description> (fixes #[issue])`
- **Types**: feat, fix, docs, style, refactor, test, chore
- **Example**: `fix: resolve authentication timeout (fixes #42)`

## Standard PR Body Template

```markdown
## Summary

[Brief description of what this PR accomplishes]

## Changes

- [Key change 1]
- [Key change 2]
- [Key change 3]

## Testing

- [How you tested these changes]
- [Any manual testing performed]
- [Test cases added/updated]

Fixes #[issue-number]
```

## GitHub CLI Command

**Basic PR creation:**

```bash
gh pr create --title "<type>: <description> (fixes #[issue])" --body "## Summary
[Brief description]

## Changes
- [List key changes]

## Testing
- [Testing approach]

Fixes #[issue]"
```

**With issue variable:**

```bash
ISSUE_NUM="123"
gh pr create --title "<type>: <description> (fixes #$ISSUE_NUM)" --body "## Summary
[Brief description]

## Changes
- [List key changes]

## Testing
- [Testing approach]

Fixes #$ISSUE_NUM"
```

## Prerequisites

Before creating PR, ensure:

1. **Branch created**: `issue-[number]-[description]`
2. **Changes committed**: Using standards from `commit.md`
3. **Repository up to date**: `git fetch origin`
4. **GitHub CLI authenticated**: `gh auth status`
