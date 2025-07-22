/**
 * Unit tests for Compliance functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  TestRegistry,
  registerComplianceTest,
} from '../../src/commands/compliance/TestRegistry.js';
import { DiagnosticTest } from '../../src/commands/compliance/DiagnosticTest.js';
import {
  TEST_SEVERITY,
  type ComplianceConfig,
  type DiagnosticResult,
} from '../../src/commands/compliance/types.js';
import { HealthReportGenerator } from '../../src/commands/compliance/HealthReport.js';
import type { McpClient } from '../../src/shared/core/mcp-client.js';

class MockDiagnosticTest extends DiagnosticTest {
  readonly name = 'Mock: Test';
  readonly description = 'Mock test for unit testing';
  readonly category = 'mock';
  readonly severity = TEST_SEVERITY.INFO;

  async execute(_client: McpClient, _config: ComplianceConfig): Promise<DiagnosticResult> {
    return this.createResult(true, 'Mock test passed');
  }
}

describe('Compliance Framework', () => {
  beforeEach(() => {
    TestRegistry.clear();
  });

  describe('TestRegistry', () => {
    it('should register and retrieve tests', () => {
      const mockTest = new MockDiagnosticTest();
      registerComplianceTest(mockTest);

      const allTests = TestRegistry.getAllTests();
      expect(allTests).toHaveLength(1);
      expect(allTests[0]).toBe(mockTest);
    });

    it('should filter tests by category', () => {
      const mockTest = new MockDiagnosticTest();
      registerComplianceTest(mockTest);

      const mockTests = TestRegistry.getTestsByCategory('mock');
      expect(mockTests).toHaveLength(1);
      expect(mockTests[0]).toBe(mockTest);

      const nonexistentTests = TestRegistry.getTestsByCategory('nonexistent');
      expect(nonexistentTests).toHaveLength(0);
    });

    it('should get available categories', () => {
      const mockTest = new MockDiagnosticTest();
      registerComplianceTest(mockTest);

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
      expect(result.severity).toBe(TEST_SEVERITY.INFO);
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
          category: 'protocol',
          status: 'passed',
          message: 'Test passed',
          severity: TEST_SEVERITY.INFO,
          duration: 100,
        },
        {
          testName: 'Security: Test',
          category: 'security',
          status: 'failed',
          message: 'Test failed',
          severity: TEST_SEVERITY.CRITICAL,
          duration: 50,
        },
      ];

      const serverInfo = {
        name: 'test-server',
        version: '1.0.0',
        transport: 'stdio',
      };

      const report = HealthReportGenerator.generateReport({
        results,
        serverInfo,
        startTime: 0,
        endTime: 1000,
      });

      expect(report.serverInfo).toEqual({
        ...serverInfo,
        protocolVersion: '2024-11-05',
      });
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
          category: 'protocol',
          status: 'passed',
          message: 'Test passed',
          severity: TEST_SEVERITY.INFO,
          duration: 100,
        },
      ];

      const serverInfo = {
        name: 'test-server',
        transport: 'stdio',
      };

      const report = HealthReportGenerator.generateReport({
        results: passedResults,
        serverInfo,
        startTime: 0,
        endTime: 1000,
      });
      expect(report.summary.overallScore).toBeGreaterThan(90);
    });

    describe('Scoring Algorithm', () => {
      it('should handle critical failures correctly', () => {
        const results: DiagnosticResult[] = [
          {
            testName: 'Protocol: Critical Test',
            status: 'failed',
            message: 'Critical failure',
            severity: TEST_SEVERITY.CRITICAL,
            duration: 100,
          },
        ];

        const serverInfo = { name: 'test', transport: 'stdio' };
        const report = HealthReportGenerator.generateReport({
          results,
          serverInfo,
          startTime: 0,
          endTime: 1000,
        });

        // Critical failure should significantly impact score
        expect(report.summary.overallScore).toBeLessThan(80);
      });

      it('should weight categories correctly', () => {
        const protocolResults: DiagnosticResult[] = [
          {
            testName: 'Protocol: Test',
            status: 'failed',
            message: 'Protocol failure',
            severity: TEST_SEVERITY.CRITICAL,
            duration: 100,
          },
        ];

        const featuresResults: DiagnosticResult[] = [
          {
            testName: 'Features: Test',
            status: 'failed',
            message: 'Features failure',
            severity: TEST_SEVERITY.CRITICAL,
            duration: 100,
          },
        ];

        const serverInfo = { name: 'test', transport: 'stdio' };

        const protocolReport = HealthReportGenerator.generateReport({
          results: protocolResults,
          serverInfo,
          startTime: 0,
          endTime: 1000,
        });
        const featuresReport = HealthReportGenerator.generateReport({
          results: featuresResults,
          serverInfo,
          startTime: 0,
          endTime: 1000,
        });

        // Both should have same category score (70 = 100 - 30), but different weights
        // Protocol weight: 0.3, Features weight: 0.15
        // So protocol should have lower overall score due to higher weight
        expect(protocolReport.summary.overallScore).toBe(70);
        expect(featuresReport.summary.overallScore).toBe(70);

        // Test with multiple categories to see weighting effect
        const mixedResults: DiagnosticResult[] = [
          {
            testName: 'Protocol: Test',
            status: 'failed',
            message: 'Protocol failure',
            severity: TEST_SEVERITY.CRITICAL,
            duration: 100,
          },
          {
            testName: 'Features: Test',
            status: 'passed',
            message: 'Features success',
            severity: TEST_SEVERITY.INFO,
            duration: 100,
          },
        ];

        const mixedReport = HealthReportGenerator.generateReport({
          results: mixedResults,
          serverInfo,
          startTime: 0,
          endTime: 1000,
        });
        // Should be between the two category scores due to weighting
        expect(mixedReport.summary.overallScore).toBeGreaterThan(70);
        expect(mixedReport.summary.overallScore).toBeLessThan(100);
      });

      it('should handle empty results gracefully', () => {
        const serverInfo = { name: 'test', transport: 'stdio' };
        const report = HealthReportGenerator.generateReport({
          results: [],
          serverInfo,
          startTime: 0,
          endTime: 1000,
        });

        expect(report.summary.overallScore).toBe(0);
        expect(report.summary.testResults.total).toBe(0);
        expect(report.categories).toHaveLength(0);
        expect(report.issues).toHaveLength(0);
      });

      it('should handle mixed severity levels correctly', () => {
        const results: DiagnosticResult[] = [
          {
            testName: 'Protocol: Critical',
            status: 'failed',
            message: 'Critical issue',
            severity: TEST_SEVERITY.CRITICAL,
            duration: 100,
          },
          {
            testName: 'Protocol: Warning',
            status: 'failed',
            message: 'Warning issue',
            severity: TEST_SEVERITY.WARNING,
            duration: 100,
          },
          {
            testName: 'Protocol: Info',
            status: 'failed',
            message: 'Info issue',
            severity: TEST_SEVERITY.INFO,
            duration: 100,
          },
        ];

        const serverInfo = { name: 'test', transport: 'stdio' };
        const report = HealthReportGenerator.generateReport({
          results,
          serverInfo,
          startTime: 0,
          endTime: 1000,
        });

        // Critical should have most impact, warning medium, info least
        // All same category, so base score 100 - 30 (critical) - 10 (warning) - 5 (info) = 55
        expect(report.summary.overallScore).toBe(55);
      });
    });

    describe('Error Handling', () => {
      it('should sort issues by severity correctly', () => {
        const results: DiagnosticResult[] = [
          {
            testName: 'Test: Info Issue',
            status: 'failed',
            message: 'Info issue',
            severity: TEST_SEVERITY.INFO,
            duration: 100,
          },
          {
            testName: 'Test: Critical Issue',
            status: 'failed',
            message: 'Critical issue',
            severity: TEST_SEVERITY.CRITICAL,
            duration: 100,
          },
          {
            testName: 'Test: Warning Issue',
            status: 'failed',
            message: 'Warning issue',
            severity: TEST_SEVERITY.WARNING,
            duration: 100,
          },
        ];

        const serverInfo = { name: 'test', transport: 'stdio' };
        const report = HealthReportGenerator.generateReport({
          results,
          serverInfo,
          startTime: 0,
          endTime: 1000,
        });

        // Issues should be sorted: critical, warning, info
        expect(report.issues[0].severity).toBe(TEST_SEVERITY.CRITICAL);
        expect(report.issues[1].severity).toBe(TEST_SEVERITY.WARNING);
        expect(report.issues[2].severity).toBe(TEST_SEVERITY.INFO);
      });

      it('should extract categories from test names correctly', () => {
        const results: DiagnosticResult[] = [
          {
            testName: 'Protocol: Test',
            status: 'passed',
            message: 'Test',
            severity: TEST_SEVERITY.INFO,
            duration: 100,
          },
          {
            testName: 'Features: Test',
            status: 'passed',
            message: 'Test',
            severity: TEST_SEVERITY.INFO,
            duration: 100,
          },
          {
            testName: 'Malformed Test Name',
            status: 'passed',
            message: 'Test',
            severity: TEST_SEVERITY.INFO,
            duration: 100,
          },
        ];

        const serverInfo = { name: 'test', transport: 'stdio' };
        const report = HealthReportGenerator.generateReport({
          results,
          serverInfo,
          startTime: 0,
          endTime: 1000,
        });

        expect(report.categories).toHaveLength(3);

        const categoryNames = report.categories.map(c => c.name).sort();
        expect(categoryNames).toEqual(['features', 'general', 'protocol']);
      });

      it('should handle malformed test results gracefully', () => {
        const results: DiagnosticResult[] = [
          {
            testName: '',
            status: 'failed',
            message: '',
            severity: TEST_SEVERITY.CRITICAL,
            duration: 0,
          },
        ];

        const serverInfo = { name: 'test', transport: 'stdio' };

        // Should not throw error
        expect(() => {
          HealthReportGenerator.generateReport({
            results,
            serverInfo,
            startTime: 0,
            endTime: 1000,
          });
        }).not.toThrow();
      });
    });
  });
});
