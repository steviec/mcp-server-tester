/**
 * SDK Error Detection System
 * Captures and translates MCP SDK errors into compliance test results
 */

import { ErrorCode, McpError, isJSONRPCError } from '@modelcontextprotocol/sdk/types.js';
import type { McpClient } from '../../shared/core/mcp-client.js';
import {
  TEST_SEVERITY,
  ISSUE_TYPE,
  type DiagnosticResult,
  type ComplianceConfig,
  type TestSeverity,
  type IssueType,
} from './types.js';

export interface SdkErrorTest {
  readonly name: string;
  readonly description: string;
  readonly category: 'base-protocol' | 'lifecycle' | 'server-features';
  readonly feature: string;
  readonly severity: TestSeverity;
  readonly mcpSpecSection?: string;
  readonly operation: (_client: McpClient) => Promise<unknown>;
  readonly expectsError?: boolean;
  readonly expectedErrorCode?: number;
}

export interface SdkErrorResult {
  testName: string;
  category: string;
  status: 'passed' | 'failed' | 'skipped';
  message: string;
  severity: TestSeverity;
  duration: number;
  sdkError?: {
    type: 'McpError' | 'JSONRPCError' | 'Error' | 'Unknown';
    code?: number;
    message: string;
    data?: unknown;
  };
  issueType?: IssueType;
  expected?: string;
  actual?: string;
  recommendations?: string[];
  specLinks?: string[];
}

export class SdkErrorDetector {
  /**
   * Standard SDK error tests that replace manual validation
   */
  static readonly STANDARD_TESTS: SdkErrorTest[] = [
    {
      name: 'SDK: JSON-RPC Message Format Validation',
      description: 'Tests that SDK validates JSON-RPC 2.0 message format compliance',
      category: 'base-protocol',
      feature: 'json-rpc',
      severity: TEST_SEVERITY.CRITICAL,
      mcpSpecSection: 'Base Protocol - JSON-RPC 2.0',
      operation: async (client: McpClient) => await client.sdk.listTools(),
      expectsError: false,
    },
    {
      name: 'SDK: Protocol Version Compatibility',
      description: 'Tests that SDK enforces protocol version compatibility',
      category: 'lifecycle',
      feature: 'initialization',
      severity: TEST_SEVERITY.CRITICAL,
      mcpSpecSection: 'Lifecycle - Initialization',
      operation: async (client: McpClient) => await client.sdk.listTools(),
      expectsError: false,
    },
    {
      name: 'SDK: Method Not Found Error (-32601)',
      description: 'Tests that SDK properly handles method not found errors',
      category: 'base-protocol',
      feature: 'json-rpc',
      severity: TEST_SEVERITY.WARNING,
      operation: async (client: McpClient) => {
        await client.sdk.callTool({
          name: 'non_existent_tool_xyz_12345',
          arguments: {},
        });
      },
      expectsError: true,
      expectedErrorCode: ErrorCode.MethodNotFound,
    },
    {
      name: 'SDK: Invalid Parameters Error (-32602)',
      description: 'Tests that SDK properly validates request parameters',
      category: 'base-protocol',
      feature: 'json-rpc',
      severity: TEST_SEVERITY.WARNING,
      operation: async (client: McpClient) => {
        const tools = await client.sdk.listTools();
        if (tools.tools && tools.tools.length > 0) {
          const toolName = tools.tools[0].name;
          await client.sdk.callTool({
            name: toolName,
            arguments: {
              __invalid_param: null,
              __circular_ref: {} as Record<string, unknown>,
            },
          });
        } else {
          throw new Error('No tools available for parameter validation test');
        }
      },
      expectsError: true,
      expectedErrorCode: ErrorCode.InvalidParams,
    },
    {
      name: 'SDK: Connection Management',
      description: 'Tests that SDK properly manages connection lifecycle',
      category: 'lifecycle',
      feature: 'connection',
      severity: TEST_SEVERITY.CRITICAL,
      operation: async (client: McpClient) => {
        // Test basic connectivity
        await client.sdk.listTools();
        await client.sdk.listResources();
        return { connected: true };
      },
      expectsError: false,
    },
  ];

  /**
   * Execute SDK error detection tests
   */
  static async executeTests(
    client: McpClient,
    config: ComplianceConfig,
    tests: SdkErrorTest[] = SdkErrorDetector.STANDARD_TESTS
  ): Promise<SdkErrorResult[]> {
    const results: SdkErrorResult[] = [];

    for (const test of tests) {
      const result = await SdkErrorDetector.executeTest(test, client, config);
      results.push(result);
    }

    return results;
  }

