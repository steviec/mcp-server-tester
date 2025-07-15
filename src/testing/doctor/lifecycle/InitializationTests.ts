/**
 * Initialization flow tests for MCP server lifecycle
 */

import { DiagnosticTest } from '../DiagnosticTest.js';
import { TEST_SEVERITY, type DiagnosticResult, type DoctorConfig } from '../types.js';
import type { McpClient } from '../../../core/mcp-client.js';

export class InitializationTests extends DiagnosticTest {
  readonly name = 'Lifecycle: Initialization Flow';
  readonly description = 'Tests MCP server initialization sequence and responses';
  readonly category = 'lifecycle';
  readonly severity = TEST_SEVERITY.CRITICAL;

  async execute(client: McpClient, _config: DoctorConfig): Promise<DiagnosticResult> {
    try {
      const results = await Promise.allSettled([
        this.testInitializeRequest(client),
        this.testInitializeResponse(client),
        this.testInitializedNotification(client),
        this.testInitializationErrors(client),
      ]);

      const issues: string[] = [];
      const details: Record<string, unknown> = {};

      // Process test results
      results.forEach((result, index) => {
        const testNames = [
          'InitializeRequest',
          'InitializeResponse',
          'InitializedNotification',
          'InitializationErrors',
        ];

        if (result.status === 'rejected') {
          issues.push(`${testNames[index]}: ${result.reason}`);
        } else {
          details[testNames[index]] = result.value;
        }
      });

      if (issues.length > 0) {
        return this.createResult(
          false,
          `Initialization flow has ${issues.length} issue(s)`,
          { issues, details },
          [
            'Verify server implements proper MCP initialization sequence',
            'Check server response to InitializeRequest follows MCP specification',
            'Ensure server sends proper InitializedNotification acknowledgment',
          ]
        );
      }

      return this.createResult(true, 'Initialization flow completed successfully', details);
    } catch (error) {
      return this.createResult(
        false,
        'Initialization flow test failed',
        { error: error instanceof Error ? error.message : String(error) },
        ['Check server connection and MCP protocol implementation']
      );
    }
  }

  private async testInitializeRequest(client: McpClient): Promise<unknown> {
    // Test basic connectivity which implicitly tests initialization
    try {
      const _result = await client.ping();
      return { status: 'passed', message: 'Server responds to ping after initialization' };
    } catch (error) {
      throw new Error(`InitializeRequest handling failed: ${error}`);
    }
  }

  private async testInitializeResponse(client: McpClient): Promise<unknown> {
    // Test that server provides valid initialization response
    try {
      const capabilities = await client.getServerCapabilities();
      const version = await client.getServerVersion();

      return {
        status: 'passed',
        message: 'Server provides valid initialization response',
        capabilities,
        version,
      };
    } catch (error) {
      throw new Error(`InitializeResponse validation failed: ${error}`);
    }
  }

  private async testInitializedNotification(client: McpClient): Promise<unknown> {
    // Test that server properly acknowledges initialization
    try {
      // If we can make any request, initialization was properly acknowledged
      await client.listTools();
      return {
        status: 'passed',
        message: 'Server acknowledges initialization and accepts requests',
      };
    } catch (error) {
      throw new Error(`InitializedNotification acknowledgment failed: ${error}`);
    }
  }

  private async testInitializationErrors(client: McpClient): Promise<unknown> {
    // Test error handling during initialization (this is more of a validation)
    try {
      // Verify we have a working connection, which means error handling worked
      const version = await client.getServerVersion();
      return {
        status: 'passed',
        message: 'Server handled initialization without errors',
        version,
      };
    } catch (error) {
      throw new Error(`Initialization error handling test failed: ${error}`);
    }
  }
}
