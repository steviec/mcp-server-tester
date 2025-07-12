/**
 * JUnit XML formatter for standardized test output
 * Generates JUnit XML format compatible with CI/CD systems
 */

import type { TestEvent, TestFormatter, DisplayOptions } from '../types.js';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { validateJunitXmlContent } from './junit-validation.js';

interface TestCase {
  name: string;
  classname: string;
  time: number;
  failure?: {
    message: string;
    type: string;
    content: string;
  };
  error?: {
    message: string;
    type: string;
    content: string;
  };
  skipped?: boolean;
}

interface TestSuite {
  name: string;
  tests: number;
  failures: number;
  errors: number;
  skipped: number;
  time: number;
  timestamp: string;
  testcases: TestCase[];
  properties?: Record<string, string>;
}

export class JunitXmlFormatter implements TestFormatter {
  private options: DisplayOptions;
  private outputFile: string;
  private suites: TestSuite[] = [];
  private currentSuite: TestSuite | null = null;
  private startTime: number = 0;
  private testStartTimes: Map<string, number> = new Map();

  constructor(options: DisplayOptions = {}, outputFile: string = 'junit.xml') {
    this.options = options;
    this.outputFile = outputFile;
  }

  onEvent(event: TestEvent): void {
    switch (event.type) {
      case 'suite_start':
        this.handleSuiteStart(event.data);
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
      case 'progress':
        this.handleProgress(event.data);
        break;
    }
  }

  private handleSuiteStart(data: any): void {
    this.startTime = Date.now();

    // Determine suite type based on data
    const suiteName = this.determineSuiteName(data);

    this.currentSuite = {
      name: suiteName,
      tests: data.testCount || 0,
      failures: 0,
      errors: 0,
      skipped: 0,
      time: 0,
      timestamp: new Date().toISOString(),
      testcases: [],
      properties: this.extractProperties(data),
    };
  }

  private handleProgress(data: any): void {
    // Handle model changes for eval tests
    if (data.model && this.currentSuite) {
      // If we detect a model change and already have testcases,
      // finalize current suite and start a new one for the new model
      if (this.currentSuite.testcases.length > 0) {
        this.finalizeCurrentSuite();

        // Start new suite for new model
        this.currentSuite = {
          name: `evals-${data.model}`,
          tests: 0, // Will be updated as tests complete
          failures: 0,
          errors: 0,
          skipped: 0,
          time: 0,
          timestamp: new Date().toISOString(),
          testcases: [],
          properties: { model: data.model },
        };
      } else if (this.currentSuite) {
        // Update existing suite with model info
        this.currentSuite.name = `evals-${data.model}`;
        this.currentSuite.properties = { ...this.currentSuite.properties, model: data.model };
      }
    }
  }

  private handleTestStart(data: any): void {
    const testKey = this.getTestKey(data.name, data.model);
    this.testStartTimes.set(testKey, Date.now());
  }

  private handleTestComplete(data: any): void {
    if (!this.currentSuite) {
      // Create a default suite if none exists
      this.currentSuite = {
        name: 'tests',
        tests: 0,
        failures: 0,
        errors: 0,
        skipped: 0,
        time: 0,
        timestamp: new Date().toISOString(),
        testcases: [],
      };
    }

    const testKey = this.getTestKey(data.name, data.model);
    const startTime = this.testStartTimes.get(testKey) || Date.now();
    const duration = (Date.now() - startTime) / 1000; // Convert to seconds

    const testCase: TestCase = {
      name: data.name,
      classname: this.getClassname(data),
      time: duration,
    };

    // Handle test failures and errors
    if (!data.passed) {
      if (data.errors && data.errors.length > 0) {
        const errorMessage = data.errors.join('; ');
        testCase.failure = {
          message: errorMessage,
          type: 'AssertionError',
          content: this.formatFailureContent(data),
        };
        this.currentSuite.failures++;
      } else {
        // Generic failure
        testCase.failure = {
          message: 'Test failed',
          type: 'TestFailure',
          content: this.formatFailureContent(data),
        };
        this.currentSuite.failures++;
      }
    }

    this.currentSuite.testcases.push(testCase);
    this.currentSuite.tests++;
    this.testStartTimes.delete(testKey);
  }

  private handleSuiteComplete(_data: any): void {
    this.finalizeCurrentSuite();
  }

  private finalizeCurrentSuite(): void {
    if (this.currentSuite) {
      // Calculate total suite time
      this.currentSuite.time = (Date.now() - this.startTime) / 1000;

      // Update counts based on actual testcases
      this.currentSuite.tests = this.currentSuite.testcases.length;
      this.currentSuite.failures = this.currentSuite.testcases.filter(tc => tc.failure).length;
      this.currentSuite.errors = this.currentSuite.testcases.filter(tc => tc.error).length;
      this.currentSuite.skipped = this.currentSuite.testcases.filter(tc => tc.skipped).length;

      this.suites.push(this.currentSuite);
      this.currentSuite = null;
    }
  }

