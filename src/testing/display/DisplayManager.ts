/**
 * Central display manager that coordinates test output formatting
 */

import type { TestEvent, TestFormatter, DisplayOptions } from './types.js';
import { ConsoleFormatter } from './formatters/ConsoleFormatter.js';

export class DisplayManager {
  private formatter: TestFormatter;

  constructor(options: DisplayOptions = {}) {
    // For now, always use ConsoleFormatter. Later we can switch based on options.formatter
    this.formatter = new ConsoleFormatter(options);
  }

  /**
   * Emit a test event to the active formatter
   */
  emit(event: TestEvent): void {
    this.formatter.onEvent(event);
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
    prompt?: string
  ): void {
    this.emit({
      type: 'test_complete',
      data: { name, model, passed, errors, prompt },
    });
  }

  suiteComplete(total: number, passed: number, failed: number, duration: number): void {
    this.emit({
      type: 'suite_complete',
      data: { total, passed, failed, duration },
    });
  }

  /**
   * Flush any pending output
   */
  flush(): void {
    this.formatter.flush();
  }
}
