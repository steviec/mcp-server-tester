/**
 * Unit tests for SDK Error Detection System
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SdkErrorDetector,
  type SdkErrorTest,
} from '../../src/commands/compliance/SdkErrorDetector.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { TEST_SEVERITY, type ComplianceConfig } from '../../src/commands/compliance/types.js';

describe('SdkErrorDetector', () => {
  let mockClient: any;
  let mockConfig: ComplianceConfig;

  beforeEach(() => {
    mockClient = {
      sdk: {
        listTools: vi.fn(),
        listResources: vi.fn(),
        listPrompts: vi.fn(),
        callTool: vi.fn(),
      } as any,
    };

    mockConfig = {
      timeouts: {
        connection: 5000,
        testExecution: 30000,
        overall: 300000,
      },
      categories: {
        enabled: [],
        disabled: [],
      },
      output: {
        format: 'console',
      },
      experimental: {
        useSdkErrorDetection: true,
      },
    };
  });

  describe('analyzeSdkError', () => {
    it('should correctly analyze McpError', () => {
      const error = new McpError(ErrorCode.MethodNotFound, 'Method not found', { method: 'test' });
      const result = SdkErrorDetector.analyzeSdkError(error);

      expect(result).toEqual({
        type: 'McpError',
        code: ErrorCode.MethodNotFound,
        message: 'MCP error -32601: Method not found',
        data: { method: 'test' },
      });
    });

    it('should correctly analyze standard Error', () => {
      const error = new Error('Connection failed');
      const result = SdkErrorDetector.analyzeSdkError(error);

      expect(result).toEqual({
        type: 'Error',
        message: 'Connection failed',
      });
    });

    it('should handle unknown error types', () => {
      const error = 'string error';
      const result = SdkErrorDetector.analyzeSdkError(error);

      expect(result).toEqual({
        type: 'Unknown',
        message: 'string error',
      });
    });
  });

  describe('validateExpectedError', () => {
    it('should validate error with expected code', () => {
      const sdkError = {
        type: 'McpError' as const,
        code: ErrorCode.MethodNotFound,
        message: 'Method not found',
      };

      const result = SdkErrorDetector.validateExpectedError(sdkError, ErrorCode.MethodNotFound);
      expect(result).toBe(true);
    });

    it('should reject error with wrong code', () => {
      const sdkError = {
        type: 'McpError' as const,
        code: ErrorCode.InvalidParams,
        message: 'Invalid params',
      };

      const result = SdkErrorDetector.validateExpectedError(sdkError, ErrorCode.MethodNotFound);
      expect(result).toBe(false);
    });

    it('should validate general error without specific code requirement', () => {
      const sdkError = {
        type: 'Error' as const,
        message: 'Some error occurred',
      };

      const result = SdkErrorDetector.validateExpectedError(sdkError);
      expect(result).toBe(true);
    });
  });

  describe('executeTest', () => {
    it('should pass test when operation succeeds and no error expected', async () => {
      mockClient.sdk.listTools.mockResolvedValue({ tools: [] });

      const test: SdkErrorTest = {
        name: 'Test Success',
        description: 'Test description',
        category: 'base-protocol',
        feature: 'json-rpc',
        severity: TEST_SEVERITY.CRITICAL,
        operation: async client => await client.sdk.listTools(),
        expectsError: false,
      };

      const result = await SdkErrorDetector.executeTest(test, mockClient, mockConfig);

      expect(result.status).toBe('passed');
      expect(result.message).toBe('SDK operation completed successfully');
    });

    it('should fail test when operation succeeds but error was expected', async () => {
      mockClient.sdk.callTool.mockResolvedValue({ content: 'success' });

      const test: SdkErrorTest = {
        name: 'Test Expected Error',
        description: 'Test description',
        category: 'base-protocol',
        feature: 'json-rpc',
        severity: TEST_SEVERITY.WARNING,
        operation: async client => await client.sdk.callTool({ name: 'test', arguments: {} }),
        expectsError: true,
        expectedErrorCode: ErrorCode.MethodNotFound,
      };

      const result = await SdkErrorDetector.executeTest(test, mockClient, mockConfig);

      expect(result.status).toBe('failed');
      expect(result.message).toBe('Expected SDK to throw an error but operation succeeded');
      expect(result.expected).toBe('SDK error with code -32601');
    });

    it('should pass test when expected error occurs with correct code', async () => {
      const expectedError = new McpError(ErrorCode.MethodNotFound, 'Method not found');
      mockClient.sdk.callTool.mockRejectedValue(expectedError);

      const test: SdkErrorTest = {
        name: 'Test Expected Error',
        description: 'Test description',
        category: 'base-protocol',
        feature: 'json-rpc',
        severity: TEST_SEVERITY.WARNING,
        operation: async client => await client.sdk.callTool({ name: 'test', arguments: {} }),
        expectsError: true,
        expectedErrorCode: ErrorCode.MethodNotFound,
      };

      const result = await SdkErrorDetector.executeTest(test, mockClient, mockConfig);

      expect(result.status).toBe('passed');
      expect(result.message).toBe(
        'SDK properly detected and reported error: MCP error -32601: Method not found'
      );
      expect(result.sdkError).toEqual({
        type: 'McpError',
        code: ErrorCode.MethodNotFound,
        message: 'MCP error -32601: Method not found',
        data: undefined,
      });
    });

    it('should fail test when error occurs with wrong code', async () => {
      const wrongError = new McpError(ErrorCode.InvalidParams, 'Invalid params');
      mockClient.sdk.callTool.mockRejectedValue(wrongError);

      const test: SdkErrorTest = {
        name: 'Test Wrong Error Code',
        description: 'Test description',
        category: 'base-protocol',
        feature: 'json-rpc',
        severity: TEST_SEVERITY.WARNING,
        operation: async client => await client.sdk.callTool({ name: 'test', arguments: {} }),
        expectsError: true,
        expectedErrorCode: ErrorCode.MethodNotFound,
      };

      const result = await SdkErrorDetector.executeTest(test, mockClient, mockConfig);

      expect(result.status).toBe('failed');
      expect(result.message).toBe(
        'SDK error format or code incorrect: MCP error -32602: Invalid params'
      );
      expect(result.expected).toBe('Proper JSON-RPC error with code -32601');
    });

    it('should create failure result when unexpected error occurs', async () => {
      const unexpectedError = new Error('Connection failed');
      mockClient.sdk.listTools.mockRejectedValue(unexpectedError);

      const test: SdkErrorTest = {
        name: 'Test Unexpected Error',
        description: 'Test description',
        category: 'base-protocol',
        feature: 'json-rpc',
        severity: TEST_SEVERITY.CRITICAL,
        operation: async client => await client.sdk.listTools(),
        expectsError: false,
      };

      const result = await SdkErrorDetector.executeTest(test, mockClient, mockConfig);

      expect(result.status).toBe('failed');
      expect(result.message).toBe('SDK detected error: Connection failed');
      expect(result.sdkError).toEqual({
        type: 'Error',
        message: 'Connection failed',
      });
      expect(result.recommendations).toContain('Review server implementation');
    });
  });

  describe('executeTests', () => {
    it('should execute multiple tests and return results', async () => {
      mockClient.sdk.listTools.mockResolvedValue({ tools: [] });
      mockClient.sdk.callTool.mockRejectedValue(
        new McpError(ErrorCode.MethodNotFound, 'Not found')
      );

      const tests: SdkErrorTest[] = [
        {
          name: 'Success Test',
          description: 'Test success',
          category: 'base-protocol',
          feature: 'json-rpc',
          severity: TEST_SEVERITY.CRITICAL,
          operation: async client => await client.sdk.listTools(),
          expectsError: false,
        },
        {
          name: 'Error Test',
          description: 'Test error',
          category: 'base-protocol',
          feature: 'json-rpc',
          severity: TEST_SEVERITY.WARNING,
          operation: async client => await client.sdk.callTool({ name: 'invalid', arguments: {} }),
          expectsError: true,
          expectedErrorCode: ErrorCode.MethodNotFound,
        },
      ];

      const results = await SdkErrorDetector.executeTests(mockClient, mockConfig, tests);

      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('passed');
      expect(results[1].status).toBe('passed');
    });
  });

  describe('convertTodiagnosticResults', () => {
    it('should convert SDK results to diagnostic results', () => {
      const sdkResults = [
        {
          testName: 'Test 1',
          category: 'base-protocol',
          status: 'passed' as const,
          message: 'Test passed',
          severity: TEST_SEVERITY.CRITICAL,
          duration: 100,
        },
        {
          testName: 'Test 2',
          category: 'base-protocol',
          status: 'failed' as const,
          message: 'Test failed',
          severity: TEST_SEVERITY.WARNING,
          duration: 200,
          sdkError: {
            type: 'McpError' as const,
            code: ErrorCode.MethodNotFound,
            message: 'Method not found',
          },
          recommendations: ['Fix the method'],
        },
      ];

      const diagnosticResults = SdkErrorDetector.convertTodiagnosticResults(sdkResults);

      expect(diagnosticResults).toHaveLength(2);
      expect(diagnosticResults[0]).toMatchObject({
        testName: 'Test 1',
        category: 'base-protocol',
        status: 'passed',
        message: 'Test passed',
        severity: TEST_SEVERITY.CRITICAL,
        duration: 100,
      });
      expect(diagnosticResults[1]).toMatchObject({
        testName: 'Test 2',
        category: 'base-protocol',
        status: 'failed',
        message: 'Test failed',
        severity: TEST_SEVERITY.WARNING,
        duration: 200,
        details: {
          type: 'McpError',
          code: ErrorCode.MethodNotFound,
          message: 'Method not found',
        },
        recommendations: ['Fix the method'],
      });
    });
  });
});
