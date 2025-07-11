#!/bin/bash

# Complete Release Command Implementation
# Usage: ./release-complete.sh [patch|minor|major] [--dry-run]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Parse arguments
BUMP_TYPE=""
DRY_RUN=false

for arg in "$@"; do
    case $arg in
        patch|minor|major)
            BUMP_TYPE="$arg"
            ;;
        --dry-run)
            DRY_RUN=true
            ;;
        *)
            echo -e "${RED}Error: Unknown argument '$arg'${NC}"
            echo "Usage: $0 [patch|minor|major] [--dry-run]"
            exit 1
            ;;
    esac
done

if [ -z "$BUMP_TYPE" ]; then
    echo -e "${RED}Error: Version bump type required${NC}"
    echo "Usage: $0 [patch|minor|major] [--dry-run]"
    exit 1
fi

echo -e "${BLUE}🚀 Release Process Started${NC}"
if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}📋 DRY RUN MODE - No changes will be made${NC}"
fi
echo ""

# Prerequisites check
echo -e "${PURPLE}📋 Checking Prerequisites...${NC}"

# Check gh CLI
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) not found${NC}"
    echo "Install: brew install gh"
    exit 1
fi

# Check gh auth
if ! gh auth status &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI not authenticated${NC}"
    echo "Run: gh auth login"
    exit 1
fi

# Check git status
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${RED}❌ Git working directory not clean${NC}"
    git status --short
    exit 1
fi

echo -e "${GREEN}✅ All prerequisites satisfied${NC}\n"

# Version calculation
CURRENT_VERSION=$(node -p "require('./package.json').version")
IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_VERSION"
MAJOR=${VERSION_PARTS[0]}
MINOR=${VERSION_PARTS[1]}
PATCH=${VERSION_PARTS[2]}

case $BUMP_TYPE in
    patch)
        NEW_VERSION="$MAJOR.$MINOR.$((PATCH + 1))"
        ;;
    minor)
        NEW_VERSION="$MAJOR.$((MINOR + 1)).0"
        ;;
    major)
        NEW_VERSION="$((MAJOR + 1)).0.0"
        ;;
esac

echo -e "${BLUE}📊 Version Information${NC}"
echo -e "Current: ${GREEN}v$CURRENT_VERSION${NC}"
echo -e "New:     ${GREEN}v$NEW_VERSION${NC} ($BUMP_TYPE)"
echo ""

# Get last tag for changelog
LAST_TAG=$(git tag --sort=-version:refname | head -1 2>/dev/null || echo "")
if [ -z "$LAST_TAG" ]; then
    COMMIT_RANGE="--all"
    echo -e "${YELLOW}📅 No previous tags found - analyzing all commits${NC}"
else
    COMMIT_RANGE="$LAST_TAG..HEAD"
    echo -e "${BLUE}📅 Analyzing changes since: ${GREEN}$LAST_TAG${NC}"
fi
echo ""

# Collect change information
echo -e "${PURPLE}🔍 Analyzing Changes...${NC}"

# Get commits
COMMITS=$(git log --oneline $COMMIT_RANGE 2>/dev/null || echo "No commits found")
COMMIT_COUNT=$(echo "$COMMITS" | wc -l | tr -d ' ')

# Get changed files
if [ "$LAST_TAG" != "" ]; then
    CHANGED_FILES=$(git diff --name-only $LAST_TAG..HEAD 2>/dev/null || echo "")
else
    CHANGED_FILES=$(git ls-files)
fi

echo -e "📈 ${GREEN}$COMMIT_COUNT${NC} commits"
echo -e "📁 $(echo "$CHANGED_FILES" | wc -l | tr -d ' ') files changed"
echo ""

# Display recent commits
echo -e "${YELLOW}📝 Recent Commits:${NC}"
echo "$COMMITS" | head -10
echo ""

