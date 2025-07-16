/**
 * JUnit XML formatter for standardized test output
 * Generates JUnit XML format compatible with CI/CD systems
 * Uses fast-xml-parser XMLBuilder for robust XML generation
 */

import type {
  TestEvent,
  TestFormatter,
  DisplayOptions,
  SuiteStartEvent,
  TestCompleteEvent,
  ProgressEvent,
  SuiteCompleteEvent,
  TestStartEvent,
} from '../types.js';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { XMLBuilder } from 'fast-xml-parser';
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
  private xmlBuilder: XMLBuilder;

  constructor(options: DisplayOptions = {}, outputFile: string = 'junit.xml') {
    this.options = options;
    this.outputFile = outputFile;
    this.xmlBuilder = new XMLBuilder({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      format: true,
      indentBy: '  ',
      suppressEmptyNode: true,
    });
  }

  onEvent(event: TestEvent): void {
    switch (event.type) {
      case 'suite_start':
        this.handleSuiteStart(event.data as SuiteStartEvent['data']);
        break;
      case 'test_start':
        this.handleTestStart(event.data as TestStartEvent['data']);
        break;
      case 'test_complete':
        this.handleTestComplete(event.data as TestCompleteEvent['data']);
        break;
      case 'suite_complete':
        this.handleSuiteComplete(event.data as SuiteCompleteEvent['data']);
        break;
      case 'progress':
        this.handleProgress(event.data as ProgressEvent['data']);
        break;
    }
  }

  private handleSuiteStart(data: SuiteStartEvent['data']): void {
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

  private handleProgress(data: ProgressEvent['data']): void {
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

  private handleTestStart(data: TestStartEvent['data']): void {
    const testKey = this.getTestKey(data.name, data.model);
    this.testStartTimes.set(testKey, Date.now());
  }

  private handleTestComplete(data: TestCompleteEvent['data']): void {
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

  private handleSuiteComplete(_data: SuiteCompleteEvent['data']): void {
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

  private determineSuiteName(data: SuiteStartEvent['data']): string {
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

  private getClassname(data: TestCompleteEvent['data']): string {
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

  private extractProperties(data: SuiteStartEvent['data']): Record<string, string> {
    const properties: Record<string, string> = {};

    if (data.modelCount) {
      properties.modelCount = data.modelCount.toString();
    }
    if (data.totalRuns) {
      properties.totalRuns = data.totalRuns.toString();
    }

    return properties;
  }

  private formatFailureContent(data: TestCompleteEvent['data']): string {
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

    // Generate JUnit XML using XMLBuilder
    const xml = this.generateXml();

    // Ensure output directory exists
    const outputDir = dirname(this.outputFile);
    if (outputDir !== '.') {
      mkdirSync(outputDir, { recursive: true });
    }

    // Write XML to file
    writeFileSync(this.outputFile, xml, 'utf8');

    // Validate the generated XML
    if (this.options.debug) {
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

    // Build the XML structure using XMLBuilder
    const xmlData = {
      '?xml': {
        '@_version': '1.0',
        '@_encoding': 'UTF-8',
      },
      testsuites: {
        '@_tests': totalTests,
        '@_failures': totalFailures,
        '@_errors': totalErrors,
        '@_time': totalTime.toFixed(3),
        testsuite: this.suites.map(suite => this.buildTestSuiteData(suite)),
      },
    };

    return this.xmlBuilder.build(xmlData);
  }

  private buildTestSuiteData(suite: TestSuite) {
    const testsuiteData: Record<string, unknown> = {
      '@_name': suite.name,
      '@_tests': suite.tests,
      '@_failures': suite.failures,
      '@_errors': suite.errors,
      '@_skipped': suite.skipped,
      '@_time': suite.time.toFixed(3),
      '@_timestamp': suite.timestamp,
    };

    // Add properties if they exist
    if (suite.properties && Object.keys(suite.properties).length > 0) {
      testsuiteData.properties = {
        property: Object.entries(suite.properties).map(([key, value]) => ({
          '@_name': key,
          '@_value': value,
        })),
      };
    }

    // Add test cases
    if (suite.testcases.length > 0) {
      testsuiteData.testcase = suite.testcases.map(testcase => this.buildTestCaseData(testcase));
    }

    return testsuiteData;
  }

  private buildTestCaseData(testcase: TestCase) {
    const testcaseData: Record<string, unknown> = {
      '@_name': testcase.name,
      '@_classname': testcase.classname,
      '@_time': testcase.time.toFixed(3),
    };

    if (testcase.failure) {
      testcaseData.failure = {
        '@_message': testcase.failure.message,
        '@_type': testcase.failure.type,
        '#text': testcase.failure.content,
      };
    }

    if (testcase.error) {
      testcaseData.error = {
        '@_message': testcase.error.message,
        '@_type': testcase.error.type,
        '#text': testcase.error.content,
      };
    }

    if (testcase.skipped) {
      testcaseData.skipped = {};
    }

    return testcaseData;
  }
}
