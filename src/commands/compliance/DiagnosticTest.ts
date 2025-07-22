/**
 * Base class for all diagnostic tests
 */

import type { McpClient } from '../../shared/core/mcp-client.js';
import type {
  ComplianceConfig,
  DiagnosticResult,
  TestSeverity,
  TestCategory,
  IssueType,
  ProtocolFeature,
} from './types.js';
import type { McpCapability } from './CapabilityDetector.js';

export abstract class DiagnosticTest {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly category: TestCategory;
  abstract readonly severity: TestSeverity;

  // Optional: Protocol feature this test belongs to
  readonly feature?: ProtocolFeature;

  // Optional: MCP capability required for this test to run
  readonly requiredCapability?: McpCapability;

  // Optional: Reference to MCP specification section
  readonly mcpSpecSection?: string;

  abstract execute(_client: McpClient, _config: ComplianceConfig): Promise<DiagnosticResult>;

  protected createResult(
    success: boolean,
    message: string,
    details?: unknown,
    recommendations?: string[]
  ): DiagnosticResult {
    return {
      testName: this.name,
      category: this.category,
      feature: this.feature,
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

  protected createEnhancedResult(options: {
    success: boolean;
    message: string;
    details?: unknown;
    recommendations?: string[];
    issueType?: IssueType;
    expected?: string;
    actual?: string;
    fixInstructions?: string[];
    specLinks?: string[];
  }): DiagnosticResult {
    return {
      testName: this.name,
      category: this.category,
      feature: this.feature,
      status: options.success ? 'passed' : 'failed',
      message: options.message,
      details: options.details,
      recommendations: options.recommendations || [],
      severity: this.severity,
      duration: 0, // Will be set by runner
      requiredCapability: this.requiredCapability,
      mcpSpecSection: this.mcpSpecSection,
      issueType: options.issueType,
      expected: options.expected,
      actual: options.actual,
      fixInstructions: options.fixInstructions,
      specLinks: options.specLinks,
    };
  }

  protected createSkippedResult(reason: string): DiagnosticResult {
    return {
      testName: this.name,
      category: this.category,
      feature: this.feature,
      status: 'skipped',
      message: `Test skipped: ${reason}`,
      severity: this.severity,
      duration: 0,
      requiredCapability: this.requiredCapability,
      mcpSpecSection: this.mcpSpecSection,
    };
  }
}
