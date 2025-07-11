/**
 * Core types for MCP Tester
 * Focus on capabilities testing initially
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

// Capabilities test types
export interface CapabilitiesTestCall {
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

// Single tool test format
export interface SingleToolTest {
  name: string;
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

// Multi-step test format
export interface MultiStepTest {
  name: string;
  calls: CapabilitiesTestCall[];
}

// Union type for both formats
export type CapabilitiesTest = SingleToolTest | MultiStepTest;

// Type guards to distinguish between formats
export function isSingleToolTest(test: CapabilitiesTest): test is SingleToolTest {
  return 'tool' in test;
}

export function isMultiStepTest(test: CapabilitiesTest): test is MultiStepTest {
  return 'calls' in test;
}

export interface CapabilitiesTestConfig {
  discovery?: {
    expect_tools?: string[];
    validate_schemas?: boolean;
  };
  tests: CapabilitiesTest[];
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

// Later: LLM Evaluation (eval) test types
export interface EvalTestConfig {
  options: {
    models: string[];
    timeout: number;
    max_steps: number;
  };
  tests: EvalTest[];
}

export interface EvalTest {
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

export interface EvalResult {
  name: string;
  model: string;
  passed: boolean;
  errors: string[];
  scorer_results: any[];
  messages?: any[];
}

// Main test configuration
export interface TestConfig {
  tools?: ToolsConfig;
  evals?: EvalsConfig;
}

export interface ToolsConfig {
  expected_tool_list?: string[];
  tests: CapabilitiesTest[];
}

export interface EvalsConfig {
  models?: string[];
  timeout?: number;
  max_steps?: number;
  tests: EvalTest[];
}
