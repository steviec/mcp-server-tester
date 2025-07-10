/**
 * Integration test runner for direct tool calls
 */

import {
  McpClient,
  createTransportOptions,
  createServerConfigFromCli,
} from '../../core/mcp-client.js';
import { ConfigLoader } from '../../config/loader.js';
import type {
  IntegrationTestConfig,
  IntegrationTest,
  IntegrationTestCall,
  TestResult,
  TestCallResult,
  TestSummary,
} from '../../core/types.js';

interface ServerOptions {
  serverConfig?: string;
  serverName?: string;
  serverCommand?: string;
  serverArgs?: string;
  serverEnv?: string;
}

export class IntegrationTestRunner {
  private mcpClient: McpClient;
  private config: IntegrationTestConfig;
  private serverOptions: ServerOptions;

  constructor(configPath: string, serverOptions: ServerOptions) {
    this.config = ConfigLoader.loadIntegrationConfig(configPath);
    this.serverOptions = serverOptions;
    this.mcpClient = new McpClient();
  }

  async run(): Promise<TestSummary> {
    const startTime = Date.now();

    try {
      // Determine server configuration based on mode
      let transportOptions;

      if (this.serverOptions.serverConfig) {
        // Config file mode
        const serverConfig = ConfigLoader.loadServerConfig(
          this.serverOptions.serverConfig,
          this.serverOptions.serverName
        );
        transportOptions = createTransportOptions(serverConfig);
      } else if (this.serverOptions.serverCommand) {
        // CLI launch mode
        const serverConfig = createServerConfigFromCli(
          this.serverOptions.serverCommand,
          this.serverOptions.serverArgs,
          this.serverOptions.serverEnv
        );
        transportOptions = createTransportOptions(serverConfig);
      } else {
        throw new Error('No server configuration provided');
      }

      await this.mcpClient.connect(transportOptions);

      // Run discovery tests if configured
      if (this.config.discovery) {
        await this.runDiscoveryTests();
      }

      // Run integration tests
      const results: TestResult[] = [];

      for (const test of this.config.tests) {
        const result = await this.runTest(test);
        results.push(result);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      const summary: TestSummary = {
        total: results.length,
        passed: results.filter(r => r.passed).length,
        failed: results.filter(r => !r.passed).length,
        duration,
        results,
      };

      // Results logged by Jest framework

      return summary;
    } finally {
      await this.mcpClient.disconnect();
    }
  }

  private async runDiscoveryTests(): Promise<void> {
    if (!this.config.discovery) {
      return;
    }

    // Running discovery tests

    // Test tool discovery
    if (this.config.discovery.expect_tools) {
      try {
        const toolsResult = await this.mcpClient.listTools();
        const availableTools = toolsResult.tools?.map((tool: { name: string }) => tool.name) || [];

        for (const expectedTool of this.config.discovery.expect_tools) {
          if (!availableTools.includes(expectedTool)) {
            throw new Error(
              `Expected tool '${expectedTool}' not found. Available tools: ${availableTools.join(', ')}`
            );
          }
        }

        // Discovery: Found all expected tools
      } catch (error) {
        throw error;
      }
    }

    // Test schema validation
    if (this.config.discovery.validate_schemas) {
      try {
        const toolsResult = await this.mcpClient.listTools();
        const tools = toolsResult.tools || [];

        for (const tool of tools) {
          if (!tool.name) {
            throw new Error(`Tool missing name property`);
          }

          if (!tool.inputSchema) {
            throw new Error(`Tool '${tool.name}' missing input schema`);
          }
        }

        // Discovery: All tool schemas valid
      } catch (error) {
        throw error;
      }
    }
  }

  private async runTest(test: IntegrationTest): Promise<TestResult> {
    const startTime = Date.now();
    const callResults: TestCallResult[] = [];
    const errors: string[] = [];
    let passed = true;

    for (const call of test.calls) {
      const callResult = await this.runCall(call);
      callResults.push(callResult);

      if (!callResult.success) {
        passed = false;
        errors.push(`Tool call ${call.tool} failed: ${callResult.error}`);
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    return {
      name: test.name,
      passed,
      errors,
      calls: callResults,
      duration,
    };
  }

  private async runCall(call: IntegrationTestCall): Promise<TestCallResult> {
    const startTime = Date.now();

    try {
      const result = await this.mcpClient.callTool(call.tool, call.params);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Check if the call was expected to succeed
      if (call.expect.success) {
        // Call succeeded as expected
        const validationError = this.validateCallResult(result, call.expect);
        if (validationError) {
          return {
            tool: call.tool,
            params: call.params,
            success: false,
            error: validationError,
            duration,
          };
        }

        return {
          tool: call.tool,
          params: call.params,
          success: true,
          result,
          duration,
        };
      } else {
        // Call succeeded but was expected to fail
        return {
          tool: call.tool,
          params: call.params,
          success: false,
          error: 'Expected tool call to fail, but it succeeded',
          result,
          duration,
        };
      }
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Check if the call was expected to fail
      if (!call.expect.success) {
        // Call failed as expected
        if (call.expect.error?.contains) {
          if (!errorMessage.includes(call.expect.error.contains)) {
            return {
              tool: call.tool,
              params: call.params,
              success: false,
              error: `Expected error to contain '${call.expect.error.contains}', but got: ${errorMessage}`,
              duration,
            };
          }
        }

        return {
          tool: call.tool,
          params: call.params,
          success: true,
          error: errorMessage,
          duration,
        };
      } else {
        // Call failed but was expected to succeed
        return {
          tool: call.tool,
          params: call.params,
          success: false,
          error: errorMessage,
          duration,
        };
      }
    }
  }

  private validateCallResult(result: unknown, expect: IntegrationTestCall['expect']): string | null {
    if (!expect.result) {
      return null;
    }

    // Check contains validation
    if (expect.result.contains) {
      const resultStr = JSON.stringify(result);
      if (!resultStr.includes(expect.result.contains)) {
        return `Expected result to contain '${expect.result.contains}', but got: ${resultStr}`;
      }
    }

    // Check equals validation
    if (expect.result.equals !== undefined) {
      const resultStr = JSON.stringify(result);
      const expectedStr = JSON.stringify(expect.result.equals);
      if (resultStr !== expectedStr) {
        return `Expected result to equal ${expectedStr}, but got: ${resultStr}`;
      }
    }

    // TODO: Implement schema validation when needed
    if (expect.result.schema) {
      // This would require ajv or similar JSON schema validator
      console.warn('Schema validation not yet implemented');
    }

    return null;
  }
}