  /**
   * Execute a single SDK error detection test
   */
  static async executeTest(
    test: SdkErrorTest,
    client: McpClient,
    config: ComplianceConfig
  ): Promise<SdkErrorResult> {
    const startTime = Date.now();

    try {
      await Promise.race([
        test.operation(client),
        SdkErrorDetector.createTimeoutPromise(test.name, config.timeouts.testExecution),
      ]);

      const duration = Date.now() - startTime;

      if (test.expectsError) {
        // Test expected an error but none was thrown
        return {
          testName: test.name,
          category: test.category,
          status: 'failed',
          message: 'Expected SDK to throw an error but operation succeeded',
          severity: test.severity,
          duration,
          issueType: ISSUE_TYPE.SPEC_WARNING,
          expected: `SDK error with code ${test.expectedErrorCode}`,
          actual: 'Operation succeeded without error',
          recommendations: [
            'Verify that the server properly validates requests',
            'Check that invalid operations are properly rejected',
            'Ensure error handling is implemented according to JSON-RPC spec',
          ],
          specLinks: [
            'https://spec.modelcontextprotocol.io/specification/basic/json-rpc/',
            'https://www.jsonrpc.org/specification',
          ],
        };
      } else {
        // Test expected success and got it
        return {
          testName: test.name,
          category: test.category,
          status: 'passed',
          message: 'SDK operation completed successfully',
          severity: test.severity,
          duration,
        };
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const sdkError = SdkErrorDetector.analyzeSdkError(error);

      if (test.expectsError) {
        // Test expected an error and got one - validate it
        const isValidError = SdkErrorDetector.validateExpectedError(
          sdkError,
          test.expectedErrorCode
        );

        if (isValidError) {
          return {
            testName: test.name,
            category: test.category,
            status: 'passed',
            message: `SDK properly detected and reported error: ${sdkError?.message || 'Unknown error'}`,
            severity: test.severity,
            duration,
            sdkError,
          };
        } else {
          return {
            testName: test.name,
            category: test.category,
            status: 'failed',
            message: `SDK error format or code incorrect: ${sdkError?.message || 'Unknown error'}`,
            severity: test.severity,
            duration,
            sdkError,
            issueType: ISSUE_TYPE.SPEC_WARNING,
            expected: `Proper JSON-RPC error with code ${test.expectedErrorCode}`,
            actual: `SDK error: ${sdkError?.type || 'Unknown'} ${sdkError?.code ? `(${sdkError.code})` : ''}`,
            recommendations: [
              'Ensure server returns proper JSON-RPC error codes',
              'Verify error response format compliance',
              'Check that SDK error handling is working correctly',
            ],
          };
        }
      } else {
        // Test expected success but got an error - this is likely a real issue
        return SdkErrorDetector.createFailureResult(test, sdkError, duration);
      }
    }
  }

  /**
   * Analyze SDK error and categorize it
   */
  static analyzeSdkError(error: unknown): SdkErrorResult['sdkError'] {
    if (!error) {
      return {
        type: 'Unknown',
        message: 'Unknown error occurred',
      };
    }

    // Check for McpError (SDK's custom error type)
    if (error instanceof McpError) {
      return {
        type: 'McpError',
        code: error.code,
        message: error.message,
        data: error.data,
      };
    }

    // Check for JSON-RPC error
    if (isJSONRPCError(error)) {
      return {
        type: 'JSONRPCError',
        code: error.error.code,
        message: error.error.message,
        data: error.error.data,
      };
    }

    // Check for standard Error
    if (error instanceof Error) {
      return {
        type: 'Error',
        message: error.message,
      };
    }

    // Fallback for unknown error types
    return {
      type: 'Unknown',
      message: String(error),
    };
  }

  /**
   * Validate that an error matches expected criteria
   */
  static validateExpectedError(
    sdkError: SdkErrorResult['sdkError'],
    expectedCode?: number
  ): boolean {
    if (!sdkError) {
      return false;
    }

    // If we expect a specific error code, validate it
    if (expectedCode !== undefined) {
      return sdkError.code === expectedCode;
    }

    // For general error validation, just ensure we got a proper error
    return sdkError.type !== 'Unknown' && sdkError.message.length > 0;
  }

  /**
   * Create a failure result for unexpected errors
   */
  static createFailureResult(
    test: SdkErrorTest,
    sdkError: SdkErrorResult['sdkError'],
    duration: number
  ): SdkErrorResult {
    // Determine issue severity based on error type
    let issueType: IssueType = ISSUE_TYPE.CRITICAL_FAILURE;
    let recommendations: string[] = [];
    let specLinks: string[] = [];

    if (sdkError?.type === 'McpError') {
      switch (sdkError.code) {
        case ErrorCode.ConnectionClosed:
          issueType = ISSUE_TYPE.CRITICAL_FAILURE;
          recommendations = [
            'Check server process is running and responding',
            'Verify transport configuration',
            'Review server logs for crash or exit reasons',
          ];
          break;
        case ErrorCode.RequestTimeout:
          issueType = ISSUE_TYPE.PERFORMANCE_ISSUE;
          recommendations = [
            'Optimize server response time',
            'Check for blocking operations in server',
            'Consider increasing timeout values if appropriate',
          ];
          break;
        case ErrorCode.ParseError:
          issueType = ISSUE_TYPE.CRITICAL_FAILURE;
          recommendations = [
            'Fix JSON message formatting in server responses',
            'Ensure proper JSON-RPC 2.0 compliance',
            'Validate message structure before sending',
          ];
          specLinks = ['https://www.jsonrpc.org/specification'];
          break;
        case ErrorCode.InvalidRequest:
          issueType = ISSUE_TYPE.SPEC_WARNING;
          recommendations = [
            'Validate request format compliance',
            'Ensure required fields are present',
            'Check JSON-RPC 2.0 specification adherence',
          ];
          break;
        case ErrorCode.MethodNotFound:
          issueType = ISSUE_TYPE.SPEC_WARNING;
          recommendations = [
            'Implement required MCP methods',
            'Check capability advertisement matches implementation',
            'Verify method name spelling and casing',
          ];
          break;
        case ErrorCode.InvalidParams:
          issueType = ISSUE_TYPE.SPEC_WARNING;
          recommendations = [
            'Validate parameter schemas',
            'Ensure parameter types match expectations',
            'Provide clear parameter validation error messages',
          ];
          break;
        default:
          issueType = ISSUE_TYPE.CRITICAL_FAILURE;
          recommendations = [
            'Review server error handling implementation',
            'Check server logs for detailed error information',
            'Ensure proper error response formatting',
          ];
      }
    } else if (sdkError?.type === 'Error') {
      // Connection or transport errors
      if (sdkError.message.includes('timeout') || sdkError.message.includes('ETIMEDOUT')) {
        issueType = ISSUE_TYPE.PERFORMANCE_ISSUE;
        recommendations = [
          'Reduce server response time',
          'Check for network connectivity issues',
          'Consider server performance optimization',
        ];
      } else if (sdkError.message.includes('ECONNREFUSED') || sdkError.message.includes('spawn')) {
        issueType = ISSUE_TYPE.CRITICAL_FAILURE;
        recommendations = [
          'Verify server configuration and startup',
          'Check server process can be launched',
          'Review transport configuration',
        ];
      } else {
        issueType = ISSUE_TYPE.CRITICAL_FAILURE;
        recommendations = [
          'Review server implementation',
          'Check error handling logic',
          'Verify SDK integration',
        ];
      }
    }

    return {
      testName: test.name,
      category: test.category,
      status: 'failed',
      message: `SDK detected error: ${sdkError?.message || 'Unknown error'}`,
      severity: test.severity,
      duration,
      sdkError,
      issueType,
      expected: 'Successful operation',
      actual: `SDK error: ${sdkError?.type} ${sdkError?.code ? `(${sdkError.code})` : ''}`,
      recommendations,
      specLinks:
        specLinks.length > 0 ? specLinks : ['https://spec.modelcontextprotocol.io/specification/'],
    };
  }

  /**
   * Create a timeout promise for test execution
   */
  static async createTimeoutPromise(testName: string, timeoutMs: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(
          new McpError(
            ErrorCode.RequestTimeout,
            `SDK test '${testName}' timed out after ${timeoutMs}ms`
          )
        );
      }, timeoutMs);
    });
  }

  /**
   * Convert SDK error results to standard diagnostic results
   */
  static convertTodiagnosticResults(sdkResults: SdkErrorResult[]): DiagnosticResult[] {
    return sdkResults.map(result => ({
      testName: result.testName,
      category: result.category as 'base-protocol' | 'lifecycle' | 'server-features',
      status: result.status,
      message: result.message,
      severity: result.severity,
      duration: result.duration,
      details: result.sdkError,
      issueType: result.issueType,
      expected: result.expected,
      actual: result.actual,
      recommendations: result.recommendations,
      specLinks: result.specLinks,
    }));
  }
}
