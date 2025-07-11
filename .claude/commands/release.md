# Release Command

When the user runs `/release [patch|minor|major]`, create a new release with AI-generated release notes.

## Steps to Execute

1. **Extract the version type** from the user's command (patch, minor, or major)

2. **Check prerequisites** by running `./.claude/commands/release-check.sh`

3. **Get the last release tag and commits since then**:

   ```bash
   LAST_TAG=$(git tag -l "v*" --sort=-version:refname | head -1)
   git log ${LAST_TAG}..HEAD --oneline
   ```

4. **Analyze the commits and generate appropriately-sized release notes**:
   - **1-3 commits**: Single line per meaningful change
   - **5+ commits**: Group into categories (Features, Fixes, etc.)
   - **Internal/tooling changes**: Keep minimal unless user-facing
   - **Breaking changes**: Always highlight prominently

5. **Show preview** of the proposed version bump and release notes

6. **Ask user to confirm** before proceeding

7. **If confirmed, execute the release**:
   ```bash
   npm version [patch|minor|major]
   git push && git push --tags
   gh release create v[NEW_VERSION] --notes "[GENERATED_NOTES]"
   ```

## Example Usage

```
User: /release patch
Claude: [follows steps above to create a patch release]
```
