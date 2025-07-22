/**
 * Protocol Version Tests
 * Tests MCP protocol version negotiation, header compliance, and backward compatibility
 */

import { DiagnosticTest } from '../DiagnosticTest.js';
import { TEST_SEVERITY, type DiagnosticResult, type ComplianceConfig } from '../types.js';
import type { McpClient } from '../../../shared/core/mcp-client.js';

class ProtocolVersionNegotiationTest extends DiagnosticTest {
  readonly name = 'Lifecycle: Protocol Version Negotiation';
  readonly description = 'Test negotiation with current MCP protocol version';
  readonly category = 'lifecycle';
  readonly feature = 'version' as const;
  readonly severity = TEST_SEVERITY.WARNING;

  async execute(client: McpClient, config: ComplianceConfig): Promise<DiagnosticResult> {
    const findings: string[] = [];
    const validations: string[] = [];

    try {
      // Test basic connectivity which should involve version negotiation
      const response = await Promise.race([
        client.sdk.listTools(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Connection timeout')), config.timeouts.testExecution)
        ),
      ]);

      if (response && typeof response === 'object') {
        validations.push('Server successfully negotiated protocol version during connection');

        // Check if response structure indicates modern MCP compliance
        if ('tools' in response && Array.isArray(response.tools)) {
          validations.push('Response format consistent with current MCP specification');

          // Check for modern tool schema features
          const tools = response.tools as unknown[];
          if (tools.length > 0) {
            const firstTool = tools[0];
            if (typeof firstTool === 'object' && firstTool !== null) {
              const toolObj = firstTool as Record<string, unknown>;

              if ('name' in toolObj && 'description' in toolObj) {
                validations.push('Tools include required fields (name, description)');
              } else {
                findings.push(
                  'Tools missing standard fields - may indicate older protocol version'
                );
              }

              if ('inputSchema' in toolObj) {
                validations.push('Tools include input schema - indicates modern MCP support');
              } else {
                findings.push('Tools missing input schema - may indicate limited MCP support');
              }
            }
          } else {
            findings.push('No tools available to validate schema compliance');
          }
        } else {
          findings.push('Response format may not be fully MCP compliant');
        }
      } else {
        findings.push('Server response format indicates potential version negotiation issues');
      }

      // Test other endpoints to validate protocol consistency
      try {
        const resourcesResponse = await client.sdk.listResources();
        if (
          resourcesResponse &&
          typeof resourcesResponse === 'object' &&
          'resources' in resourcesResponse
        ) {
          validations.push('Resources endpoint follows consistent protocol format');
        } else {
          findings.push('Resources endpoint response format inconsistent');
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (errorMsg.includes('not implemented') || errorMsg.includes('not supported')) {
          validations.push('Resources endpoint properly indicates when not implemented');
        } else {
          findings.push('Resources endpoint error handling may indicate version issues');
        }
      }

      try {
        const promptsResponse = await client.sdk.listPrompts();
        if (
          promptsResponse &&
          typeof promptsResponse === 'object' &&
          'prompts' in promptsResponse
        ) {
          validations.push('Prompts endpoint follows consistent protocol format');
        } else {
          findings.push('Prompts endpoint response format inconsistent');
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (errorMsg.includes('not implemented') || errorMsg.includes('not supported')) {
          validations.push('Prompts endpoint properly indicates when not implemented');
        } else {
          findings.push('Prompts endpoint error handling may indicate version issues');
        }
      }

      const hasIssues = findings.length > 0;
      const message = hasIssues
        ? `Protocol version issues detected (${findings.length} findings, ${validations.length} validations)`
        : `Protocol version negotiation successful (${validations.length} validations)`;

      return this.createResult(
        !hasIssues,
        message,
        { findings, validations },
        findings.length > 0
          ? [
              'Ensure server implements current MCP protocol version',
              'Verify all endpoints follow consistent format',
              'Update server to latest MCP specification',
            ]
          : undefined
      );
    } catch (error) {
      return this.createResult(
        false,
        'Protocol version negotiation test failed',
        { error: error instanceof Error ? error.message : String(error) },
        [
          'Check basic server connectivity',
          'Verify MCP protocol implementation',
          'Review version negotiation logic',
        ]
      );
    }
  }
}

// Export test classes for registration in index.ts
export { ProtocolVersionNegotiationTest };
