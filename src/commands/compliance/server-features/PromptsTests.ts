/**
 * Simplified Prompts tests leveraging SDK error detection
 * Focuses on business logic validation while SDK handles protocol compliance
 */

import { DiagnosticTest } from '../DiagnosticTest.js';
import { SdkErrorDetector, type SdkErrorTest } from '../SdkErrorDetector.js';
import {
  TEST_SEVERITY,
  ISSUE_TYPE,
  type DiagnosticResult,
  type ComplianceConfig,
} from '../types.js';
import type { McpClient } from '../../../shared/core/mcp-client.js';
import { ErrorCode, type Prompt } from '@modelcontextprotocol/sdk/types.js';

export class PromptsCapabilityTest extends DiagnosticTest {
  readonly name = 'Server Features: Prompts - Capability Declaration';
  readonly description = 'Verify server declares prompts capability using SDK validation';
  readonly category = 'server-features';
  readonly feature = 'prompts' as const;
  readonly severity = TEST_SEVERITY.CRITICAL;
  readonly requiredCapability = 'prompts';
  readonly mcpSpecSection = 'Server Features - Prompts';

  async execute(client: McpClient, config: ComplianceConfig): Promise<DiagnosticResult> {
    // Use SDK to validate prompts capability - it handles all protocol validation
    const sdkTests: SdkErrorTest[] = [
      {
        name: 'Prompts Capability Declaration',
        description: 'Validate prompts capability through SDK',
        category: 'server-features',
        feature: 'prompts',
        severity: TEST_SEVERITY.CRITICAL,
        operation: async (client: McpClient) => await client.sdk.listPrompts(),
        expectsError: false,
      },
    ];

    try {
      const sdkResults = await SdkErrorDetector.executeTests(client, config, sdkTests);
      const diagnosticResults = SdkErrorDetector.convertTodiagnosticResults(sdkResults);

      const failedTests = diagnosticResults.filter(r => r.status === 'failed');

      if (failedTests.length === 0) {
        const result = await client.sdk.listPrompts();
        const promptCount = result.prompts?.length || 0;

        return this.createResult(
          true,
          `Prompts capability validated via SDK (${promptCount} prompts found)`,
          { promptCount, sdkValidated: true }
        );
      } else {
        return this.createEnhancedResult({
          success: false,
          message: 'SDK detected prompts capability issues',
          details: { failedTests: failedTests.length, results: diagnosticResults },
          issueType: failedTests[0].issueType || ISSUE_TYPE.CRITICAL_FAILURE,
          expected: 'Valid prompts capability declaration',
          actual: 'SDK validation failed',
          fixInstructions: failedTests.flatMap(t => t.recommendations || []),
          specLinks: ['https://spec.modelcontextprotocol.io/specification/server/prompts/'],
        });
      }
    } catch (error) {
      return this.createResult(
        false,
        'Prompts capability validation failed',
        { error: error instanceof Error ? error.message : String(error) },
        ['Check server prompts capability implementation', 'Verify server connection']
      );
    }
  }
}

export class PromptSchemaValidationTest extends DiagnosticTest {
  readonly name = 'Server Features: Prompts - Schema Validation';
  readonly description = 'Validate prompt schema compliance and quality (business logic)';
  readonly category = 'server-features';
  readonly feature = 'prompts' as const;
  readonly severity = TEST_SEVERITY.WARNING;
  readonly requiredCapability = 'prompts';
  readonly mcpSpecSection = 'Server Features - Prompts';

