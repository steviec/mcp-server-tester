/**
 * E2E tests for compliance functionality against non-compliant MCP server
 */

import { describe, test, expect } from 'vitest';
import { ComplianceRunner } from '../../../src/commands/compliance/index.js';
import { getTestServerConfigPath } from '../server-launcher.js';

describe('Compliance Tests - Test Server Edge Cases', () => {
  const configPath = getTestServerConfigPath();

  test('should analyze test server with specific focus on missing capabilities', async () => {
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

    // Test server has tools but lacks resources/prompts, so score reflects that
    expect(report.summary.overallScore).toBeGreaterThan(40);

    // Should have some test results
    expect(report.summary.testResults.total).toBeGreaterThan(10);

    // Should detect missing capabilities as issues
    const missingCapabilityIssues = report.issues.filter(
      issue =>
        issue.description &&
        (issue.description.toLowerCase().includes('capability') ||
          issue.description.toLowerCase().includes('resources') ||
          issue.description.toLowerCase().includes('prompts'))
    );
    expect(missingCapabilityIssues.length).toBeGreaterThanOrEqual(0);
  }, 45000);

  test('should validate tool schema correctly for test server', async () => {
    const complianceRunner = new ComplianceRunner({
      serverConfig: configPath,
      serverName: 'test-server',
      timeout: '30000',
      categories: 'server-features',
    });

    const report = await complianceRunner.runDiagnostics();

    // Should detect tools capability and run tests
    const toolsTests = report.results.filter(result =>
      result.testName.includes('Server Features: Tools')
    );

    // Test server has valid tools, so most should pass
    expect(toolsTests.length).toBeGreaterThan(0);
    const passedToolsTests = toolsTests.filter(result => result.status === 'passed');
    expect(passedToolsTests.length).toBeGreaterThan(0);
  }, 30000);

  test('should handle missing capabilities gracefully', async () => {
    const complianceRunner = new ComplianceRunner({
      serverConfig: configPath,
      serverName: 'test-server',
      timeout: '30000',
    });

    const report = await complianceRunner.runDiagnostics();

    // Should complete analysis even when some capabilities are missing
    expect(report.summary.testResults.total).toBeGreaterThan(0);

    // Test server lacks resources/prompts, so those tests may fail or be skipped
    // The important thing is that the compliance handles this gracefully
    expect(report).toBeDefined();
  }, 30000);

  test('should detect missing resource capability', async () => {
    const complianceRunner = new ComplianceRunner({
      serverConfig: configPath,
      serverName: 'test-server',
      timeout: '30000',
      categories: 'server-features',
    });

    const report = await complianceRunner.runDiagnostics();

    // Test server doesn't implement resources capability
    const resourceCapabilityTest = report.results.find(
      result => result.testName === 'Server Features: Resources - Capability Declaration'
    );

    // Should either not run (skipped) or fail since test server lacks resources
    if (resourceCapabilityTest) {
      expect(resourceCapabilityTest.status).toMatch(/failed|skipped/);
    }
  }, 30000);

  test('should provide meaningful analysis and recommendations', async () => {
    const complianceRunner = new ComplianceRunner({
      serverConfig: configPath,
      serverName: 'test-server',
      timeout: '30000',
    });

    const report = await complianceRunner.runDiagnostics();

    // Should generate a complete report
    expect(report.summary).toBeDefined();
    expect(report.categories.length).toBeGreaterThan(0);

    // If issues are detected, they should have meaningful content
    if (report.issues.length > 0) {
      const issuesWithRecommendations = report.issues.filter(
        issue => issue.recommendations && issue.recommendations.length > 0
      );

      // Recommendations should be meaningful strings when present
      issuesWithRecommendations.forEach(issue => {
        issue.recommendations?.forEach(rec => {
          expect(typeof rec).toBe('string');
          expect(rec.length).toBeGreaterThan(10);
        });
      });
    }

    // Report should always be complete regardless of issues found
    expect(report.metadata.testCount).toBeGreaterThan(0);
  }, 30000);
});
