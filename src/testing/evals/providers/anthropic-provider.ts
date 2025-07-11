/**
 * Anthropic LLM Provider using Vercel AI SDK
 */

import { generateText, tool, jsonSchema, type CoreMessage } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import type { McpClient } from '../../../core/mcp-client.js';
import {
  LlmProvider,
  type LlmConversationConfig,
  type LlmConversationResult,
  type LlmJudgeResult,
} from './llm-provider.js';

export class AnthropicProvider extends LlmProvider {
  async executeConversation(
    mcpClient: McpClient,
    prompt: string,
    config: LlmConversationConfig
  ): Promise<LlmConversationResult> {
    try {
      // Get available tools from MCP server
      const toolsResponse = await mcpClient.listTools();
      const mcpTools = toolsResponse.tools || [];

      // Convert MCP tools to AI SDK format using tool() helper
      const aiTools: Record<string, any> = {};
      for (const mcpTool of mcpTools) {
        aiTools[mcpTool.name] = tool({
          description: mcpTool.description,
          parameters: jsonSchema(mcpTool.inputSchema),
          execute: async (args: unknown) => {
            try {
              const result = await mcpClient.callTool(
                mcpTool.name,
                args as Record<string, unknown>
              );
              return result;
            } catch (error) {
              throw new Error(
                `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
              );
            }
          },
        });
      }

      // Create initial message
      const messages: CoreMessage[] = [
        {
          role: 'user',
          content: prompt,
        },
      ];

      // Execute conversation with tool calling
      const result = await generateText({
        model: anthropic(config.model),
        messages,
        tools: aiTools,
        maxSteps: config.maxSteps,
        abortSignal: AbortSignal.timeout(config.timeout),
      });

      // Extract tool calls and results
      const toolCalls = this.extractToolCalls(result.response.messages);
      const toolResults = this.extractToolResults(result.response.messages);

      return {
        messages: result.response.messages,
        toolCalls,
        toolResults,
        success: true,
      };
    } catch (error) {
      return {
        messages: [],
        toolCalls: [],
        toolResults: [],
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async judgeResponse(
    messages: CoreMessage[],
    criteria: string,
    _threshold: number = 0.7
  ): Promise<LlmJudgeResult> {
    try {
      // Create a conversation context for the judge
      const conversationContext = messages
        .map(msg => {
          if (msg.role === 'user') {
            return `User: ${typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}`;
          } else if (msg.role === 'assistant') {
            return `Assistant: ${typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}`;
          } else if (msg.role === 'tool') {
            return `Tool Result: ${JSON.stringify(msg.content)}`;
          }
          return '';
        })
        .join('\n');

      const judgePrompt = `
Please evaluate the following conversation based on these criteria: ${criteria}

Conversation:
${conversationContext}

Please provide a score from 0.0 to 1.0 (where 1.0 is perfect) and explain your reasoning.
Respond in the following JSON format:
{
  "score": 0.8,
  "rationale": "The assistant successfully..."
}`;

      const result = await generateText({
        model: anthropic('claude-3-haiku-20240307'), // Use faster model for judging
        messages: [
          {
            role: 'user',
            content: judgePrompt,
          },
        ],
        abortSignal: AbortSignal.timeout(30000), // 30 second timeout for judge
      });

      // Parse the JSON response
      try {
        const response = JSON.parse(result.text);
        return {
          score: response.score,
          rationale: response.rationale,
        };
      } catch {
        // Fallback if JSON parsing fails
        return {
          score: 0.0,
          rationale: `Failed to parse judge response: ${result.text}`,
        };
      }
    } catch (error) {
      return {
        score: 0.0,
        rationale: `Judge evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}
