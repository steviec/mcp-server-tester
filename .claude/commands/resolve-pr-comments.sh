#!/bin/bash

# resolve-pr-comments.sh - Resolve specific PR review comments by their IDs
# Usage: ./resolve-pr-comments.sh <PR_NUMBER> <COMMENT_ID1> [COMMENT_ID2] ...

set -e

if [ $# -lt 2 ]; then
    echo "Usage: $0 <PR_NUMBER> <COMMENT_ID1> [COMMENT_ID2] ..."
    echo "Example: $0 3 1234567890 1234567891"
    exit 1
fi

PR_NUM=$1
shift
COMMENT_IDS=("$@")

echo "Resolving comments for PR #$PR_NUM"
echo "Comment IDs: ${COMMENT_IDS[*]}"

# Get repository info
REPO_INFO=$(gh repo view --json owner,name)
OWNER=$(echo "$REPO_INFO" | jq -r '.owner.login')
REPO=$(echo "$REPO_INFO" | jq -r '.name')

echo "Repository: $OWNER/$REPO"

# Get PR node ID
echo "Getting PR node ID..."
PR_NODE_ID=$(gh api graphql -f query='
  query($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $number) { id }
    }
  }' -f owner="$OWNER" -f repo="$REPO" -F number="$PR_NUM" --jq '.data.repository.pullRequest.id')

if [ -z "$PR_NODE_ID" ]; then
    echo "Error: Could not get PR node ID"
    exit 1
fi

echo "PR Node ID: $PR_NODE_ID"

# Get all review threads for this PR
echo "Getting review threads..."
REVIEW_THREADS=$(gh api graphql -f query='
  query($id: ID!) {
    node(id: $id) {
      ... on PullRequest {
        reviewThreads(first: 100) {
          nodes {
            id
            isResolved
            comments(first: 10) {
              nodes {
                databaseId
                id
              }
            }
          }
        }
      }
    }
  }' -f id="$PR_NODE_ID")

echo "Found review threads"

# For each comment ID, find its thread and resolve it
for comment_id in "${COMMENT_IDS[@]}"; do
    echo "Processing comment ID: $comment_id"
    
    # Find the thread ID for this comment
    THREAD_ID=$(echo "$REVIEW_THREADS" | jq -r --arg comment_id "$comment_id" '
      .data.node.reviewThreads.nodes[] |
      select(.comments.nodes[] | .databaseId == ($comment_id | tonumber)) |
      .id
    ')
    
    if [ -z "$THREAD_ID" ] || [ "$THREAD_ID" = "null" ]; then
        echo "Warning: Could not find thread for comment ID $comment_id"
        continue
    fi
    
    # Check if thread is already resolved
    IS_RESOLVED=$(echo "$REVIEW_THREADS" | jq -r --arg thread_id "$THREAD_ID" '
      .data.node.reviewThreads.nodes[] |
      select(.id == $thread_id) |
      .isResolved
    ')
    
    if [ "$IS_RESOLVED" = "true" ]; then
        echo "Thread for comment $comment_id is already resolved"
        continue
    fi
    
    echo "Resolving thread $THREAD_ID for comment $comment_id..."
    
    # Resolve the thread
    RESULT=$(gh api graphql -f query='
      mutation($id: ID!) {
        resolveReviewThread(input: {threadId: $id}) {
          thread { id }
        }
      }' -f id="$THREAD_ID")
    
    if echo "$RESULT" | jq -e '.data.resolveReviewThread.thread.id' > /dev/null; then
        echo "✓ Successfully resolved comment $comment_id"
    else
        echo "✗ Failed to resolve comment $comment_id"
        echo "Error: $RESULT"
    fi
done

echo "Done resolving comments"