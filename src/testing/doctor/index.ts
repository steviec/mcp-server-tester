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

// Import protocol tests to register them
import './protocol/index.js';

// Import lifecycle tests to register them
import './lifecycle/index.js';

// Import features tests to register them
import './features/index.js';
