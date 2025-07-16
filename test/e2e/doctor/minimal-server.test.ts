/**
 * E2E tests for doctor functionality against minimal MCP server
 */

import { describe, test, expect } from 'vitest';
import { DoctorRunner } from '../../../src/testing/doctor/index.js';
import { getTestServerConfigPath } from '../server-launcher.js';

describe('Doctor Tests - Test Server Minimal Analysis', () => {
  const configPath = getTestServerConfigPath();

  test('should analyze test server with focus on basic implementation', async () => {
    const doctorRunner = new DoctorRunner({
      serverConfig: configPath,
      serverName: 'test-server',
      timeout: '30000',
      categories: 'protocol',
    });

    const report = await doctorRunner.runDiagnostics();

    // Validate basic report structure
    expect(report).toBeDefined();
    expect(report.serverInfo).toBeDefined();
    expect(report.serverInfo.name).toBe('test-server');
    expect(report.metadata.testCount).toBeGreaterThan(0);

    // Test server should have reasonable score for protocol compliance
    expect(report.summary.overallScore).toBeGreaterThan(40);
  }, 45000);

  test('should detect lifecycle behavior correctly', async () => {
    const doctorRunner = new DoctorRunner({
      serverConfig: configPath,
      serverName: 'test-server',
      timeout: '30000',
      categories: 'lifecycle',
    });

    const report = await doctorRunner.runDiagnostics();

    // Test server should handle basic lifecycle correctly
    const lifecycleTests = report.results.filter(result =>
      result.testName.startsWith('Lifecycle:')
    );
    expect(lifecycleTests.length).toBeGreaterThan(0);

    // Should have some lifecycle tests pass
    const passedLifecycleTests = lifecycleTests.filter(result => result.status === 'passed');
    expect(passedLifecycleTests.length).toBeGreaterThan(0);
  }, 30000);

  test('should validate specific test server features', async () => {
    const doctorRunner = new DoctorRunner({
      serverConfig: configPath,
      serverName: 'test-server',
      timeout: '30000',
      categories: 'tools',
    });

    const report = await doctorRunner.runDiagnostics();

    // Test server implements tools capability
    const toolsTests = report.results.filter(result => result.testName.startsWith('Tools:'));

    expect(toolsTests.length).toBeGreaterThan(0);

    // Tools capability should work correctly
    const toolsCapabilityTest = report.results.find(
      result => result.testName === 'Tools: Capability Declaration'
    );
    expect(toolsCapabilityTest?.status).toBe('passed');
  }, 30000);

  test('should demonstrate comprehensive testing approach', async () => {
    const doctorRunner = new DoctorRunner({
      serverConfig: configPath,
      serverName: 'test-server',
      timeout: '30000',
    });

    const report = await doctorRunner.runDiagnostics();

    // Should generate comprehensive analysis across all categories
    expect(report).toBeDefined();
    expect(report.summary.testResults.total).toBeGreaterThan(10);

    // Should run tests across multiple categories
    expect(report.categories.length).toBeGreaterThan(1);

    // Should provide complete metadata
    expect(report.metadata.timestamp).toBeTruthy();
    expect(report.metadata.duration).toBeGreaterThan(0);
  }, 30000);
});
