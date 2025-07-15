/**
 * Protocol tests for MCP server JSON-RPC compliance, connection health, and session management
 */

import { registerDoctorTest } from '../TestRegistry.js';
import {
  StdioConnectivityTest,
  ConnectionLifecycleTest,
  TransportErrorHandlingTest,
} from './ConnectionHealthTests.js';
import {
  JsonRpcMessageFormatTest,
  RequestIdHandlingTest,
  ErrorResponseFormatTest,
  JsonRpcErrorCodeTest,
} from './JsonRpcComplianceTests.js';
import { ProtocolVersionNegotiationTest } from './ProtocolVersionTests.js';
import {
  SessionIdGenerationTest,
  SessionTerminationTest,
  InvalidSessionHandlingTest,
} from './SessionManagementTests.js';

// Register all protocol tests
registerDoctorTest(new StdioConnectivityTest());
registerDoctorTest(new ConnectionLifecycleTest());
registerDoctorTest(new TransportErrorHandlingTest());
registerDoctorTest(new JsonRpcMessageFormatTest());
registerDoctorTest(new RequestIdHandlingTest());
registerDoctorTest(new ErrorResponseFormatTest());
registerDoctorTest(new JsonRpcErrorCodeTest());
registerDoctorTest(new ProtocolVersionNegotiationTest());
registerDoctorTest(new SessionIdGenerationTest());
registerDoctorTest(new SessionTerminationTest());
registerDoctorTest(new InvalidSessionHandlingTest());

// Export test classes for direct use if needed
export {
  StdioConnectivityTest,
  ConnectionLifecycleTest,
  TransportErrorHandlingTest,
  JsonRpcMessageFormatTest,
  RequestIdHandlingTest,
  ErrorResponseFormatTest,
  JsonRpcErrorCodeTest,
  ProtocolVersionNegotiationTest,
  SessionIdGenerationTest,
  SessionTerminationTest,
  InvalidSessionHandlingTest,
};
