/**
 * Lifecycle tests for MCP server
 * Tests initialization, capability negotiation, protocol version, session management, and shutdown
 */

import { registerComplianceTest } from '../TestRegistry.js';
import { InitializationTests } from './InitializationTests.js';
import { CapabilityTests } from './CapabilityTests.js';
import { ServerMetadataTests } from './ServerMetadataTests.js';
import { ProtocolVersionNegotiationTest } from './ProtocolVersionTests.js';
import {
  SessionIdGenerationTest,
  SessionTerminationTest,
  InvalidSessionHandlingTest,
} from './SessionManagementTests.js';

// Register all lifecycle tests
registerComplianceTest(new InitializationTests());
registerComplianceTest(new CapabilityTests());
registerComplianceTest(new ServerMetadataTests());
registerComplianceTest(new ProtocolVersionNegotiationTest());
registerComplianceTest(new SessionIdGenerationTest());
registerComplianceTest(new SessionTerminationTest());
registerComplianceTest(new InvalidSessionHandlingTest());

// Export test classes for direct use if needed
export {
  InitializationTests,
  CapabilityTests,
  ServerMetadataTests,
  ProtocolVersionNegotiationTest,
  SessionIdGenerationTest,
  SessionTerminationTest,
  InvalidSessionHandlingTest,
};
