#!/bin/bash

# Claude Release Command
# Usage: /release [patch|minor|major] [--dry-run]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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
            echo "Usage: /release [patch|minor|major] [--dry-run]"
            exit 1
            ;;
    esac
done

if [ -z "$BUMP_TYPE" ]; then
    echo -e "${RED}Error: Version bump type required${NC}"
    echo "Usage: /release [patch|minor|major] [--dry-run]"
    exit 1
fi

echo -e "${BLUE}🚀 Starting release process...${NC}\n"

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}Error: GitHub CLI (gh) is not installed${NC}"
    echo "Install with: brew install gh"
    exit 1
fi

# Check if gh is authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}Error: GitHub CLI is not authenticated${NC}"
    echo "Run: gh auth login"
    exit 1
fi

# Check git working directory is clean
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${RED}Error: Git working directory is not clean${NC}"
    echo "Please commit or stash your changes first"
    exit 1
fi

# Get current version and calculate new version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "Current version: ${GREEN}v$CURRENT_VERSION${NC}"

# Calculate new version
case $BUMP_TYPE in
    patch)
        NEW_VERSION=$(node -p "
            const semver = require('semver');
            semver.inc('$CURRENT_VERSION', 'patch');
        " 2>/dev/null || echo "")
        ;;
    minor)
        NEW_VERSION=$(node -p "
            const semver = require('semver');
            semver.inc('$CURRENT_VERSION', 'minor');
        " 2>/dev/null || echo "")
        ;;
    major)
        NEW_VERSION=$(node -p "
            const semver = require('semver');
            semver.inc('$CURRENT_VERSION', 'major');
        " 2>/dev/null || echo "")
        ;;
esac

# Fallback version calculation if semver is not available
if [ -z "$NEW_VERSION" ]; then
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
fi

echo -e "New version: ${GREEN}v$NEW_VERSION${NC} ($BUMP_TYPE)\n"

# Get last version tag for changelog
LAST_TAG=$(git tag --sort=-version:refname | head -1)
if [ -z "$LAST_TAG" ]; then
    LAST_TAG=$(git rev-list --max-parents=0 HEAD)
    echo -e "${YELLOW}No previous tags found, using initial commit${NC}"
else
    echo -e "Changes since: ${GREEN}$LAST_TAG${NC}"
fi

# Get commits since last release
echo -e "\n${YELLOW}📝 Recent commits:${NC}"
git log --oneline "$LAST_TAG"..HEAD | head -10

echo -e "\n${YELLOW}🔍 Analyzing changes for release notes...${NC}"

# This is where Claude will generate the release notes
# The script will pause here for Claude to analyze and generate content

echo -e "\n${BLUE}⏸️  Please analyze the git history and generate release notes.${NC}"
echo -e "${BLUE}Claude will now create the release summary...${NC}\n"

# Exit here for Claude to take over
exit 0