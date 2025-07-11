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

# Check git working directory is clean
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${RED}❌ Git working directory not clean${NC}"
    echo "Please commit or stash your changes:"
    git status --short
    exit 1
fi

# Check we're on main/master branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
    echo -e "${YELLOW}⚠️  Currently on branch: $CURRENT_BRANCH${NC}"
    echo -e "${YELLOW}Consider switching to main/master for releases${NC}"
fi

echo -e "${GREEN}✅ All prerequisites satisfied${NC}"
exit 0