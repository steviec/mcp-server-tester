/**
 * Health report generation and scoring system
 */

import type { DiagnosticResult, HealthReport, TestCategorySummary } from './types.js';
import type { McpCapability } from './CapabilityDetector.js';

export class HealthReportGenerator {
  private static readonly DEFAULT_WEIGHTS: Record<string, number> = {
    protocol: 0.3,
    security: 0.25,
    performance: 0.2,
    features: 0.15,
    transport: 0.1,
  };

  static generateReport(options: {
    results: DiagnosticResult[];
    serverInfo: { name: string; version?: string; transport: string };
    startTime: number;
    endTime: number;
    serverCapabilities?: Set<McpCapability>;
  }): HealthReport {
    const { results, serverInfo, startTime, endTime, serverCapabilities } = options;

    // Derive server capabilities from test results if not provided
    const derivedCapabilities = serverCapabilities || this.deriveServerCapabilities(results);

    const categories = this.generateCategories(results, derivedCapabilities);
    const issues = this.extractIssues(results);
    const skippedTests = results.filter(r => r.status === 'skipped');
    const overallScore = this.calculateOverallScore(categories, results);

    return {
      serverInfo,
      serverCapabilities: derivedCapabilities,
      skippedCapabilities: this.getSkippedCapabilities(results, derivedCapabilities),
      metadata: {
        timestamp: new Date().toISOString(),
        duration: endTime - startTime,
        testCount: results.length,
        skippedTestCount: skippedTests.length,
      },
      summary: {
        testResults: {
          passed: results.filter(r => r.status === 'passed').length,
          failed: results.filter(r => r.status === 'failed').length,
          skipped: skippedTests.length,
          total: results.length,
        },
        overallScore,
      },
      categories,
      issues,
      results,
    };
  }

