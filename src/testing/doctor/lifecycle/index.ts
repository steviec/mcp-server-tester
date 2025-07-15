/**
 * Lifecycle tests for MCP server initialization, capabilities, and metadata
 */

import { registerDoctorTest } from '../TestRegistry.js';
import { InitializationTests } from './InitializationTests.js';
import { CapabilityTests } from './CapabilityTests.js';
import { ServerMetadataTests } from './ServerMetadataTests.js';

// Register all lifecycle tests
registerDoctorTest(new InitializationTests());
registerDoctorTest(new CapabilityTests());
registerDoctorTest(new ServerMetadataTests());

// Export test classes for direct use if needed
export { InitializationTests, CapabilityTests, ServerMetadataTests };
