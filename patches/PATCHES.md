# Patches

This directory contains patches applied to dependencies using `patch-package`.

## @modelcontextprotocol/sdk

**File:** `@modelcontextprotocol+sdk+1.15.0.patch`

**Issue:** Child processes spawned by `StdioClientTransport` were not properly terminated on disconnect, causing Node.js processes to hang after tests completed.

**Source:** Based on [PR #821](https://github.com/modelcontextprotocol/typescript-sdk/pull/821) in the TypeScript SDK repository.

**Description:**
The SDK's `StdioClientTransport.close()` method was only calling `abort()` on the AbortController but not actually terminating the child process. This patch adds a graceful shutdown sequence:

1. Close stdin and wait 100ms for natural exit
2. Send SIGTERM and wait 1 second
3. Send SIGKILL as last resort

**Status:** This patch can be removed once PR #821 is merged and released in a version after 1.15.0.

**Related Issues:**

- [typescript-sdk#579](https://github.com/modelcontextprotocol/typescript-sdk/issues/579) - StdioClientTransport does not follow spec on close
- [typescript-sdk#547](https://github.com/modelcontextprotocol/typescript-sdk/issues/547) - Docker containers don't properly terminate
