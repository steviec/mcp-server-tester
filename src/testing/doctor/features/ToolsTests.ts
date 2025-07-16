/**
 * Comprehensive diagnostic tests for MCP server Tools functionality
 */

import { DiagnosticTest } from '../DiagnosticTest.js';
import { TEST_SEVERITY, type DiagnosticResult, type DoctorConfig } from '../types.js';
import type { McpClient } from '../../../core/mcp-client.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export class ToolsCapabilityTest extends DiagnosticTest {
  readonly name = 'Tools: Capability Declaration';
  readonly description = 'Verify server declares tools capability correctly';
  readonly category = 'features';
  readonly severity = TEST_SEVERITY.CRITICAL;
  readonly requiredCapability = 'tools';
  readonly mcpSpecSection = 'MCP Spec §4.1';

  async execute(client: McpClient, _config: DoctorConfig): Promise<DiagnosticResult> {
    try {
      const result = await client.sdk.listTools();

      if (result && typeof result === 'object' && 'tools' in result) {
        const hasListChanged = 'listChanged' in result ? result.listChanged : undefined;
        return this.createResult(
          true,
          `Tools capability declared correctly${hasListChanged !== undefined ? ` (listChanged: ${hasListChanged})` : ''}`,
          { hasListChanged, toolsCount: result.tools?.length || 0 }
        );
      } else {
        return this.createResult(
          false,
          'Server does not properly declare tools capability',
          { response: result },
          ['Ensure server implements tools/list method according to MCP specification']
        );
      }
    } catch (error) {
      return this.createResult(
        false,
        'Failed to verify tools capability declaration',
        { error: error instanceof Error ? error.message : String(error) },
        ['Check server tools capability implementation', 'Verify server is properly connected']
      );
    }
  }
}

export class ToolListingTest extends DiagnosticTest {
  readonly name = 'Tools: Tool Listing';
  readonly description = 'Verify tool listing functionality';
  readonly category = 'features';
  readonly severity = TEST_SEVERITY.WARNING;
  readonly requiredCapability = 'tools';
  readonly mcpSpecSection = 'MCP Spec §4.1.1';

  async execute(client: McpClient, _config: DoctorConfig): Promise<DiagnosticResult> {
    try {
      const result = await client.sdk.listTools();
      const tools = result.tools || [];

      if (tools.length === 0) {
        return this.createResult(false, 'No tools found', { toolCount: 0 }, [
          'Ensure server implements at least one tool',
          'Check server tool registration',
        ]);
      }

      const toolNames = tools.map(t => t.name);
      const duplicateNames = toolNames.filter((name, index) => toolNames.indexOf(name) !== index);

      if (duplicateNames.length > 0) {
        return this.createResult(
          false,
          `Duplicate tool names found: ${duplicateNames.join(', ')}`,
          { duplicates: duplicateNames, toolCount: tools.length },
          ['Ensure all tool names are unique']
        );
      }

      return this.createResult(true, `${tools.length} tools found`, {
        toolCount: tools.length,
        toolNames: toolNames.slice(0, 5), // Show first 5 tools
      });
    } catch (error) {
      return this.createResult(
        false,
        'Failed to list tools',
        { error: error instanceof Error ? error.message : String(error) },
        ['Check server tools/list implementation']
      );
    }
  }
}

export class ToolSchemaValidationTest extends DiagnosticTest {
  readonly name = 'Tools: Schema Validation';
  readonly description = 'Verify tool schemas are valid';
  readonly category = 'features';
  readonly severity = TEST_SEVERITY.WARNING;
  readonly requiredCapability = 'tools';
  readonly mcpSpecSection = 'MCP Spec §4.1.2';

