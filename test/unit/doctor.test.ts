/**
 * Unit tests for Doctor functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TestRegistry, registerDoctorTest } from '../../src/testing/doctor/TestRegistry.js';
import { DiagnosticTest } from '../../src/testing/doctor/DiagnosticTest.js';
import {
  TestSeverity,
  type DoctorConfig,
  type DiagnosticResult,
} from '../../src/testing/doctor/types.js';
import { HealthReportGenerator } from '../../src/testing/doctor/HealthReport.js';
import type { McpClient } from '../../src/core/mcp-client.js';

class MockDiagnosticTest extends DiagnosticTest {
  readonly name = 'Mock: Test';
  readonly description = 'Mock test for unit testing';
  readonly category = 'mock';
  readonly severity = TestSeverity.INFO;

  async execute(_client: McpClient, _config: DoctorConfig): Promise<DiagnosticResult> {
    return this.createResult(true, 'Mock test passed');
  }
}

describe('Doctor Framework', () => {
  beforeEach(() => {
    TestRegistry.clear();
  });

  describe('TestRegistry', () => {
    it('should register and retrieve tests', () => {
      const mockTest = new MockDiagnosticTest();
      registerDoctorTest(mockTest);

      const allTests = TestRegistry.getAllTests();
      expect(allTests).toHaveLength(1);
      expect(allTests[0]).toBe(mockTest);
    });

    it('should filter tests by category', () => {
      const mockTest = new MockDiagnosticTest();
      registerDoctorTest(mockTest);

      const mockTests = TestRegistry.getTestsByCategory('mock');
      expect(mockTests).toHaveLength(1);
      expect(mockTests[0]).toBe(mockTest);

      const nonexistentTests = TestRegistry.getTestsByCategory('nonexistent');
      expect(nonexistentTests).toHaveLength(0);
    });

    it('should get available categories', () => {
      const mockTest = new MockDiagnosticTest();
      registerDoctorTest(mockTest);

      const categories = TestRegistry.getAvailableCategories();
      expect(categories).toContain('mock');
    });
  });

  describe('DiagnosticTest', () => {
    it('should create successful result', () => {
      const test = new MockDiagnosticTest();
      const result = test['createResult'](true, 'Test passed', { data: 'test' });

      expect(result.testName).toBe('Mock: Test');
      expect(result.status).toBe('passed');
      expect(result.message).toBe('Test passed');
      expect(result.details).toEqual({ data: 'test' });
      expect(result.severity).toBe(TestSeverity.INFO);
    });

    it('should create failed result', () => {
      const test = new MockDiagnosticTest();
      const result = test['createResult'](false, 'Test failed', undefined, ['Fix this']);

      expect(result.testName).toBe('Mock: Test');
      expect(result.status).toBe('failed');
      expect(result.message).toBe('Test failed');
      expect(result.recommendations).toEqual(['Fix this']);
    });

    it('should create skipped result', () => {
      const test = new MockDiagnosticTest();
      const result = test['createSkippedResult']('Skipped because...');

      expect(result.testName).toBe('Mock: Test');
      expect(result.status).toBe('skipped');
      expect(result.message).toBe('Test skipped: Skipped because...');
    });
  });

  describe('HealthReportGenerator', () => {
    it('should generate basic health report', () => {
      const results: DiagnosticResult[] = [
        {
          testName: 'Protocol: Test',
          status: 'passed',
          message: 'Test passed',
          severity: TestSeverity.INFO,
          duration: 100,
        },
        {
          testName: 'Security: Test',
          status: 'failed',
          message: 'Test failed',
          severity: TestSeverity.CRITICAL,
          duration: 50,
        },
      ];

      const serverInfo = {
        name: 'test-server',
        version: '1.0.0',
        transport: 'stdio',
      };

      const report = HealthReportGenerator.generateReport(results, serverInfo, 0, 1000);

      expect(report.serverInfo).toEqual(serverInfo);
      expect(report.metadata.duration).toBe(1000);
      expect(report.metadata.testCount).toBe(2);
      expect(report.summary.testResults.passed).toBe(1);
      expect(report.summary.testResults.failed).toBe(1);
      expect(report.summary.testResults.total).toBe(2);
      expect(report.categories).toHaveLength(2);
      expect(report.issues).toHaveLength(1);
      expect(report.issues[0].testName).toBe('Security: Test');
    });

    it('should calculate overall score correctly', () => {
      const passedResults: DiagnosticResult[] = [
        {
          testName: 'Protocol: Test',
          status: 'passed',
          message: 'Test passed',
          severity: TestSeverity.INFO,
          duration: 100,
        },
      ];

      const serverInfo = {
        name: 'test-server',
        transport: 'stdio',
      };

      const report = HealthReportGenerator.generateReport(passedResults, serverInfo, 0, 1000);
      expect(report.summary.overallScore).toBeGreaterThan(90);
    });
  });
});
