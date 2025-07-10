/**
 * LLM Provider interface for evaluation tests
 * Using Vercel AI SDK unified types
 */

import type { CoreMessage, ToolCall, ToolResult } from 'ai';
import type { McpClient } from '../../../core/mcp-client.js';

export interface LlmConversationConfig {
  model: string;
  maxSteps: number;
  timeout: number;
}

export interface LlmConversationResult {
  messages: CoreMessage[];
  toolCalls: ToolCall<any, any>[];
  toolResults: ToolResult<any, any, any>[];
  success: boolean;
  error?: string;
}

export interface LlmJudgeResult {
  score: number;
  rationale: string;
}

export abstract class LlmProvider {
  abstract executeConversation(
    _mcpClient: McpClient,
    _prompt: string,
    _config: LlmConversationConfig
  ): Promise<LlmConversationResult>;

  abstract judgeResponse(
    _messages: CoreMessage[],
    _criteria: string,
    _threshold?: number
  ): Promise<LlmJudgeResult>;

  /**
   * Extract tool calls from AI SDK messages
   */
  extractToolCalls(messages: CoreMessage[]): ToolCall<any, any>[] {
    const toolCalls: ToolCall<any, any>[] = [];

    for (const message of messages) {
      if (message.role === 'assistant') {
        if (typeof message.content === 'string') {
          // Skip text-only messages
          continue;
        }

        // Handle array content with tool calls
        if (Array.isArray(message.content)) {
          for (const part of message.content) {
            if (part.type === 'tool-call') {
              toolCalls.push({
                toolCallId: part.toolCallId,
                toolName: part.toolName,
                args: part.args,
              });
            }
          }
        }
      }
    }

    return toolCalls;
  }

  /**
   * Extract tool results from AI SDK messages
   */
  extractToolResults(messages: CoreMessage[]): ToolResult<any, any, any>[] {
    const toolResults: ToolResult<any, any, any>[] = [];

    for (const message of messages) {
      if (message.role === 'tool' && Array.isArray(message.content)) {
        for (const part of message.content) {
          if (part.type === 'tool-result') {
            toolResults.push({
              toolCallId: part.toolCallId,
              toolName: part.toolName,
              args: {}, // Tool args not available in result
              result: part.result,
            });
          }
        }
      }
    }

    return toolResults;
  }
}
