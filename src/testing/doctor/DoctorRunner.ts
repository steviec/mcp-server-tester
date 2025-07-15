/**
 * Main orchestrator for running diagnostic tests
 */

import { McpClient, createTransportOptions } from '../../core/mcp-client.js';
import { ConfigLoader } from '../../config/loader.js';
import { TestRegistry } from './TestRegistry.js';
import { HealthReportGenerator } from './HealthReport.js';
import {
  TestSeverity,
  type DiagnosticResult,
  type DoctorOptions,
  type HealthReport,
  type DoctorConfig,
} from './types.js';

export class DoctorRunner {
  private config: DoctorConfig;

  constructor(private _options: DoctorOptions) {
    this.config = this.createConfig();
  }

  async runDiagnostics(): Promise<HealthReport> {
    const startTime = Date.now();

    try {
      const client = await this.connectToServer();
      const tests = this.discoverTests();
      const results = await this.executeTests(tests, client);
      const endTime = Date.now();

      await client.disconnect();

      return HealthReportGenerator.generateReport(
        results,
        this.getServerInfo(),
        startTime,
        endTime
      );
    } catch (error) {
      const endTime = Date.now();
      const errorResult: DiagnosticResult = {
        testName: 'System: Connection',
        status: 'failed',
        message: `Failed to connect to server: ${error instanceof Error ? error.message : String(error)}`,
        severity: TestSeverity.CRITICAL,
        duration: endTime - startTime,
        recommendations: ['Check server configuration and ensure server is running'],
      };

      return HealthReportGenerator.generateReport(
        [errorResult],
        this.getServerInfo(),
        startTime,
        endTime
      );
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

  private discoverTests() {
    const availableTests = TestRegistry.getAllTests();

    // Filter by categories if specified
    if (this._options.categories) {
      const requestedCategories = this._options.categories.split(',').map(c => c.trim());
      return availableTests.filter(test => requestedCategories.includes(test.category));
    }

    return availableTests;
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
          status: 'failed',
          message: `Test execution failed: ${error instanceof Error ? error.message : String(error)}`,
          severity: test.severity,
          duration,
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

  private createConfig(): DoctorConfig {
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
    };
  }

  private getServerInfo() {
    return {
      name: this._options.serverName || 'unknown',
      transport: 'stdio', // TODO: detect actual transport
    };
  }
}
