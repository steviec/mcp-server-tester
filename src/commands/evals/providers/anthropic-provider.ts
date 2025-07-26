/**
 * Anthropic LLM Provider using Vercel AI SDK
 */

import { generateText, tool, jsonSchema, type CoreMessage } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import type { McpClient } from '../../../shared/core/mcp-client.js';
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
      const toolsResponse = await mcpClient.sdk.listTools();
      const mcpTools = toolsResponse.tools || [];

      // Convert MCP tools to AI SDK format using tool() helper
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const aiTools: Record<string, any> = {};
      for (const mcpTool of mcpTools) {
        aiTools[mcpTool.name] = tool({
          description: mcpTool.description,
          parameters: jsonSchema(mcpTool.inputSchema as object),
          execute: async (args: unknown) => {
            try {
              const result = await mcpClient.sdk.callTool({
                name: mcpTool.name,
                arguments: args as Record<string, unknown>,
              });
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tools: aiTools as any,
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
IMPORTANT: When providing your rationale, ensure all quotes are properly escaped for JSON.
Respond in the following JSON format only, with no additional text:
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

      // Parse the JSON response with better error handling
      try {
        // Clean the response text to handle potential extra text around JSON
        const cleanedText = result.text.trim();
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
        const jsonText = jsonMatch ? jsonMatch[0] : cleanedText;

        const response = JSON.parse(jsonText);

        // Validate response structure
        if (typeof response.score !== 'number' || typeof response.rationale !== 'string') {
          throw new Error('Invalid response structure');
        }

        // Ensure score is within valid range
        const normalizedScore = Math.max(0, Math.min(1, response.score));

        return {
          score: normalizedScore,
          rationale: response.rationale,
        };
      } catch (parseError) {
        // Enhanced fallback with more detailed error information
        const errorDetails = parseError instanceof Error ? parseError.message : String(parseError);
        return {
          score: 0.0,
          rationale: `Failed to parse judge response: ${errorDetails}. Raw response: ${result.text.substring(0, 200)}...`,
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
