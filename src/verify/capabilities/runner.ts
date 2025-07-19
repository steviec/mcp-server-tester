/**
 * Capabilities test runner for direct tool calls
 */

import { McpClient, createTransportOptions } from '../../core/mcp-client.js';
import {
  type ToolsConfig,
  type CapabilitiesTest,
  type CapabilitiesTestCall,
  type TestResult,
  type TestCallResult,
  type TestSummary,
  type ServerConfig,
  isSingleToolTest,
  isMultiStepTest,
} from '../../core/types.js';
import type { DisplayManager } from '../display/DisplayManager.js';

interface ServerOptions {
  serverConfig: ServerConfig;
  timeout?: number;
  debug?: boolean;
}

export class CapabilitiesTestRunner {
  private mcpClient: McpClient;
  private config: ToolsConfig;
  private serverOptions: ServerOptions;
  private displayManager?: DisplayManager;

  constructor(config: ToolsConfig, serverOptions: ServerOptions, displayManager?: DisplayManager) {
    this.config = config;
    this.serverOptions = serverOptions;
    this.displayManager = displayManager;
    this.mcpClient = new McpClient();
  }

  async run(): Promise<TestSummary> {
    const startTime = Date.now();

    try {
      const transportOptions = createTransportOptions(this.serverOptions.serverConfig);

      await this.mcpClient.connect(transportOptions);

      // Emit section start
      this.displayManager?.sectionStart('tools', '📋 Tools Tests');

      // Run discovery tests if configured
      if (this.config.expected_tool_list) {
        await this.runDiscoveryTests();
      }

      // Run capabilities tests
      const results: TestResult[] = [];

      for (const test of this.config.tests) {
        this.displayManager?.testStart(test.name);
        const result = await this.runTest(test);
        results.push(result);
        this.displayManager?.testComplete(test.name, result.passed, result.errors);
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

      return summary;
    } finally {
      await this.mcpClient.disconnect();
    }
  }

  private async runDiscoveryTests(): Promise<void> {
    if (!this.config.expected_tool_list) {
      return;
    }

    // Test tool discovery
    const toolsResult = await this.mcpClient.sdk.listTools();
    const availableTools = toolsResult.tools?.map((tool: { name: string }) => tool.name) || [];

    const missingTools: string[] = [];
    for (const expectedTool of this.config.expected_tool_list) {
      if (!availableTools.includes(expectedTool)) {
        missingTools.push(expectedTool);
      }
    }

    const passed = missingTools.length === 0;

    // Emit tool discovery result
    this.displayManager?.toolDiscovery(this.config.expected_tool_list, availableTools, passed);

    if (!passed) {
      throw new Error(
        `Expected tool(s) not found: ${missingTools.join(', ')}. Available tools: ${availableTools.join(', ')}`
      );
    }

    // Always validate tool schemas
    const toolsResultForValidation = await this.mcpClient.sdk.listTools();
    const tools = toolsResultForValidation.tools || [];

    for (const tool of tools) {
      if (!tool.name) {
        throw new Error(`Tool missing name property`);
      }

      if (!tool.inputSchema) {
        throw new Error(`Tool '${tool.name}' missing input schema`);
      }
    }
  }

  private async runTest(test: CapabilitiesTest): Promise<TestResult> {
    const startTime = Date.now();
    const callResults: TestCallResult[] = [];
    const errors: string[] = [];
    let passed = true;

    if (isSingleToolTest(test)) {
      // Handle single tool test format
      const callToMake: CapabilitiesTestCall = {
        tool: test.tool,
        params: test.params,
        expect: test.expect,
      };

      const callResult = await this.runCall(callToMake);
      callResults.push(callResult);

      if (!callResult.success) {
        passed = false;
        errors.push(`Tool call ${test.tool} failed: ${callResult.error}`);
      }
    } else if (isMultiStepTest(test)) {
      // Handle multi-step test format
      for (const call of test.calls) {
        const callResult = await this.runCall(call);
        callResults.push(callResult);

        if (!callResult.success) {
          passed = false;
          errors.push(`Tool call ${call.tool} failed: ${callResult.error}`);
        }
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

  private async runCall(call: CapabilitiesTestCall): Promise<TestCallResult> {
    const startTime = Date.now();

    try {
      const result = await this.mcpClient.sdk.callTool({
        name: call.tool,
        arguments: call.params,
      });
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

  private validateCallResult(
    result: unknown,
    expect: CapabilitiesTestCall['expect']
  ): string | null {
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
