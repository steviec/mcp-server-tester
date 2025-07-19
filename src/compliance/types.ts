/**
 * Type definitions for the Compliance framework
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
  PERFORMANCE_ISSUE: 'performance_issue',
} as const;

export type IssueType = (typeof ISSUE_TYPE)[keyof typeof ISSUE_TYPE];

/**
 * Protocol features - specific aspects of MCP that we test
 */
export type ProtocolFeature =
  // Base Protocol features
  | 'transport'
  | 'json-rpc'
  | 'error-handling'
  // Lifecycle features
  | 'initialization'
  | 'capabilities'
  | 'version'
  | 'connection'
  // Server capability features
  | 'tools'
  | 'resources'
  | 'prompts'
  // Utility features
  | 'ping'
  | 'progress'
  | 'cancellation'
  | 'completion'
  | 'logging'
  | 'pagination';

/**
 * Protocol categories - groups of related protocol features
 */
export type ProtocolCategory = 'base-protocol' | 'lifecycle' | 'server-features' | 'utilities';

/**
 * Test organization categories aligned with MCP specification structure
 * @deprecated Use ProtocolCategory instead
 */
export type TestCategory = 'base-protocol' | 'lifecycle' | 'server-features' | 'security';

export interface DiagnosticResult {
  testName: string;
  category: TestCategory;
  feature?: ProtocolFeature; // NEW: which protocol feature this test belongs to
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

export interface ComplianceConfig {
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
  experimental: {
    // Enable SDK-based error detection instead of manual validation
    useSdkErrorDetection: boolean;
  };
}

export interface ComplianceOptions {
  serverConfig: string;
  serverName?: string;
  categories?: string;
  output?: string;
  timeout?: string;
}

/**
 * Information about a protocol feature and its tests
 */
export interface ProtocolFeatureInfo {
  feature: ProtocolFeature;
  category: ProtocolCategory;
  displayName: string;
  requiredCapability?: McpCapability;
  tests: Array<{ new (): any }>; // Test class constructors
}

/**
 * Summary of test results for a protocol feature
 */
export interface ProtocolFeatureSummary {
  feature: ProtocolFeature;
  displayName: string;
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  duration: number;
  status: 'passed' | 'failed' | 'warning' | 'skipped';
}

/**
 * Summary of test results for a protocol category
 */
export interface ProtocolCategorySummary {
  category: ProtocolCategory;
  displayName: string;
  features: Map<ProtocolFeature, ProtocolFeatureSummary>;
  totalPassed: number;
  totalFailed: number;
  totalSkipped: number;
  totalTests: number;
  status: 'passed' | 'failed' | 'warning' | 'skipped';
}
