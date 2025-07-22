/**
 * Main orchestrator for running diagnostic tests
 */

import { McpClient, createTransportOptions } from '../../shared/core/mcp-client.js';
import { ConfigLoader } from '../../shared/config/loader.js';
import { TestRegistry } from './TestRegistry.js';
import { HealthReportGenerator } from './HealthReport.js';
import { CapabilityDetector, type McpCapability } from './CapabilityDetector.js';
import {
  TEST_SEVERITY,
  type DiagnosticResult,
  type ComplianceOptions,
  type HealthReport,
  type ComplianceConfig,
  type TestCategory,
} from './types.js';

export class ComplianceRunner {
  private config: ComplianceConfig;

  constructor(private _options: ComplianceOptions) {
    this.config = this.createConfig();
  }

  async runDiagnostics(): Promise<HealthReport> {
    const startTime = Date.now();

    try {
      const client = await this.connectToServer();

      // Detect server capabilities first
      const serverCapabilities = await CapabilityDetector.detectCapabilities(client);

      // Discover applicable tests based on capabilities
      const applicableTests = this.discoverApplicableTests(serverCapabilities);
      const skippedTests = TestRegistry.getSkippedTests(serverCapabilities);

      // Execute applicable tests
      const results = await this.executeTests(applicableTests, client);

      // Add skipped test results
      const skippedResults = this.createSkippedResults(skippedTests);
      const allResults = [...results, ...skippedResults];

      const endTime = Date.now();
      await client.disconnect();

      return HealthReportGenerator.generateReport({
        results: allResults,
        serverInfo: this.getServerInfo(),
        startTime,
        endTime,
        serverCapabilities,
      });
    } catch (error) {
      const endTime = Date.now();
      const errorResult: DiagnosticResult = {
        testName: 'System: Connection',
        category: 'lifecycle',
        status: 'failed',
        message: `Failed to connect to server: ${error instanceof Error ? error.message : String(error)}`,
        severity: TEST_SEVERITY.CRITICAL,
        duration: endTime - startTime,
        recommendations: ['Check server configuration and ensure server is running'],
      };

      return HealthReportGenerator.generateReport({
        results: [errorResult],
        serverInfo: this.getServerInfo(),
        startTime,
        endTime,
      });
    }
  }

  private async connectToServer(): Promise<McpClient> {
    const serverConfig = ConfigLoader.loadServerConfig(
      this._options.serverConfig,
      this._options.serverName
    );
    const client = new McpClient();
    const transportOptions = createTransportOptions(serverConfig);

    await client.connect(transportOptions);
    return client;
  }

  private discoverApplicableTests(serverCapabilities: Set<McpCapability>) {
    let applicableTests = TestRegistry.getApplicableTests(serverCapabilities);

    // Filter by categories if specified
    if (this._options.categories) {
      const requestedCategories = this._options.categories
        .split(',')
        .map(c => c.trim() as TestCategory);
      applicableTests = applicableTests.filter(test => requestedCategories.includes(test.category));
    }

    return applicableTests;
  }

  private createSkippedResults(
    skippedTests: ReturnType<typeof TestRegistry.getSkippedTests>
  ): DiagnosticResult[] {
    return skippedTests.map(test => ({
      testName: test.name,
      category: test.category,
      status: 'skipped' as const,
      message: `Test skipped: Server does not advertise '${test.requiredCapability}' capability`,
      severity: test.severity,
      duration: 0,
      requiredCapability: test.requiredCapability,
      mcpSpecSection: test.mcpSpecSection,
    }));
  }

  private async executeTests(
    tests: ReturnType<typeof TestRegistry.getAllTests>,
    client: McpClient
  ): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = [];

    for (const test of tests) {
      const startTime = Date.now();
      try {
        const result = await Promise.race([
          test.execute(client, this.config),
          this.createTimeoutPromise(test.name, this.config.timeouts.testExecution),
        ]);

        result.duration = Date.now() - startTime;
        results.push(result);
      } catch (error) {
        const duration = Date.now() - startTime;
        results.push({
          testName: test.name,
          category: test.category,
          status: 'failed',
          message: `Test execution failed: ${error instanceof Error ? error.message : String(error)}`,
          severity: test.severity,
          duration,
          requiredCapability: test.requiredCapability,
          mcpSpecSection: test.mcpSpecSection,
        });
      }
    }

    return results;
  }

  private async createTimeoutPromise(
    testName: string,
    timeoutMs: number
  ): Promise<DiagnosticResult> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Test '${testName}' timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });
  }

  private createConfig(): ComplianceConfig {
    return {
      timeouts: {
        connection: 5000,
        testExecution: parseInt(this._options.timeout || '30000'),
        overall: parseInt(this._options.timeout || '300000'),
      },
      categories: {
        enabled: this._options.categories
          ? this._options.categories.split(',').map(c => c.trim())
          : [],
        disabled: [],
      },
      output: {
        format: (this._options.output as 'console' | 'json') || 'console',
      },
      experimental: {
        useSdkErrorDetection: true, // Enable SDK-based error detection by default
      },
    };
  }

  private getServerInfo() {
    return {
      name: this._options.serverName || 'unknown',
      transport: 'stdio', // TODO: detect actual transport
    };
  }
}
