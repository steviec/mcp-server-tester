/**
 * Resources server feature tests
 */

import { ProtocolFeatureTests } from '../../ProtocolFeatureTests.js';
import type { ProtocolFeature, ProtocolCategory } from '../../types.js';
import {
  ResourcesCapabilityTest,
  ResourceSchemaValidationTest,
  ResourceReadingTest,
  ResourceMimeTypeTest,
} from '../../server-features/ResourcesTests.js';

export class ResourcesFeature extends ProtocolFeatureTests {
  readonly feature: ProtocolFeature = 'resources';
  readonly category: ProtocolCategory = 'server-features';
  readonly displayName = 'Resources';
  readonly requiredCapability = 'resources' as const;

  readonly tests = [
    ResourcesCapabilityTest,
    ResourceSchemaValidationTest,
    ResourceReadingTest,
    ResourceMimeTypeTest,
  ];
}
