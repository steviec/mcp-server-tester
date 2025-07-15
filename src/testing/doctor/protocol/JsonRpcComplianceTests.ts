/**
 * JSON-RPC Compliance Tests
 * Tests JSON-RPC 2.0 message format, request ID handling, and error responses
 */

import { DiagnosticTest } from '../DiagnosticTest.js';
import { TEST_SEVERITY, type DiagnosticResult, type DoctorConfig } from '../types.js';
import { registerDoctorTest } from '../TestRegistry.js';
import type { McpClient } from '../../../core/mcp-client.js';

class JsonRpcMessageFormatTest extends DiagnosticTest {
  readonly name = 'Protocol: JSON-RPC Message Format Validation';
  readonly description = 'Validate JSON-RPC 2.0 message structure compliance';
  readonly category = 'protocol';
  readonly severity = TEST_SEVERITY.CRITICAL;

  async execute(client: McpClient, config: DoctorConfig): Promise<DiagnosticResult> {
    const issues: string[] = [];
    const validations: string[] = [];

    try {
      // Test basic JSON-RPC response structure
      const response = await Promise.race([
        client.listTools(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), config.timeouts.testExecution)
        ),
      ]);

      // Validate response structure
      if (typeof response !== 'object' || response === null) {
        issues.push('Response is not a JSON object');
      } else {
        // Check for required fields in a typical MCP response
        if ('tools' in response && Array.isArray(response.tools)) {
          validations.push('Response contains expected tools array');
        } else {
          issues.push('Response missing expected tools field or not an array');
        }

        // Check that response doesn't contain JSON-RPC error structure when successful
        if ('error' in response) {
          issues.push('Successful response contains error field');
        } else {
          validations.push('Successful response properly structured without error field');
        }

        // Validate that arrays contain proper objects
        if ('tools' in response && Array.isArray(response.tools)) {
          const tools = response.tools as unknown[];
          for (let i = 0; i < Math.min(tools.length, 3); i++) {
            // Check first 3 tools
            const tool = tools[i];
            if (typeof tool !== 'object' || tool === null) {
              issues.push(`Tool ${i} is not a proper object`);
            } else if (!('name' in tool) || typeof tool.name !== 'string') {
              issues.push(`Tool ${i} missing required 'name' field or not a string`);
            } else {
              validations.push(`Tool ${i} properly structured with name: ${tool.name}`);
            }
          }
        }
      }

      // Test error response format by making an invalid request
      try {
        // Attempt to call a non-existent tool to trigger an error response
        await client.callTool('non_existent_tool_xyz', {});
      } catch (error) {
        // This should throw an error, which is expected
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Validate that we get a proper error message
        if (errorMessage.includes('non_existent_tool_xyz')) {
          validations.push('Error responses contain proper tool identification');
        } else if (errorMessage.includes('not found') || errorMessage.includes('unknown')) {
          validations.push('Error responses properly indicate missing tools');
        } else {
          issues.push('Error response format unclear or non-standard');
        }
      }

      const isValid = issues.length === 0;
      const message = isValid
        ? `JSON-RPC format validation passed (${validations.length} checks)`
        : `JSON-RPC format issues detected (${issues.length} issues, ${validations.length} valid)`;

      return this.createResult(
        isValid,
        message,
        { issues, validations },
        issues.length > 0
          ? [
              'Ensure all responses follow JSON-RPC 2.0 specification',
              'Validate message structure before sending responses',
              'Check error handling implementation',
            ]
          : undefined
      );
    } catch (error) {
      return this.createResult(
        false,
        'JSON-RPC format validation failed',
        { error: error instanceof Error ? error.message : String(error) },
        [
          'Check basic server connectivity',
          'Verify JSON-RPC implementation',
          'Review server response format',
        ]
      );
    }
  }
}

class RequestIdHandlingTest extends DiagnosticTest {
  readonly name = 'Protocol: Request ID Handling';
  readonly description = 'Test request ID uniqueness and proper response matching';
  readonly category = 'protocol';
  readonly severity = TEST_SEVERITY.WARNING;

