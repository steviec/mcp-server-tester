/**
 * Test discovery and registration system with MCP capability awareness
 */

import type { DiagnosticTest } from './DiagnosticTest.js';
import type { McpCapability } from './CapabilityDetector.js';
import type { TestCategory } from './types.js';

export class TestRegistry {
  private static tests: DiagnosticTest[] = [];

  static registerTest(test: DiagnosticTest): void {
    this.tests.push(test);
  }

  static getAllTests(): DiagnosticTest[] {
    return [...this.tests];
  }

  /**
   * Get tests that should run based on server's advertised capabilities
   * Tests without requiredCapability always run (core protocol tests)
   */
  static getApplicableTests(serverCapabilities: Set<McpCapability>): DiagnosticTest[] {
    return this.tests.filter(test => {
      // Always run tests that don't require specific capabilities (core protocol tests)
      if (!test.requiredCapability) {
        return true;
      }

      // Only run capability-specific tests if server supports them
      return serverCapabilities.has(test.requiredCapability);
    });
  }

  /**
   * Get tests that are skipped because server doesn't support required capabilities
   */
  static getSkippedTests(serverCapabilities: Set<McpCapability>): DiagnosticTest[] {
    return this.tests.filter(test => {
      return test.requiredCapability && !serverCapabilities.has(test.requiredCapability);
    });
  }

  static getTestsByCategory(category: TestCategory): DiagnosticTest[] {
    return this.tests.filter(test => test.category === category);
  }

  static getTestsByCategories(categories: TestCategory[]): DiagnosticTest[] {
    return this.tests.filter(test => categories.includes(test.category));
  }

  /**
   * Get tests by capability requirement
   */
  static getTestsByCapability(capability: McpCapability): DiagnosticTest[] {
    return this.tests.filter(test => test.requiredCapability === capability);
  }

  /**
   * Get tests that don't require any specific capability (core protocol tests)
   */
  static getCoreTests(): DiagnosticTest[] {
    return this.tests.filter(test => !test.requiredCapability);
  }

  static getAvailableCategories(): TestCategory[] {
    const categories = new Set(this.tests.map(test => test.category));
    return Array.from(categories).sort();
  }

  /**
   * Get capabilities that have tests registered for them
   */
  static getTestedCapabilities(): McpCapability[] {
    const capabilities = new Set(
      this.tests
        .map(test => test.requiredCapability)
        .filter((cap): cap is McpCapability => cap !== undefined)
    );
    return Array.from(capabilities).sort();
  }

  static clear(): void {
    this.tests = [];
  }
}

export function registerComplianceTest(test: DiagnosticTest): void {
  TestRegistry.registerTest(test);
}
