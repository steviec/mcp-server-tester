/**
 * Capabilities test runner for direct tool calls
 */

import { McpClient, createTransportOptions } from '../../shared/core/mcp-client.js';
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
} from '../../shared/core/types.js';
import type { DisplayManager } from '../../shared/display/DisplayManager.js';

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

    // Base result template to eliminate duplication
    const baseResult = {
      tool: call.tool,
      params: call.params,
      duration: 0, // Will be updated
    };

    try {
      const result = await this.mcpClient.sdk.callTool({
        name: call.tool,
        arguments: call.params,
      });

      baseResult.duration = Date.now() - startTime;
      const hasError = this.hasToolError(result);

      // Route to appropriate handler based on expectations
      if (call.expect.success) {
        return this.handleSuccessExpectation(baseResult, result, hasError, call.expect);
      } else {
        return this.handleFailureExpectation(baseResult, result, hasError, call.expect);
      }
    } catch (error) {
      baseResult.duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      return this.handleThrownError(baseResult, errorMessage, call.expect);
    }
  }

  private handleSuccessExpectation(
    baseResult: Pick<TestCallResult, 'tool' | 'params' | 'duration'>,
    result: unknown,
    hasError: boolean,
    expect: CapabilitiesTestCall['expect']
  ): TestCallResult {
    // If we got an error result but expected success, that's a failure
    if (hasError) {
      const errorMessage = this.extractErrorMessage(result);
      return {
        ...baseResult,
        success: false,
        error: errorMessage,
      };
    }

    // Call succeeded as expected - validate the result
    const validationError = this.validateCallResult(result, expect);
    if (validationError) {
      return {
        ...baseResult,
        success: false,
        error: validationError,
      };
    }

    return {
      ...baseResult,
      success: true,
      result,
    };
  }

  private handleFailureExpectation(
    baseResult: Pick<TestCallResult, 'tool' | 'params' | 'duration'>,
    result: unknown,
    hasError: boolean,
    expect: CapabilitiesTestCall['expect']
  ): TestCallResult {
    if (hasError) {
      // Call failed as expected - check error message if specified
      const errorMessage = this.extractErrorMessage(result);
      if (expect.error?.contains) {
        if (!errorMessage.includes(expect.error.contains)) {
          return {
            ...baseResult,
            success: false,
            error: `Expected error to contain '${expect.error.contains}', but got: ${errorMessage}`,
          };
        }
      }

      return {
        ...baseResult,
        success: true,
        error: errorMessage,
      };
    } else {
      // Call succeeded but was expected to fail
      return {
        ...baseResult,
        success: false,
        error: 'Expected tool call to fail, but it succeeded',
        result,
      };
    }
  }

  private handleThrownError(
    baseResult: Pick<TestCallResult, 'tool' | 'params' | 'duration'>,
    errorMessage: string,
    expect: CapabilitiesTestCall['expect']
  ): TestCallResult {
    // Check if the call was expected to fail
    if (!expect.success) {
      // Call failed as expected - check error message if specified
      if (expect.error?.contains) {
        if (!errorMessage.includes(expect.error.contains)) {
          return {
            ...baseResult,
            success: false,
            error: `Expected error to contain '${expect.error.contains}', but got: ${errorMessage}`,
          };
        }
      }

      return {
        ...baseResult,
        success: true,
        error: errorMessage,
      };
    } else {
      // Call failed but was expected to succeed
      return {
        ...baseResult,
        success: false,
        error: errorMessage,
      };
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

  private hasToolError(result: unknown): boolean {
    // According to MCP spec, tool execution errors are indicated by isError: true
    if (typeof result === 'object' && result !== null) {
      const resultObj = result as Record<string, unknown>;
      return resultObj.isError === true;
    }
    return false;
  }

  private extractErrorMessage(result: unknown): string {
    if (typeof result === 'object' && result !== null) {
      const resultObj = result as Record<string, unknown>;

      // Extract error message from content if available
      if (Array.isArray(resultObj.content)) {
        for (const contentItem of resultObj.content) {
          if (typeof contentItem === 'object' && contentItem !== null) {
            const content = contentItem as Record<string, unknown>;
            if (content.type === 'text' && typeof content.text === 'string') {
              return content.text;
            }
          }
        }
      }

      // Fallback to generic error message
      return 'Tool execution failed';
    }

    return 'Unknown tool error';
  }
}
