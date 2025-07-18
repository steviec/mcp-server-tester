# MCP Server Tester

**Build MCP servers that actually work with LLMs** 🤖

Too many MCP servers work great when you're testing them locally, but then fail to be useful when LLMs try to use them. This tool helps you build servers that are:

- ✅ **Spec-compliant** - Follow the MCP protocol correctly
- ✅ **LLM-friendly** - Work seamlessly with AI assistants
- ✅ **Production-ready** - Handle edge cases and errors properly

## The Two-Step Verification Process

### 1. 🏥 `doctor` - Spec compliance check

Runs diagnostics on your MCP server without needing any configuration or knowledge of your server's functionality. Catches spec violations that cause LLMs to fail or behave unpredictably.

```bash
npx mcp-server-tester doctor --server-config your-server.json
```

**Example output:**

```
🏥 MCP SERVER DOCTOR v1.0.0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 FEATURES ❌ 4/17 passed
🔍 LIFECYCLE ✅ 3/3 passed
🔍 PROTOCOL ⚠️ 8/11 passed

📊 OVERALL MCP COMPLIANCE: 67/100

⚠️ WARNINGS
• Error response format issues detected
• JSON-RPC error code issues detected
• Protocol version issues detected

💡 RECOMMENDATIONS
• Implement proper error response formatting
• Ensure -32601 for method not found
• Update server to latest MCP specification
```

### 2. 🧪 `test` - Functional Testing

Verifies your server's specific functionality works correctly, including testing with real LLMs. Ensures your tools do what they claim and that LLMs can discover and use them effectively.

```bash
npx mcp-server-tester test your-tests.yaml --server-config your-server.json
```

**Two types of tests:**

#### Tools Tests - Direct API verification

```yaml
tools:
  expected_tool_list: ['read_file', 'write_file']
  tests:
    - name: 'Write file successfully'
      tool: 'write_file'
      params: { path: '/tmp/test.txt', content: 'hello' }
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

3. **Run health check first**:

   ```bash
   mcp-server-tester doctor --server-config server-config.json
   ```

4. **Let your agent create the functional tests** (`test.yaml`):

   Try a prompt like this:

   ```console
   > can you create a basic set of tests for my mcp server's 'write_file' tool
   using the `npx mcp-server-tester` tool. Save it to test.yaml and then run
   the "test" command against it to confirm it's working.
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

5. **Run functional tests**:
   ```bash
   export ANTHROPIC_API_KEY="your-key"  # Required for eval tests
   mcp-server-tester test tests.yaml --server-config server-config.json
   ```

## Contributing

We welcome contributions! Please ensure all PRs:

1. Pass `doctor` diagnostics
2. Include tests for new features
3. Update documentation

## License

MIT
