/**
 * Simplified Tools tests leveraging SDK error detection
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
import { ErrorCode, type Tool } from '@modelcontextprotocol/sdk/types.js';

export class ToolsCapabilityTest extends DiagnosticTest {
  readonly name = 'Server Features: Tools - Capability Declaration';
  readonly description = 'Verify server declares tools capability using SDK validation';
  readonly category = 'server-features';
  readonly feature = 'tools' as const;
  readonly severity = TEST_SEVERITY.CRITICAL;
  readonly requiredCapability = 'tools';
  readonly mcpSpecSection = 'Server Features - Tools';

  async execute(client: McpClient, config: ComplianceConfig): Promise<DiagnosticResult> {
    // Use SDK to validate tools capability - it handles all protocol validation
    const sdkTests: SdkErrorTest[] = [
      {
        name: 'Tools Capability Declaration',
        description: 'Validate tools capability through SDK',
        category: 'server-features',
        feature: 'tools',
        severity: TEST_SEVERITY.CRITICAL,
        operation: async (client: McpClient) => await client.sdk.listTools(),
        expectsError: false,
      },
    ];

    try {
      const sdkResults = await SdkErrorDetector.executeTests(client, config, sdkTests);
      const diagnosticResults = SdkErrorDetector.convertTodiagnosticResults(sdkResults);

      const failedTests = diagnosticResults.filter(r => r.status === 'failed');

      if (failedTests.length === 0) {
        const result = await client.sdk.listTools();
        const toolCount = result.tools?.length || 0;

        return this.createResult(
          true,
          `Tools capability validated via SDK (${toolCount} tools found)`,
          { toolCount, sdkValidated: true }
        );
      } else {
        return this.createEnhancedResult({
          success: false,
          message: 'SDK detected tools capability issues',
          details: { failedTests: failedTests.length, results: diagnosticResults },
          issueType: failedTests[0].issueType || ISSUE_TYPE.CRITICAL_FAILURE,
          expected: 'Valid tools capability declaration',
          actual: 'SDK validation failed',
          fixInstructions: failedTests.flatMap(t => t.recommendations || []),
          specLinks: ['https://spec.modelcontextprotocol.io/specification/server/tools/'],
        });
      }
    } catch (error) {
      return this.createResult(
        false,
        'Tools capability validation failed',
        { error: error instanceof Error ? error.message : String(error) },
        ['Check server tools capability implementation', 'Verify server connection']
      );
    }
  }
}

export class ToolSchemaValidationTest extends DiagnosticTest {
  readonly name = 'Server Features: Tools - Schema Validation';
  readonly description = 'Validate tool schema compliance and quality (business logic)';
  readonly category = 'server-features';
  readonly feature = 'tools' as const;
  readonly severity = TEST_SEVERITY.WARNING;
  readonly requiredCapability = 'tools';
  readonly mcpSpecSection = 'Server Features - Tools';

  async execute(client: McpClient, _config: ComplianceConfig): Promise<DiagnosticResult> {
    try {
      // SDK handles the listTools call validation, we focus on business logic
      const result = await client.sdk.listTools();
      const tools = result.tools || [];

      if (tools.length === 0) {
        return this.createResult(false, 'No tools available for schema validation', {
          toolCount: 0,
        });
      }

      const issues: string[] = [];
      const warnings: string[] = [];
      const validations: string[] = [];

      // Business logic validation (not protocol validation)
      tools.forEach((tool: Tool, index: number) => {
        // Check for required business fields
        if (!tool.name || tool.name.trim().length === 0) {
          issues.push(`Tool ${index}: Empty name`);
        } else if (tool.name.length > 100) {
          warnings.push(`Tool ${index} (${tool.name}): Name very long (${tool.name.length} chars)`);
        } else {
          validations.push(`Tool ${index} (${tool.name}): Valid name`);
        }

        if (!tool.description || tool.description.trim().length === 0) {
          warnings.push(`Tool ${index} (${tool.name}): Missing description`);
        } else if (tool.description.length < 10) {
          warnings.push(`Tool ${index} (${tool.name}): Very short description`);
        } else if (tool.description.length > 500) {
          warnings.push(
            `Tool ${index} (${tool.name}): Very long description (${tool.description.length} chars)`
          );
        } else {
          validations.push(`Tool ${index} (${tool.name}): Good description`);
        }

        // Check for input schema quality
        if (tool.inputSchema) {
          if (typeof tool.inputSchema === 'object' && tool.inputSchema.type === 'object') {
            validations.push(`Tool ${index} (${tool.name}): Has structured input schema`);
          } else {
            warnings.push(`Tool ${index} (${tool.name}): Input schema not well-structured`);
          }
        }
      });

      // Check for duplicate names (business logic)
      const names = tools.map(t => t.name);
      const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
      if (duplicates.length > 0) {
        issues.push(`Duplicate tool names: ${duplicates.join(', ')}`);
      }

      const hasIssues = issues.length > 0;
      const message = hasIssues
        ? `Tool schema validation found ${issues.length} issues, ${warnings.length} warnings`
        : warnings.length > 0
          ? `Tool schemas valid with ${warnings.length} improvement suggestions`
          : `All ${tools.length} tool schemas are well-formed`;

      return this.createResult(
        !hasIssues,
        message,
        {
          toolCount: tools.length,
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
        'Tool schema validation failed',
        { error: error instanceof Error ? error.message : String(error) },
        ['Check tools/list implementation', 'Verify tool schema format']
      );
    }
  }
}

export class ToolExecutionTest extends DiagnosticTest {
  readonly name = 'Server Features: Tools - Execution (tools/call)';
  readonly description = 'Test tool execution using SDK error detection';
  readonly category = 'server-features';
  readonly feature = 'tools' as const;
  readonly severity = TEST_SEVERITY.WARNING;
  readonly requiredCapability = 'tools';

  async execute(client: McpClient, config: ComplianceConfig): Promise<DiagnosticResult> {
    try {
      // Get available tools via SDK
      const toolsResult = await client.sdk.listTools();
      const tools = toolsResult.tools || [];

      if (tools.length === 0) {
        return this.createResult(false, 'No tools available for execution testing', {
          toolCount: 0,
        });
      }

      // Test execution with SDK error detection
      const testTool = tools[0]; // Test first tool
      const sdkTests: SdkErrorTest[] = [
        {
          name: 'Valid Tool Execution',
          description: 'Test tool execution with minimal arguments',
          category: 'server-features',
          feature: 'tools',
          severity: TEST_SEVERITY.WARNING,
          operation: async (client: McpClient) => {
            // Try to call with empty arguments (most tools should handle this gracefully)
            return await client.sdk.callTool({ name: testTool.name, arguments: {} });
          },
          expectsError: false, // We expect this to either work or give a proper error
        },
        {
          name: 'Invalid Tool Name Error Handling',
          description: 'Test error handling for non-existent tools',
          category: 'server-features',
          feature: 'tools',
          severity: TEST_SEVERITY.WARNING,
          operation: async (client: McpClient) => {
            return await client.sdk.callTool({
              name: 'definitely_non_existent_tool_xyz_12345',
              arguments: {},
            });
          },
          expectsError: true,
          expectedErrorCode: ErrorCode.MethodNotFound,
        },
      ];

      const sdkResults = await SdkErrorDetector.executeTests(client, config, sdkTests);
      const diagnosticResults = SdkErrorDetector.convertTodiagnosticResults(sdkResults);

      const failedTests = diagnosticResults.filter(r => r.status === 'failed');
      const passedTests = diagnosticResults.filter(r => r.status === 'passed');

      if (failedTests.length === 0) {
        return this.createResult(
          true,
          `Tool execution validated via SDK (tested ${testTool.name})`,
          {
            testedTool: testTool.name,
            passedTests: passedTests.length,
            sdkValidated: true,
          }
        );
      } else {
        return this.createEnhancedResult({
          success: false,
          message: `SDK detected ${failedTests.length} tool execution issues`,
          details: {
            testedTool: testTool.name,
            failedTests: failedTests.length,
            passedTests: passedTests.length,
            results: diagnosticResults,
          },
          issueType: failedTests[0].issueType || ISSUE_TYPE.SPEC_WARNING,
          expected: 'Proper tool execution or error handling',
          actual: `${failedTests.length} execution issues detected by SDK`,
          fixInstructions: failedTests.flatMap(t => t.recommendations || []),
          specLinks: ['https://spec.modelcontextprotocol.io/specification/server/tools/'],
        });
      }
    } catch (error) {
      return this.createResult(
        false,
        'Tool execution test failed',
        { error: error instanceof Error ? error.message : String(error) },
        ['Check tools/call implementation', 'Verify tool execution logic']
      );
    }
  }
}

export class ToolAnnotationsTest extends DiagnosticTest {
  readonly name = 'Server Features: Tools - Annotations Support';
  readonly description = 'Check for recommended tool annotations (business logic)';
  readonly category = 'server-features';
  readonly feature = 'tools' as const;
  readonly severity = TEST_SEVERITY.INFO;
  readonly requiredCapability = 'tools';

  async execute(client: McpClient, _config: ComplianceConfig): Promise<DiagnosticResult> {
    try {
      // SDK handles the protocol validation, we check business logic
      const result = await client.sdk.listTools();
      const tools = result.tools || [];

      if (tools.length === 0) {
        return this.createResult(false, 'No tools available for annotation checking', {
          toolCount: 0,
        });
      }

      const suggestions: string[] = [];
      let annotatedCount = 0;

      tools.forEach((tool: Tool) => {
        // Check for helpful annotations (business logic, not spec requirements)
        const hasInputSchema = tool.inputSchema && typeof tool.inputSchema === 'object';
        if (hasInputSchema) {
          annotatedCount++;
        } else {
          suggestions.push(`Tool '${tool.name}': Consider adding inputSchema for better usability`);
        }

        // Check for examples or additional documentation
        if (tool.description && tool.description.length < 50) {
          suggestions.push(
            `Tool '${tool.name}': Consider expanding description with usage examples`
          );
        }
      });

      const message =
        suggestions.length === 0
          ? `All ${tools.length} tools have good annotations`
          : `Found ${suggestions.length} annotation improvement opportunities`;

      return this.createResult(
        true, // This is informational, not a failure
        message,
        {
          toolCount: tools.length,
          annotatedCount,
          suggestionCount: suggestions.length,
          suggestions: suggestions.slice(0, 5), // Limit output
        },
        suggestions.length > 0 ? suggestions.slice(0, 3) : undefined
      );
    } catch (error) {
      return this.createResult(
        false,
        'Tool annotations check failed',
        { error: error instanceof Error ? error.message : String(error) },
        ['Check tools/list implementation']
      );
    }
  }
}
