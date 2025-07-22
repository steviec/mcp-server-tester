/**
 * E2E tests for compliance functionality against the existing test server
 * This validates that compliance works correctly with real MCP server implementations
 */

import { describe, beforeAll, afterAll, test, expect } from 'vitest';
import { ComplianceRunner } from '../../../src/commands/compliance/index.js';
import {
  TestServerLauncher,
  createTestServerLauncher,
  getTestServerConfigPath,
} from '../server-launcher.js';

describe('Compliance Tests - Existing Test Server', () => {
  let serverLauncher: TestServerLauncher;
  const configPath = getTestServerConfigPath();

  beforeAll(async () => {
    // Start the existing test server (same one used by capabilities tests)
    serverLauncher = createTestServerLauncher();
    await serverLauncher.start();
  }, 15000);

  afterAll(async () => {
    // Stop the test server
    if (serverLauncher) {
      await serverLauncher.stop();
    }
  }, 10000);

  test('should successfully analyze existing test server', async () => {
    const complianceRunner = new ComplianceRunner({
      serverConfig: configPath,
      serverName: 'test-server',
      timeout: '30000',
    });

    const report = await complianceRunner.runDiagnostics();

    // Validate basic report structure
    expect(report).toBeDefined();
    expect(report.serverInfo).toBeDefined();
    expect(report.serverInfo.name).toBe('test-server');
    expect(report.metadata.testCount).toBeGreaterThan(0);
    expect(report.summary).toBeDefined();

    // Existing test server should have reasonable health score
    expect(report.summary.overallScore).toBeGreaterThan(50);

    // Should complete without major errors
    expect(report.summary.testResults.total).toBeGreaterThan(10);
    expect(report.metadata.duration).toBeGreaterThan(0);
  }, 45000);

  test('should detect tools capability in existing server', async () => {
    const complianceRunner = new ComplianceRunner({
      serverConfig: configPath,
      serverName: 'test-server',
      timeout: '30000',
      categories: 'server-features',
    });

    const report = await complianceRunner.runDiagnostics();

    // Should detect tools capability (existing server has echo and add tools)
    const toolsCapabilityTest = report.results.find(
      result => result.testName === 'Server Features: Tools - Capability Declaration'
    );
    expect(toolsCapabilityTest?.status).toBe('passed');

    // Tool execution should work
    // const toolExecutionTest = report.results.find(
    //   result => result.testName === 'Server Features: Tools - Execution (tools/call)'
    // );
    // expect(toolExecutionTest?.status).toBe('passed');
  }, 30000);

  test('should validate protocol compliance of existing server', async () => {
    const complianceRunner = new ComplianceRunner({
      serverConfig: configPath,
      serverName: 'test-server',
      timeout: '30000',
      categories: 'base-protocol',
    });

    const report = await complianceRunner.runDiagnostics();

    // Protocol tests should mostly pass for existing server
    const protocolTests = report.results.filter(result =>
      result.testName.startsWith('Base Protocol:')
    );

    expect(protocolTests.length).toBeGreaterThan(0);

    // Most protocol tests should pass
    const passedProtocolTests = protocolTests.filter(result => result.status === 'passed');
    const protocolPassRate = (passedProtocolTests.length / protocolTests.length) * 100;
    expect(protocolPassRate).toBeGreaterThan(60);
  }, 30000);

  test('should validate lifecycle behavior of existing server', async () => {
    const complianceRunner = new ComplianceRunner({
      serverConfig: configPath,
      serverName: 'test-server',
      timeout: '30000',
      categories: 'lifecycle',
    });

    const report = await complianceRunner.runDiagnostics();

    // Lifecycle tests should pass for existing server
    const lifecycleTests = report.results.filter(result =>
      result.testName.startsWith('Lifecycle:')
    );

    expect(lifecycleTests.length).toBeGreaterThan(0);

    // Most lifecycle tests should pass (at least initialization and capability discovery)
    const passedLifecycleTests = lifecycleTests.filter(result => result.status === 'passed');
    expect(passedLifecycleTests.length).toBeGreaterThan(1);
  }, 30000);

  test('should provide meaningful analysis for real server', async () => {
    const complianceRunner = new ComplianceRunner({
      serverConfig: configPath,
      serverName: 'test-server',
      timeout: '30000',
    });

    const report = await complianceRunner.runDiagnostics();

    // Should provide category breakdown
    expect(report.categories.length).toBeGreaterThan(0);

    // Each category should have meaningful results
    report.categories.forEach(category => {
      expect(category.name).toBeTruthy();
      expect(category.total).toBeGreaterThan(0);
      expect(category.passed + category.failed + category.warnings).toBeLessThanOrEqual(
        category.total
      );
    });

    // Should have metadata about the test run
    expect(report.metadata.timestamp).toBeTruthy();
    expect(report.metadata.duration).toBeGreaterThan(0);
    expect(report.metadata.testCount).toBeGreaterThan(0);

    // Server info should be populated
    expect(report.serverInfo.name).toBeTruthy();
    expect(report.serverInfo.transport).toBeTruthy();
  }, 30000);

  test('should handle edge cases gracefully with real server', async () => {
    // Test with very short timeout to ensure graceful handling
    const complianceRunner = new ComplianceRunner({
      serverConfig: configPath,
      serverName: 'test-server',
      timeout: '5000', // Short timeout
    });

    const report = await complianceRunner.runDiagnostics();

    // Should still produce a valid report even with constraints
    expect(report).toBeDefined();
    expect(report.serverInfo).toBeDefined();
    expect(report.summary).toBeDefined();

    // Either tests complete or timeout gracefully
    expect(report.summary.testResults.total).toBeGreaterThan(0);
  }, 15000);
});
