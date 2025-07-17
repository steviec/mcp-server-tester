/**
 * Lifecycle tests for MCP server
 * Tests initialization, capability negotiation, protocol version, session management, and shutdown
 */

import { registerDoctorTest } from '../TestRegistry.js';
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
registerDoctorTest(new InitializationTests());
registerDoctorTest(new CapabilityTests());
registerDoctorTest(new ServerMetadataTests());
registerDoctorTest(new ProtocolVersionNegotiationTest());
registerDoctorTest(new SessionIdGenerationTest());
registerDoctorTest(new SessionTerminationTest());
registerDoctorTest(new InvalidSessionHandlingTest());

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
