/**
 * Capabilities negotiation protocol feature tests
 */

import { ProtocolFeatureTests } from '../../ProtocolFeatureTests.js';
import type { ProtocolFeature, ProtocolCategory } from '../../types.js';
import { CapabilityTests } from '../../lifecycle/CapabilityTests.js';

export class CapabilitiesFeature extends ProtocolFeatureTests {
  readonly feature: ProtocolFeature = 'capabilities';
  readonly category: ProtocolCategory = 'lifecycle';
  readonly displayName = 'Capability Negotiation';

  readonly tests = [CapabilityTests];
}
