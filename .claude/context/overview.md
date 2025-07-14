# Project Overview

MCP Server Tester is a CLI tool that confirms MCP servers provide correct capabilities and can be used consistently by LLMs.

## Core Functionality

- **Tools Testing**: Direct API calls to test MCP server tool implementations
- **Evals**: Test that LLMs can correctly discover and use MCP tools

## CLI Usage

```bash
mcp-server-tester test.yaml --server-config <config-file> [options]
```

## Configuration Formats

### Server Configuration (JSON)

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "node",
      "args": ["./filesystem-server.js"],
      "env": { "ALLOWED_DIRS": "/tmp,/home/user/documents" }
    }
  }
}
```

### Test Configuration (YAML)

**Tools Tests:**

```yaml
tools:
  expected_tool_list: ['read_file', 'write_file']
  tests:
    # Single tool test
    - name: 'Write file successfully'
      tool: 'write_file'
      params: { path: '/tmp/test.txt', content: 'data' }
      expect: { success: true }

    # Multi-step workflow
    - name: 'Write and read workflow'
      calls:
        - tool: 'write_file'
          params: { path: '/tmp/test.txt', content: 'hello' }
          expect: { success: true }
        - tool: 'read_file'
          params: { path: '/tmp/test.txt' }
          expect:
            success: true
            result: { contains: 'hello' }
```

**Eval Tests:**

```yaml
evals:
  models: ['claude-3-haiku-20240307']
  tests:
    - name: 'LLM can create and read files'
      prompt: 'Create a file called hello.txt with content "test" and read it back'
      expected_tool_calls:
        required: ['write_file', 'read_file']
      response_scorers:
        - type: 'regex'
          pattern: 'test'
        - type: 'llm-judge'
          criteria: 'Did the assistant successfully complete the task?'
          threshold: 0.8
```

## Key Patterns

- **Single vs Multi-step**: Use `tool` + `params` for simple tests, `calls` array for workflows
- **Error Testing**: Set `expect: { success: false, error: { contains: 'message' } }`
- **Result Validation**: Use `result: { contains: 'text' }` or `result: { equals: 'exact' }`
- **Tool Discovery**: Test LLM understanding with `expected_tool_calls: { allowed: [] }`

## Examples Directory

- `test.yaml` - Combined tools and evals
- `tools-test.yaml` - Tools testing only
- `evaluations-test.yaml` - LLM evaluations only
- `server-config.json` - Server configuration
- `test-server.js` - Sample MCP server