  async execute(client: McpClient, _config: DoctorConfig): Promise<DiagnosticResult> {
    try {
      const result = await client.sdk.listTools();
      const tools = result.tools || [];

      if (tools.length === 0) {
        return this.createSkippedResult('No tools available to validate');
      }

      const issues: string[] = [];
      const validTools: string[] = [];

      for (const tool of tools) {
        const toolIssues = this.validateToolSchema(tool);
        if (toolIssues.length > 0) {
          issues.push(`${tool.name}: ${toolIssues.join(', ')}`);
        } else {
          validTools.push(tool.name);
        }
      }

      if (issues.length > 0) {
        return this.createResult(
          false,
          `Schema validation failed for ${issues.length} tools`,
          { issues, validTools, totalTools: tools.length },
          ['Fix tool schema validation errors', 'Ensure all required fields are present']
        );
      }

      return this.createResult(true, `All ${tools.length} tool schemas are valid`, {
        validTools,
        totalTools: tools.length,
      });
    } catch (error) {
      return this.createResult(false, 'Failed to validate tool schemas', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private validateToolSchema(tool: Tool): string[] {
    const issues: string[] = [];

    if (!tool.name || typeof tool.name !== 'string') {
      issues.push('missing or invalid name');
    }

    if (!tool.description || typeof tool.description !== 'string') {
      issues.push('missing or invalid description');
    }

    if (!tool.inputSchema || typeof tool.inputSchema !== 'object') {
      issues.push('missing or invalid inputSchema');
    } else {
      // Basic JSON Schema validation
      if (!tool.inputSchema.type) {
        issues.push('inputSchema missing type field');
      }
    }

    return issues;
  }
}

export class ToolExecutionTest extends DiagnosticTest {
  readonly name = 'Tools: Tool Execution';
  readonly description = 'Test tool execution capability';
  readonly category = 'features';
  readonly severity = TEST_SEVERITY.INFO;

  async execute(client: McpClient, config: DoctorConfig): Promise<DiagnosticResult> {
    try {
      const result = await client.sdk.listTools();
      const tools = result.tools || [];

      if (tools.length === 0) {
        return this.createSkippedResult('No tools available to test execution');
      }

      // Find a simple tool to test (prefer echo-like tools)
      const testTool = this.findSuitableTestTool(tools);

      if (!testTool) {
        return this.createResult(
          false,
          'No suitable tool found for execution testing',
          { availableTools: tools.map(t => t.name) },
          [
            'Implement a simple test tool for validation',
            'Ensure tools have minimal parameter requirements',
          ]
        );
      }

      const testArgs = this.generateTestArguments(testTool);
      const timeout = config.timeouts?.testExecution || 30000;

      try {
        const startTime = Date.now();
        const callResult = await Promise.race([
          client.sdk.callTool({ name: testTool.name, arguments: testArgs }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Tool execution timeout')), timeout)
          ),
        ]);
        const duration = Date.now() - startTime;

        return this.createResult(true, `Tool execution successful (${testTool.name})`, {
          toolName: testTool.name,
          duration,
          testArgs,
          result: callResult,
        });
      } catch (error) {
        return this.createResult(
          false,
          `Tool execution failed (${testTool.name})`,
          {
            toolName: testTool.name,
            testArgs,
            error: error instanceof Error ? error.message : String(error),
          },
          ['Check tool implementation', 'Verify tool parameter handling']
        );
      }
    } catch (error) {
      return this.createResult(false, 'Failed to test tool execution', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private findSuitableTestTool(tools: Tool[]): Tool | null {
    // Prefer tools with names suggesting they're safe to test
    const safeToolNames = ['echo', 'ping', 'test', 'hello', 'version', 'status'];

    for (const safeName of safeToolNames) {
      const tool = tools.find(t => t.name.toLowerCase().includes(safeName));
      if (tool) {
        return tool;
      }
    }

    // Fall back to first tool with simple schema
    return tools.find(tool => this.hasSimpleSchema(tool)) || tools[0];
  }

  private hasSimpleSchema(tool: Tool): boolean {
    const schema = tool.inputSchema;
    if (!schema || typeof schema !== 'object') {
      return false;
    }

    // Check if it's an object with no required properties or simple properties
    if (schema.type === 'object') {
      const required = Array.isArray(schema.required) ? schema.required : [];
      return required.length === 0;
    }

    return schema.type === 'null' || !schema.type;
  }

  private generateTestArguments(tool: Tool): Record<string, unknown> {
    const schema = tool.inputSchema;
    if (!schema || typeof schema !== 'object') {
      return {};
    }

    if (schema.type === 'object' && schema.properties) {
      const args: Record<string, unknown> = {};
      const properties = schema.properties as Record<
        string,
        { type?: string; description?: string; enum?: unknown[] }
      >;

      // Only fill required properties with safe test values
      const required = Array.isArray(schema.required) ? schema.required : [];

      for (const prop of required) {
        if (properties[prop]) {
          const propSchema = properties[prop];
          args[prop] = this.generateTestValue(propSchema);
        }
      }

      return args;
    }

    return {};
  }

  private generateTestValue(schema: {
    type?: string;
    description?: string;
    enum?: unknown[];
  }): unknown {
    switch (schema.type) {
      case 'string':
        return 'test';
      case 'number':
      case 'integer':
        return 1;
      case 'boolean':
        return true;
      case 'array':
        return [];
      case 'object':
        return {};
      default:
        return null;
    }
  }
}

export class ToolErrorHandlingTest extends DiagnosticTest {
  readonly name = 'Tools: Error Handling';
  readonly description = 'Test tool error handling for invalid parameters';
  readonly category = 'features';
  readonly severity = TEST_SEVERITY.INFO;

  async execute(client: McpClient, _config: DoctorConfig): Promise<DiagnosticResult> {
    try {
      const result = await client.sdk.listTools();
      const tools = result.tools || [];

      if (tools.length === 0) {
        return this.createSkippedResult('No tools available to test error handling');
      }

      const testTool = tools[0]; // Use first available tool

      try {
        // Call tool with invalid parameters
        await client.sdk.callTool({
          name: testTool.name,
          arguments: { invalid_param: 'invalid_value' },
        });

        return this.createResult(
          false,
          `Tool did not reject invalid parameters (${testTool.name})`,
          { toolName: testTool.name },
          ['Implement proper parameter validation', 'Return appropriate error for invalid inputs']
        );
      } catch (error) {
        // This is expected behavior - the tool should reject invalid parameters
        return this.createResult(
          true,
          `Tool properly rejects invalid parameters (${testTool.name})`,
          {
            toolName: testTool.name,
            error: error instanceof Error ? error.message : String(error),
          }
        );
      }
    } catch (error) {
      return this.createResult(false, 'Failed to test tool error handling', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export class ToolAnnotationsTest extends DiagnosticTest {
  readonly name = 'Tools: Annotations Support';
  readonly description = 'Check for recommended tool annotations';
  readonly category = 'features';
  readonly severity = TEST_SEVERITY.INFO;

  async execute(client: McpClient, _config: DoctorConfig): Promise<DiagnosticResult> {
    try {
      const result = await client.sdk.listTools();
      const tools = result.tools || [];

      if (tools.length === 0) {
        return this.createSkippedResult('No tools available to check annotations');
      }

      const annotationIssues: string[] = [];
      const wellAnnotatedTools: string[] = [];

      for (const tool of tools) {
        const issues = this.checkToolAnnotations(tool);
        if (issues.length > 0) {
          annotationIssues.push(`${tool.name}: ${issues.join(', ')}`);
        } else {
          wellAnnotatedTools.push(tool.name);
        }
      }

      if (annotationIssues.length > 0) {
        return this.createResult(
          false,
          `Missing recommended annotations on ${annotationIssues.length} tools`,
          {
            annotationIssues,
            wellAnnotatedTools,
            totalTools: tools.length,
          },
          [
            'Consider adding readOnlyHint annotation for tools that only read data',
            'Add openWorldHint for tools that can accept additional parameters',
            'Include title annotation for better tool identification',
          ]
        );
      }

      return this.createResult(true, `All ${tools.length} tools have good annotation coverage`, {
        wellAnnotatedTools,
        totalTools: tools.length,
      });
    } catch (error) {
      return this.createResult(false, 'Failed to check tool annotations', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private checkToolAnnotations(tool: Tool): string[] {
    const issues: string[] = [];
    const annotations = tool.annotations || {};

    // Check for readOnlyHint (recommended for tools that don't modify state)
    if (annotations.readOnlyHint === undefined) {
      // Heuristic: if tool name suggests read-only operation
      const readOnlyPatterns = ['get', 'read', 'list', 'view', 'show', 'check', 'search', 'find'];
      const toolNameLower = tool.name.toLowerCase();

      if (readOnlyPatterns.some(pattern => toolNameLower.includes(pattern))) {
        issues.push('missing readOnlyHint (likely read-only tool)');
      }
    }

    // Check for title annotation
    if (!annotations.title) {
      issues.push('missing title annotation');
    }

    return issues;
  }
}
