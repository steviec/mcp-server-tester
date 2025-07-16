/**
 * Type definitions for the Doctor framework
 */

import type { McpCapability } from './CapabilityDetector.js';

export const TEST_SEVERITY = {
  CRITICAL: 'critical',
  WARNING: 'warning',
  INFO: 'info',
} as const;

export type TestSeverity = (typeof TEST_SEVERITY)[keyof typeof TEST_SEVERITY];

/**
 * Issue classification for enhanced reporting
 */
export const ISSUE_TYPE = {
  CRITICAL_FAILURE: 'critical_failure',
  SPEC_WARNING: 'spec_warning',
  OPTIMIZATION: 'optimization',
} as const;

export type IssueType = (typeof ISSUE_TYPE)[keyof typeof ISSUE_TYPE];

/**
 * Test organization categories (our internal grouping, not MCP spec)
 */
export type TestCategory = 'lifecycle' | 'protocol' | 'security' | 'performance' | 'features';

export interface DiagnosticResult {
  testName: string;
  category: TestCategory;
  status: 'passed' | 'failed' | 'skipped';
  message: string;
  details?: unknown;
  recommendations?: string[];
  severity: TestSeverity;
  duration: number;
  requiredCapability?: McpCapability; // MCP spec capability requirement
  mcpSpecSection?: string; // Reference to MCP specification section
  issueType?: IssueType; // Enhanced issue classification
  expected?: string; // Expected behavior description
  actual?: string; // Actual behavior description
  fixInstructions?: string[]; // Specific actionable fix instructions
  specLinks?: string[]; // Links to relevant specification sections
}

export interface TestCategorySummary {
  name: string;
  passed: number;
  failed: number;
  warnings: number;
  total: number;
  duration: number;
  status: 'passed' | 'failed' | 'warning' | 'skipped';
}

export interface HealthScore {
  overall: number;
  categories: Record<string, number>;
  weights: Record<string, number>;
}

export interface HealthReport {
  serverInfo: {
    name: string;
    version?: string;
    transport: string;
    protocolVersion?: string;
  };
  serverCapabilities: Set<McpCapability>;
  skippedCapabilities: McpCapability[];
  metadata: {
    timestamp: string;
    duration: number;
    testCount: number;
    skippedTestCount: number;
  };
  summary: {
    testResults: {
      passed: number;
      failed: number;
      skipped: number;
      total: number;
    };
    overallScore: number;
  };
  categories: TestCategorySummary[];
  issues: DiagnosticResult[];
  results: DiagnosticResult[]; // Include raw results for testing/debugging
  categorizedIssues: {
    criticalFailures: DiagnosticResult[];
    specWarnings: DiagnosticResult[];
    optimizations: DiagnosticResult[];
  };
}

export interface DoctorConfig {
  timeouts: {
    connection: number;
    testExecution: number;
    overall: number;
  };
  categories: {
    enabled: string[];
    disabled: string[];
  };
  output: {
    format: 'console' | 'json';
    file?: string;
  };
}

export interface DoctorOptions {
  serverConfig: string;
  serverName?: string;
  categories?: string;
  output?: string;
  timeout?: string;
}
