# Architecture Overview

## Core Components

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

## Test Runner Architecture

**Capabilities Test Runner** (`src/testing/capabilities/runner.ts`)

- Direct tool testing against MCP servers
- Supports single tool tests and multi-step workflows
- Validates tool discovery and schema compliance

**Eval Test Runner** (`src/testing/evals/runner.ts`)

- LLM evaluation testing using Anthropic models
- Tests that LLMs can discover and use tools correctly
- Requires `ANTHROPIC_API_KEY` environment variable

**LLM Provider** (`src/testing/evals/providers/anthropic-provider.ts`)

- Implements conversation execution with tool calling
- Supports response judging with LLM-based scoring

## Configuration System

**Config Loader** (`src/config/loader.ts`)

- Loads test configs (YAML) and server configs (JSON)
- Validates against JSON schemas in `src/schemas/`

**Test Configuration Types** (`src/core/types.ts`)

- Defines TypeScript interfaces for all test types
- Supports both tools testing and LLM evaluations

## Key Implementation Patterns

**Test File Structure**

- Test configs are YAML files with `tools` and `evals` sections

**Type Guards**

- Uses `isSingleToolTest`, `isMultiStepTest` to distinguish test formats at runtime

**Server Configuration**

- JSON files following MCP standard format with `mcpServers` object
