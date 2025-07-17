/**
 * Base class for protocol feature test collections
 */

import type { ProtocolFeature, ProtocolCategory, ProtocolFeatureInfo } from './types.js';
import type { McpCapability } from './CapabilityDetector.js';
import type { DiagnosticTest } from './DiagnosticTest.js';

export abstract class ProtocolFeatureTests implements ProtocolFeatureInfo {
  abstract readonly feature: ProtocolFeature;
  abstract readonly category: ProtocolCategory;
  abstract readonly displayName: string;
  abstract readonly tests: Array<{ new (): DiagnosticTest }>;

  readonly requiredCapability?: McpCapability;

  /**
   * Create instances of all tests for this feature
   */
  createTests(): DiagnosticTest[] {
    return this.tests.map(TestClass => new TestClass());
  }

  /**
   * Get the number of tests in this feature
   */
  getTestCount(): number {
    return this.tests.length;
  }

  /**
   * Check if this feature should run based on server capabilities
   */
  shouldRun(serverCapabilities: Set<McpCapability>): boolean {
    return !this.requiredCapability || serverCapabilities.has(this.requiredCapability);
  }
}