  private determineSuiteName(data: any): string {
    if (data.modelCount && data.modelCount > 1) {
      return 'evals';
    } else if (data.testCount) {
      return 'tools';
    }
    return 'tests';
  }

  private getTestKey(name: string, model?: string): string {
    return model ? `${name}-${model}` : name;
  }

  private getClassname(data: any): string {
    if (data.model) {
      return data.model;
    }
    // For tools tests, try to extract tool/capability name from test name
    // Example: "filesystem.read_file" -> "filesystem"
    const parts = data.name.split('.');
    if (parts.length > 1) {
      return parts[0];
    }
    return 'default';
  }

  private extractProperties(data: any): Record<string, string> {
    const properties: Record<string, string> = {};

    if (data.modelCount) {
      properties.modelCount = data.modelCount.toString();
    }
    if (data.totalRuns) {
      properties.totalRuns = data.totalRuns.toString();
    }

    return properties;
  }

  private formatFailureContent(data: any): string {
    let content = '';

    if (data.prompt) {
      content += `Prompt: ${data.prompt}\n`;
    }

    if (data.errors && data.errors.length > 0) {
      content += `Errors:\n${data.errors.map((e: string) => `  - ${e}`).join('\n')}`;
    }

    return content || 'Test failed without detailed error information';
  }

  flush(): void {
    // Finalize any remaining suite
    this.finalizeCurrentSuite();

    // Generate JUnit XML
    const xml = this.generateXml();

    // Ensure output directory exists
    const outputDir = dirname(this.outputFile);
    if (outputDir !== '.') {
      mkdirSync(outputDir, { recursive: true });
    }

    // Write XML to file
    writeFileSync(this.outputFile, xml, 'utf8');

    // Validate the generated XML
    if (this.options.verbose) {
      const validation = validateJunitXmlContent(xml);
      if (!validation.valid) {
        console.warn(`JUnit XML validation errors: ${validation.errors.join(', ')}`);
      }
      if (validation.warnings.length > 0) {
        console.warn(`JUnit XML validation warnings: ${validation.warnings.join(', ')}`);
      }
      console.log(`JUnit XML report written to: ${this.outputFile}`);
    }
  }

  private generateXml(): string {
    const totalTests = this.suites.reduce((sum, suite) => sum + suite.tests, 0);
    const totalFailures = this.suites.reduce((sum, suite) => sum + suite.failures, 0);
    const totalErrors = this.suites.reduce((sum, suite) => sum + suite.errors, 0);
    const totalTime = this.suites.reduce((sum, suite) => sum + suite.time, 0);

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += `<testsuites tests="${totalTests}" failures="${totalFailures}" errors="${totalErrors}" time="${totalTime.toFixed(3)}">\n`;

    for (const suite of this.suites) {
      xml += this.generateTestSuiteXml(suite);
    }

    xml += '</testsuites>\n';
    return xml;
  }

  private generateTestSuiteXml(suite: TestSuite): string {
    let xml = `  <testsuite name="${this.escapeXml(suite.name)}" `;
    xml += `tests="${suite.tests}" `;
    xml += `failures="${suite.failures}" `;
    xml += `errors="${suite.errors}" `;
    xml += `skipped="${suite.skipped}" `;
    xml += `time="${suite.time.toFixed(3)}" `;
    xml += `timestamp="${suite.timestamp}">\n`;

    // Add properties if they exist
    if (suite.properties && Object.keys(suite.properties).length > 0) {
      xml += '    <properties>\n';
      for (const [key, value] of Object.entries(suite.properties)) {
        xml += `      <property name="${this.escapeXml(key)}" value="${this.escapeXml(value)}"/>\n`;
      }
      xml += '    </properties>\n';
    }

    // Add test cases
    for (const testcase of suite.testcases) {
      xml += this.generateTestCaseXml(testcase);
    }

    xml += '  </testsuite>\n';
    return xml;
  }

  private generateTestCaseXml(testcase: TestCase): string {
    let xml = `    <testcase name="${this.escapeXml(testcase.name)}" `;
    xml += `classname="${this.escapeXml(testcase.classname)}" `;
    xml += `time="${testcase.time.toFixed(3)}"`;

    if (testcase.failure || testcase.error || testcase.skipped) {
      xml += '>\n';

      if (testcase.failure) {
        xml += `      <failure message="${this.escapeXml(testcase.failure.message)}" `;
        xml += `type="${this.escapeXml(testcase.failure.type)}">\n`;
        xml += this.escapeXml(testcase.failure.content);
        xml += '\n      </failure>\n';
      }

      if (testcase.error) {
        xml += `      <error message="${this.escapeXml(testcase.error.message)}" `;
        xml += `type="${this.escapeXml(testcase.error.type)}">\n`;
        xml += this.escapeXml(testcase.error.content);
        xml += '\n      </error>\n';
      }

      if (testcase.skipped) {
        xml += '      <skipped/>\n';
      }

      xml += '    </testcase>\n';
    } else {
      xml += '/>\n';
    }

    return xml;
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
