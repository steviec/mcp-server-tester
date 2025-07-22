/**
 * Compliance module exports
 */

export { DiagnosticTest } from './DiagnosticTest.js';
export { TestRegistry, registerComplianceTest } from './TestRegistry.js';
export { ComplianceRunner } from './ComplianceRunner.js';
export { HealthReportGenerator, formatReport } from './HealthReport.js';
export { CapabilityDetector, type McpCapability } from './CapabilityDetector.js';
export type {
  DiagnosticResult,
  HealthReport,
  ComplianceConfig,
  ComplianceOptions,
  TestSeverity,
  TestCategory,
  TestCategorySummary,
  HealthScore,
} from './types.js';

// Import base protocol tests to register them
import './base-protocol/index.js';

// Import lifecycle tests to register them
import './lifecycle/index.js';

// Import server features tests to register them
import './server-features/index.js';

// Register all protocol features
import { registerAllFeatures } from './features/index.js';
registerAllFeatures();
