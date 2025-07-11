# Release Command

Creates a new release with AI-generated release notes.

## Usage

```
/release [patch|minor|major]
```

## Flow

When user runs `/release minor`:

1. **Check prerequisites**: Clean git working directory, gh CLI authenticated
2. **Find last release tag**: Get the most recent semantic version tag (v1.0.2)
3. **Analyze commits**: Get git log since last release tag
4. **Generate release notes**: LLM categorizes commits into features, fixes, etc.
5. **Show preview**: Display new version and release notes
6. **Execute release**: Run npm version, push tags, create GitHub release

## Implementation

```bash
# 1. Prerequisites (helper script)
./.claude/commands/release-check.sh

# 2. Get last release tag and commits
LAST_TAG=$(git tag -l "v*" --sort=-version:refname | head -1)
git log ${LAST_TAG}..HEAD --oneline

# 3. LLM analyzes commits and generates release notes

# 4. Show preview and confirm

# 5. Execute release
npm version [type]
git push && git push --tags
gh release create v[NEW_VERSION] --notes "[GENERATED_NOTES]"
```

The helper script handles deterministic validation, while Claude handles the analysis and orchestration.
