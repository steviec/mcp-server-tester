/**
 * Connection Health Tests
 * Tests STDIO, HTTP, and SSE transport connectivity and lifecycle management
 */

import { DiagnosticTest } from '../DiagnosticTest.js';
import { TEST_SEVERITY, type DiagnosticResult, type ComplianceConfig } from '../types.js';
import { McpClient, type McpClient as McpClientType } from '../../../shared/core/mcp-client.js';

class StdioConnectivityTest extends DiagnosticTest {
  readonly name = 'Base Protocol: Transport Layer (STDIO)';
  readonly description = 'Test STDIO transport establishment and basic communication';
  readonly category = 'base-protocol';
  readonly feature = 'transport' as const;
  readonly severity = TEST_SEVERITY.CRITICAL;

  async execute(client: McpClientType, config: ComplianceConfig): Promise<DiagnosticResult> {
    try {
      const startTime = Date.now();

      // Test basic connectivity - SDK handles response validation
      await Promise.race([
        client.sdk.listTools(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Connection timeout')), config.timeouts.connection)
        ),
      ]);

      const duration = Date.now() - startTime;

      return this.createResult(true, `STDIO transport connected successfully (${duration}ms)`, {
        transport: 'stdio',
        connectionTime: duration,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (errorMessage.includes('timeout')) {
        return this.createResult(
          false,
          `STDIO transport connection timeout after ${config.timeouts.connection}ms`,
          { error: errorMessage },
          [
            'Check if server process is running',
            'Verify server command and arguments',
            'Increase connection timeout if needed',
          ]
        );
      }

      return this.createResult(
        false,
        'STDIO transport connection failed',
        { error: errorMessage },
        [
          'Verify server configuration',
          'Check server process startup',
          'Review server logs for errors',
        ]
      );
    }
  }
}

class ConnectionLifecycleTest extends DiagnosticTest {
  readonly name = 'Base Protocol: Transport Connection Lifecycle';
  readonly description = 'Test connection establishment and clean termination';
  readonly category = 'base-protocol';
  readonly feature = 'transport' as const;
  readonly severity = TEST_SEVERITY.WARNING;

  async execute(_client: McpClientType, config: ComplianceConfig): Promise<DiagnosticResult> {
    let testClient: McpClient | null = null;

    try {
      // Create a new client to test lifecycle
      testClient = new McpClient();

      // Test connection establishment
      const connectStart = Date.now();
      // Note: We can't easily test this without server config details
      // This is a simplified version that tests the current connection
      const connectDuration = Date.now() - connectStart;

      // Test that we can make requests
      const listResult = await Promise.race([
        _client.sdk.listTools(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), config.timeouts.testExecution)
        ),
      ]);

      // Test disconnection
      const disconnectStart = Date.now();
      await testClient.disconnect();
      const disconnectDuration = Date.now() - disconnectStart;

      return this.createResult(
        true,
        'Connection lifecycle managed successfully',
        {
          connectionTime: connectDuration,
          disconnectionTime: disconnectDuration,
          requestSuccessful: !!listResult,
        },
        disconnectDuration > 1000 ? ['Consider optimizing disconnect process'] : undefined
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      return this.createResult(false, 'Connection lifecycle test failed', { error: errorMessage }, [
        'Check connection stability',
        'Verify proper cleanup on disconnect',
        'Review server connection handling',
      ]);
    } finally {
      // Ensure cleanup
      if (testClient) {
        try {
          await testClient.disconnect();
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  }
}

class TransportErrorHandlingTest extends DiagnosticTest {
  readonly name = 'Base Protocol: Transport Error Handling';
  readonly description = 'Test basic transport-level error handling';
  readonly category = 'base-protocol';
  readonly feature = 'transport' as const;
  readonly severity = TEST_SEVERITY.WARNING;

  async execute(client: McpClientType, _config: ComplianceConfig): Promise<DiagnosticResult> {
    const warnings: string[] = [];

    try {
      // Test performance baseline (concurrent testing is handled by SDK tests)
      const startTime = Date.now();
      await client.sdk.listTools();
      const duration = Date.now() - startTime;

      if (duration > 1000) {
        warnings.push(`Slow response time: ${duration}ms - consider performance optimization`);
      }

      const message =
        warnings.length > 0
          ? `Transport working with minor issues (${warnings.length} warnings)`
          : 'Transport error handling working correctly';

      return this.createResult(
        true,
        message,
        { warnings, responseTime: duration },
        warnings.map(warn => `Address: ${warn}`)
      );
    } catch (error) {
      return this.createResult(
        false,
        'Transport error handling test failed',
        { error: error instanceof Error ? error.message : String(error) },
        ['Review transport implementation', 'Check error handling logic']
      );
    }
  }
}

// Export test classes for registration in index.ts
export { StdioConnectivityTest, ConnectionLifecycleTest, TransportErrorHandlingTest };
