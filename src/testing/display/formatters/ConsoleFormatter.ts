/**
 * Console formatter that provides rich human-readable test output
 * Inspired by the old inspector output format
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { TestEvent, TestFormatter, DisplayOptions } from '../types.js';

interface TestResult {
  name: string;
  passed: boolean;
  errors?: string[];
  model?: string;
  prompt?: string;
}

export class ConsoleFormatter implements TestFormatter {
  private options: DisplayOptions;
  private currentModel: string | undefined;
  private toolTests: TestResult[] = [];
  private evalTests: TestResult[] = [];
  private versionShown = false;
  private version: string;

  constructor(options: DisplayOptions = {}) {
    this.options = options;
    this.version = this.getVersion();
  }

  private getVersion(): string {
    try {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const packageJsonPath = join(__dirname, '../../../../package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      return packageJson.version;
    } catch {
      return '1.0.7'; // fallback version
    }
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
    if (!this.versionShown) {
      console.log(`MCP Server Tester v${this.version}\n`);
      this.versionShown = true;
    }
    
    // Don't show individual suite start messages - we'll organize output differently
  }

  private handleProgress(data: any): void {
    if (data.model && data.model !== this.currentModel) {
      this.currentModel = data.model;
      // Don't show model messages immediately - we'll organize by category
    } else if (data.message) {
      // Suppress progress messages for cleaner output
    }
  }

  private handleTestStart(_data: any): void {
    // For now, we don't show individual test starts
    // Could add verbose mode later that shows "Running: test_name..."
  }

  private handleTestComplete(data: any): void {
    const { name, passed, errors, prompt } = data;
    
    const testResult: TestResult = {
      name,
      passed,
      errors,
      model: this.currentModel,
      prompt
    };

    // Categorize tests based on model presence (eval tests have models)
    if (this.currentModel) {
      this.evalTests.push(testResult);
    } else {
      this.toolTests.push(testResult);
    }
  }

  private handleSuiteComplete(data: any): void {
    this.displayOrganizedResults(data);
  }

  private displayOrganizedResults(data: any): void {
    // Display Tools Tests section if we have any
    if (this.toolTests.length > 0) {
      console.log('📋 Tools Tests');
      this.toolTests.forEach(test => {
        this.displayTestResult(test);
      });
      console.log('');
    }

    // Display LLM Evaluation Tests section if we have any
    if (this.evalTests.length > 0) {
      // Group by model
      const testsByModel = this.groupTestsByModel(this.evalTests);
      
      for (const [model, tests] of Object.entries(testsByModel)) {
        console.log(`🤖 LLM Evaluation Tests (${model})`);
        tests.forEach(test => {
          this.displayTestResult(test);
        });
        console.log('');
      }
    }

    // Display summary
    const allTests = [...this.toolTests, ...this.evalTests];
    const passedCount = allTests.filter(t => t.passed).length;
    const totalCount = allTests.length;
    const duration = data.duration || 0;
    
    console.log(`📊 Results: ${passedCount}/${totalCount} tests passed (${(duration / 1000).toFixed(1)}s)`);
  }

  private displayTestResult(test: TestResult): void {
    const emoji = test.passed ? '✅' : '❌';
    const status = test.passed ? 'PASSED' : 'FAILED';
    
    console.log(`${emoji} ${test.name}: ${status}`);
    
    if (!test.passed && test.errors && test.errors.length > 0) {
      if (test.prompt) {
        console.log(`    Prompt: "${test.prompt}"`);
      }
      test.errors.forEach((error: string) => {
        console.log(`    • ${error}`);
      });
    }
  }

  private groupTestsByModel(tests: TestResult[]): Record<string, TestResult[]> {
    const grouped: Record<string, TestResult[]> = {};
    
    tests.forEach(test => {
      const model = test.model || 'unknown';
      if (!grouped[model]) {
        grouped[model] = [];
      }
      grouped[model].push(test);
    });
    
    return grouped;
  }

  flush(): void {
    // Console output is synchronous, nothing to flush
  }
}
