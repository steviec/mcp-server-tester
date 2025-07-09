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
  toolCalls: ToolCall[];
  toolResults: ToolResult[];
  success: boolean;
  error?: string;
}

export interface LlmJudgeResult {
  score: number;
  rationale: string;
}

export abstract class LlmProvider {
  abstract executeConversation(
    mcpClient: McpClient,
    prompt: string,
    config: LlmConversationConfig
  ): Promise<LlmConversationResult>;

  abstract judgeResponse(
    messages: CoreMessage[],
    criteria: string,
    threshold?: number
  ): Promise<LlmJudgeResult>;

  /**
   * Extract tool calls from AI SDK messages
   */
  extractToolCalls(messages: CoreMessage[]): ToolCall[] {
    const toolCalls: ToolCall[] = [];
    
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
                args: part.args
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
  extractToolResults(messages: CoreMessage[]): ToolResult[] {
    const toolResults: ToolResult[] = [];
    
    for (const message of messages) {
      if (message.role === 'tool' && Array.isArray(message.content)) {
        for (const part of message.content) {
          if (part.type === 'tool-result') {
            toolResults.push({
              toolCallId: part.toolCallId,
              toolName: part.toolName,
              result: part.result,
              isError: part.isError
            });
          }
        }
      }
    }
    
    return toolResults;
  }
}