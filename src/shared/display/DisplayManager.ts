/**
 * Central display manager that coordinates test output formatting
 */

import type { TestEvent, TestFormatter, DisplayOptions } from './types.js';
import type { ScorerResult } from '../core/types.js';
import { ConsoleFormatter } from './formatters/ConsoleFormatter.js';
import { JunitXmlFormatter } from './formatters/JunitXmlFormatter.js';

export class DisplayManager {
  private formatters: TestFormatter[];

  constructor(options: DisplayOptions = {}) {
    this.formatters = [];

    // Always include console formatter
    this.formatters.push(new ConsoleFormatter(options));

    // Add JUnit XML formatter if requested
    if (options.junitXml !== undefined) {
      const filename = options.junitXml || 'junit.xml';
      this.formatters.push(new JunitXmlFormatter(options, filename));
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
  suiteStart(testCount: number, modelCount?: number): void {
    this.emit({
      type: 'suite_start',
      data: {
        testCount,
        modelCount,
        totalRuns: modelCount ? testCount * modelCount : testCount,
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
    messages?: any[],
    scorer_results?: ScorerResult[]
  ): void {
    this.emit({
      type: 'test_complete',
      data: { name, model, passed, errors, prompt, messages, scorer_results },
    });
  }

  suiteComplete(total: number, passed: number, failed: number, duration: number): void {
    this.emit({
      type: 'suite_complete',
      data: { total, passed, failed, duration },
    });
  }

  toolDiscovery(expectedTools: string[], foundTools: string[], passed: boolean): void {
    this.emit({
      type: 'tool_discovery',
      data: { expectedTools, foundTools, passed },
    });
  }

  sectionStart(section: 'tools' | 'evals', title: string): void {
    this.emit({
      type: 'section_start',
      data: { section, title },
    });
  }

  /**
   * Flush any pending output from all formatters
   */
  flush(): void {
    this.formatters.forEach(formatter => formatter.flush());
  }
}
