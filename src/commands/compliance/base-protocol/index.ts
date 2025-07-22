/**
 * Base Protocol tests for MCP server compliance
 * Tests transport layer and JSON-RPC 2.0 compliance using SDK-based error detection
 */

import { registerComplianceTest } from '../TestRegistry.js';
import {
  StdioConnectivityTest,
  ConnectionLifecycleTest,
  TransportErrorHandlingTest,
} from './TransportTests.js';
import {
  SdkJsonRpcComplianceTest,
  SdkErrorResponseTest,
  SdkConnectionReliabilityTest,
} from './SdkBasedJsonRpcTests.js';

// Register transport tests
registerComplianceTest(new StdioConnectivityTest());
registerComplianceTest(new ConnectionLifecycleTest());
registerComplianceTest(new TransportErrorHandlingTest());

// Register SDK-based JSON-RPC tests (replace all manual validation)
registerComplianceTest(new SdkJsonRpcComplianceTest());
registerComplianceTest(new SdkErrorResponseTest());
registerComplianceTest(new SdkConnectionReliabilityTest());

// Export test classes for direct use if needed
export {
  StdioConnectivityTest,
  ConnectionLifecycleTest,
  TransportErrorHandlingTest,
  SdkJsonRpcComplianceTest,
  SdkErrorResponseTest,
  SdkConnectionReliabilityTest,
};
