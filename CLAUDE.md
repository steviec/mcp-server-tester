# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## About This Project

MCP Server Tester is a CLI tool for testing Model Context Protocol (MCP) servers. It provides two testing approaches:

- **Tools Testing**: Direct API calls to test MCP server tool implementations
- **Evals**: Test that LLMs can correctly discover and use MCP tools

## Essential Commands

### Development

```bash
npm run dev              # Run CLI in development mode with tsx
npm run build           # Compile TypeScript to dist/
npm start               # Run CLI directly with tsx
```

### Testing

```bash
npm test                # Run all tests
npm run test:unit       # Run unit tests only
npm run test:e2e        # Run end-to-end tests
npm run test:e2e:api    # Run API-focused e2e tests
npm run test:e2e:eval   # Run evaluation-focused e2e tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage report
```

### Code Quality

```bash
npm run typecheck       # TypeScript type checking
npm run lint            # Run ESLint
npm run lint:fix        # Run ESLint with auto-fix
npm run format          # Format code with Prettier
npm run format:check    # Check code formatting
```

### Pre-commit Hooks

The project uses lefthook with automatic staging of fixes:

- **format**: Runs Prettier and stages fixes
- **lint**: Runs ESLint with --fix and stages fixes
- **typecheck**: Validates TypeScript types
- **test**: Runs unit tests

## Architecture Overview

### Core Components

**CLI Entry Point** (`src/cli.ts`)

- Single unified command that auto-detects test types from YAML config
- Routes to appropriate test runners based on config sections (`tools` or `evals`)

**Main Test Runner** (`src/testing/runner.ts`)

- Auto-detects test types from config file sections
- Orchestrates capabilities and eval test runners
- Combines results into unified summary

**MCP Client** (`src/core/mcp-client.ts`)

- Handles MCP server connections via stdio transport
- Wraps tool calls and server lifecycle management
- Used by both capabilities and eval runners

### Test Runner Architecture

**Capabilities Test Runner** (`src/testing/capabilities/runner.ts`)

- Direct tool testing against MCP servers
- Supports single tool tests and multi-step workflows
- Validates tool discovery and schema compliance
- Handles both success and failure expectations

**Eval Test Runner** (`src/testing/evals/runner.ts`)

- LLM evaluation testing using Anthropic models
- Tests that LLMs can discover and use tools correctly
- Supports tool call validation and response scoring
- Requires `ANTHROPIC_API_KEY` environment variable

**LLM Provider** (`src/testing/evals/providers/anthropic-provider.ts`)

- Implements conversation execution with tool calling
- Supports response judging with LLM-based scoring
- Handles multi-step conversations with MCP tools

### Configuration System

**Config Loader** (`src/config/loader.ts`)

- Loads test configs (YAML) and server configs (JSON)
- Validates against JSON schemas in `src/schemas/`
- Handles both single and multi-server configurations

**Test Configuration Types** (`src/core/types.ts`)

- Defines TypeScript interfaces for all test types
- Supports both tools testing and LLM evaluations
- Includes validation expectations and scoring criteria

### Display System

**Display Manager** (`src/testing/display/DisplayManager.ts`)

- Manages test output formatting and progress reporting
- Supports multiple output formats (console, JSON, JUnit XML)
- Used primarily by eval tests for rich progress display

## Key Implementation Patterns

### Test File Structure

Test configs are YAML files with two main sections:

- `tools`: Direct tool testing configuration
- `evals`: LLM evaluation testing configuration

### Server Configuration

Server configs are JSON files following MCP standard format:

```json
{
  "mcpServers": {
    "server-name": {
      "command": "node",
      "args": ["server.js"],
      "env": { "KEY": "value" }
    }
  }
}
```

### Type Guards

Uses TypeScript type guards (`isSingleToolTest`, `isMultiStepTest`) to distinguish between different test formats at runtime.

### Error Handling

Comprehensive error handling with specific error messages for common issues like missing API keys, invalid configurations, and tool failures.

## Environment Variables

- `ANTHROPIC_API_KEY`: Required for LLM evaluation tests
- `DEBUG=mcp-tester`: Enable debug logging

## Development Notes

- Uses ES modules (`"type": "module"`)
- TypeScript with strict type checking
- ESLint warns about `any` usage (currently 51 warnings)
- Prettier for code formatting
- Vitest for testing framework
- Uses `tsx` for TypeScript execution in development
