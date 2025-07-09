/**
 * Core types for MCP Tester
 * Focus on integration testing initially
 */

// Server configuration (standard MCP format)
export interface ServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface McpServersConfig {
  mcpServers: Record<string, ServerConfig>;
}

// Integration test types
export interface IntegrationTestCall {
  tool: string;
  params: Record<string, any>;
  expect: {
    success: boolean;
    result?: {
      contains?: string;
      equals?: any;
      schema?: any;
    };
    error?: {
      contains?: string;
    };
  };
}

export interface IntegrationTest {
  name: string;
  calls: IntegrationTestCall[];
}

export interface IntegrationTestConfig {
  discovery?: {
    expect_tools?: string[];
    validate_schemas?: boolean;
  };
  tests: IntegrationTest[];
  options?: {
    timeout?: number;
    cleanup?: boolean;
    parallel?: boolean;
  };
}

// Test results
export interface TestCallResult {
  tool: string;
  params: Record<string, any>;
  success: boolean;
  result?: any;
  error?: string;
  duration: number;
}

export interface TestResult {
  name: string;
  passed: boolean;
  errors: string[];
  calls: TestCallResult[];
  duration: number;
}

export interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  duration: number;
  results: TestResult[];
}

// Transport and connection types
export interface TransportOptions {
  type: 'stdio' | 'sse' | 'http';
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
}

// Later: Evaluation test types (for LLM interaction)
export interface EvaluationTestConfig {
  options: {
    models: string[];
    timeout: number;
    max_steps: number;
  };
  tests: EvaluationTest[];
}

export interface EvaluationTest {
  name: string;
  prompt: string;
  expected_tool_calls?: {
    required?: string[];
    allowed?: string[];
  };
  response_scorers?: ResponseScorer[];
}

export interface ResponseScorer {
  type: 'regex' | 'json-schema' | 'llm-judge';
  pattern?: string;
  schema?: any;
  criteria?: string;
  threshold?: number;
}

export interface EvaluationResult {
  name: string;
  model: string;
  passed: boolean;
  errors: string[];
  scorer_results: any[];
  messages?: any[];
}