/**
 * Enhanced Console formatter that provides organized, visually appealing test output
 * with grouped sections, emoji indicators, and improved readability
 */

import type { TestEvent, TestFormatter, DisplayOptions } from '../types.js';

interface TestGroup {
  name: string;
  emoji: string;
  tests: Array<{
    name: string;
    passed: boolean;
    errors: string[];
    prompt?: string;
  }>;
}

export class EnhancedConsoleFormatter implements TestFormatter {
  private options: DisplayOptions;
  private currentModel: string | undefined;
  private testGroups: Map<string, TestGroup> = new Map();
  private startTime: number = 0;

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
    this.startTime = Date.now();

    // Display version header
    console.log('\nMCP Server Tester v1.0.7\n');

    // Initialize test groups based on data
    if (data.hasTools) {
      this.testGroups.set('tools', {
        name: 'Tools Tests',
        emoji: '📋',
        tests: [],
      });
    }

    if (data.hasEvals) {
      this.testGroups.set('evals', {
        name: 'LLM Evaluation Tests',
        emoji: '🤖',
        tests: [],
      });
    }
  }

  private handleProgress(data: any): void {
    if (data.model && data.model !== this.currentModel) {
      this.currentModel = data.model;
      // Update the eval group name to include model
      if (this.testGroups.has('evals')) {
        const evalGroup = this.testGroups.get('evals')!;
        evalGroup.name = `LLM Evaluation Tests (${data.model})`;
      }
    }
  }

  private handleTestStart(_data: any): void {
    // Enhanced version could show test start if verbose mode
    if (this.options.verbose && _data.name) {
      console.log(`⏳ Starting: ${_data.name}`);
    }
  }

  private handleTestComplete(data: any): void {
    const { name, passed, errors, prompt, model, testType } = data;

    // Determine which group this test belongs to
    let groupKey = 'tools'; // default
    if (model || testType === 'eval') {
      groupKey = 'evals';
    }

    const group = this.testGroups.get(groupKey);
    if (group) {
      group.tests.push({
        name,
        passed,
        errors: errors || [],
        prompt,
      });
    }
  }

  private handleSuiteComplete(data: any): void {
    const duration = Date.now() - this.startTime;

    // Display each test group
    for (const group of this.testGroups.values()) {
      if (group.tests.length > 0) {
        console.log(`${group.emoji} ${group.name}`);

        for (const test of group.tests) {
          const statusIcon = test.passed ? '✅' : '❌';
          const status = test.passed ? 'PASSED' : 'FAILED';
          console.log(`${statusIcon} ${test.name}: ${status}`);

          // Show error details for failed tests
          if (!test.passed && test.errors.length > 0) {
            if (test.prompt) {
              console.log(`    Prompt: "${test.prompt}"`);
            }
            test.errors.forEach(error => {
              console.log(`    • ${error}`);
            });
          }
        }
        console.log(); // Empty line after each group
      }
    }

    // Display summary
    const { total, passed } = data;
    const durationInSeconds = (duration / 1000).toFixed(1);
    console.log(`📊 Results: ${passed}/${total} tests passed (${durationInSeconds}s)`);
  }

  flush(): void {
    // Console output is synchronous, nothing to flush
  }
}
