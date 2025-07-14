/**
 * Central display manager that coordinates test output formatting
 */

import type { TestEvent, TestFormatter, DisplayOptions } from './types.js';
import { EnhancedConsoleFormatter } from './formatters/EnhancedConsoleFormatter.js';
import { JunitXmlFormatter } from './formatters/JunitXmlFormatter.js';

export class DisplayManager {
  private formatters: TestFormatter[];

  constructor(options: DisplayOptions = {}) {
    this.formatters = [];

    // Always include enhanced console formatter unless quiet mode
    if (!options.quiet) {
      this.formatters.push(new EnhancedConsoleFormatter(options));
    }

    // Add JUnit XML formatter if requested
    if (options.junitXml !== undefined) {
      const filename = options.junitXml || 'junit.xml';
      this.formatters.push(new JunitXmlFormatter(options, filename));
    }

    // Ensure we have at least one formatter
    if (this.formatters.length === 0) {
      this.formatters.push(new EnhancedConsoleFormatter(options));
    }
  }

  /**
   * Emit a test event to all active formatters
   */
  emit(event: TestEvent): void {
    this.formatters.forEach(formatter => formatter.onEvent(event));
  }

  /**
   * Convenience methods for common events
   */
  suiteStart(testCount: number, modelCount?: number, hasTools?: boolean, hasEvals?: boolean): void {
    this.emit({
      type: 'suite_start',
      data: {
        testCount,
        modelCount,
        totalRuns: modelCount ? testCount * modelCount : testCount,
        hasTools,
        hasEvals,
      },
    });
  }

  progress(message: string, model?: string): void {
    this.emit({
      type: 'progress',
      data: { message, model },
    });
  }

  testStart(name: string, model?: string): void {
    this.emit({
      type: 'test_start',
      data: { name, model },
    });
  }

  testComplete(
    name: string,
    passed: boolean,
    errors: string[],
    model?: string,
    prompt?: string,
    testType?: string
  ): void {
    this.emit({
      type: 'test_complete',
      data: { name, model, passed, errors, prompt, testType },
    });
  }

  suiteComplete(total: number, passed: number, failed: number, duration: number): void {
    this.emit({
      type: 'suite_complete',
      data: { total, passed, failed, duration },
    });
  }

  /**
   * Flush any pending output from all formatters
   */
  flush(): void {
    this.formatters.forEach(formatter => formatter.flush());
  }
}
