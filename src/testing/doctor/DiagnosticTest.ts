/**
 * Base class for all diagnostic tests
 */

import type { McpClient } from '../../core/mcp-client.js';
import type { DoctorConfig, DiagnosticResult, TestSeverity, TestCategory } from './types.js';
import type { McpCapability } from './CapabilityDetector.js';

export abstract class DiagnosticTest {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly category: TestCategory;
  abstract readonly severity: TestSeverity;

  // Optional: MCP capability required for this test to run
  readonly requiredCapability?: McpCapability;

  // Optional: Reference to MCP specification section
  readonly mcpSpecSection?: string;

  abstract execute(_client: McpClient, _config: DoctorConfig): Promise<DiagnosticResult>;

  protected createResult(
    success: boolean,
    message: string,
    details?: unknown,
    recommendations?: string[]
  ): DiagnosticResult {
    return {
      testName: this.name,
      category: this.category,
      status: success ? 'passed' : 'failed',
      message,
      details,
      recommendations: recommendations || [],
      severity: this.severity,
      duration: 0, // Will be set by runner
      requiredCapability: this.requiredCapability,
      mcpSpecSection: this.mcpSpecSection,
    };
  }

  protected createSkippedResult(reason: string): DiagnosticResult {
    return {
      testName: this.name,
      category: this.category,
      status: 'skipped',
      message: `Test skipped: ${reason}`,
      severity: this.severity,
      duration: 0,
      requiredCapability: this.requiredCapability,
      mcpSpecSection: this.mcpSpecSection,
    };
  }
}
