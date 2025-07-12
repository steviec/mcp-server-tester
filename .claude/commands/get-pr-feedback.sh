#!/bin/bash

# get-pr-feedback.sh - Fetch comprehensive PR feedback in LLM-friendly format
# Usage: ./get-pr-feedback.sh <PR_NUMBER>

set -e

if [ $# -eq 0 ]; then
    echo "Usage: $0 <PR_NUMBER>"
    exit 1
fi

PR_NUM=$1

echo "# PR #$PR_NUM Feedback Summary"
echo ""

# Get repository info
REPO_INFO=$(gh repo view --json owner,name)
OWNER=$(echo "$REPO_INFO" | jq -r '.owner.login')
REPO=$(echo "$REPO_INFO" | jq -r '.name')

echo "## Reviews with Unresolved Comments"
echo ""

# Use GraphQL to get unresolved review threads and their review IDs
GRAPHQL_QUERY='{
  "query": "query($owner: String!, $repo: String!, $pr: Int!) { repository(owner: $owner, name: $repo) { pullRequest(number: $pr) { reviewThreads(first: 100) { nodes { isResolved comments(first: 50) { nodes { id body path line author { login } createdAt pullRequestReview { id } } } } } } } }",
  "variables": {
    "owner": "'$OWNER'",
    "repo": "'$REPO'",
    "pr": '$PR_NUM'
  }
}'

REVIEW_THREADS=$(echo "$GRAPHQL_QUERY" | gh api graphql --input -)

# Get review summaries
REVIEWS=$(gh api "repos/$OWNER/$REPO/pulls/$PR_NUM/reviews")

# Get unique review IDs that have unresolved comments
UNRESOLVED_REVIEW_IDS=$(echo "$REVIEW_THREADS" | jq -r '
  [.data.repository.pullRequest.reviewThreads.nodes[] | 
   select(.isResolved == false) | 
   .comments.nodes[0].pullRequestReview.id] | 
  unique | .[]')

UNRESOLVED_COUNT=$(echo "$REVIEW_THREADS" | jq '[.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved == false)] | length')

if [ -n "$UNRESOLVED_REVIEW_IDS" ]; then
    # Process each review that has unresolved comments
    echo "$UNRESOLVED_REVIEW_IDS" | while IFS= read -r review_id; do
        # Get review summary
        REVIEW_SUMMARY=$(echo "$REVIEWS" | jq -r --arg review_id "$review_id" '.[] | 
        select(.node_id == $review_id) |
        "### \(.state) Review by \(.user.login)
**Submitted:** \(.submitted_at // .created_at)

\(.body // "*No summary provided*")
"')
        
        if [ -n "$REVIEW_SUMMARY" ]; then
            echo "$REVIEW_SUMMARY"
            echo ""
            echo "**Unresolved Comments from this Review:**"
            echo ""
            
            # Get unresolved comments for this specific review
            echo "$REVIEW_THREADS" | jq -r --arg review_id "$review_id" '
              .data.repository.pullRequest.reviewThreads.nodes[] | 
              select(.isResolved == false) | 
              select(.comments.nodes[0].pullRequestReview.id == $review_id) |
              .comments.nodes[] | 
              "- **Comment ID:** \(.id)
  **File:** \(.path // "General") | **Line:** \(.line // "N/A")
  **Content:** \(.body)
"'
            echo ""
            echo "---"
            echo ""
        fi
    done
else
    echo "*No reviews with unresolved comments found.*"
    echo ""
fi

echo ""
echo "## General PR Comments (Contextual)"
echo ""

# Get general PR comments (issue comments)
GENERAL_COMMENTS=$(gh api "repos/$OWNER/$REPO/issues/$PR_NUM/comments")

if [ "$(echo "$GENERAL_COMMENTS" | jq length)" -gt 0 ]; then
    echo "$GENERAL_COMMENTS" | jq -r '.[] | 
    "### Comment by \(.user.login)
**Created:** \(.created_at)

\(.body)

---
"'
else
    echo "*No general PR comments found.*"
    echo ""
fi

echo "## Summary"
echo "- **Unresolved review comments:** $UNRESOLVED_COUNT"
echo "- **General comments:** $(echo "$GENERAL_COMMENTS" | jq length)"
echo "- **Reviews:** $(echo "$REVIEWS" | jq length)"

# No cleanup needed anymore