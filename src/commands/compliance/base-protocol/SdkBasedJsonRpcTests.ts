/**
 * SDK-Based JSON-RPC Compliance Tests
 * Leverages MCP SDK error detection instead of manual validation
 */

import { DiagnosticTest } from '../DiagnosticTest.js';
import { SdkErrorDetector, type SdkErrorTest } from '../SdkErrorDetector.js';
import {
  TEST_SEVERITY,
  ISSUE_TYPE,
  type DiagnosticResult,
  type ComplianceConfig,
} from '../types.js';
import type { McpClient } from '../../../shared/core/mcp-client.js';
import { ErrorCode } from '@modelcontextprotocol/sdk/types.js';

class SdkJsonRpcComplianceTest extends DiagnosticTest {
  readonly name = 'SDK: JSON-RPC Protocol Compliance';
  readonly description = 'Uses SDK error detection to validate JSON-RPC compliance';
  readonly category = 'base-protocol';
  readonly feature = 'json-rpc' as const;
  readonly severity = TEST_SEVERITY.CRITICAL;
  readonly mcpSpecSection = 'Base Protocol - JSON-RPC 2.0';

  async execute(client: McpClient, config: ComplianceConfig): Promise<DiagnosticResult> {
    const sdkTests: SdkErrorTest[] = [
      {
        name: 'JSON-RPC Message Format',
        description: 'Validate basic message format through SDK',
        category: 'base-protocol',
        feature: 'json-rpc',
        severity: TEST_SEVERITY.CRITICAL,
        operation: async (client: McpClient) => await client.sdk.listTools(),
        expectsError: false,
      },
      {
        name: 'JSON-RPC Request Processing',
        description: 'Test request processing through SDK',
        category: 'base-protocol',
        feature: 'json-rpc',
        severity: TEST_SEVERITY.CRITICAL,
        operation: async (client: McpClient) => {
          // Test multiple operations to ensure consistent processing
          const [tools, resources, prompts] = await Promise.all([
            client.sdk.listTools(),
            client.sdk.listResources(),
            client.sdk.listPrompts(),
          ]);
          return { tools, resources, prompts };
        },
        expectsError: false,
      },
    ];

    try {
      const sdkResults = await SdkErrorDetector.executeTests(client, config, sdkTests);
      const diagnosticResults = SdkErrorDetector.convertTodiagnosticResults(sdkResults);

      const failedTests = diagnosticResults.filter(r => r.status === 'failed');
      const passedTests = diagnosticResults.filter(r => r.status === 'passed');

      if (failedTests.length === 0) {
        return this.createResult(
          true,
          `SDK JSON-RPC compliance validated (${passedTests.length} checks passed)`,
          {
            passedTests: passedTests.length,
            details: diagnosticResults,
          }
        );
      } else {
        return this.createEnhancedResult({
          success: false,
          message: `SDK detected ${failedTests.length} JSON-RPC compliance issues`,
          details: {
            failedTests: failedTests.length,
            passedTests: passedTests.length,
            results: diagnosticResults,
          },
          issueType: failedTests[0].issueType || ISSUE_TYPE.CRITICAL_FAILURE,
          expected: 'Full JSON-RPC 2.0 compliance through SDK validation',
          actual: `${failedTests.length} compliance issues detected by SDK`,
          fixInstructions: failedTests.flatMap(t => t.recommendations || []),
          specLinks: [
            'https://spec.modelcontextprotocol.io/specification/basic/json-rpc/',
            'https://www.jsonrpc.org/specification',
          ],
        });
      }
    } catch (error) {
      return this.createResult(
        false,
        'SDK JSON-RPC compliance test failed',
        { error: error instanceof Error ? error.message : String(error) },
        [
          'Check SDK integration and client setup',
          'Verify server is properly responding to SDK requests',
          'Review connection and transport configuration',
        ]
      );
    }
  }
}

class SdkErrorResponseTest extends DiagnosticTest {
  readonly name = 'SDK: Error Response Validation';
  readonly description = 'Uses SDK to validate JSON-RPC error response handling';
  readonly category = 'base-protocol';
  readonly feature = 'json-rpc' as const;
  readonly severity = TEST_SEVERITY.WARNING;
  readonly mcpSpecSection = 'Base Protocol - Error Handling';

