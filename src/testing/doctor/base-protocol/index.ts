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

// Register all base protocol tests
registerDoctorTest(new StdioConnectivityTest());
registerDoctorTest(new ConnectionLifecycleTest());
registerDoctorTest(new TransportErrorHandlingTest());
registerDoctorTest(new JsonRpcMessageFormatTest());
registerDoctorTest(new RequestIdHandlingTest());
registerDoctorTest(new ErrorResponseFormatTest());
registerDoctorTest(new JsonRpcErrorCodeTest());

// Export test classes for direct use if needed
export {
  StdioConnectivityTest,
  ConnectionLifecycleTest,
  TransportErrorHandlingTest,
  JsonRpcMessageFormatTest,
  RequestIdHandlingTest,
  ErrorResponseFormatTest,
  JsonRpcErrorCodeTest,
};