  async execute(client: McpClient, _config: ComplianceConfig): Promise<DiagnosticResult> {
    try {
      // SDK handles the listPrompts call validation, we focus on business logic
      const result = await client.sdk.listPrompts();
      const prompts = result.prompts || [];

      if (prompts.length === 0) {
        return this.createResult(false, 'No prompts available for schema validation', {
          promptCount: 0,
        });
      }

      const issues: string[] = [];
      const warnings: string[] = [];
      const validations: string[] = [];

      // Business logic validation (not protocol validation)
      prompts.forEach((prompt: Prompt, index: number) => {
        // Check for required business fields
        if (!prompt.name || prompt.name.trim().length === 0) {
          issues.push(`Prompt ${index}: Empty name`);
        } else if (prompt.name.length > 100) {
          warnings.push(
            `Prompt ${index} (${prompt.name}): Name very long (${prompt.name.length} chars)`
          );
        } else {
          validations.push(`Prompt ${index} (${prompt.name}): Valid name`);
        }

        if (!prompt.description || prompt.description.trim().length === 0) {
          warnings.push(`Prompt ${index} (${prompt.name}): Missing description`);
        } else if (prompt.description.length < 10) {
          warnings.push(`Prompt ${index} (${prompt.name}): Very short description`);
        } else if (prompt.description.length > 500) {
          warnings.push(
            `Prompt ${index} (${prompt.name}): Very long description (${prompt.description.length} chars)`
          );
        } else {
          validations.push(`Prompt ${index} (${prompt.name}): Good description`);
        }

        // Check for argument schema quality
        if (prompt.arguments) {
          if (Array.isArray(prompt.arguments) && prompt.arguments.length > 0) {
            const argCount = prompt.arguments.length;
            validations.push(`Prompt ${index} (${prompt.name}): Has ${argCount} arguments`);

            // Check argument quality
            prompt.arguments.forEach((arg, argIndex) => {
              if (!arg.name || !arg.description) {
                warnings.push(
                  `Prompt ${index} (${prompt.name}): Argument ${argIndex} missing name or description`
                );
              }
            });
          } else {
            validations.push(`Prompt ${index} (${prompt.name}): No arguments required`);
          }
        }
      });

      // Check for duplicate names (business logic)
      const names = prompts.map(p => p.name);
      const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
      if (duplicates.length > 0) {
        issues.push(`Duplicate prompt names: ${duplicates.join(', ')}`);
      }

      const hasIssues = issues.length > 0;
      const message = hasIssues
        ? `Prompt schema validation found ${issues.length} issues, ${warnings.length} warnings`
        : warnings.length > 0
          ? `Prompt schemas valid with ${warnings.length} improvement suggestions`
          : `All ${prompts.length} prompt schemas are well-formed`;

      return this.createResult(
        !hasIssues,
        message,
        {
          promptCount: prompts.length,
          issues,
          warnings,
          validations: validations.slice(0, 10), // Limit output
        },
        hasIssues || warnings.length > 0
          ? [...issues.map(i => `Fix: ${i}`), ...warnings.map(w => `Consider: ${w}`)]
          : undefined
      );
    } catch (error) {
      return this.createResult(
        false,
        'Prompt schema validation failed',
        { error: error instanceof Error ? error.message : String(error) },
        ['Check prompts/list implementation', 'Verify prompt schema format']
      );
    }
  }
}

export class PromptRetrievalTest extends DiagnosticTest {
  readonly name = 'Server Features: Prompts - Retrieval (prompts/get)';
  readonly description = 'Test prompt retrieval using SDK error detection';
  readonly category = 'server-features';
  readonly feature = 'prompts' as const;
  readonly severity = TEST_SEVERITY.WARNING;
  readonly requiredCapability = 'prompts';