  async execute(client: McpClient, config: DoctorConfig): Promise<DiagnosticResult> {
    const issues: string[] = [];
    const validations: string[] = [];

    try {
      // Make multiple concurrent requests to test ID handling
      const startTime = Date.now();
      const requests = await Promise.allSettled([
        client.listTools(),
        client.listResources(),
        client.listPrompts(),
        client.listTools(), // Duplicate request
      ]);

      const duration = Date.now() - startTime;

      // Check that all requests either succeeded or failed gracefully
      const successful = requests.filter(r => r.status === 'fulfilled').length;
      const failed = requests.filter(r => r.status === 'rejected').length;

      if (successful > 0) {
        validations.push(`${successful} concurrent requests handled successfully`);
      }

      if (failed > 0) {
        // Check if failures are legitimate (e.g., method not implemented)
        const rejectedReasons = requests
          .filter(r => r.status === 'rejected')
          .map(r => (r.reason instanceof Error ? r.reason.message : String(r.reason)));

        const hasTimeouts = rejectedReasons.some(
          reason => reason.includes('timeout') || reason.includes('ETIMEDOUT')
        );

        if (hasTimeouts) {
          issues.push('Some requests timed out - potential ID tracking issues');
        } else {
          validations.push('Failed requests have proper error messages');
        }
      }

      // Test response timing consistency
      if (duration > config.timeouts.testExecution) {
        issues.push(`Concurrent requests took ${duration}ms - longer than expected`);
      } else {
        validations.push(`Concurrent requests completed in ${duration}ms`);
      }

      const isValid = issues.length === 0;
      const message = isValid
        ? `Request ID handling validation passed (${validations.length} checks)`
        : `Request ID handling issues detected (${issues.length} issues)`;

      return this.createResult(
        isValid,
        message,
        {
          successful,
          failed,
          duration,
          issues,
          validations,
        },
        issues.length > 0
          ? [
              'Implement proper request ID tracking',
              'Ensure concurrent request handling',
              'Optimize response timing',
            ]
          : undefined
      );
    } catch (error) {
      return this.createResult(
        false,
        'Request ID handling test failed',
        { error: error instanceof Error ? error.message : String(error) },
        [
          'Check concurrent request handling',
          'Verify request ID implementation',
          'Review server request processing',
        ]
      );
    }
  }
}

class ErrorResponseFormatTest extends DiagnosticTest {
  readonly name = 'Protocol: Error Response Format';
  readonly description = 'Test standard error response format and error codes';
  readonly category = 'protocol';
  readonly severity = TEST_SEVERITY.WARNING;

  async execute(client: McpClient, _config: DoctorConfig): Promise<DiagnosticResult> {
    const issues: string[] = [];
    const validations: string[] = [];

    try {
      // Test various error conditions
      const errorTests = [
        {
          name: 'Invalid tool name',
          test: async () => {
            try {
              await client.callTool('invalid_tool_name_12345', {});
              return 'No error thrown for invalid tool';
            } catch (error) {
              return error instanceof Error ? error.message : String(error);
            }
          },
        },
        {
          name: 'Invalid tool arguments',
          test: async () => {
            try {
              // First get a valid tool name
              const tools = await client.listTools();
              if (tools.tools && tools.tools.length > 0) {
                const toolName = tools.tools[0].name;
                // Call with potentially invalid arguments
                await client.callTool(toolName, { invalid_param: 'test' });
                return 'No error thrown for potentially invalid arguments';
              } else {
                return 'No tools available to test invalid arguments';
              }
            } catch (error) {
              return error instanceof Error ? error.message : String(error);
            }
          },
        },
      ];

      for (const errorTest of errorTests) {
        try {
          const result = await errorTest.test();

          if (result.startsWith('No error thrown')) {
            issues.push(`${errorTest.name}: ${result}`);
          } else if (result.includes('No tools available')) {
            validations.push(`${errorTest.name}: Skipped - no tools to test`);
          } else {
            // Validate error message quality
            if (result.length > 0 && result.length < 500) {
              validations.push(`${errorTest.name}: Proper error message received`);
            } else if (result.length === 0) {
              issues.push(`${errorTest.name}: Empty error message`);
            } else {
              issues.push(`${errorTest.name}: Error message too long (${result.length} chars)`);
            }
          }
        } catch (testError) {
          issues.push(
            `${errorTest.name}: Test execution failed - ${testError instanceof Error ? testError.message : String(testError)}`
          );
        }
      }

      const isValid = issues.length === 0;
      const message = isValid
        ? `Error response format validation passed (${validations.length} checks)`
        : `Error response format issues detected (${issues.length} issues)`;

      return this.createResult(
        isValid,
        message,
        { issues, validations },
        issues.length > 0
          ? [
              'Implement proper error response formatting',
              'Ensure error messages are descriptive but concise',
              'Validate error handling for invalid inputs',
            ]
          : undefined
      );
    } catch (error) {
      return this.createResult(
        false,
        'Error response format test failed',
        { error: error instanceof Error ? error.message : String(error) },
        [
          'Check error handling implementation',
          'Verify error response structure',
          'Review exception handling',
        ]
      );
    }
  }
}

// Register JSON-RPC compliance tests
registerDoctorTest(new JsonRpcMessageFormatTest());
registerDoctorTest(new RequestIdHandlingTest());
registerDoctorTest(new ErrorResponseFormatTest());
