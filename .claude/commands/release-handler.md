# Release Handler Implementation

This file defines how Claude should handle the `/release` command.

## Command Flow

When user types `/release [patch|minor|major] [--dry-run]`:

1. **Parse Arguments**: Extract version type and flags
2. **Run Prerequisites Check**: Execute initial validation script
3. **Analyze Git History**: Get changes since last release
4. **Generate Release Notes**: Use AI to create comprehensive changelog
5. **Show Preview**: Display proposed changes for review
6. **Execute Release** (if approved): Bump version and create release

## Implementation Steps

### Step 1: Validation & Setup

```bash
# Run the prerequisite checks
./.claude/commands/release.sh [args]
```

### Step 2: Analyze Changes

```bash
# Get commits since last tag
git log --oneline [LAST_TAG]..HEAD

# Get file changes
git diff --name-only [LAST_TAG]..HEAD

# Get detailed changes
git log --format="%h %s%n%b" [LAST_TAG]..HEAD
```

### Step 3: AI Release Note Generation

Analyze the changes and generate:

- **Breaking Changes**: API changes, renames, removals
- **New Features**: Added functionality, new capabilities
- **Bug Fixes**: Fixed issues, resolved problems
- **Improvements**: Performance, UX, DX enhancements
- **Documentation**: README updates, new examples
- **Internal**: Refactoring, tooling, dependencies

### Step 4: Preview Format

```
📋 Proposed Release: v[NEW_VERSION] ([TYPE])

🔍 Changes since [LAST_TAG]:
- [Bullet point summary of key changes]

📝 Generated Release Notes:
## Breaking Changes
- [If any]

## New Features
- [Feature descriptions]

## Bug Fixes
- [Fix descriptions]

## Improvements
- [Enhancement descriptions]

## Documentation
- [Doc updates]

Proceed with release? (y/n)
```

### Step 5: Release Execution

If approved:

```bash
# Bump version and tag
npm version [TYPE] --no-git-tag-version
git add package.json package-lock.json
git commit -m "chore: bump version to v[NEW_VERSION]"
git tag v[NEW_VERSION]

# Push changes
git push origin main
git push origin v[NEW_VERSION]

# Create GitHub release
gh release create v[NEW_VERSION] \
  --title "Release v[NEW_VERSION]" \
  --notes "[GENERATED_NOTES]"
```

## Error Handling

- Validate git status is clean
- Check GitHub CLI authentication
- Verify npm version command success
- Handle network failures gracefully
- Rollback on errors (delete tag, reset commit)

## Dry Run Mode

When `--dry-run` is used:

- Show all proposed changes
- Generate release notes
- Display exact commands that would run
- Do NOT execute version bump or release creation
