# MCP Server Tester

**Build MCP servers that actually work with LLMs** 🤖

Too many MCP servers work great when you're testing them locally, but then fail to be useful when LLMs try to use them. This tool helps you build servers that are:

- ✅ **Spec-compliant** - Follow the MCP protocol correctly
- ✅ **LLM-friendly** - Work seamlessly with AI assistants
- ✅ **Production-ready** - Handle edge cases and errors properly

## 🧪 Testing Your MCP Server

Verifies your server's specific functionality works correctly, including testing with real LLMs. Ensures your tools do what they claim and that LLMs can discover and use them effectively.

```bash
npx mcp-server-tester verify your-tests.yaml --server-config your-server.json
```

**Two types of tests:**

#### Tools Tests - Direct API verification

```yaml
tools:
  expected_tool_list: ['read_file', 'write_file']
  tests:
    - name: 'Writes file successfully'
      tool: 'write_file'
      params: { path: './test.txt', content: 'hello' }
      expect: { success: true }
```

#### Eval Tests - LLM integration testing

```yaml
evals:
  models: ['claude-3-5-haiku-latest']
  tests:
    - name: 'LLM can create and read files'
      prompt: 'Create a file called test.txt with "hello" and read it back'
      expected_tool_calls:
        required: ['write_file', 'read_file']
```

## Quick Start

1. **Install**

   ```bash
   npm install -g mcp-server-tester
   ```

2. **Create server config** (`server-config.json`):

   ```json
   {
     "mcpServers": {
       "myserver": {
         "command": "node",
         "args": ["./my-mcp-server.js"]
       }
     }
   }
   ```

3. **Let your agent create the functional tests** (`test.yaml`):

   Try a prompt like this:

   ```console
   > please create a basic set of tool and eval tests for my MCP server using the
   `npx mcp-server-tester` tool. Save it to test.yaml and then run
   the "verify" command against it to confirm it's working.
   ```

   Your agent should be able to build up a test suite like this:

   ```yaml
   tools:
     expected_tool_list: ['write_file']
     tests:
       - name: 'Write file successfully'
         tool: 'write_file'
         params: { path: '/tmp/test.txt', content: 'Hello world' }
         expect: { success: true }

       - name: 'Handle invalid path'
         tool: 'write_file'
         params: { path: '/root/forbidden.txt', content: 'test' }
         expect:
           success: false
           error: { contains: 'permission denied' }

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

4. **Run functional tests**:
   ```bash
   export ANTHROPIC_API_KEY="your-key"  # Required for eval tests
   mcp-server-tester verify tests.yaml --server-config server-config.json
   ```

## Advanced Features

### 🔍 Compliance Command (Beta)

> ⚠️ **Work in Progress**: The `compliance` command does not fully coverage the spec yet.

Basic spec compliance checking:

```bash
npx mcp-server-tester compliance --server-config your-server.json
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
