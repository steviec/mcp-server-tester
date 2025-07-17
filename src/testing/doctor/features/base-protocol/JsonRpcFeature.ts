/**
 * JSON-RPC protocol feature tests
 */

import { ProtocolFeatureTests } from '../../ProtocolFeatureTests.js';
import type { ProtocolFeature, ProtocolCategory } from '../../types.js';
import {
  JsonRpcMessageFormatTest,
  RequestIdHandlingTest,
  ErrorResponseFormatTest,
  JsonRpcErrorCodeTest,
} from '../../base-protocol/JsonRpcComplianceTests.js';

export class JsonRpcFeature extends ProtocolFeatureTests {
  readonly feature: ProtocolFeature = 'json-rpc';
  readonly category: ProtocolCategory = 'base-protocol';
  readonly displayName = 'JSON-RPC 2.0';

  readonly tests = [
    JsonRpcMessageFormatTest,
    RequestIdHandlingTest,
    ErrorResponseFormatTest,
    JsonRpcErrorCodeTest,
  ];
}