  private static generateCategories(
    results: DiagnosticResult[],
    _serverCapabilities: Set<McpCapability>
  ): TestCategorySummary[] {
    const categoryMap = new Map<string, TestCategorySummary>();

    // Initialize categories
    for (const result of results) {
      const categoryName = result.category || this.extractCategoryFromTestName(result.testName);
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, {
          name: categoryName,
          passed: 0,
          failed: 0,
          warnings: 0,
          total: 0,
          duration: 0,
          status: 'passed',
        });
      }
    }

    // Aggregate results by category
    for (const result of results) {
      const categoryName = result.category || this.extractCategoryFromTestName(result.testName);
      const category = categoryMap.get(categoryName)!;

      category.total += 1;
      category.duration += result.duration;

      if (result.status === 'passed') {
        category.passed += 1;
      } else if (result.status === 'failed') {
        if (result.severity === 'warning') {
          category.warnings += 1;
        } else {
          category.failed += 1;
        }
      } else if (result.status === 'skipped') {
        // Don't count skipped tests in passed/failed, but they are in total
      }
    }

    // Set category status based on results
    for (const category of categoryMap.values()) {
      if (category.failed > 0) {
        category.status = 'failed';
      } else if (category.warnings > 0) {
        category.status = 'warning';
      } else if (category.total === 0 || category.passed === 0) {
        category.status = 'skipped';
      } else {
        category.status = 'passed';
      }
    }

    return Array.from(categoryMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  private static extractIssues(results: DiagnosticResult[]): DiagnosticResult[] {
    return results
      .filter(result => result.status === 'failed')
      .sort((a, b) => {
        // Sort by severity: critical first, then warning, then info
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });
  }

  /**
   * Extract category from test name as fallback
   * Format: "Category: Test Name" -> "category"
   */
  private static extractCategoryFromTestName(testName: string): string {
    const match = testName.match(/^([^:]+):/);
    return match ? match[1].toLowerCase().trim() : 'general';
  }

  /**
   * Derive server capabilities from test results
   * If a capability test passed, the server supports it
   */
  private static deriveServerCapabilities(results: DiagnosticResult[]): Set<McpCapability> {
    const supportedCapabilities = new Set<McpCapability>();

    for (const result of results) {
      if (result.requiredCapability && result.status === 'passed') {
        supportedCapabilities.add(result.requiredCapability);
      }
    }

    return supportedCapabilities;
  }

  private static getSkippedCapabilities(
    results: DiagnosticResult[],
    _serverCapabilities: Set<McpCapability>
  ): McpCapability[] {
    const skippedTests = results.filter(r => r.status === 'skipped' && r.requiredCapability);
    const skippedCapabilities = new Set(
      skippedTests
        .map(t => t.requiredCapability)
        .filter((cap): cap is McpCapability => cap !== undefined)
    );
    return Array.from(skippedCapabilities).sort();
  }

  private static calculateOverallScore(
    categories: TestCategorySummary[],
    results: DiagnosticResult[]
  ): number {
    if (results.length === 0) {
      return 0;
    }

    let totalScore = 0;
    let totalWeight = 0;

    for (const category of categories) {
      const categoryScore = this.calculateCategoryScore(category, results);
      const weight = this.DEFAULT_WEIGHTS[category.name.toLowerCase()] || 0.1;

      totalScore += categoryScore * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }

  private static calculateCategoryScore(
    category: TestCategorySummary,
    results: DiagnosticResult[]
  ): number {
    if (category.total === 0) {
      return 100;
    }

    const categoryResults = results.filter(
      r => (r.category || this.extractCategoryFromTestName(r.testName)) === category.name
    );

    let score = 100;

    for (const result of categoryResults) {
      if (result.status === 'failed') {
        switch (result.severity) {
          case 'critical':
            score -= 30;
            break;
          case 'warning':
            score -= 10;
            break;
          case 'info':
            score -= 5;
            break;
        }
      }
    }

    return Math.max(0, score);
  }
}

export function formatReport(report: HealthReport): string {
  const lines = [
    `🏥 MCP SERVER DOCTOR v1.0.0`,
    `Diagnosing server: ${report.serverInfo.name}${report.serverInfo.version ? ` v${report.serverInfo.version}` : ''}`,
    `Started: ${new Date(report.metadata.timestamp).toLocaleString()}`,
    '',
    '━'.repeat(80),
    '',
  ];

  // Category summaries with capability awareness
  for (const category of report.categories) {
    let status: string;
    let summary: string;

    if (category.status === 'skipped') {
      status = '⏭️';
      summary = 'SKIPPED';
    } else {
      status = category.failed > 0 ? '❌' : category.warnings > 0 ? '⚠️' : '✅';
      summary = `${category.passed}/${category.total} passed`;
    }

    lines.push(`🔍 ${category.name.toUpperCase()} ${status} ${summary} (${category.duration}ms)`);
  }

  // Show server capabilities
  lines.push('');
  const capabilityDisplay = Array.from(report.serverCapabilities)
    .sort()
    .map(cap => `${cap} ✅`)
    .concat(report.skippedCapabilities.map(cap => `${cap} ⏭️`))
    .join(' | ');
  lines.push(`Server Capabilities: ${capabilityDisplay || 'None detected'}`);

  lines.push('', '━'.repeat(80), '');

  // Overall score
  const skippedNote =
    report.summary.testResults.skipped > 0
      ? ` (${report.summary.testResults.skipped} tests skipped)`
      : '';
  lines.push(`📊 OVERALL MCP COMPLIANCE: ${report.summary.overallScore}/100${skippedNote}`);

  // Issues
  if (report.issues.length > 0) {
    lines.push('');
    const critical = report.issues.filter(i => i.severity === 'critical');
    const warnings = report.issues.filter(i => i.severity === 'warning');

    if (critical.length > 0) {
      lines.push(`🚨 CRITICAL ISSUES (${critical.length})`);
      critical.forEach(issue => lines.push(`• ${issue.message}`));
      lines.push('');
    }

    if (warnings.length > 0) {
      lines.push(`⚠️ WARNINGS (${warnings.length})`);
      warnings.forEach(issue => lines.push(`• ${issue.message}`));
    }

    // Add recommendations if any
    const withRecommendations = report.issues.filter(
      i => i.recommendations && i.recommendations.length > 0
    );
    if (withRecommendations.length > 0) {
      lines.push('', '💡 RECOMMENDATIONS');
      for (const issue of withRecommendations) {
        issue.recommendations!.forEach(rec => lines.push(`• ${rec}`));
      }
    }
  }

  lines.push('', `Total execution time: ${report.metadata.duration}ms`);
  return lines.join('\n');
}
