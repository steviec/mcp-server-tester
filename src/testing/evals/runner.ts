/**
 * Evaluation test runner for LLM interaction testing
 */

import {
  McpClient,
  createTransportOptions,
  createServerConfigFromCli,
} from '../../core/mcp-client.js';
import { ConfigLoader } from '../../config/loader.js';
import { AnthropicProvider } from './providers/anthropic-provider.js';
import type { EvaluationsConfig, EvaluationTest, EvaluationResult } from '../../core/types.js';

export interface EvaluationSummary {
  total: number;
  passed: number;
  failed: number;
  duration: number;
  results: EvaluationResult[];
}

interface EvalServerOptions {
  serverConfig?: string;
  serverName?: string;
  serverCommand?: string;
  serverArgs?: string;
  serverEnv?: string;
  models?: string;
}

export class EvaluationTestRunner {
  private mcpClient: McpClient;
  private config: EvaluationsConfig;
  private serverOptions: EvalServerOptions;
  private models: string[];
  private llmProvider: AnthropicProvider;

  constructor(config: EvaluationsConfig, serverOptions: EvalServerOptions) {
    this.config = config;
    this.serverOptions = serverOptions;
    // Parse models override from CLI if provided
    this.models = serverOptions.models
      ? serverOptions.models.split(',').map(m => m.trim())
      : this.config.models || ['claude-3-haiku-20240307'];
    this.mcpClient = new McpClient();
    this.llmProvider = new AnthropicProvider();
  }

  async run(): Promise<EvaluationSummary> {
    const startTime = Date.now();

    try {
      // Check for API key early
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error(
          'ANTHROPIC_API_KEY environment variable is required for evaluation tests.\n' +
            'Please set your Anthropic API key: export ANTHROPIC_API_KEY="your-key-here"'
        );
      }

      // Determine server configuration based on mode
      let transportOptions;

      if (this.serverOptions.serverConfig) {
        // Config file mode
        const serverConfig = ConfigLoader.loadServerConfig(
          this.serverOptions.serverConfig,
          this.serverOptions.serverName
        );
        transportOptions = createTransportOptions(serverConfig);
      } else if (this.serverOptions.serverCommand) {
        // CLI launch mode
        const serverConfig = createServerConfigFromCli(
          this.serverOptions.serverCommand,
          this.serverOptions.serverArgs,
          this.serverOptions.serverEnv
        );
        transportOptions = createTransportOptions(serverConfig);
      } else {
        throw new Error('No server configuration provided');
      }

      await this.mcpClient.connect(transportOptions);

      // Run evaluation tests for each model
      const results: EvaluationResult[] = [];

      for (const model of this.models) {
        for (const test of this.config.tests) {
          const result = await this.runTest(test, model);
          results.push(result);
        }
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      const summary: EvaluationSummary = {
        total: results.length,
        passed: results.filter(r => r.passed).length,
        failed: results.filter(r => !r.passed).length,
        duration,
        results,
      };

      // Results logged by Jest framework

      return summary;
    } finally {
      await this.mcpClient.disconnect();
    }
  }

  private async runTest(test: EvaluationTest, model: string): Promise<EvaluationResult> {
    const errors: string[] = [];
    let passed = true;

    try {
      // Execute LLM conversation
      const conversationResult = await this.llmProvider.executeConversation(
        this.mcpClient,
        test.prompt,
        {
          model,
          maxSteps: this.config.max_steps || 3,
          timeout: this.config.timeout || 30000,
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

      // Run response scorers if configured
      if (test.response_scorers && conversationResult.success) {
        const scorerErrors = await this.runResponseScorers(
          conversationResult.messages,
          test.response_scorers
        );
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
        scorer_results: [], // TODO: Implement detailed scorer results
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
    actualToolCalls: any[],
    expectedToolCalls: NonNullable<EvaluationTest['expected_tool_calls']>
  ): string[] {
    const errors: string[] = [];
    const actualToolNames = actualToolCalls.map(call => call.toolName);

    // Check required tools
    if (expectedToolCalls.required) {
      for (const requiredTool of expectedToolCalls.required) {
        if (!actualToolNames.includes(requiredTool)) {
          errors.push(`Required tool '${requiredTool}' was not called`);
        }
      }
    }

    // Check allowed tools (if specified, only these tools should be called)
    if (expectedToolCalls.allowed) {
      for (const actualTool of actualToolNames) {
        if (!expectedToolCalls.allowed.includes(actualTool)) {
          errors.push(`Tool '${actualTool}' was called but not in allowed list`);
        }
      }
    }

    return errors;
  }

  private async runResponseScorers(
    messages: any[],
    scorers: NonNullable<EvaluationTest['response_scorers']>
  ): Promise<string[]> {
    const errors: string[] = [];

    for (const scorer of scorers) {
      try {
        if (scorer.type === 'regex') {
          const success = await this.runRegexScorer(messages, scorer.pattern!);
          if (!success) {
            errors.push(`Regex scorer failed: pattern '${scorer.pattern}' not found`);
          }
        } else if (scorer.type === 'llm-judge') {
          const result = await this.llmProvider.judgeResponse(
            messages,
            scorer.criteria!,
            scorer.threshold
          );
          if (result.score < (scorer.threshold || 0.7)) {
            errors.push(
              `LLM judge failed: score ${result.score} < threshold ${scorer.threshold || 0.7}. Rationale: ${result.rationale}`
            );
          }
        } else if (scorer.type === 'json-schema') {
          const success = await this.runJsonSchemaScorer(messages, scorer.schema!);
          if (!success) {
            errors.push(`JSON schema scorer failed: response does not match schema`);
          }
        }
      } catch (error) {
        errors.push(
          `Scorer '${scorer.type}' failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return errors;
  }

  private async runRegexScorer(messages: any[], pattern: string): Promise<boolean> {
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

  private async runJsonSchemaScorer(messages: any[], schema: any): Promise<boolean> {
    // Basic JSON schema validation - would need full implementation with ajv
    for (const message of messages) {
      if (message.role === 'assistant') {
        const content =
          typeof message.content === 'string' ? message.content : JSON.stringify(message.content);

        // Try to parse as JSON and do basic validation
        try {
          const jsonData = JSON.parse(content);

          // Very basic schema validation - in practice would use ajv
          if (schema.type === 'string' && typeof jsonData === 'string') {
            if (schema.minLength && jsonData.length < schema.minLength) {
              continue;
            }
            if (schema.pattern && !new RegExp(schema.pattern).test(jsonData)) {
              continue;
            }
            return true;
          }

          if (schema.type === 'object' && typeof jsonData === 'object') {
            return true; // Basic object validation
          }
        } catch {
          // If schema expects a string but content is not JSON, check if it matches
          if (schema.type === 'string') {
            if (schema.pattern && new RegExp(schema.pattern).test(content)) {
              return true;
            }
          }
        }
      }
    }

    return false;
  }
}
