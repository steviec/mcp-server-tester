/**
 * Initialization protocol feature tests
 */

import { ProtocolFeatureTests } from '../../ProtocolFeatureTests.js';
import type { ProtocolFeature, ProtocolCategory } from '../../types.js';
import { InitializationTests } from '../../lifecycle/InitializationTests.js';
import { ServerMetadataTests } from '../../lifecycle/ServerMetadataTests.js';

export class InitializationFeature extends ProtocolFeatureTests {
  readonly feature: ProtocolFeature = 'initialization';
  readonly category: ProtocolCategory = 'lifecycle';
  readonly displayName = 'Initialization';

  readonly tests = [InitializationTests, ServerMetadataTests];
}
