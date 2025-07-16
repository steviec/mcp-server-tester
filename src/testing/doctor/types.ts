/**
 * Type definitions for the Doctor framework
 */

export const TEST_SEVERITY = {
  CRITICAL: 'critical',
  WARNING: 'warning',
  INFO: 'info',
} as const;

export type TestSeverity = (typeof TEST_SEVERITY)[keyof typeof TEST_SEVERITY];

export interface DiagnosticResult {
  testName: string;
  status: 'passed' | 'failed' | 'skipped';
  message: string;
  details?: unknown;
  recommendations?: string[];
  severity: TestSeverity;
  duration: number;
}

export interface TestCategory {
  name: string;
  passed: number;
  failed: number;
  warnings: number;
  total: number;
  duration: number;
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
  };
  metadata: {
    timestamp: string;
    duration: number;
    testCount: number;
  };
  summary: {
    testResults: {
      passed: number;
      failed: number;
      total: number;
    };
    overallScore: number;
  };
  categories: TestCategory[];
  issues: DiagnosticResult[];
  results: DiagnosticResult[]; // Include raw results for testing/debugging
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
