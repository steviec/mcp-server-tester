/**
 * Base class for all diagnostic tests
 */

import type { McpClient } from '../../core/mcp-client.js';
import type { DoctorConfig, DiagnosticResult, TestSeverity } from './types.js';

export abstract class DiagnosticTest {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly category: string;
  abstract readonly severity: TestSeverity;

  abstract execute(_client: McpClient, _config: DoctorConfig): Promise<DiagnosticResult>;

  protected createResult(
    success: boolean,
    message: string,
    details?: unknown,
    recommendations?: string[]
  ): DiagnosticResult {
    return {
      testName: this.name,
      status: success ? 'passed' : 'failed',
      message,
      details,
      recommendations: recommendations || [],
      severity: this.severity,
      duration: 0, // Will be set by runner
    };
  }

  protected createSkippedResult(reason: string): DiagnosticResult {
    return {
      testName: this.name,
      status: 'skipped',
      message: `Test skipped: ${reason}`,
      severity: this.severity,
      duration: 0,
    };
  }
}
