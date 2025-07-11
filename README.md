# MCP Server Tester

A tool to confirm that your MCP server provides the correct capabilities and can be used consistently by LLMs.

## Overview

MCP Tester provides two testing approaches:

- **Tools Testing** - Direct API calls to test your MCP server's tool implementations
- **Evals** - Test that LLMs can correctly discover and use your MCP tools

## Quick Example

Test a filesystem MCP server (`fs-test.yaml`):

```yaml
tools:
  expected_tool_list: ['read_file', 'write_file', 'list_directory']
  tests:
    # Single tool test (simplified format)
    - name: 'Read file test'
      tool: 'read_file'
      params: { path: '/tmp/test.txt' }
      expect:
        success: true
        result: { contains: 'hello world' }

    # Multi-step workflow test
    - name: 'Write and read file workflow'
      calls:
        - tool: 'write_file'
          params: { path: '/tmp/test.txt', content: 'hello world' }
          expect: { success: true }

        - tool: 'read_file'
          params: { path: '/tmp/test.txt' }
          expect:
            success: true
            result: { contains: 'hello world' }

evals:
  models: ['claude-3-haiku-20240307']
  tests:
    - name: 'LLM can create and read files'
      prompt: 'Create a file called hello.txt with the content "test" and then read it back'
      expected_tool_calls:
        required: ['write_file', 'read_file']
      response_scorers:
        - type: 'regex'
          pattern: 'test'
```

Run the test:

```bash
npx mcp-server-tester fs-test.yaml --server-config server-config.json
```

Output:

```
Running tests from: fs-test.yaml
Detecting test types...
Running tools tests...
Running eval tests...

Test Summary:
  Total: 2
  Passed: 2
  Failed: 0
  Duration: 1247ms
```

## Installation

```bash
# Run directly
npx mcp-server-tester --help

# Install globally
npm install -g mcp-server-tester
```

## Setup

### 1. Server Configuration

Create `server-config.json` with your MCP server details:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "node",
      "args": ["./filesystem-server.js"],
      "env": {
        "ALLOWED_DIRS": "/tmp,/home/user/documents"
      }
    }
  }
}
```

### 2. Tools Testing

Test your MCP server's tool implementations directly:

```yaml
tools:
  expected_tool_list: ['read_file', 'write_file']
  tests:
    # Simple single tool tests
    - name: 'Write file successfully'
      tool: 'write_file'
      params: { path: '/tmp/test.txt', content: 'data' }
      expect: { success: true }

    - name: 'Read existing file'
      tool: 'read_file'
      params: { path: '/tmp/test.txt' }
      expect:
        success: true
        result: { contains: 'data' }

    - name: 'Handle missing file'
      tool: 'read_file'
      params: { path: '/nonexistent/file.txt' }
      expect:
        success: false
        error: { contains: 'not found' }
```

### 3. LLM Evals

Test that language models can use your tools correctly:

```yaml
evals:
  models: ['claude-3-haiku-20240307']
  tests:
    - name: 'LLM discovers available tools'
      prompt: 'What file operations can you perform?'
      expected_tool_calls: { allowed: [] } # Should not call tools
      response_scorers:
        - type: 'regex'
          pattern: '(read|write|file)'

    - name: 'LLM performs file operations'
      prompt: 'List the files in /tmp directory'
      expected_tool_calls: { required: ['list_directory'] }
      response_scorers:
        - type: 'llm-judge'
          criteria: 'Did the assistant successfully list directory contents?'
          threshold: 0.8
```

Run evals (requires API key):

```bash
export ANTHROPIC_API_KEY="your-key"
npx mcp-server-tester eval-test.yaml --server-config server-config.json
```

## Test Configuration

### Tools Tests

```yaml
tools:
  expected_tool_list: ['tool1', 'tool2'] # Verify these tools exist via tools/list
  tests:
    # Single tool test format (recommended for simple tests)
    - name: 'Simple tool test'
      tool: 'tool_name'
      params: { key: 'value' }
      expect:
        success: true
        result:
          contains: 'expected_text'
          equals: 'exact_match'
        error: # For testing error conditions
          contains: 'error_message'

    # Multi-step test format (for complex workflows)
    - name: 'Complex workflow test'
      calls:
        - tool: 'tool1'
          params: { ... }
          expect: { ... }
        - tool: 'tool2'
          params: { ... }
          expect: { ... }
```

### Eval Tests

```yaml
evals:
  models: ['claude-3-haiku-20240307']
  timeout: 30000
  max_steps: 3
  tests:
    - name: 'Test description'
      prompt: 'Task for the LLM'
      expected_tool_calls:
        required: ['tool1'] # Must call these
        allowed: ['tool1', 'tool2'] # Can only call these
      response_scorers:
        - type: 'regex'
          pattern: 'pattern_to_match'
        - type: 'llm-judge'
          criteria: 'Evaluation criteria'
          threshold: 0.8
```

## CLI Usage

```bash
mcp-server-tester <test-file> --server-config <config-file> [options]

Options:
  --server-config <file>    MCP server configuration (required)
  --server-name <name>      Server name if multiple in config
  --models <models>         Override models for evals
  --timeout <ms>            Test timeout
  --output <format>         Output: console, json, junit

# Alternative: Launch server directly
mcp-server-tester test.yaml --server-command "node" --server-args "server.js"
```

## Common Patterns

### Multi-step Workflows

```yaml
tools:
  tests:
    - name: 'Database CRUD operations'
      calls:
        - tool: 'create_record'
          params: { table: 'users', data: { name: 'Alice' } }
          expect: { success: true }

        - tool: 'read_record'
          params: { table: 'users', id: 1 }
          expect:
            success: true
            result: { contains: 'Alice' }

        - tool: 'delete_record'
          params: { table: 'users', id: 1 }
          expect: { success: true }
```

### Error Handling

```yaml
tools:
  tests:
    # Single tool error test
    - name: 'Invalid parameters are rejected'
      tool: 'read_file'
      params: { path: '../../../etc/passwd' }
      expect:
        success: false
        error: { contains: 'access denied' }
```

### LLM Task Completion

```yaml
evals:
  tests:
    - name: 'LLM completes complex task'
      prompt: 'Find all .log files in /var/log and count how many contain "ERROR"'
      expected_tool_calls:
        required: ['list_directory', 'read_file']
      response_scorers:
        - type: 'regex'
          pattern: '\\d+.*files.*ERROR'
```

### Tool Discovery

```yaml
evals:
  tests:
    - name: 'LLM understands capabilities without calling tools'
      prompt: 'What database operations can you perform? Just list them.'
      expected_tool_calls: { allowed: [] }
      response_scorers:
        - type: 'regex'
          pattern: '(create|read|update|delete|query)'
```

## Examples

See `examples/` directory:

- `test.yaml` - Combined tools and evals
- `tools-test.yaml` - Tools testing only
- `evaluations-test.yaml` - LLM evaluations (evals) only
- `server-config.json` - Server configuration
- `test-server.js` - Sample MCP server

## Environment Variables

- `ANTHROPIC_API_KEY` - Required for evals
- `DEBUG=mcp-tester` - Debug logging

## Contributing

1. Fork and create feature branch
2. Add tests for new functionality
3. Run `npm test` and `npm run lint`
4. Submit pull request

## License

MIT
