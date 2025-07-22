/**
 * LLM Evaluation (eval) test runner for LLM interaction testing
 */

import { McpClient, createTransportOptions } from '../../shared/core/mcp-client.js';
import { AnthropicProvider } from './providers/anthropic-provider.js';
import type {
  EvalsConfig,
  EvalTest,
  EvalResult,
  ServerConfig,
  ScorerResult,
} from '../../shared/core/types.js';
import type { DisplayManager } from '../../shared/display/DisplayManager.js';
import type { CoreMessage, ToolCall, ToolResult } from 'ai';

export interface EvalSummary {
  total: number;
  passed: number;
  failed: number;
  duration: number;
  results: EvalResult[];
}

interface EvalServerOptions {
  serverConfig: ServerConfig;
  timeout?: number;
  debug?: boolean;
}

export class EvalTestRunner {
  private mcpClient: McpClient;
  private config: EvalsConfig;
  private serverOptions: EvalServerOptions;
  private models: string[];
  private llmProvider: AnthropicProvider;
  private displayManager?: DisplayManager;

  constructor(
    config: EvalsConfig,
    serverOptions: EvalServerOptions,
    displayManager?: DisplayManager
  ) {
    this.config = config;
    this.serverOptions = serverOptions;
    this.displayManager = displayManager;
    // Use models from config file or default
    this.models = this.config.models || ['claude-3-haiku-20240307'];
    this.mcpClient = new McpClient();
    this.llmProvider = new AnthropicProvider();
  }

  async run(): Promise<EvalSummary> {
    const startTime = Date.now();

    try {
      // Check for API key early
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error(
          'ANTHROPIC_API_KEY environment variable is required for LLM evaluation (eval) tests.\n' +
            'Please set your Anthropic API key: export ANTHROPIC_API_KEY="your-key-here"'
        );
      }

      // Use the provided server configuration
      const transportOptions = createTransportOptions(this.serverOptions.serverConfig);

      await this.mcpClient.connect(transportOptions);

      // Emit section start for LLM evaluation tests
      if (this.displayManager && this.models.length > 0) {
        const modelText =
          this.models.length === 1 ? this.models[0] : `${this.models.length} models`;
        this.displayManager.sectionStart('evals', `🤖 LLM Evaluation Tests (${modelText})`);
      }

      // Run LLM evaluation (eval) tests for each model
      const results: EvalResult[] = [];

      for (const model of this.models) {
        // Notify display manager about model change
        if (this.displayManager) {
          this.displayManager.progress(`Running tests with model: ${model}`, model);
        }

        for (const test of this.config.tests) {
          if (this.displayManager) {
            this.displayManager.testStart(test.name, model);
          }

          const result = await this.runTest(test, model);
          results.push(result);

          if (this.displayManager) {
            this.displayManager.testComplete(
              test.name,
              result.passed,
              result.errors,
              model,
              test.prompt,
              result.messages,
              result.scorer_results
            );
          }
        }
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      const summary: EvalSummary = {
        total: results.length,
        passed: results.filter(r => r.passed).length,
        failed: results.filter(r => !r.passed).length,
        duration,
        results,
      };

      // Note: suiteComplete is called by the main runner, not here

      return summary;
    } finally {
      await this.mcpClient.disconnect();
    }
  }

  private async runTest(test: EvalTest, model: string): Promise<EvalResult> {
    const errors: string[] = [];
    let passed = true;

    try {
      // Determine allowed tools from test configuration
      let allowedTools: string[] | undefined;
      if (test.expected_tool_calls?.allowed !== undefined) {
        allowedTools = test.expected_tool_calls.allowed;
      } else if (test.expected_tool_calls?.required) {
        // If only required tools are specified, allow those
        allowedTools = test.expected_tool_calls.required;
      }

      const conversationResult = await this.llmProvider.executeConversation(
        this.mcpClient,
        test.prompt,
        {
          model,
          maxSteps: this.config.max_steps || 3,
          timeout: this.config.timeout || 30000,
          allowedTools,
        }
      );

      if (!conversationResult.success) {
        errors.push(`Conversation failed: ${conversationResult.error}`);
        passed = false;
      }

      // Validate tool calls if expected
      if (test.expected_tool_calls && conversationResult.success) {
        const toolCallErrors = this.validateToolCalls(
          conversationResult.toolCalls,
          test.expected_tool_calls
        );
        errors.push(...toolCallErrors);
        if (toolCallErrors.length > 0) {
          passed = false;
        }
      }

      // Validate tool call success for required tools
      if (test.expected_tool_calls?.required && conversationResult.success) {
        const toolSuccessErrors = this.validateToolCallSuccess(
          conversationResult.toolCalls,
          conversationResult.toolResults,
          test.expected_tool_calls.required
        );
        errors.push(...toolSuccessErrors);
        if (toolSuccessErrors.length > 0) {
          passed = false;
        }
      }

      // Run response scorers if configured
      let scorerResults: ScorerResult[] = [];
      if (test.response_scorers && conversationResult.success) {
        scorerResults = await this.runResponseScorers(
          conversationResult.messages,
          test.response_scorers
        );

        // Generate error messages from failed scorers for backward compatibility
        const scorerErrors = scorerResults
          .filter(result => !result.passed)
          .map(result => {
            if (result.type === 'regex') {
              return `Regex scorer failed: ${result.details}`;
            } else if (result.type === 'llm-judge') {
              return `LLM judge failed: ${result.details}`;
            } else {
              return `Scorer '${result.type}' failed: ${result.details}`;
            }
          });

        errors.push(...scorerErrors);
        if (scorerErrors.length > 0) {
          passed = false;
        }
      }

      return {
        name: test.name,
        model,
        passed,
        errors,
        scorer_results: scorerResults,
        messages: conversationResult.messages,
      };
    } catch (error) {
      return {
        name: test.name,
        model,
        passed: false,
        errors: [
          `Test execution failed: ${error instanceof Error ? error.message : String(error)}`,
        ],
        scorer_results: [],
        messages: [],
      };
    }
  }