  async execute(client: McpClient, config: ComplianceConfig): Promise<DiagnosticResult> {
    try {
      // Get available prompts via SDK
      const promptsResult = await client.sdk.listPrompts();
      const prompts = promptsResult.prompts || [];

      if (prompts.length === 0) {
        return this.createResult(false, 'No prompts available for retrieval test', {
          promptCount: 0,
        });
      }

      // Test retrieval with SDK error detection
      const sdkTests: SdkErrorTest[] = [
        {
          name: 'Invalid Prompt Name Error Handling',
          description: 'Test error handling for non-existent prompts',
          category: 'server-features',
          feature: 'prompts',
          severity: TEST_SEVERITY.WARNING,
          operation: async (client: McpClient) => {
            return await client.sdk.getPrompt({
              name: 'definitely_non_existent_prompt_xyz_12345',
              arguments: {},
            });
          },
          expectsError: true,
          expectedErrorCode: ErrorCode.InvalidParams,
        },
      ];

      const sdkResults = await SdkErrorDetector.executeTests(client, config, sdkTests);
      const diagnosticResults = SdkErrorDetector.convertTodiagnosticResults(sdkResults);

      const failedTests = diagnosticResults.filter(r => r.status === 'failed');
      const passedTests = diagnosticResults.filter(r => r.status === 'passed');

      if (failedTests.length === 0) {
        return this.createResult(true, `Prompt retrieval error handling validated via SDK`, {
          availablePrompts: prompts.length,
          passedTests: passedTests.length,
          sdkValidated: true,
        });
      } else {
        return this.createEnhancedResult({
          success: false,
          message: `SDK detected ${failedTests.length} prompt retrieval issues`,
          details: {
            availablePrompts: prompts.length,
            failedTests: failedTests.length,
            passedTests: passedTests.length,
            results: diagnosticResults,
          },
          issueType: failedTests[0].issueType || ISSUE_TYPE.SPEC_WARNING,
          expected: 'Proper prompt retrieval error handling',
          actual: `${failedTests.length} retrieval issues detected by SDK`,
          fixInstructions: failedTests.flatMap(t => t.recommendations || []),
          specLinks: ['https://spec.modelcontextprotocol.io/specification/server/prompts/'],
        });
      }
    } catch (error) {
      return this.createResult(
        false,
        'Prompt retrieval test failed',
        { error: error instanceof Error ? error.message : String(error) },
        ['Check prompts/get implementation', 'Verify prompt retrieval logic']
      );
    }
  }
}

export class PromptArgumentValidationTest extends DiagnosticTest {
  readonly name = 'Server Features: Prompts - Argument Validation';
  readonly description = 'Check for proper argument handling (business logic)';
  readonly category = 'server-features';
  readonly feature = 'prompts' as const;
  readonly severity = TEST_SEVERITY.INFO;
  readonly requiredCapability = 'prompts';

  async execute(client: McpClient, _config: ComplianceConfig): Promise<DiagnosticResult> {
    try {
      // SDK handles the protocol validation, we check business logic
      const result = await client.sdk.listPrompts();
      const prompts = result.prompts || [];

      if (prompts.length === 0) {
        return this.createResult(false, 'No prompts available for argument validation checking', {
          promptCount: 0,
        });
      }

      const suggestions: string[] = [];
      let argumentCount = 0;
      let wellDocumentedCount = 0;

      prompts.forEach((prompt: Prompt) => {
        // Check for argument usage (business logic, not spec requirements)
        if (prompt.arguments && Array.isArray(prompt.arguments)) {
          argumentCount += prompt.arguments.length;

          const wellDocumented = prompt.arguments.every(
            arg => arg.name && arg.description && arg.name.length > 0 && arg.description.length > 5
          );

          if (wellDocumented) {
            wellDocumentedCount++;
          } else {
            suggestions.push(`Prompt '${prompt.name}': Consider improving argument documentation`);
          }
        } else if (
          prompt.name.toLowerCase().includes('arg') ||
          prompt.description?.toLowerCase().includes('parameter')
        ) {
          suggestions.push(`Prompt '${prompt.name}': Might benefit from structured arguments`);
        }
      });

      const message =
        suggestions.length === 0
          ? `All ${prompts.length} prompts have proper argument handling`
          : `Found ${suggestions.length} argument handling improvement opportunities`;

      return this.createResult(
        true, // This is informational, not a failure
        message,
        {
          promptCount: prompts.length,
          argumentCount,
          wellDocumentedCount,
          suggestionCount: suggestions.length,
          suggestions: suggestions.slice(0, 5), // Limit output
        },
        suggestions.length > 0 ? suggestions.slice(0, 3) : undefined
      );
    } catch (error) {
      return this.createResult(
        false,
        'Prompt argument validation check failed',
        { error: error instanceof Error ? error.message : String(error) },
        ['Check prompts/list implementation']
      );
    }
  }
}
