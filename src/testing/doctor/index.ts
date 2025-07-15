/**
 * Doctor module exports
 */

export { DiagnosticTest } from './DiagnosticTest.js';
export { TestRegistry, registerDoctorTest } from './TestRegistry.js';
export { DoctorRunner } from './DoctorRunner.js';
export { HealthReportGenerator, formatReport } from './HealthReport.js';
export type {
  DiagnosticResult,
  HealthReport,
  DoctorConfig,
  DoctorOptions,
  TestSeverity,
  TestCategory,
  HealthScore,
} from './types.js';

// Import placeholder tests to register them
import './PlaceholderTests.js';

// Import protocol tests to register them
import './protocol/ConnectionHealthTests.js';
import './protocol/JsonRpcComplianceTests.js';
import './protocol/ProtocolVersionTests.js';
import './protocol/SessionManagementTests.js';
