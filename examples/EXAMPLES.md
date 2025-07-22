## Examples

Examples contains a complete working server and examples so you can see how it all works together.

### Try the Test Server

```bash
# Build the tool first
npm run build

# Run basic tools tests (no API key needed)
node dist/cli.js tools examples/tools-basic.yaml --server-config examples/test-mcp-server.json

# Run LLM evaluation tests (requires API key)
export ANTHROPIC_API_KEY="your-key"
node dist/cli.js evals examples/evals-basic.yaml --server-config examples/test-mcp-server.json


# Run the tests and see the full LLM conversation for easier debugging
export ANTHROPIC_API_KEY="your-key"
node dist/cli.js evals examples/evals-basic.yaml --server-config examples/test-mcp-server.json --debug
```

The test server provides `echo` and `add` tools perfect for learning the testing patterns.

### Example Progression

- **`tools-basic.yaml`** - Tool discovery, simple API calls, basic workflows
- **`tools-advanced.yaml`** - Error handling, complex multi-step operations
- **`evals-basic.yaml`** - LLM tool discovery, basic usage testing
- **`evals-advanced.yaml`** - Complex reasoning, constraint testing, advanced scoring

All examples work with the included `test-mcp-server.js` - a simple but complete MCP server implementation.
