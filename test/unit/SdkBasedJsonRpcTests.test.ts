/**
 * Integration tests for SDK-based JSON-RPC tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SdkJsonRpcComplianceTest,
  SdkErrorResponseTest,
  SdkConnectionReliabilityTest,
} from '../../src/commands/compliance/base-protocol/SdkBasedJsonRpcTests.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { TEST_SEVERITY, type ComplianceConfig } from '../../src/commands/compliance/types.js';

describe('SDK-based JSON-RPC Tests', () => {
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

  describe('SdkJsonRpcComplianceTest', () => {
    it('should pass when SDK operations succeed', async () => {
      mockClient.sdk.listTools.mockResolvedValue({ tools: [] });
      mockClient.sdk.listResources.mockResolvedValue({ resources: [] });
      mockClient.sdk.listPrompts.mockResolvedValue({ prompts: [] });

      const test = new SdkJsonRpcComplianceTest();
      const result = await test.execute(mockClient, mockConfig);

      expect(result.status).toBe('passed');
      expect(result.message).toContain('SDK JSON-RPC compliance validated');
      expect(result.details).toHaveProperty('passedTests');
    });

    it('should fail when SDK operations fail', async () => {
      mockClient.sdk.listTools.mockRejectedValue(new Error('Connection failed'));

      const test = new SdkJsonRpcComplianceTest();
      const result = await test.execute(mockClient, mockConfig);

      expect(result.status).toBe('failed');
      expect(result.message).toContain('SDK detected');
      expect(result.details).toHaveProperty('failedTests');
      expect(result.fixInstructions).toBeDefined();
    });

    it('should provide enhanced error information on failure', async () => {
      const mcpError = new McpError(ErrorCode.ParseError, 'Invalid JSON');
      mockClient.sdk.listTools.mockRejectedValue(mcpError);

      const test = new SdkJsonRpcComplianceTest();
      const result = await test.execute(mockClient, mockConfig);

      expect(result.status).toBe('failed');
      expect(result.issueType).toBeDefined();
      expect(result.expected).toBeDefined();
      expect(result.actual).toBeDefined();
      expect(result.specLinks).toContain('https://www.jsonrpc.org/specification');
    });
  });

  describe('SdkErrorResponseTest', () => {
    it('should pass when errors are properly handled', async () => {
      // First call to get tools succeeds
      mockClient.sdk.listTools.mockResolvedValue({ tools: [{ name: 'test_tool' }] });

      // Error tests should throw appropriate errors
      mockClient.sdk.callTool
        .mockRejectedValueOnce(new McpError(ErrorCode.MethodNotFound, 'Method not found'))
        .mockRejectedValueOnce(new McpError(ErrorCode.InvalidParams, 'Invalid parameters'));

      const test = new SdkErrorResponseTest();
      const result = await test.execute(mockClient, mockConfig);

      expect(result.status).toBe('passed');
      expect(result.message).toContain('SDK error response validation passed');
    });

    it('should fail when expected errors are not thrown', async () => {
      // Mock successful responses when errors are expected
      mockClient.sdk.callTool.mockResolvedValue({ content: 'unexpected success' });

      const test = new SdkErrorResponseTest();
      const result = await test.execute(mockClient, mockConfig);

      expect(result.status).toBe('failed');
      expect(result.message).toContain('SDK detected');
      expect(result.issueType).toBe('spec_warning');
    });

    it('should fail when errors have wrong codes', async () => {
      mockClient.sdk.listTools.mockResolvedValue({ tools: [{ name: 'test_tool' }] });

      // Return wrong error codes
      mockClient.sdk.callTool
        .mockRejectedValueOnce(new McpError(ErrorCode.InvalidParams, 'Wrong error code'))
        .mockRejectedValueOnce(new McpError(ErrorCode.MethodNotFound, 'Wrong error code'));

      const test = new SdkErrorResponseTest();
      const result = await test.execute(mockClient, mockConfig);

      expect(result.status).toBe('failed');
      expect(result.message).toContain('error response issues');
    });
  });

  describe('SdkConnectionReliabilityTest', () => {
    it('should pass when connections are reliable', async () => {
      mockClient.sdk.listTools.mockResolvedValue({ tools: [] });
      mockClient.sdk.listResources.mockResolvedValue({ resources: [] });
      mockClient.sdk.listPrompts.mockResolvedValue({ prompts: [] });

      const test = new SdkConnectionReliabilityTest();
      const result = await test.execute(mockClient, mockConfig);

      expect(result.status).toBe('passed');
      expect(result.message).toContain('SDK connection reliability validated');
    });

    it('should fail when connections are unreliable', async () => {
      mockClient.sdk.listTools.mockRejectedValue(new Error('ECONNREFUSED'));

      const test = new SdkConnectionReliabilityTest();
      const result = await test.execute(mockClient, mockConfig);

      expect(result.status).toBe('failed');
      expect(result.message).toContain('connection reliability issues');
      expect(result.issueType).toBe('critical_failure');
    });

    it('should handle timeout errors appropriately', async () => {
      const timeoutError = new McpError(ErrorCode.RequestTimeout, 'Request timed out');
      mockClient.sdk.listTools.mockRejectedValue(timeoutError);

      const test = new SdkConnectionReliabilityTest();
      const result = await test.execute(mockClient, mockConfig);

      expect(result.status).toBe('failed');
      expect(result.issueType).toBe('performance_issue');
      expect(result.fixInstructions).toContain('Optimize server response time');
    });
  });

  describe('Test Configuration', () => {
    it('should have correct test metadata', () => {
      const complianceTest = new SdkJsonRpcComplianceTest();
      expect(complianceTest.name).toBe('SDK: JSON-RPC Protocol Compliance');
      expect(complianceTest.category).toBe('base-protocol');
      expect(complianceTest.severity).toBe(TEST_SEVERITY.CRITICAL);
      expect(complianceTest.mcpSpecSection).toBe('Base Protocol - JSON-RPC 2.0');

      const errorTest = new SdkErrorResponseTest();
      expect(errorTest.name).toBe('SDK: Error Response Validation');
      expect(errorTest.category).toBe('base-protocol');
      expect(errorTest.severity).toBe(TEST_SEVERITY.WARNING);

      const reliabilityTest = new SdkConnectionReliabilityTest();
      expect(reliabilityTest.name).toBe('SDK: Connection Reliability');
      expect(reliabilityTest.category).toBe('lifecycle');
      expect(reliabilityTest.severity).toBe(TEST_SEVERITY.CRITICAL);
    });
  });
});
