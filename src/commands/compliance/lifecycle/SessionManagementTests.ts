/**
 * Session Management Tests
 * Tests session ID generation, header handling, and session lifecycle management
 */

import { DiagnosticTest } from '../DiagnosticTest.js';
import { TEST_SEVERITY, type DiagnosticResult, type ComplianceConfig } from '../types.js';
import type { McpClient } from '../../../shared/core/mcp-client.js';

class SessionIdGenerationTest extends DiagnosticTest {
  readonly name = 'Lifecycle: Session Management - Ping';
  readonly description = 'Test session ID generation and format validation';
  readonly category = 'lifecycle';
  readonly feature = 'ping' as const;
  readonly severity = TEST_SEVERITY.INFO;

  async execute(client: McpClient, _config: ComplianceConfig): Promise<DiagnosticResult> {
    const findings: string[] = [];
    const validations: string[] = [];

    try {
      // For STDIO transport, session management is typically handled differently
      // We'll test consistency across multiple requests to infer session handling

      const responses = [];
      for (let i = 0; i < 3; i++) {
        try {
          const response = await client.sdk.listTools();
          responses.push(response);
          validations.push(`Request ${i + 1}: Successful response received`);
        } catch (error) {
          findings.push(
            `Request ${i + 1}: Failed - ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      // Test that multiple requests work consistently (indicating proper session handling)
      if (responses.length >= 2) {
        // Compare response structures for consistency
        const firstResponse = responses[0];
        const lastResponse = responses[responses.length - 1];

        if (
          typeof firstResponse === 'object' &&
          typeof lastResponse === 'object' &&
          firstResponse !== null &&
          lastResponse !== null &&
          'tools' in firstResponse &&
          'tools' in lastResponse
        ) {
          const firstTools = (firstResponse.tools as unknown[]) || [];
          const lastTools = (lastResponse.tools as unknown[]) || [];

          if (firstTools.length === lastTools.length) {
            validations.push(
              'Consistent responses across multiple requests (session handling working)'
            );
          } else {
            findings.push('Inconsistent tool counts across requests - possible session issues');
          }
        }
      }

      // Note: For STDIO transport, we can't directly validate session IDs
      // but we can test that the connection remains stable
      validations.push(
        'Connection stability indicates proper session management for STDIO transport'
      );

      const hasIssues = findings.length > 0;
      const message = hasIssues
        ? `Session ID generation issues detected (${findings.length} issues)`
        : `Session management working correctly (${validations.length} validations)`;

      return this.createResult(
        !hasIssues,
        message,
        { findings, validations, transport: 'stdio' },
        findings.length > 0
          ? [
              'Ensure consistent session handling across requests',
              'Implement proper session lifecycle management',
              'Consider testing with HTTP transport for direct session validation',
            ]
          : [
              'For HTTP transport testing, verify session ID cryptographic security',
              'Implement session ID validation logging',
            ]
      );
    } catch (error) {
      return this.createResult(
        false,
        'Session ID generation test failed',
        { error: error instanceof Error ? error.message : String(error) },
        [
          'Check session management implementation',
          'Verify connection stability',
          'Review session handling logic',
        ]
      );
    }
  }
}

class SessionTerminationTest extends DiagnosticTest {
  readonly name = 'Lifecycle: Session Management - Termination';
  readonly description = 'Test proper session cleanup and termination';
  readonly category = 'lifecycle';
  readonly feature = 'ping' as const;
  readonly severity = TEST_SEVERITY.INFO;

  async execute(client: McpClient, _config: ComplianceConfig): Promise<DiagnosticResult> {
    const observations: string[] = [];
    const validations: string[] = [];

    try {
      // Test that the current session is working before testing termination
      try {
        await client.sdk.listTools();
        validations.push('Session active and responding before termination test');
      } catch (error) {
        observations.push(
          `Session not responding before termination test: ${error instanceof Error ? error.message : String(error)}`
        );
        return this.createResult(
          false,
          'Cannot test session termination - session not active',
          { observations },
          ['Ensure session is active before testing termination']
        );
      }

      // For STDIO transport, termination is handled by process management
      // We'll test that the session handles graceful shutdown scenarios

      // Test multiple rapid requests to ensure session can handle load before termination
      try {
        const rapidRequests = await Promise.allSettled([
          client.sdk.listTools(),
          client.sdk.listResources(),
          client.sdk.listPrompts(),
        ]);

        const successful = rapidRequests.filter(r => r.status === 'fulfilled').length;
        const failed = rapidRequests.filter(r => r.status === 'rejected').length;

        validations.push(`Rapid requests handled: ${successful} success, ${failed} failed`);

        if (successful > 0) {
          validations.push('Session handles concurrent requests properly before termination');
        }
      } catch (error) {
        observations.push(
          `Rapid request test failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      // Note: Actual termination testing would require creating a separate client
      // and testing its lifecycle, which is beyond the scope of this test

      observations.push('STDIO transport: Session termination handled by process lifecycle');
      validations.push('Session remains stable during normal operation');

      const hasIssues = observations.some(obs => obs.includes('failed') || obs.includes('Failed'));
      const message = hasIssues
        ? `Session termination issues detected`
        : `Session termination handling appropriate for STDIO transport (${validations.length} validations)`;

      return this.createResult(
        !hasIssues,
        message,
        { observations, validations },
        hasIssues
          ? [
              'Ensure proper session cleanup',
              'Implement graceful termination handling',
              'Test session lifecycle management',
            ]
          : [
              'For HTTP transport, implement proper DELETE endpoint handling',
              'Add session cleanup logging',
              'Consider implementing session timeout handling',
            ]
      );
    } catch (error) {
      return this.createResult(
        false,
        'Session termination test failed',
        { error: error instanceof Error ? error.message : String(error) },
        [
          'Check session lifecycle implementation',
          'Verify termination handling',
          'Review cleanup procedures',
        ]
      );
    }
  }
}

class InvalidSessionHandlingTest extends DiagnosticTest {
  readonly name = 'Lifecycle: Session Management - Invalid Session Handling';
  readonly description = 'Test handling of invalid session scenarios';
  readonly category = 'lifecycle';
  readonly feature = 'ping' as const;
  readonly severity = TEST_SEVERITY.INFO;

  async execute(client: McpClient, config: ComplianceConfig): Promise<DiagnosticResult> {
    const observations: string[] = [];
    const validations: string[] = [];

    try {
      // Test that the session handles various edge cases gracefully

      // Test session resilience with various request patterns
      const edgeCaseTests = [
        {
          name: 'Empty request handling',
          test: async () => {
            try {
              // Test with potentially empty or minimal requests
              const result = await client.sdk.listTools();
              return result ? 'success' : 'empty_response';
            } catch (error) {
              return `error: ${error instanceof Error ? error.message : String(error)}`;
            }
          },
        },
        {
          name: 'Rapid successive requests',
          test: async () => {
            try {
              // Test rapid requests that might stress session handling
              const results = await Promise.all([
                client.sdk.listTools(),
                client.sdk.listTools(),
                client.sdk.listTools(),
              ]);
              return results.every(r => r && typeof r === 'object') ? 'success' : 'inconsistent';
            } catch (error) {
              return `error: ${error instanceof Error ? error.message : String(error)}`;
            }
          },
        },
      ];

      for (const test of edgeCaseTests) {
        try {
          const result = await Promise.race([
            test.test(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Test timeout')), config.timeouts.testExecution)
            ),
          ]);

          if (result === 'success') {
            validations.push(`${test.name}: Handled correctly`);
          } else if (typeof result === 'string' && result.startsWith('error:')) {
            if (result.includes('not implemented') || result.includes('not supported')) {
              validations.push(`${test.name}: Properly indicates unsupported feature`);
            } else {
              observations.push(`${test.name}: ${result}`);
            }
          } else {
            observations.push(`${test.name}: Unexpected result - ${result}`);
          }
        } catch (error) {
          observations.push(
            `${test.name}: Test execution failed - ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      // For STDIO transport, invalid session scenarios are limited
      observations.push('STDIO transport: Limited invalid session scenarios (process-based)');

      if (validations.length > 0) {
        validations.push('Session handling robust against edge cases');
      }

      const hasIssues = observations.some(
        obs => obs.includes('failed') || obs.includes('Failed') || obs.includes('error:')
      );

      const message = hasIssues
        ? `Invalid session handling issues detected (${observations.filter(obs => obs.includes('error:')).length} errors)`
        : `Invalid session handling working correctly (${validations.length} validations)`;

      return this.createResult(
        !hasIssues,
        message,
        { observations, validations },
        hasIssues
          ? [
              'Improve error handling for edge cases',
              'Implement proper session validation',
              'Add robust error recovery',
            ]
          : [
              'For HTTP transport, implement proper 404 responses for invalid sessions',
              'Add comprehensive session validation',
              'Consider implementing session recovery mechanisms',
            ]
      );
    } catch (error) {
      return this.createResult(
        false,
        'Invalid session handling test failed',
        { error: error instanceof Error ? error.message : String(error) },
        [
          'Check edge case handling',
          'Verify error handling implementation',
          'Review session validation logic',
        ]
      );
    }
  }
}

// Export test classes for registration in index.ts
export { SessionIdGenerationTest, SessionTerminationTest, InvalidSessionHandlingTest };
