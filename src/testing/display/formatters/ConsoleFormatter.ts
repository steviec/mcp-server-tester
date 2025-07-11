/**
 * Console formatter that provides rich human-readable test output
 * Inspired by the old inspector output format
 */

import type { TestEvent, TestFormatter, DisplayOptions } from '../types.js';

export class ConsoleFormatter implements TestFormatter {
  private options: DisplayOptions;
  private currentModel: string | undefined;

  constructor(options: DisplayOptions = {}) {
    this.options = options;
  }

  onEvent(event: TestEvent): void {
    if (this.options.quiet) {
      return;
    }

    switch (event.type) {
      case 'suite_start':
        this.handleSuiteStart(event.data);
        break;
      case 'progress':
        this.handleProgress(event.data);
        break;
      case 'test_start':
        this.handleTestStart(event.data);
        break;
      case 'test_complete':
        this.handleTestComplete(event.data);
        break;
      case 'suite_complete':
        this.handleSuiteComplete(event.data);
        break;
    }
  }

  private handleSuiteStart(data: any): void {
    if (data.modelCount && data.testCount) {
      console.log(
        `\nRunning ${data.testCount} eval tests across ${data.modelCount} model(s) (${data.totalRuns} total runs)...`
      );
    } else {
      console.log(`\nRunning ${data.testCount} tests...`);
    }
  }

  private handleProgress(data: any): void {
    if (data.model && data.model !== this.currentModel) {
      this.currentModel = data.model;
      console.log(`\n🤖 Running tests with model: ${data.model}`);
    } else if (data.message) {
      console.log(data.message);
    }
  }

  private handleTestStart(_data: any): void {
    // For now, we don't show individual test starts
    // Could add verbose mode later that shows "Running: test_name..."
  }

  private handleTestComplete(data: any): void {
    const { name, passed, errors, prompt } = data;

    if (passed) {
      console.log(`✅ ${name}: PASSED`);
    } else {
      console.log(`❌ ${name}: FAILED`);

      if (prompt) {
        console.log(`    Prompt: "${prompt}"`);
      }

      if (errors && errors.length > 0) {
        errors.forEach((error: string) => {
          console.log(`    • ${error}`);
        });
      }
    }
  }

  private handleSuiteComplete(data: any): void {
    const { total, passed, duration } = data;

    console.log(`\nResults: ${passed}/${total} tests passed`);

    if (this.options.verbose) {
      console.log(`Duration: ${duration}ms`);
    }
  }

  flush(): void {
    // Console output is synchronous, nothing to flush
  }
}
