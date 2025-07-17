/**
 * Transport protocol feature tests
 */

import { ProtocolFeatureTests } from '../../ProtocolFeatureTests.js';
import type { ProtocolFeature, ProtocolCategory } from '../../types.js';
import {
  StdioConnectivityTest,
  ConnectionLifecycleTest,
  TransportErrorHandlingTest,
} from '../../base-protocol/TransportTests.js';

export class TransportFeature extends ProtocolFeatureTests {
  readonly feature: ProtocolFeature = 'transport';
  readonly category: ProtocolCategory = 'base-protocol';
  readonly displayName = 'Transport Layer';

  readonly tests = [StdioConnectivityTest, ConnectionLifecycleTest, TransportErrorHandlingTest];
}
