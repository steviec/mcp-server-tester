# MCP Tester

A standalone CLI tool for testing Model Context Protocol (MCP) servers with both integration and evaluation capabilities.

## Overview

MCP Tester provides comprehensive testing for MCP servers through two distinct testing approaches:

1. **Integration Tests** - Direct tool call testing similar to API integration tests
2. **Evaluation Tests** - LLM interaction testing to verify how well language models can use your MCP tools

## Installation

```bash
npm install
```

## Quick Start

### 1. Set up your MCP server configuration

Create a `server-config.json` file with your MCP server details:

```json
{
  "mcpServers": {
    "your-server": {
      "command": "node",
      "args": ["path/to/your/server.js"],
      "env": {
        "API_KEY": "your-key"
      }
    }
  }
}
```

### 2. Run Integration Tests

Create an integration test file (`integration-test.yaml`):

```yaml
discovery:
  expect_tools: ['tool1', 'tool2']
  validate_schemas: true

tests:
  - name: 'Echoes a basic message'
    calls:
      - tool: 'echo'
        params:
          message: 'Hello World'
        expect:
          success: true
          result:
            contains: 'Hello World'
```

Run the tests:

```bash
npx tsx src/cli.ts integration integration-test.yaml --server-config ./server-config.json
```

### 3. Run Evaluation Tests

Create an evaluation test file (`eval-test.yaml`):

```yaml
options:
  models: ['claude-3-haiku-20240307']
  timeout: 30000
  max_steps: 3

tests:
  - name: 'tool_understanding'
    prompt: 'List all available tools'
    expected_tool_calls:
      allowed: []
    response_scorers:
      - type: 'regex'
        pattern: '(tool|function|capability)'
```

Set your Anthropic API key and run:

```bash
export ANTHROPIC_API_KEY="your-api-key"
npx tsx src/cli.ts evals eval-test.yaml --server-config ./server-config.json
```

## Configuration Reference

### Server Configuration

Standard MCP server configuration format:

```json
{
  "mcpServers": {
    "server-name": {
      "command": "executable",
      "args": ["arg1", "arg2"],
      "env": {
        "ENV_VAR": "value"
      }
    }
  }
}
```

### Integration Test Configuration

```yaml
# Optional: Tool discovery validation
discovery:
  expect_tools: ['tool1', 'tool2'] # Tools that must be available
  validate_schemas: true # Validate tool input schemas

# Test definitions
tests:
  - name: 'Performs specific functionality'
    calls:
      - tool: 'tool_name'
        params:
          param1: 'value1'
          param2: 123
        expect:
          success: true # Whether call should succeed
          result: # Optional result validation
            contains: 'text' # Text that should be in result
            equals: 'exact_match' # Exact result match
          error: # For expected failures
            contains: 'error_text'

# Global options
options:
  timeout: 10000 # Test timeout in milliseconds
  cleanup: true # Cleanup after tests
  parallel: false # Run tests in parallel
```

### Evaluation Test Configuration

```yaml
options:
  models: ['claude-3-haiku-20240307', 'claude-3-5-sonnet-20241022']
  timeout: 30000
  max_steps: 3

tests:
  - name: 'Evaluates specific LLM behavior'
    prompt: 'Prompt for the LLM'

    # Tool call validation
    expected_tool_calls:
      required: ['tool1'] # Tools that must be called
      allowed: ['tool1', 'tool2'] # Only these tools can be called (if not specified, all tools are allowed)

    # Response quality scoring
    response_scorers:
      - type: 'regex'
        pattern: 'expected_pattern'

      - type: 'json-schema'
        schema:
          type: 'string'
          minLength: 10
          pattern: "\\d+"

      - type: 'llm-judge'
        criteria: 'Did the assistant complete the task correctly?'
        threshold: 0.8
```

## Testing Patterns

### Integration Testing Patterns

**Single Tool Call**

```yaml
- name: 'Calls echo tool with message'
  calls:
    - tool: 'echo'
      params: { message: 'test' }
      expect: { success: true }
```

**Multi-Step Workflow**

```yaml
- name: 'Creates, reads, and deletes file'
  calls:
    - tool: 'create_file'
      params: { path: '/tmp/test.txt', content: 'data' }
      expect: { success: true }
    - tool: 'read_file'
      params: { path: '/tmp/test.txt' }
      expect:
        success: true
        result: { contains: 'data' }
    - tool: 'delete_file'
      params: { path: '/tmp/test.txt' }
      expect: { success: true }
```

**Error Testing**

```yaml
- name: 'Handles nonexistent tool gracefully'
  calls:
    - tool: 'nonexistent_tool'
      params: {}
      expect:
        success: false
        error: { contains: 'unknown tool' }
```

### Evaluation Testing Patterns

**Tool Discovery Test**

```yaml
- name: 'Lists available tools without calling them'
  prompt: 'What tools do you have available?'
  expected_tool_calls: { allowed: [] } # No tools should be called
  response_scorers:
    - type: 'regex'
      pattern: '(tool|function|available)'
```

**Task Completion Test**

```yaml
- name: 'Completes math task using required tools'
  prompt: 'Add 5 and 3'
  expected_tool_calls: { required: ['add'] }
  response_scorers:
    - type: 'llm-judge'
      criteria: 'Did the assistant correctly add the numbers?'
      threshold: 0.8
```

**Restricted Tool Usage Test**

```yaml
- name: 'Reads file without modifying it'
  prompt: "Read the config file, but don't modify anything"
  expected_tool_calls:
    required: ['read_file']
    allowed: ['read_file'] # Only read_file is allowed, all others are implicitly prohibited
```

## CLI Commands

### Integration Tests

```bash
npx tsx src/cli.ts integration <test-file> --server-config <server-config-file> [options]

Required:
  --server-config <file>   MCP server configuration file (JSON)

Options:
  --server-name <name>     Specific server name from config (required if multiple servers)
  --timeout <ms>           Test timeout (default: 10000)
  --output <format>        Output format: console, json, junit
```

### Evaluation Tests

```bash
npx tsx src/cli.ts evals <test-file> --server-config <server-config-file> [options]

Required:
  --server-config <file>   MCP server configuration file (JSON)

Options:
  --server-name <name>     Specific server name from config (required if multiple servers)
  --models <models>        Comma-separated model list (overrides config file)
  --timeout <ms>           Test timeout (default: 30000)
  --output <format>        Output format: console, json, junit
```

## Environment Variables

- `ANTHROPIC_API_KEY` - Required for evaluation tests
- `DEBUG=mcp-tester` - Enable debug logging

## Examples

The `examples/` directory contains:

- `server-config.json` - Sample MCP server configuration
- `integration-test.yaml` - Integration test examples
- `eval-test.yaml` - Evaluation test examples
- `test-server.js` - Simple MCP server for testing

## Architecture

- **Direct MCP SDK Usage** - No proxy server overhead
- **Vercel AI SDK Integration** - Unified types for LLM interactions
- **Modular Design** - Separate runners for different test types
- **TypeScript Native** - Built with TypeScript, runs with tsx

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT
