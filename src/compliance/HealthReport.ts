/**
 * Health report generation and scoring system
 */

import {
  ISSUE_TYPE,
  type DiagnosticResult,
  type HealthReport,
  type TestCategorySummary,
  type ProtocolCategory,
  type ProtocolFeature,
  type ProtocolCategorySummary,
  type ProtocolFeatureSummary,
} from './types.js';
import type { McpCapability } from './CapabilityDetector.js';
import { FeatureRegistry } from './FeatureRegistry.js';

export class HealthReportGenerator {
  private static readonly DEFAULT_WEIGHTS: Record<string, number> = {
    'base-protocol': 0.3,
    lifecycle: 0.25,
    'server-features': 0.35,
    security: 0.1,
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
    const categorizedIssues = this.categorizeIssues(results);
    const skippedTests = results.filter(r => r.status === 'skipped');
    const overallScore = this.calculateOverallScore(categories, results);

    return {
      serverInfo: {
        ...serverInfo,
        protocolVersion: this.extractProtocolVersion(results),
      },
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
      categorizedIssues,
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

  private static categorizeIssues(results: DiagnosticResult[]) {
    const failedResults = results.filter(result => result.status === 'failed');

    return {
      criticalFailures: failedResults.filter(
        r =>
          r.issueType === ISSUE_TYPE.CRITICAL_FAILURE || (r.severity === 'critical' && !r.issueType)
      ),
      specWarnings: failedResults.filter(
        r => r.issueType === ISSUE_TYPE.SPEC_WARNING || (r.severity === 'warning' && !r.issueType)
      ),
      optimizations: failedResults.filter(
        r => r.issueType === ISSUE_TYPE.OPTIMIZATION || (r.severity === 'info' && !r.issueType)
      ),
    };
  }

  private static extractProtocolVersion(results: DiagnosticResult[]): string | undefined {
    // Look for protocol version in test details or messages
    for (const result of results) {
      if (result.testName.includes('Protocol Version') && result.details) {
        if (typeof result.details === 'object' && 'version' in result.details) {
          return result.details.version as string;
        }
      }
    }
    return '2024-11-05'; // Default to latest MCP version
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

  /**
   * Generate hierarchical category summaries with protocol features
   */
  static generateHierarchicalSummaries(
    results: DiagnosticResult[],
    serverCapabilities: Set<McpCapability>
  ): Map<ProtocolCategory, ProtocolCategorySummary> {
    const categorySummaries = new Map<ProtocolCategory, ProtocolCategorySummary>();

    // Get all registered features grouped by category
    const featuresByCategory = FeatureRegistry.getFeaturesByCategories();

    // Initialize category summaries
    for (const [category, features] of featuresByCategory) {
      const featureSummaries = new Map<ProtocolFeature, ProtocolFeatureSummary>();

      // Initialize feature summaries
      for (const featureInfo of features) {
        const featureResults = results.filter(r => r.feature === featureInfo.feature);

        const summary: ProtocolFeatureSummary = {
          feature: featureInfo.feature,
          displayName: featureInfo.displayName,
          passed: featureResults.filter(r => r.status === 'passed').length,
          failed: featureResults.filter(r => r.status === 'failed').length,
          skipped: featureResults.filter(r => r.status === 'skipped').length,
          total: featureResults.length,
          duration: featureResults.reduce((sum, r) => sum + r.duration, 0),
          status: 'passed',
        };

        // Determine feature status
        if (
          featureInfo.requiredCapability &&
          !serverCapabilities.has(featureInfo.requiredCapability)
        ) {
          summary.status = 'skipped';
        } else if (summary.failed > 0) {
          summary.status = 'failed';
        } else if (summary.total === 0) {
          summary.status = 'skipped';
        }

        featureSummaries.set(featureInfo.feature, summary);
      }

      // Create category summary
      const categorySummary: ProtocolCategorySummary = {
        category,
        displayName: this.getCategoryDisplayName(category),
        features: featureSummaries,
        totalPassed: 0,
        totalFailed: 0,
        totalSkipped: 0,
        totalTests: 0,
        status: 'passed',
      };

      // Aggregate feature stats
      for (const feature of featureSummaries.values()) {
        categorySummary.totalPassed += feature.passed;
        categorySummary.totalFailed += feature.failed;
        categorySummary.totalSkipped += feature.skipped;
        categorySummary.totalTests += feature.total;
      }

      // Determine category status
      if (categorySummary.totalFailed > 0) {
        categorySummary.status = 'failed';
      } else if (categorySummary.totalTests === categorySummary.totalSkipped) {
        categorySummary.status = 'skipped';
      }

      categorySummaries.set(category, categorySummary);
    }

    return categorySummaries;
  }

  private static getCategoryDisplayName(category: ProtocolCategory): string {
    const names: Record<ProtocolCategory, string> = {
      'base-protocol': 'BASE PROTOCOL',
      lifecycle: 'LIFECYCLE',
      'server-features': 'SERVER FEATURES',
      utilities: 'UTILITIES',
    };
    return names[category] || category.toUpperCase();
  }
}

export function formatReport(report: HealthReport): string {
  const lines = [
    `🏥 MCP SERVER COMPLIANCE v2.0.0`,
    `Diagnosing server: ${report.serverInfo.name}${report.serverInfo.version ? ` v${report.serverInfo.version}` : ''} (MCP Protocol ${report.serverInfo.protocolVersion || '2024-11-05'})`,
    `Started: ${new Date(report.metadata.timestamp).toLocaleString()}`,
    '',
    '━'.repeat(80),
    '',
    '📋 MCP SPECIFICATION COMPLIANCE SUMMARY',
    '',
  ];

  // Map categories to MCP spec sections
  const specSections: Record<string, string> = {
    'base-protocol': '[Base Protocol]',
    lifecycle: '[Lifecycle]',
    'server-features': '[Server Features]',
    security: '[Security & Authorization]',
  };

  // Category summaries with capability awareness and spec references
  for (const category of report.categories) {
    let status: string;
    let summary: string;
    const specRef = specSections[category.name] || '[MCP Spec]';

    if (category.status === 'skipped') {
      status = '⏭️';
      summary = 'SKIPPED     (0ms)    [Not advertised by server]';
    } else {
      status = category.failed > 0 ? '❌' : category.warnings > 0 ? '⚠️' : '✅';
      summary = `${category.passed}/${category.total} passed   (${category.duration}ms)   ${specRef}`;
    }

    const displayName = category.name
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    lines.push(`🔍 ${displayName.padEnd(20)} ${status} ${summary}`);
  }

  lines.push('', '━'.repeat(80), '');

  // Overall score with better context
  const totalTestsRun = report.summary.testResults.total - report.summary.testResults.skipped;
  const skippedNote =
    report.summary.testResults.skipped > 0
      ? ` (${report.skippedCapabilities.length} categories skipped)`
      : '';
  lines.push(`📊 OVERALL MCP COMPLIANCE: ${report.summary.overallScore}/100${skippedNote}`);

  // Show server capabilities with visual indicators
  lines.push('');
  const capabilityDisplay = Array.from(report.serverCapabilities)
    .sort()
    .map(cap => `${cap} ✅`)
    .concat(report.skippedCapabilities.map(cap => `${cap} ⏭️`))
    .join(' | ');
  lines.push(`Server Capabilities: ${capabilityDisplay || 'None detected'}`);

  lines.push('', '━'.repeat(80));

  // Enhanced issue reporting with categories
  const { criticalFailures, specWarnings, optimizations } = report.categorizedIssues;

  if (criticalFailures.length > 0) {
    lines.push('', `🚨 CRITICAL FAILURES (${criticalFailures.length})`, '');

    criticalFailures.forEach(issue => {
      const specRef = issue.mcpSpecSection ? ` [${issue.mcpSpecSection}]` : '';
      lines.push(`❌ ${issue.testName}${specRef}`);

      if (issue.expected && issue.actual) {
        lines.push(`   Expected: ${issue.expected}`);
        lines.push(`   Actual:   ${issue.actual}`);
      } else {
        lines.push(`   ${issue.message}`);
      }

      if (issue.fixInstructions && issue.fixInstructions.length > 0) {
        issue.fixInstructions.forEach(fix => lines.push(`   → Fix: ${fix}`));
      }

      if (issue.specLinks && issue.specLinks.length > 0) {
        issue.specLinks.forEach(link => lines.push(`   → Reference: ${link}`));
      }

      lines.push('');
    });
  }

  if (specWarnings.length > 0) {
    lines.push(`⚠️  SPECIFICATION WARNINGS (${specWarnings.length})`, '');

    specWarnings.forEach(issue => {
      const specRef = issue.mcpSpecSection ? ` [${issue.mcpSpecSection}]` : '';
      lines.push(`⚠️  ${issue.testName}${specRef}`);

      if (issue.expected && issue.actual) {
        lines.push(`   Expected: ${issue.expected}`);
        lines.push(`   Actual:   ${issue.actual}`);
      } else {
        lines.push(`   ${issue.message}`);
      }

      if (issue.fixInstructions && issue.fixInstructions.length > 0) {
        issue.fixInstructions.forEach(fix => lines.push(`   → Fix: ${fix}`));
      }

      lines.push('');
    });
  }

  if (optimizations.length > 0) {
    lines.push(`ℹ️  OPTIMIZATION RECOMMENDATIONS (${optimizations.length})`, '');

    optimizations.forEach(issue => {
      lines.push(`ℹ️  ${issue.testName}`);
      lines.push(`   Suggestion: ${issue.message}`);

      if (issue.fixInstructions && issue.fixInstructions.length > 0) {
        issue.fixInstructions.forEach(fix => lines.push(`   → ${fix}`));
      }

      lines.push('');
    });
  }

  // Add spec references if no issues found
  if (criticalFailures.length === 0 && specWarnings.length === 0 && optimizations.length === 0) {
    lines.push('', '🎉 ALL TESTS PASSED!', '');
    lines.push('Your MCP server appears to be fully compliant with the MCP specification.');
  }

  lines.push('━'.repeat(80), '');

  // Detailed breakdown section
  lines.push('📈 DETAILED COMPLIANCE BREAKDOWN');
  for (const category of report.categories) {
    if (category.status !== 'skipped') {
      lines.push(`   ${category.name}: ${category.passed}/${category.total} tests passed`);
    }
  }

  lines.push('');
  lines.push('🔗 SPECIFICATION REFERENCES');
  lines.push('• MCP Specification: https://spec.modelcontextprotocol.io/');
  lines.push('• JSON-RPC 2.0: https://www.jsonrpc.org/specification');
  lines.push(
    '• Error Codes: https://spec.modelcontextprotocol.io/specification/basic/error-handling/'
  );

  lines.push('');
  lines.push(
    `📊 Total execution time: ${report.metadata.duration}ms | Tests run: ${totalTestsRun} | Skipped: ${report.summary.testResults.skipped}`
  );

  return lines.join('\n');
}
