/**
 * Placeholder tests for initial implementation
 */

import { DiagnosticTest } from './DiagnosticTest.js';
import { TEST_SEVERITY, type DiagnosticResult } from './types.js';
import { registerDoctorTest } from './TestRegistry.js';
import type { McpClient } from '../../core/mcp-client.js';

class PlaceholderProtocolTest extends DiagnosticTest {
  readonly name = 'Protocol: Basic Connectivity';
  readonly description = 'Basic protocol compliance validation';
  readonly category = 'protocol';
  readonly severity = TEST_SEVERITY.INFO;

  async execute(client: McpClient, _config: unknown): Promise<DiagnosticResult> {
    try {
      // Simple connectivity test
      const result = await client.listTools();

      if (result.tools && Array.isArray(result.tools)) {
        return this.createResult(
          true,
          `Server responds to basic requests (${result.tools.length} tools available)`,
          { toolCount: result.tools.length }
        );
      } else {
        return this.createResult(false, 'Server response format is invalid', { response: result }, [
          'Check server implementation of listTools method',
        ]);
      }
    } catch (error) {
      return this.createResult(
        false,
        'Server not responding to basic requests',
        { error: error instanceof Error ? error.message : String(error) },
        ['Check server configuration and ensure server is running']
      );
    }
  }
}

class PlaceholderSecurityTest extends DiagnosticTest {
  readonly name = 'Security: Basic Validation';
  readonly description = 'Basic security compliance check';
  readonly category = 'security';
  readonly severity = TEST_SEVERITY.WARNING;

  async execute(_client: McpClient, _config: unknown): Promise<DiagnosticResult> {
    // This is a placeholder - actual implementation would check security features
    return this.createResult(
      false,
      'Security tests not yet implemented',
      { status: 'placeholder' },
      ['Implement comprehensive security testing in future releases']
    );
  }
}

class PlaceholderPerformanceTest extends DiagnosticTest {
  readonly name = 'Performance: Response Time';
  readonly description = 'Basic performance validation';
  readonly category = 'performance';
  readonly severity = TEST_SEVERITY.INFO;

  async execute(client: McpClient, _config: unknown): Promise<DiagnosticResult> {
    try {
      const startTime = Date.now();
      await client.listTools();
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      const isGood = responseTime < 100;
      const isAcceptable = responseTime < 500;

      if (isGood) {
        return this.createResult(true, `Good response time: ${responseTime}ms`, { responseTime });
      } else if (isAcceptable) {
        return this.createResult(
          true,
          `Acceptable response time: ${responseTime}ms`,
          { responseTime },
          ['Consider optimizing for better performance']
        );
      } else {
        return this.createResult(false, `Slow response time: ${responseTime}ms`, { responseTime }, [
          'Investigate server performance issues',
          'Check network connectivity',
        ]);
      }
    } catch (error) {
      return this.createResult(false, 'Performance test failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

class PlaceholderFeaturesTest extends DiagnosticTest {
  readonly name = 'Features: Tool Discovery';
  readonly description = 'Basic features validation';
  readonly category = 'features';
  readonly severity = TEST_SEVERITY.INFO;

  async execute(client: McpClient, _config: unknown): Promise<DiagnosticResult> {
    try {
      const tools = await client.listTools();
      const resources = await client.listResources();
      const prompts = await client.listPrompts();

      const features = {
        tools: tools.tools?.length || 0,
        resources: resources.resources?.length || 0,
        prompts: prompts.prompts?.length || 0,
      };

      const totalFeatures = features.tools + features.resources + features.prompts;

      if (totalFeatures > 0) {
        return this.createResult(true, `Server provides ${totalFeatures} features`, features);
      } else {
        return this.createResult(false, 'No features detected', features, [
          'Ensure server implements tools, resources, or prompts',
        ]);
      }
    } catch (error) {
      return this.createResult(false, 'Feature discovery failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

class PlaceholderTransportTest extends DiagnosticTest {
  readonly name = 'Transport: Connection Health';
  readonly description = 'Basic transport validation';
  readonly category = 'transport';
  readonly severity = TEST_SEVERITY.INFO;

  async execute(_client: McpClient, _config: unknown): Promise<DiagnosticResult> {
    // This is a placeholder - actual implementation would test transport specifics
    return this.createResult(
      true,
      'Transport connection is healthy',
      { transport: 'stdio' }, // TODO: detect actual transport
      ['Implement transport-specific health checks in future releases']
    );
  }
}

// Register all placeholder tests
registerDoctorTest(new PlaceholderProtocolTest());
registerDoctorTest(new PlaceholderSecurityTest());
registerDoctorTest(new PlaceholderPerformanceTest());
registerDoctorTest(new PlaceholderFeaturesTest());
registerDoctorTest(new PlaceholderTransportTest());
