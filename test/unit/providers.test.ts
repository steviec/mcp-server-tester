/**
 * Unit tests for LLM providers
 * Tests provider functionality in isolation with a real MCP server
 */

import { describe, beforeAll, afterAll, test, expect } from 'vitest';
import { AnthropicProvider } from '../../src/commands/evals/providers/anthropic-provider.js';
import {
  McpClient,
  createServerConfigFromCli,
  createTransportOptions,
} from '../../src/shared/core/mcp-client.js';
import { createTestServerLauncher, type TestServerLauncher } from '../e2e/server-launcher.js';

const hasApiKey = !!process.env.ANTHROPIC_API_KEY;

describe('LLM Provider Unit Tests', () => {
  let serverLauncher: TestServerLauncher;
  let mcpClient: McpClient;
  let provider: AnthropicProvider;

  beforeAll(async () => {
    if (!hasApiKey) {
      console.warn('⚠️  ANTHROPIC_API_KEY not set - skipping provider unit tests');
      console.warn('   To run provider tests: export ANTHROPIC_API_KEY="your-key-here"');
      return;
    }

    // Start test MCP server using existing infrastructure
    serverLauncher = createTestServerLauncher();
    await serverLauncher.start();

    // Create MCP client and connect to server
    mcpClient = new McpClient();
    const serverConfig = createServerConfigFromCli(
      'node',
      'test/fixtures/mock-servers/test-mcp-server.js'
    );
    const transportOptions = createTransportOptions(serverConfig);
    await mcpClient.connect(transportOptions);

    // Create provider instance
    provider = new AnthropicProvider();
  }, 15000);

  afterAll(async () => {
    if (mcpClient) {
      await mcpClient.disconnect();
    }
    if (serverLauncher) {
      await serverLauncher.stop();
    }
  }, 10000);

  describe.skipIf(!hasApiKey)('AnthropicProvider', () => {
    test('should execute conversation with tool calling', async () => {
      // This is the critical test that would have caught the typeName error
      // It exercises: MCP tools → AI SDK conversion → generateText() → message extraction
      const result = await provider.executeConversation(
        mcpClient,
        'Please echo the message "Hello from unit test"',
        {
          model: 'claude-3-haiku-20240307',
          maxSteps: 3,
          timeout: 30000,
        }
      );

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.messages).toBeDefined();
      expect(result.toolCalls).toBeDefined();
      expect(result.toolResults).toBeDefined();

      // Should have called the echo tool
      expect(result.toolCalls.length).toBeGreaterThan(0);
      const echoCall = result.toolCalls.find(call => call.toolName === 'echo');
      expect(echoCall).toBeDefined();
    });

    test('should judge responses correctly', async () => {
      const testMessages = [
        {
          role: 'user' as const,
          content: 'What is 2 + 2?',
        },
        {
          role: 'assistant' as const,
          content: 'The answer is 4.',
        },
      ];

      const result = await provider.judgeResponse(
        testMessages,
        'Did the assistant correctly answer the math question?',
        0.7
      );

      expect(result.score).toBeDefined();
      expect(typeof result.score).toBe('number');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
      expect(result.rationale).toBeDefined();
      expect(typeof result.rationale).toBe('string');
      expect(result.rationale.length).toBeGreaterThan(0);

      // Should score highly for correct math answer
      expect(result.score).toBeGreaterThan(0.5);
    });

    test('should extract tool calls and results from messages', async () => {
      // Get a real conversation with tool calls and results
      const conversationResult = await provider.executeConversation(
        mcpClient,
        'Please echo "test message"',
        {
          model: 'claude-3-haiku-20240307',
          maxSteps: 3,
          timeout: 30000,
        }
      );

      expect(conversationResult.success).toBe(true);
      expect(conversationResult.toolCalls.length).toBeGreaterThan(0);
      expect(conversationResult.toolResults.length).toBeGreaterThan(0);

      // Test extraction methods directly
      const extractedCalls = provider.extractToolCalls(conversationResult.messages);
      const extractedResults = provider.extractToolResults(conversationResult.messages);

      expect(extractedCalls.length).toBeGreaterThan(0);
      expect(extractedResults.length).toBeGreaterThan(0);

      const echoCall = extractedCalls.find(call => call.toolName === 'echo');
      const echoResult = extractedResults.find(result => result.toolName === 'echo');

      expect(echoCall).toBeDefined();
      expect(echoCall?.toolCallId).toBeDefined();
      expect(echoCall?.args).toBeDefined();

      expect(echoResult).toBeDefined();
      expect(echoResult?.toolCallId).toBeDefined();
      expect(echoResult?.result).toBeDefined();
    });

    test('should handle errors gracefully', async () => {
      // Test with invalid model
      const result = await provider.executeConversation(mcpClient, 'Hello', {
        model: 'invalid-model-name',
        maxSteps: 1,
        timeout: 10000,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
      expect(result.error!.length).toBeGreaterThan(0);
    });
  });

  describe('Environment Setup Validation', () => {
    test('should detect when API key is missing', () => {
      if (!hasApiKey) {
        expect(process.env.ANTHROPIC_API_KEY).toBeUndefined();
      } else {
        expect(process.env.ANTHROPIC_API_KEY).toBeDefined();
        expect(process.env.ANTHROPIC_API_KEY!.length).toBeGreaterThan(0);
      }
    });

    test('should have access to test MCP server tools', async () => {
      if (!hasApiKey) {
        return;
      }

      const toolsResponse = await mcpClient.sdk.listTools();
      expect(toolsResponse.tools).toBeDefined();

      const toolNames = toolsResponse.tools.map((tool: any) => tool.name);
      expect(toolNames).toContain('echo');
      expect(toolNames).toContain('add');
    });
  });
});
