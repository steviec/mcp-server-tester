# MCP Server Tester

The MCP Server Tester is a tool for automated testing of MCP servers.

## Why this tool?

Building reliable MCP servers that work consistently and are spec-compliant is harder than it should be:

- the Inspector tool helps to build and test the intial server, but won't protect you from regressions
- tools works perfectly in direct testing, but LLMs use them incorrectly and inconsistently in the real world
- most MCP SDKs aren't fully spec-compliant, and it's hard to know what's missing
- the spec evolves rapidly, making it hard to stay current with best practices

The `mcp-server-tester` is a implementation-agnostic CLI testing tool that provides three focused commands that help solve these core issues:

- **`tools`** - Run tests that verify your tools work correctly with direct MCP calls
- **`evals`** - Run tests that verify LLMs can consistently understand and use your tools correctly
- **`compliance`** - Automated server spec validation as the protocol evolves _(Work in Progress)_

---

## Commands

### `tools` - Direct MCP Tool Testing

Test your tools work correctly with direct API calls:

```bash
npx mcp-server-tester tools filesystem-tool-tests.yaml --server-config filesystem-server-config.json
```

**Sample output:**

```
✅ Tool Discovery: Found 3 tools (read_file, write_file, delete_file)
✅ Write file successfully
✅ Read file returns content
✅ Write and read workflow
❌ Handle invalid path - Expected error containing 'permission' but got 'access denied'
✅ Delete file cleanup

Results: 5/6 tests passed
```

### `evals` - LLM Integration Testing

Test that LLMs can discover and use your tools effectively:

```bash
npx mcp-server-tester evals filesystem-eval-tests.yaml --server-config filesystem-server-config.json
```

**Sample output:**

```
🤖 Testing with claude-3-5-haiku-latest
✅ LLM can create and read files
✅ File manipulation workflow
✅ Error handling test
❌ Documentation query task: FAILED
    Prompt: "How do I search for configuration files in the project?"
    • Required tool 'search_docs' was not called (actual calls: list_files)
❌ Lists all available tools: FAILED
    Prompt: "Please list all available file management tools you have access to."
    • LLM judge failed: Score: 0.3/1.0 (threshold: 0.8). Assistant did not provide complete tool list.

Results: 3/5 tests passed
```

_Note: Requires `ANTHROPIC_API_KEY` environment variable._

### `compliance` - MCP Specification Compliance Testing

Test that your server is spec compliant:

```bash
npx mcp-server-tester compliance --server-config filesystem-server-config.json
```

