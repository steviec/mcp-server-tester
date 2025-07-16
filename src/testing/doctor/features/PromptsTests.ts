/**
 * Comprehensive diagnostic tests for MCP server Prompts functionality
 */

import { DiagnosticTest } from '../DiagnosticTest.js';
import { TEST_SEVERITY, type DiagnosticResult, type DoctorConfig } from '../types.js';
import type { McpClient } from '../../../core/mcp-client.js';
import type { Prompt } from '@modelcontextprotocol/sdk/types.js';

export class PromptsCapabilityTest extends DiagnosticTest {
  readonly name = 'Prompts: Capability Declaration';
  readonly description = 'Verify server declares prompts capability correctly';
  readonly category = 'prompts';
  readonly severity = TEST_SEVERITY.INFO;

  async execute(client: McpClient, _config: DoctorConfig): Promise<DiagnosticResult> {
    try {
      const result = await client.sdk.listPrompts();

      if (result && typeof result === 'object' && 'prompts' in result) {
        const hasListChanged = 'listChanged' in result ? result.listChanged : undefined;
        return this.createResult(
          true,
          `Prompts capability declared correctly${hasListChanged !== undefined ? ` (listChanged: ${hasListChanged})` : ''}`,
          { hasListChanged, promptsCount: result.prompts?.length || 0 }
        );
      } else {
        return this.createResult(
          false,
          'Server does not properly declare prompts capability',
          { response: result },
          ['Ensure server implements prompts/list method according to MCP specification']
        );
      }
    } catch (error) {
      // Prompts are optional, so we'll treat this as info
      return this.createResult(
        false,
        'Server does not support prompts capability',
        { error: error instanceof Error ? error.message : String(error) },
        ['Prompts capability is optional but useful for template-based interactions']
      );
    }
  }
}

export class PromptListingTest extends DiagnosticTest {
  readonly name = 'Prompts: Prompt Listing';
  readonly description = 'Verify prompt listing functionality';
  readonly category = 'prompts';
  readonly severity = TEST_SEVERITY.INFO;

  async execute(client: McpClient, _config: DoctorConfig): Promise<DiagnosticResult> {
    try {
      const result = await client.sdk.listPrompts();
      const prompts = result.prompts || [];

      if (prompts.length === 0) {
        return this.createResult(false, 'No prompts found', { promptCount: 0 }, [
          'Consider implementing prompts for template-based interactions',
          'Prompts are optional but useful for structured AI interactions',
        ]);
      }

      const promptNames = prompts.map(p => p.name);
      const duplicateNames = promptNames.filter(
        (name, index) => promptNames.indexOf(name) !== index
      );

      if (duplicateNames.length > 0) {
        return this.createResult(
          false,
          `Duplicate prompt names found: ${duplicateNames.join(', ')}`,
          { duplicates: duplicateNames, promptCount: prompts.length },
          ['Ensure all prompt names are unique']
        );
      }

      return this.createResult(true, `${prompts.length} prompts found`, {
        promptCount: prompts.length,
        promptNames: promptNames.slice(0, 5), // Show first 5 prompts
      });
    } catch (error) {
      return this.createResult(
        false,
        'Failed to list prompts',
        { error: error instanceof Error ? error.message : String(error) },
        ['Check server prompts/list implementation']
      );
    }
  }
}

export class PromptRetrievalTest extends DiagnosticTest {
  readonly name = 'Prompts: Prompt Retrieval';
  readonly description = 'Test prompt retrieval functionality';
  readonly category = 'prompts';
  readonly severity = TEST_SEVERITY.INFO;

