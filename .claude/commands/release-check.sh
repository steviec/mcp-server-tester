#!/bin/bash

# Release prerequisite checker
# Returns exit code 0 if all checks pass, 1 if any fail

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔍 Checking release prerequisites..."

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) not found${NC}"
    echo "Install with: brew install gh"
    exit 1
fi

# Check if gh is authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI not authenticated${NC}"
    echo "Run: gh auth login"
    exit 1
fi

# Check git working directory is clean (ignore .claude/ and .md files)
UNCLEAN_FILES=$(git status --porcelain | grep -v "^.* \.claude/" | grep -v "^.* .*\.md$")
if [ -n "$UNCLEAN_FILES" ]; then
    echo -e "${YELLOW}⚠️ Git working directory not clean${NC}"
    echo "Consider stashing your changes"
fi

# Check we're on main/master branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
    echo -e "${YELLOW}⚠️  Currently on branch: $CURRENT_BRANCH${NC}"
    echo -e "${YELLOW}Consider switching to main/master for releases${NC}"
fi

echo -e "${GREEN}✅ All prerequisites satisfied${NC}"

# Get last release tag and commits since then
echo ""
echo "📋 Release Information:"

LAST_TAG=$(git tag -l "v*" --sort=-version:refname | head -1)
if [ -z "$LAST_TAG" ]; then
    echo -e "${YELLOW}No previous release tags found${NC}"
    echo "Commits in this release:"
    git log --oneline | head -10
else
    echo -e "Last release tag: ${GREEN}$LAST_TAG${NC}"
    echo "Commits since $LAST_TAG:"
    git log $LAST_TAG..HEAD --oneline
fi

exit 0