  async execute(client: McpClient, config: ComplianceConfig): Promise<DiagnosticResult> {
    const errorTests: SdkErrorTest[] = [
      {
        name: 'Method Not Found Error (-32601)',
        description: 'Test SDK handling of method not found errors',
        category: 'base-protocol',
        feature: 'json-rpc',
        severity: TEST_SEVERITY.WARNING,
        operation: async (client: McpClient) => {
          await client.sdk.callTool({
            name: 'non_existent_method_12345',
            arguments: {},
          });
        },
        expectsError: true,
        expectedErrorCode: ErrorCode.MethodNotFound,
      },
      {
        name: 'Invalid Parameters Error (-32602)',
        description: 'Test SDK handling of invalid parameter errors',
        category: 'base-protocol',
        feature: 'json-rpc',
        severity: TEST_SEVERITY.WARNING,
        operation: async (client: McpClient) => {
          // First get a valid tool to test invalid parameters
          const tools = await client.sdk.listTools();
          if (tools.tools && tools.tools.length > 0) {
            const toolName = tools.tools[0].name;
            await client.sdk.callTool({
              name: toolName,
              arguments: {
                __definitely_invalid_param: 'test',
                __another_bad_param: null,
              },
            });
          } else {
            // If no tools, just test the non-existent tool case
            await client.sdk.callTool({
              name: 'invalid_tool',
              arguments: { bad: 'params' },
            });
          }
        },
        expectsError: true,
        expectedErrorCode: ErrorCode.InvalidParams,
      },
    ];

    try {
      const sdkResults = await SdkErrorDetector.executeTests(client, config, errorTests);
      const diagnosticResults = SdkErrorDetector.convertTodiagnosticResults(sdkResults);

      const failedTests = diagnosticResults.filter(r => r.status === 'failed');
      const passedTests = diagnosticResults.filter(r => r.status === 'passed');

      if (failedTests.length === 0) {
        return this.createResult(
          true,
          `SDK error response validation passed (${passedTests.length} error types tested)`,
          {
            passedTests: passedTests.length,
            details: diagnosticResults,
          }
        );
      } else {
        return this.createEnhancedResult({
          success: false,
          message: `SDK detected ${failedTests.length} error response issues`,
          details: {
            failedTests: failedTests.length,
            passedTests: passedTests.length,
            results: diagnosticResults,
          },
          issueType: failedTests[0].issueType || ISSUE_TYPE.SPEC_WARNING,
          expected: 'Proper JSON-RPC error codes and format through SDK',
          actual: `${failedTests.length} error handling issues detected by SDK`,
          fixInstructions: failedTests.flatMap(t => t.recommendations || []),
          specLinks: [
            'https://spec.modelcontextprotocol.io/specification/basic/json-rpc/',
            'https://www.jsonrpc.org/specification#error_object',
          ],
        });
      }
    } catch (error) {
      return this.createResult(
        false,
        'SDK error response test failed',
        { error: error instanceof Error ? error.message : String(error) },
        [
          'Check that server properly handles error conditions',
          'Verify error response formatting',
          'Review SDK error handling implementation',
        ]
      );
    }
  }
}

class SdkConnectionReliabilityTest extends DiagnosticTest {
  readonly name = 'SDK: Connection Reliability';
  readonly description = 'Uses SDK to test connection management and reliability';
  readonly category = 'lifecycle';
  readonly feature = 'connection' as const;
  readonly severity = TEST_SEVERITY.CRITICAL;
  readonly mcpSpecSection = 'Lifecycle - Connection Management';

  async execute(client: McpClient, config: ComplianceConfig): Promise<DiagnosticResult> {
    const connectionTests: SdkErrorTest[] = [
      {
        name: 'Basic Connectivity',
        description: 'Test basic SDK connectivity',
        category: 'lifecycle',
        feature: 'connection',
        severity: TEST_SEVERITY.CRITICAL,
        operation: async (client: McpClient) => {
          // Test that basic operations work through SDK
          const result = await client.sdk.listTools();
          return { connected: true, toolCount: result.tools?.length || 0 };
        },
        expectsError: false,
      },
      {
        name: 'Concurrent Requests',
        description: 'Test SDK handling of concurrent requests',
        category: 'lifecycle',
        feature: 'connection',
        severity: TEST_SEVERITY.WARNING,
        operation: async (client: McpClient) => {
          // Test concurrent operations through SDK
          const startTime = Date.now();
          const results = await Promise.allSettled([
            client.sdk.listTools(),
            client.sdk.listResources(),
            client.sdk.listPrompts(),
            client.sdk.listTools(), // Duplicate to test concurrency
          ]);

          const duration = Date.now() - startTime;
          const successful = results.filter(r => r.status === 'fulfilled').length;

          return {
            duration,
            successful,
            total: results.length,
            concurrentOpsSupported: successful >= 2,
          };
        },
        expectsError: false,
      },
    ];

    try {
      const sdkResults = await SdkErrorDetector.executeTests(client, config, connectionTests);
      const diagnosticResults = SdkErrorDetector.convertTodiagnosticResults(sdkResults);

      const failedTests = diagnosticResults.filter(r => r.status === 'failed');
      const passedTests = diagnosticResults.filter(r => r.status === 'passed');

      if (failedTests.length === 0) {
        return this.createResult(
          true,
          `SDK connection reliability validated (${passedTests.length} checks passed)`,
          {
            passedTests: passedTests.length,
            details: diagnosticResults,
          }
        );
      } else {
        return this.createEnhancedResult({
          success: false,
          message: `SDK detected ${failedTests.length} connection reliability issues`,
          details: {
            failedTests: failedTests.length,
            passedTests: passedTests.length,
            results: diagnosticResults,
          },
          issueType: failedTests[0].issueType || ISSUE_TYPE.CRITICAL_FAILURE,
          expected: 'Reliable connection management through SDK',
          actual: `${failedTests.length} connection issues detected by SDK`,
          fixInstructions: failedTests.flatMap(t => t.recommendations || []),
          specLinks: ['https://spec.modelcontextprotocol.io/specification/basic/transports/'],
        });
      }
    } catch (error) {
      return this.createResult(
        false,
        'SDK connection reliability test failed',
        { error: error instanceof Error ? error.message : String(error) },
        [
          'Check server connection handling',
          'Verify transport configuration',
          'Review SDK connection management',
        ]
      );
    }
  }
}

// Export test classes for registration
export { SdkJsonRpcComplianceTest, SdkErrorResponseTest, SdkConnectionReliabilityTest };