  async execute(client: McpClient, config: DoctorConfig): Promise<DiagnosticResult> {
    try {
      const result = await client.sdk.listPrompts();
      const prompts = result.prompts || [];

      if (prompts.length === 0) {
        return this.createSkippedResult('No prompts available to test retrieval');
      }

      const testPrompt = this.findSuitableTestPrompt(prompts);

      if (!testPrompt) {
        return this.createResult(
          false,
          'No suitable prompt found for retrieval test',
          { availablePrompts: prompts.map(p => p.name) },
          ['Ensure prompts have valid names', 'Check prompt accessibility']
        );
      }

      const testArgs = this.generateTestArguments(testPrompt);
      const timeout = config.timeouts?.testExecution || 30000;

      try {
        const startTime = Date.now();
        const getResult = (await Promise.race([
          client.sdk.getPrompt({ name: testPrompt.name, arguments: testArgs }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Prompt retrieval timeout')), timeout)
          ),
        ])) as any;
        const duration = Date.now() - startTime;

        const messages = Array.isArray(getResult.messages)
          ? getResult.messages
          : [getResult.messages];

        return this.createResult(true, `Prompt retrieval successful (${testPrompt.name})`, {
          promptName: testPrompt.name,
          duration,
          testArgs,
          messageCount: messages.length,
          description: getResult.description,
        });
      } catch (error) {
        return this.createResult(
          false,
          `Prompt retrieval failed (${testPrompt.name})`,
          {
            promptName: testPrompt.name,
            testArgs,
            error: error instanceof Error ? error.message : String(error),
          },
          ['Check prompt implementation', 'Verify prompt argument handling']
        );
      }
    } catch (error) {
      return this.createResult(false, 'Failed to test prompt retrieval', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private findSuitableTestPrompt(prompts: Prompt[]): Prompt | null {
    // Prefer prompts with simple arguments or no required arguments
    const simplePrompt = prompts.find(prompt => this.hasSimpleArguments(prompt));
    if (simplePrompt) {
      return simplePrompt;
    }

    // Fall back to first prompt
    return prompts[0];
  }

  private hasSimpleArguments(prompt: Prompt): boolean {
    const args = prompt.arguments || [];

    // Check for prompts with no required arguments or simple string arguments
    const requiredArgs = args.filter(arg => arg.required);
    return (
      requiredArgs.length === 0 ||
      requiredArgs.every(arg => !arg.required || this.isSimpleArgument(arg))
    );
  }

  private isSimpleArgument(arg: any): boolean {
    // Simple if it's a string argument without complex validation
    return !arg.required || (typeof arg.description === 'string' && arg.description.length < 100);
  }

  private generateTestArguments(prompt: Prompt): Record<string, string> {
    const args: Record<string, string> = {};
    const promptArgs = prompt.arguments || [];

    // Fill required arguments with test values
    for (const arg of promptArgs) {
      if (arg.required) {
        args[arg.name] = this.generateTestValue(arg);
      }
    }

    return args;
  }

  private generateTestValue(arg: any): string {
    // Generate safe test values based on argument description or name
    const name = arg.name.toLowerCase();
    const description = (arg.description || '').toLowerCase();

    if (name.includes('name') || description.includes('name')) {
      return 'test_name';
    }
    if (name.includes('file') || description.includes('file')) {
      return 'test.txt';
    }
    if (name.includes('url') || description.includes('url')) {
      return 'https://example.com';
    }
    if (name.includes('email') || description.includes('email')) {
      return 'test@example.com';
    }
    if (name.includes('number') || description.includes('number')) {
      return '1';
    }

    // Default test value
    return 'test_value';
  }
}

export class ArgumentValidationTest extends DiagnosticTest {
  readonly name = 'Prompts: Argument Validation';
  readonly description = 'Test prompt argument validation';
  readonly category = 'prompts';
  readonly severity = TEST_SEVERITY.INFO;

  async execute(client: McpClient, _config: DoctorConfig): Promise<DiagnosticResult> {
    try {
      const result = await client.sdk.listPrompts();
      const prompts = result.prompts || [];

      if (prompts.length === 0) {
        return this.createSkippedResult('No prompts available to test argument validation');
      }

      // Find a prompt with required arguments
      const promptWithRequiredArgs = prompts.find(prompt =>
        prompt.arguments?.some(arg => arg.required)
      );

      if (!promptWithRequiredArgs) {
        return this.createResult(
          false,
          'No prompts with required arguments found',
          { totalPrompts: prompts.length },
          ['Consider adding required arguments to prompts for better validation testing']
        );
      }

      try {
        // Call prompt without required arguments
        await client.sdk.getPrompt({ name: promptWithRequiredArgs.name, arguments: {} });

        return this.createResult(
          false,
          `Prompt did not validate required arguments (${promptWithRequiredArgs.name})`,
          { promptName: promptWithRequiredArgs.name },
          [
            'Implement proper argument validation',
            'Return appropriate error for missing required arguments',
          ]
        );
      } catch (error) {
        // This is expected behavior - the prompt should validate required arguments
        return this.createResult(
          true,
          `Prompt properly validates required arguments (${promptWithRequiredArgs.name})`,
          {
            promptName: promptWithRequiredArgs.name,
            error: error instanceof Error ? error.message : String(error),
          }
        );
      }
    } catch (error) {
      return this.createResult(false, 'Failed to test prompt argument validation', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export class TemplateRenderingTest extends DiagnosticTest {
  readonly name = 'Prompts: Template Rendering';
  readonly description = 'Test prompt template rendering with variables';
  readonly category = 'prompts';
  readonly severity = TEST_SEVERITY.INFO;

  async execute(client: McpClient, _config: DoctorConfig): Promise<DiagnosticResult> {
    try {
      const result = await client.sdk.listPrompts();
      const prompts = result.prompts || [];

      if (prompts.length === 0) {
        return this.createSkippedResult('No prompts available to test template rendering');
      }

      // Find a prompt that likely uses templates (has arguments)
      const templatePrompt = prompts.find(
        prompt => prompt.arguments && prompt.arguments.length > 0
      );

      if (!templatePrompt) {
        return this.createResult(
          false,
          'No prompts with arguments found for template testing',
          { totalPrompts: prompts.length },
          ['Consider adding parameterized prompts for template functionality']
        );
      }

      const testArgs = this.generateTestArguments(templatePrompt);

      try {
        const getResult = await client.sdk.getPrompt({
          name: templatePrompt.name,
          arguments: testArgs,
        });

        // Check if template variables were substituted
        const rendered = this.analyzeTemplateRendering(getResult as any, testArgs);

        if (rendered.hasSubstitution) {
          return this.createResult(true, `Template rendering working (${templatePrompt.name})`, {
            promptName: templatePrompt.name,
            testArgs,
            substitutionFound: rendered.substitutionFound,
            messageCount: rendered.messageCount,
          });
        } else {
          return this.createResult(
            false,
            `No template substitution detected (${templatePrompt.name})`,
            {
              promptName: templatePrompt.name,
              testArgs,
              messageCount: rendered.messageCount,
            },
            [
              'Verify prompt templates use argument substitution',
              'Check template syntax implementation',
            ]
          );
        }
      } catch (error) {
        return this.createResult(false, `Template rendering failed (${templatePrompt.name})`, {
          promptName: templatePrompt.name,
          testArgs,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } catch (error) {
      return this.createResult(false, 'Failed to test template rendering', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private generateTestArguments(prompt: Prompt): Record<string, string> {
    const args: Record<string, string> = {};
    const promptArgs = prompt.arguments || [];

    // Generate distinctive test values for template detection
    for (const arg of promptArgs) {
      args[arg.name] = `TEST_VALUE_${arg.name.toUpperCase()}`;
    }

    return args;
  }

  private analyzeTemplateRendering(result: any, testArgs: Record<string, string>) {
    const messages = Array.isArray(result.messages) ? result.messages : [result.messages];
    let hasSubstitution = false;
    const substitutionFound: string[] = [];

    // Look for test values in the rendered content
    for (const message of messages) {
      if (message && typeof message === 'object' && message.content) {
        const content =
          typeof message.content === 'string' ? message.content : JSON.stringify(message.content);

        for (const [argName, argValue] of Object.entries(testArgs)) {
          if (content.includes(argValue)) {
            hasSubstitution = true;
            substitutionFound.push(`${argName}="${argValue}"`);
          }
        }
      }
    }

    return {
      hasSubstitution,
      substitutionFound,
      messageCount: messages.length,
    };
  }
}