  private validateToolCalls(
    actualToolCalls: ToolCall<string, Record<string, unknown>>[],
    expectedToolCalls: NonNullable<EvalTest['expected_tool_calls']>
  ): string[] {
    const errors: string[] = [];
    const actualToolNames = actualToolCalls.map(call => call.toolName);

    // Check required tools
    if (expectedToolCalls.required) {
      for (const requiredTool of expectedToolCalls.required) {
        if (!actualToolNames.includes(requiredTool)) {
          errors.push(
            `Required tool '${requiredTool}' was not called (actual calls: ${actualToolNames.length > 0 ? actualToolNames.join(', ') : 'none'})`
          );
        }
      }
    }

    // Check allowed tools (if specified, only these tools should be called)
    // Note: required tools are automatically considered allowed
    if (expectedToolCalls.allowed) {
      const allowedTools = [...expectedToolCalls.allowed];

      // Add required tools to allowed list since they should always be permitted
      if (expectedToolCalls.required) {
        allowedTools.push(...expectedToolCalls.required);
      }

      for (const actualTool of actualToolNames) {
        if (!allowedTools.includes(actualTool)) {
          errors.push(
            `Tool '${actualTool}' was called but not in allowed list (allowed: ${allowedTools.join(', ')})`
          );
        }
      }
    }

    return errors;
  }

  private validateToolCallSuccess(
    toolCalls: ToolCall<string, Record<string, unknown>>[],
    toolResults: ToolResult<string, Record<string, unknown>, unknown>[],
    requiredTools: string[]
  ): string[] {
    const errors: string[] = [];
    const calledToolNames = toolCalls.map(call => call.toolName);

    for (const requiredTool of requiredTools) {
      // Only validate success if the tool was actually called
      if (!calledToolNames.includes(requiredTool)) {
        continue; // Skip - this case is already handled by validateToolCalls
      }

      // Find results for this required tool
      const resultsForTool = toolResults.filter(tr => tr.toolName === requiredTool);

      if (resultsForTool.length === 0) {
        errors.push(`Required tool '${requiredTool}' was called but no results found`);
        continue;
      }

      // Check each result for errors
      for (const result of resultsForTool) {
        if (this.hasToolError(result.result)) {
          errors.push(
            `Required tool '${requiredTool}' failed: ${this.getErrorMessage(result.result)}`
          );
        }
      }
    }

    return errors;
  }

  private hasToolError(result: unknown): boolean {
    // According to MCP spec, tool execution errors are indicated by isError: true
    if (typeof result === 'object' && result !== null) {
      const resultObj = result as Record<string, unknown>;
      return resultObj.isError === true;
    }
    return false;
  }

  private getErrorMessage(result: unknown): string {
    if (typeof result === 'object' && result !== null) {
      const resultObj = result as Record<string, unknown>;

      // Try to extract error message from content
      if (Array.isArray(resultObj.content)) {
        for (const contentItem of resultObj.content) {
          if (typeof contentItem === 'object' && contentItem !== null) {
            const content = contentItem as Record<string, unknown>;
            if (content.type === 'text' && typeof content.text === 'string') {
              return content.text;
            }
          }
        }
      }

      // Fallback to JSON representation
      return JSON.stringify(result);
    }

    return String(result);
  }

  private async runResponseScorers(
    messages: CoreMessage[],
    scorers: NonNullable<EvalTest['response_scorers']>
  ): Promise<ScorerResult[]> {
    const results: ScorerResult[] = [];

    for (const scorer of scorers) {
      try {
        if (scorer.type === 'regex') {
          const success = await this.runRegexScorer(messages, scorer.pattern!);
          results.push({
            type: 'regex',
            passed: success,
            details: success
              ? `Pattern '${scorer.pattern}' found`
              : `Pattern '${scorer.pattern}' not found`,
          });
        } else if (scorer.type === 'llm-judge') {
          const result = await this.llmProvider.judgeResponse(
            messages,
            scorer.criteria!,
            scorer.threshold
          );

          const threshold = scorer.threshold || 0.7;
          const passed = result.score >= threshold;

          results.push({
            type: 'llm-judge',
            passed,
            score: result.score,
            details: `Score: ${result.score} (threshold: ${threshold}). Rationale: ${result.rationale}`,
          });
        }
      } catch (error) {
        results.push({
          type: scorer.type,
          passed: false,
          details: `Scorer failed: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }

    return results;
  }

  private async runRegexScorer(messages: CoreMessage[], pattern: string): Promise<boolean> {
    const regex = new RegExp(pattern, 'i');

    for (const message of messages) {
      if (message.role === 'assistant') {
        const content =
          typeof message.content === 'string' ? message.content : JSON.stringify(message.content);

        if (regex.test(content)) {
          return true;
        }
      }
    }

    return false;
  }
}
