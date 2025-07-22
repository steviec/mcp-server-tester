/**
 * Tools server feature tests
 */

import { ProtocolFeatureTests } from '../../ProtocolFeatureTests.js';
import type { ProtocolFeature, ProtocolCategory } from '../../types.js';
import {
  ToolsCapabilityTest,
  ToolSchemaValidationTest,
  ToolExecutionTest,
  ToolAnnotationsTest,
} from '../../server-features/ToolsTests.js';

export class ToolsFeature extends ProtocolFeatureTests {
  readonly feature: ProtocolFeature = 'tools';
  readonly category: ProtocolCategory = 'server-features';
  readonly displayName = 'Tools';
  readonly requiredCapability = 'tools' as const;

  readonly tests = [
    ToolsCapabilityTest,
    ToolSchemaValidationTest,
    ToolExecutionTest,
    ToolAnnotationsTest,
  ];
}
