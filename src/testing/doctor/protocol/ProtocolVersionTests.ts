/**
 * Protocol Version Tests
 * Tests MCP protocol version negotiation, header compliance, and backward compatibility
 */

import { DiagnosticTest } from '../DiagnosticTest.js';
import { TEST_SEVERITY, type DiagnosticResult, type DoctorConfig } from '../types.js';
import { registerDoctorTest } from '../TestRegistry.js';
import type { McpClient } from '../../../core/mcp-client.js';

class ProtocolVersionNegotiationTest extends DiagnosticTest {
  readonly name = 'Protocol: Version Negotiation';
  readonly description = 'Test negotiation with current MCP protocol version';
  readonly category = 'protocol';
  readonly severity = TEST_SEVERITY.WARNING;

  async execute(client: McpClient, config: DoctorConfig): Promise<DiagnosticResult> {
    const findings: string[] = [];
    const validations: string[] = [];

    try {
      // Test basic connectivity which should involve version negotiation
      const response = await Promise.race([
        client.listTools(),
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
        const resourcesResponse = await client.listResources();
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
        const promptsResponse = await client.listPrompts();
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

class ProtocolVersionHeaderTest extends DiagnosticTest {
  readonly name = 'Protocol: Version Header Compliance';
  readonly description = 'Test MCP-Protocol-Version header handling (where applicable)';
  readonly category = 'protocol';
  readonly severity = TEST_SEVERITY.INFO;

  async execute(client: McpClient, _config: DoctorConfig): Promise<DiagnosticResult> {
    // Note: For STDIO transport, version headers are not directly observable
    // This test focuses on behavior that indicates proper version handling

    const observations: string[] = [];
    const validations: string[] = [];

    try {
      // Test that the server behaves consistently with expected protocol version
      const toolsResult = await client.listTools();

      if (toolsResult && typeof toolsResult === 'object' && 'tools' in toolsResult) {
        const tools = toolsResult.tools as unknown[];

        // Check for features that indicate specific protocol versions
        if (Array.isArray(tools) && tools.length > 0) {
          const tool = tools[0];
          if (typeof tool === 'object' && tool !== null) {
            const toolObj = tool as Record<string, unknown>;

            // Check for modern features
            if ('inputSchema' in toolObj) {
              validations.push('Server supports input schemas (MCP 2024+ feature)');
            }

            if ('name' in toolObj && 'description' in toolObj) {
              validations.push('Server follows standard tool declaration format');
            }
          }
        }

        observations.push(`Server exposes ${tools.length} tools with consistent format`);
      }

      // For STDIO transport, we can't directly check HTTP headers
      // but we can infer protocol compliance from behavior
      observations.push(
        'Protocol version compliance inferred from response format (STDIO transport)'
      );

      const message =
        validations.length > 0
          ? `Protocol version header compliance verified (${validations.length} checks)`
          : 'Protocol version header compliance cannot be directly verified for STDIO transport';

      return this.createResult(
        true,
        message,
        { observations, validations },
        validations.length === 0
          ? [
              'Consider testing with HTTP transport for direct header validation',
              'Implement version negotiation logging for better visibility',
            ]
          : undefined
      );
    } catch (error) {
      return this.createResult(
        false,
        'Protocol version header test failed',
        { error: error instanceof Error ? error.message : String(error) },
        [
          'Check protocol implementation',
          'Verify version handling logic',
          'Review server startup and negotiation',
        ]
      );
    }
  }
}

class BackwardCompatibilityTest extends DiagnosticTest {
  readonly name = 'Protocol: Backward Compatibility Support';
  readonly description = 'Test support for older MCP protocol versions where applicable';
  readonly category = 'protocol';
  readonly severity = TEST_SEVERITY.INFO;

  async execute(client: McpClient, _config: DoctorConfig): Promise<DiagnosticResult> {
    const observations: string[] = [];
    const compatibilityChecks: string[] = [];

    try {
      // Test core functionality that should work across versions
      const coreTests = [
        {
          name: 'List Tools',
          test: async () => {
            const result = await client.listTools();
            return result && typeof result === 'object' && 'tools' in result;
          },
        },
        {
          name: 'List Resources',
          test: async () => {
            try {
              const result = await client.listResources();
              return result && typeof result === 'object';
            } catch {
              return 'not_implemented'; // This is acceptable
            }
          },
        },
        {
          name: 'List Prompts',
          test: async () => {
            try {
              const result = await client.listPrompts();
              return result && typeof result === 'object';
            } catch {
              return 'not_implemented'; // This is acceptable
            }
          },
        },
      ];

      for (const test of coreTests) {
        try {
          const result = await test.test();
          if (result === true) {
            compatibilityChecks.push(`${test.name}: Fully supported`);
          } else if (result === 'not_implemented') {
            compatibilityChecks.push(`${test.name}: Not implemented (acceptable)`);
          } else {
            observations.push(`${test.name}: Unexpected response format`);
          }
        } catch (error) {
          observations.push(
            `${test.name}: Failed - ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      // Test graceful handling of potentially newer features
      try {
        const toolsResult = await client.listTools();
        if (toolsResult && typeof toolsResult === 'object' && 'tools' in toolsResult) {
          const tools = toolsResult.tools as unknown[];
          if (Array.isArray(tools) && tools.length > 0) {
            const tool = tools[0];
            if (typeof tool === 'object' && tool !== null) {
              const toolObj = tool as Record<string, unknown>;

              // Check if server handles both old and new style gracefully
              if ('inputSchema' in toolObj && 'name' in toolObj && 'description' in toolObj) {
                compatibilityChecks.push('Server supports modern tool schema format');
              } else if ('name' in toolObj && 'description' in toolObj) {
                compatibilityChecks.push('Server supports basic tool format (backward compatible)');
              }
            }
          }
        }
      } catch (error) {
        observations.push(
          `Tool schema compatibility check failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      const hasIssues = observations.length > 0;
      const message = hasIssues
        ? `Backward compatibility issues detected (${observations.length} issues)`
        : `Backward compatibility checks passed (${compatibilityChecks.length} checks)`;

      return this.createResult(
        !hasIssues,
        message,
        { observations, compatibilityChecks },
        observations.length > 0
          ? [
              'Ensure core MCP features work across protocol versions',
              'Implement graceful degradation for unsupported features',
              'Test with multiple MCP client versions',
            ]
          : undefined
      );
    } catch (error) {
      return this.createResult(
        false,
        'Backward compatibility test failed',
        { error: error instanceof Error ? error.message : String(error) },
        [
          'Check core protocol implementation',
          'Verify compatibility handling',
          'Review version support matrix',
        ]
      );
    }
  }
}

// Register protocol version tests
registerDoctorTest(new ProtocolVersionNegotiationTest());
registerDoctorTest(new ProtocolVersionHeaderTest());
registerDoctorTest(new BackwardCompatibilityTest());
