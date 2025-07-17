/**
 * Protocol version negotiation feature tests
 */

import { ProtocolFeatureTests } from '../../ProtocolFeatureTests.js';
import type { ProtocolFeature, ProtocolCategory } from '../../types.js';
import { ProtocolVersionNegotiationTest } from '../../lifecycle/ProtocolVersionTests.js';

export class VersionFeature extends ProtocolFeatureTests {
  readonly feature: ProtocolFeature = 'version';
  readonly category: ProtocolCategory = 'lifecycle';
  readonly displayName = 'Protocol Version';

  readonly tests = [ProtocolVersionNegotiationTest];
}
