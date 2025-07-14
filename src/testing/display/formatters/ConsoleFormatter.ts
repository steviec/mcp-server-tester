/**
 * Console formatter that provides rich human-readable test output
 * Inspired by the old inspector output format
 */

import type { TestEvent, TestFormatter, DisplayOptions } from '../types.js';

export class ConsoleFormatter implements TestFormatter {
  private options: DisplayOptions;
  private currentModel: string | undefined;
  private hasShownVersion = false;

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
      case 'section_start':
        this.handleSectionStart(event.data);
        break;
      case 'tool_discovery':
        this.handleToolDiscovery(event.data);
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

  private handleSuiteStart(_data: any): void {
    // Show version info once at the very beginning
    if (!this.hasShownVersion) {
      const version = this.options.version || '1.0.7';
      console.log(`\nMCP Server Tester v${version}`);
      this.hasShownVersion = true;
    }
  }

  private handleSectionStart(data: any): void {
    console.log(`\n${data.title}`);
  }

  private handleToolDiscovery(data: any): void {
    const { expectedTools, foundTools, passed } = data;
    const icon = passed ? '✅' : '❌';

    if (passed) {
      console.log(
        `${icon} Tool discovery: ${foundTools.length}/${expectedTools.length} expected tools found (${foundTools.join(', ')})`
      );
    } else {
      const missing = expectedTools.filter((tool: string) => !foundTools.includes(tool));
      console.log(
        `${icon} Tool discovery: ${foundTools.length}/${expectedTools.length} expected tools found (missing: ${missing.join(', ')})`
      );
    }
  }

  private handleProgress(data: any): void {
    if (data.model && data.model !== this.currentModel) {
      this.currentModel = data.model;
      // Model changes are now handled by section headers
    } else if (data.message && !this.options.quiet) {
      // Only show progress messages in verbose mode or if explicitly needed
      if (this.options.verbose) {
        console.log(data.message);
      }
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
    const durationInSeconds = (duration / 1000).toFixed(1);

    console.log(`\n📊 Results: ${passed}/${total} tests passed (${durationInSeconds}s)`);
  }

  flush(): void {
    // Console output is synchronous, nothing to flush
  }
}