# Display changed files by category
echo -e "${YELLOW}📁 Changed Files:${NC}"
if [ -n "$CHANGED_FILES" ]; then
    echo "$CHANGED_FILES" | head -15
    if [ $(echo "$CHANGED_FILES" | wc -l) -gt 15 ]; then
        echo "... and $(( $(echo "$CHANGED_FILES" | wc -l) - 15 )) more files"
    fi
else
    echo "No files changed"
fi
echo ""

# Generate release notes template
echo -e "${PURPLE}📄 Release Notes Template Generated${NC}"
echo -e "${BLUE}================================================================${NC}"
cat << EOF
# Release v$NEW_VERSION

## Summary
[TO BE FILLED BY CLAUDE: Concise summary of this release]

## Changes Since $LAST_TAG

### 🚀 New Features
[TO BE FILLED BY CLAUDE: New functionality added]

### 🐛 Bug Fixes  
[TO BE FILLED BY CLAUDE: Issues resolved]

### 🔧 Improvements
[TO BE FILLED BY CLAUDE: Enhancements and optimizations]

### 📚 Documentation
[TO BE FILLED BY CLAUDE: Documentation updates]

### 🏗️ Internal Changes
[TO BE FILLED BY CLAUDE: Refactoring, tooling, dependencies]

### ⚠️ Breaking Changes
[TO BE FILLED BY CLAUDE: Breaking changes if any]

## Installation

\`\`\`bash
npm install -g mcp-server-tester@$NEW_VERSION
\`\`\`

---
Full changelog: https://github.com/$(gh repo view --json owner,name -q '.owner.login + "/" + .name')/compare/$LAST_TAG...v$NEW_VERSION
EOF
echo -e "${BLUE}================================================================${NC}"
echo ""

# Show execution plan
echo -e "${PURPLE}📋 Execution Plan${NC}"
if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}The following commands WOULD be executed:${NC}"
else
    echo -e "${GREEN}The following commands WILL be executed:${NC}"
fi

cat << EOF

1. Update package.json version to $NEW_VERSION
2. Create git commit: "chore: bump version to v$NEW_VERSION" 
3. Create git tag: v$NEW_VERSION
4. Push changes to origin/main
5. Push tag to origin
6. Create GitHub release with generated notes

Commands:
  npm version $BUMP_TYPE --no-git-tag-version
  git add package.json package-lock.json
  git commit -m "chore: bump version to v$NEW_VERSION"
  git tag v$NEW_VERSION
  git push origin main
  git push origin v$NEW_VERSION
  gh release create v$NEW_VERSION --title "Release v$NEW_VERSION" --notes-file RELEASE_NOTES.md

EOF

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}🏁 Dry run complete. No changes made.${NC}"
    echo -e "${BLUE}💡 Claude: Please analyze the above information and generate comprehensive release notes.${NC}"
    exit 0
fi

echo -e "${YELLOW}⚠️  Ready to execute release. This will make real changes!${NC}"
echo -e "${BLUE}💡 Claude: Please review the above and confirm before proceeding.${NC}"
echo ""
read -p "Do you want to proceed with the release? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🚫 Release cancelled by user${NC}"
    exit 0
fi

echo -e "${GREEN}🚀 Executing release...${NC}"

# Execute release steps
set -x  # Show commands being executed

npm version $BUMP_TYPE --no-git-tag-version
git add package.json package-lock.json
git commit -m "chore: bump version to v$NEW_VERSION"
git tag v$NEW_VERSION
git push origin main
git push origin v$NEW_VERSION

set +x

echo -e "${GREEN}✅ Release v$NEW_VERSION completed successfully!${NC}"
echo -e "${BLUE}🔗 Create GitHub release at: https://github.com/$(gh repo view --json owner,name -q '.owner.login + "/" + .name')/releases/new?tag=v$NEW_VERSION${NC}"
echo -e "${YELLOW}💡 Don't forget to create the GitHub release with your generated notes!${NC}"