See the [Compliance Command (WIP)](#compliance-command-wip) section below for details and example output.

## Quick Start

1. **Install**

   ```bash
   npm install -g mcp-server-tester
   ```

2. **Create server config** (`filesystem-server-config.json`):

   ```json
   {
     "mcpServers": {
       "filesystem": {
         "command": "node",
         "args": ["./filesystem-server.js"]
       }
     }
   }
   ```

3. **Create your test file** (`filesystem-tests.yaml`):

   ```yaml
   tools:
     expected_tool_list: ['write_file']
     tests:
       - name: 'Write file successfully'
         tool: 'write_file'
         params: { path: '/tmp/test.txt', content: 'Hello world' }
         expect: { success: true }

   evals:
     models: ['claude-3-5-haiku-latest']
     tests:
       - name: 'LLM can write files'
         prompt: 'Create a file at /tmp/greeting.txt with the content "Hello from Claude"'
         expected_tool_calls:
           required: ['write_file']
         response_scorers:
           - type: 'llm-judge'
             criteria: 'Did the assistant successfully create the file?'
             threshold: 0.8
   ```

   See the [Tools Testing](#tools-testing) and [Evals Testing](#evals-testing) sections for comprehensive syntax examples.

4. **Run functional tests**:

   ```bash
   # Run tools tests (fast, no API key needed)
   mcp-server-tester tools filesystem-tests.yaml --server-config filesystem-server-config.json

   # Run LLM evaluation tests (requires API key)
   export ANTHROPIC_API_KEY="your-key"
   mcp-server-tester evals filesystem-tests.yaml --server-config filesystem-server-config.json
   ```

## Tools Testing

The `tools` command tests your MCP server tools with direct API calls. This is fast, requires no API keys, and helps verify your tools work correctly before testing with LLMs.

### Basic Syntax

```yaml
tools:
  expected_tool_list: ['tool1', 'tool2'] # Optional: verify specific tools are available
  tests:
    - name: 'Test description'
      tool: 'tool_name'
      params: { param1: 'value1' }
      expect: { success: true }
```

### Single Tool Tests

Test individual tool calls:

```yaml
tools:
  tests:
    # Basic success test
    - name: 'Write file successfully'
      tool: 'write_file'
      params: { path: '/tmp/test.txt', content: 'hello world' }
      expect: { success: true }

    # Error handling test
    - name: 'Handle invalid path'
      tool: 'write_file'
      params: { path: '/invalid/path.txt', content: 'test' }
      expect:
        success: false
        error: { contains: 'permission denied' }

    # Result validation test
    - name: 'Read file returns content'
      tool: 'read_file'
      params: { path: '/tmp/existing.txt' }
      expect:
        success: true
        result: { contains: 'expected content' }
```

### Multi-Step Workflow Tests

Test sequences of tool calls:

```yaml
tools:
  tests:
    - name: 'Write and read workflow'
      calls:
        - tool: 'write_file'
          params: { path: '/tmp/workflow.txt', content: 'test data' }
          expect: { success: true }

        - tool: 'read_file'
          params: { path: '/tmp/workflow.txt' }
          expect:
            success: true
            result: { equals: 'test data' }

        - tool: 'delete_file'
          params: { path: '/tmp/workflow.txt' }
          expect: { success: true }
```

### Expectation Types

**Success/Failure:**

```yaml
expect: { success: true }   # Tool should succeed
expect: { success: false }  # Tool should fail
```

**Error Validation:**

```yaml
expect:
  success: false
  error: { contains: 'permission denied' } # Error message must contain text
```

**Result Validation:**

```yaml
expect:
  success: true
  result: { contains: 'partial text' }      # Result must contain text
  result: { equals: 'exact match' }         # Result must exactly match
```

## Evals Testing

The `evals` command tests that LLMs can discover and use your tools effectively. This requires an `ANTHROPIC_API_KEY` and tests real-world usage patterns.

### Basic Syntax

```yaml
evals:
  models: ['claude-3-5-haiku-latest']
  maxSteps: 5 # Optional: limit conversation turns
  tests:
    - name: 'Test description'
      prompt: 'Task for the LLM to complete'
      expected_tool_calls:
        required: ['tool1', 'tool2']
      response_scorers:
        - type: 'llm-judge'
          criteria: 'Did the assistant complete the task?'
```

### Tool Call Validation

Control which tools the LLM should use:

```yaml
evals:
  tests:
    - name: 'LLM must use specific tools'
      prompt: 'Create and read a file'
      expected_tool_calls:
        required: ['write_file', 'read_file'] # Must use these tools
        allowed: ['write_file', 'read_file'] # Can only use these tools
        forbidden: ['delete_file'] # Must not use these tools
```

### Response Scoring

Evaluate the quality of LLM responses:

**Regex Scorer:**

```yaml
response_scorers:
  - type: 'regex'
    pattern: 'success|completed|done' # Response must match pattern
    threshold: 1.0 # Optional: defaults to 1.0
```

**LLM Judge Scorer:**

```yaml
response_scorers:
  - type: 'llm-judge'
    criteria: 'Did the assistant successfully complete the file operations?'
    threshold: 0.8 # Score must be >= 0.8
```

**Contains Scorer:**

```yaml
response_scorers:
  - type: 'contains'
    text: 'File created successfully' # Response must contain exact text
```

### Advanced Options

**Environment Variable Replacement:**
Use `${VAR_NAME}` syntax to inject environment variables into your test configurations:

```bash
export API_BASE_URL="https://api.example.com"
export TEST_USER="alice"
mcp-server-tester tools test.yaml --server-config server.json
```

```yaml
tools:
  tests:
    - name: 'Test ${TEST_USER} API access'
      tool: 'api_call'
      params:
        url: '${API_BASE_URL}/users/${TEST_USER}'
        method: 'GET'
      expect:
        success: true
        result: { contains: '${TEST_USER}' }
```

Environment variables work in test names, parameters, expectations, and all other config values. Missing variables will cause the config loading to fail with a helpful error message.

**Debug Mode:**
See full conversation output and scoring details:

```bash
mcp-server-tester evals filesystem-eval-tests.yaml --server-config filesystem-server-config.json --debug
```

**Multiple Models:**

```yaml
evals:
  models: ['claude-3-5-haiku-latest', 'claude-3-5-sonnet-latest']
  tests: [...]
```

**Complex Evaluation:**

```yaml
evals:
  tests:
    - name: 'Multi-step file management'
      prompt: |
        Create a file called notes.txt with "Meeting notes from today".
        Then read it back and confirm the content is correct.
        Finally, create a backup copy called notes-backup.txt.
      expected_tool_calls:
        required: ['write_file', 'read_file']
        allowed: ['write_file', 'read_file', 'copy_file']
      response_scorers:
        - type: 'llm-judge'
          criteria: 'Did the assistant create the original file, read it back, and create a backup?'
          threshold: 0.8
        - type: 'contains'
          text: 'Meeting notes from today'
```

## Compliance Command (WIP)

> ⚠️ **Work in Progress**: The `compliance` command does not fully cover the spec yet.

I'm not 100% convinced that a compliance checker should live in this tool. But it's been useful to me, so I'll include it here. It's far from complete.

```bash
npx mcp-server-tester compliance --server-config filesystem-server-config.json
```

**Example output:**

```
🏥 MCP SERVER COMPLIANCE
Diagnosing server: Filesystem MCP (MCP Protocol 2024-11-05)
Started: 7/19/2025, 7:53:57 AM

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 MCP SPECIFICATION COMPLIANCE SUMMARY

🔍 BASE PROTOCOL
   └─ Transport Layer      ✅  3/3 passed
   └─ JSON-RPC 2.0         ❌  0/2 passed

🔍 LIFECYCLE
   └─ Initialization       ✅  2/2 passed
   └─ Capability Negotiation ✅  1/1 passed
   └─ Protocol Version     ❌  0/1 passed

🔍 SERVER FEATURES
   └─ Tools                ❌  3/4 passed
   └─ Resources            skipped (not advertised)
   └─ Prompts              skipped (not advertised)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 OVERALL MCP COMPLIANCE: 80/100 (2 features skipped)

Server Capabilities: tools ✅ | prompts ⏭️ | resources ⏭️

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  SPECIFICATION WARNINGS (4)

⚠️  SDK: JSON-RPC Protocol Compliance [Base Protocol - JSON-RPC 2.0]
   Expected: Full JSON-RPC 2.0 compliance
   Actual:   1 compliance issues detected
   → Fix: Check capability advertisement matches implementation
   → Fix: Verify method name spelling and casing

⚠️  SDK: Error Response Validation [Base Protocol - Error Handling]
   Expected: Proper JSON-RPC error codes and format
   Actual:   2 error handling issues detected
   → Fix: Ensure server returns proper JSON-RPC error codes
   → Fix: Verify that the server properly validates requests
   → Fix: Ensure error handling is implemented according to JSON-RPC spec

⚠️  Lifecycle: Protocol Version Negotiation
   Protocol version issues detected (2 findings, 4 validations)

⚠️  Server Features: Tools - Execution (tools/call)
   Expected: Proper tool execution or error handling
   Actual:   1 execution issues detected
   → Fix: Verify error response format compliance

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 DETAILED COMPLIANCE BREAKDOWN
   base-protocol: 3/5 tests passed
   lifecycle: 7/8 tests passed
   server-features: 3/12 tests passed

🔗 SPECIFICATION REFERENCES
• MCP Specification: https://spec.modelcontextprotocol.io/
• JSON-RPC 2.0: https://www.jsonrpc.org/specification
• Error Codes: https://spec.modelcontextprotocol.io/specification/basic/error-handling/
```

## License

MIT
