/**
 * Base Protocol tests for MCP server compliance
 * Tests transport layer, JSON-RPC 2.0 compliance, message types, and error handling
 */

import { registerDoctorTest } from '../TestRegistry.js';
import {
  StdioConnectivityTest,
  ConnectionLifecycleTest,
  TransportErrorHandlingTest,
} from './TransportTests.js';
import {
  JsonRpcMessageFormatTest,
  RequestIdHandlingTest,
  ErrorResponseFormatTest,
  JsonRpcErrorCodeTest,
} from './JsonRpcComplianceTests.js';
import {
  SdkJsonRpcComplianceTest,
  SdkErrorResponseTest,
  SdkConnectionReliabilityTest,
} from './SdkBasedJsonRpcTests.js';

// Register transport tests (these remain unchanged)
registerDoctorTest(new StdioConnectivityTest());
registerDoctorTest(new ConnectionLifecycleTest());
registerDoctorTest(new TransportErrorHandlingTest());

// Register SDK-based JSON-RPC tests (these replace manual validation)
registerDoctorTest(new SdkJsonRpcComplianceTest());
registerDoctorTest(new SdkErrorResponseTest());
registerDoctorTest(new SdkConnectionReliabilityTest());

// Legacy manual validation tests - TODO: Remove after SDK-based tests are proven
// These are kept temporarily for comparison and fallback
// registerDoctorTest(new JsonRpcMessageFormatTest());
// registerDoctorTest(new RequestIdHandlingTest());
// registerDoctorTest(new ErrorResponseFormatTest());
// registerDoctorTest(new JsonRpcErrorCodeTest());

// Export test classes for direct use if needed
export {
  StdioConnectivityTest,
  ConnectionLifecycleTest,
  TransportErrorHandlingTest,
  // SDK-based tests
  SdkJsonRpcComplianceTest,
  SdkErrorResponseTest,
  SdkConnectionReliabilityTest,
  // Legacy manual tests (exported but not registered)
  JsonRpcMessageFormatTest,
  RequestIdHandlingTest,
  ErrorResponseFormatTest,
  JsonRpcErrorCodeTest,
};
