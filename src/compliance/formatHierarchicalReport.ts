/**
 * Format health report with hierarchical category/feature display
 */

import type { HealthReport } from './types.js';
import { HealthReportGenerator } from './HealthReport.js';

export function formatHierarchicalReport(report: HealthReport): string {
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

  // Generate hierarchical summaries
  const hierarchicalSummaries = HealthReportGenerator.generateHierarchicalSummaries(
    report.results,
    report.serverCapabilities
  );

  // Display each category with its features
  for (const [_, categorySummary] of hierarchicalSummaries) {
    const categoryStatus = getCategoryStatus(categorySummary);
    const categorySummaryText = `${categorySummary.totalPassed}/${categorySummary.totalTests} passed`;

    lines.push(
      `🔍 ${categorySummary.displayName.padEnd(25)} ${categoryStatus} ${categorySummaryText}`
    );

    // Display features under this category
    for (const [_, featureSummary] of categorySummary.features) {
      const featureStatus = getFeatureStatus(featureSummary);
      let featureSummaryText: string;

      if (featureSummary.status === 'skipped') {
        featureSummaryText = 'skipped (not advertised)';
      } else {
        featureSummaryText = `${featureSummary.passed}/${featureSummary.total} passed`;
      }

      lines.push(
        `   └─ ${featureSummary.displayName.padEnd(20)} ${featureStatus}  ${featureSummaryText}`
      );
    }

    lines.push(''); // Empty line between categories
  }

  lines.push('━'.repeat(80), '');

  // Overall score with better context
  const totalTestsRun = report.summary.testResults.total - report.summary.testResults.skipped;
  const skippedNote =
    report.summary.testResults.skipped > 0
      ? ` (${report.skippedCapabilities.length} features skipped)`
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

function getCategoryStatus(summary: { status: string }): string {
  switch (summary.status) {
    case 'passed':
      return '✅';
    case 'failed':
      return '❌';
    case 'warning':
      return '⚠️';
    case 'skipped':
      return '⏭️';
    default:
      return '❓';
  }
}

function getFeatureStatus(summary: { status: string; failed: number }): string {
  switch (summary.status) {
    case 'passed':
      return '✅';
    case 'failed':
      return '❌';
    case 'warning':
      return '⚠️';
    case 'skipped':
      return '⏭️';
    default:
      return '❓';
  }
}
