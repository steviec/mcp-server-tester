/**
 * E2E tests for doctor functionality against compliant MCP server
 */

import { describe, test, expect } from 'vitest';
import { DoctorRunner } from '../../../src/testing/doctor/index.js';
import { getTestServerConfigPath } from '../server-launcher.js';

describe('Doctor Tests - Compliant Server (Using Existing Test Server)', () => {
  const configPath = getTestServerConfigPath();

  test('should report high health score for compliant server', async () => {
    const doctorRunner = new DoctorRunner({
      serverConfig: configPath,
      serverName: 'test-server',
      timeout: '30000',
    });

    const report = await doctorRunner.runDiagnostics();

    // Validate basic report structure
    expect(report).toBeDefined();
    expect(report.serverInfo).toBeDefined();
    expect(report.serverInfo.name).toBe('test-server');
    expect(report.metadata.testCount).toBeGreaterThan(0);
    expect(report.summary).toBeDefined();

    // Test server should have reasonable overall score
    expect(report.summary.overallScore).toBeGreaterThan(60);

    // Should have minimal or no critical issues
    const criticalIssues = report.issues.filter(issue => issue.severity === 'critical');
    expect(criticalIssues.length).toBeLessThanOrEqual(1);

    // Most tests should pass
    const passRate = (report.summary.testResults.passed / report.summary.testResults.total) * 100;
    expect(passRate).toBeGreaterThan(50);
  }, 45000);

  test('should detect tools capability correctly', async () => {
    const doctorRunner = new DoctorRunner({
      serverConfig: configPath,
      serverName: 'test-server',
      timeout: '30000',
    });

    const report = await doctorRunner.runDiagnostics();

    // Tools capability should be detected
    const toolsCapabilityTest = report.results.find(
      result => result.testName.startsWith('Tools:') && result.testName.includes('Capability')
    );
    expect(toolsCapabilityTest?.status).toBe('passed');
  }, 30000);

  test('should validate tool schemas correctly', async () => {
    const doctorRunner = new DoctorRunner({
      serverConfig: configPath,
      serverName: 'test-server',
      timeout: '30000',
      // Remove category filter to allow all tests
    });

    const report = await doctorRunner.runDiagnostics();

    // Tool schema validation should pass
    const schemaTest = report.results.find(
      result => result.testName === 'Tools: Schema Validation'
    );
    expect(schemaTest?.status).toBe('passed');
  }, 30000);

  test('should validate server implements tools correctly', async () => {
    const doctorRunner = new DoctorRunner({
      serverConfig: configPath,
      serverName: 'test-server',
      timeout: '30000',
    });

    const report = await doctorRunner.runDiagnostics();

    // Should have run various tests
    expect(report.summary.testResults.total).toBeGreaterThan(5);

    // Should have mostly successful results for a compliant server
    const passRate = (report.summary.testResults.passed / report.summary.testResults.total) * 100;
    expect(passRate).toBeGreaterThan(60);

    // Should have tools capability working
    const toolsTests = report.results.filter(result => result.testName.startsWith('Tools:'));
    expect(toolsTests.length).toBeGreaterThan(0);

    const passedToolsTests = toolsTests.filter(result => result.status === 'passed');
    expect(passedToolsTests.length).toBeGreaterThan(0);
  }, 30000);
});
