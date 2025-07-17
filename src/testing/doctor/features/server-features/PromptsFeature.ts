/**
 * Prompts server feature tests
 */

import { ProtocolFeatureTests } from '../../ProtocolFeatureTests.js';
import type { ProtocolFeature, ProtocolCategory } from '../../types.js';
import {
  PromptsCapabilityTest,
  PromptListingTest,
  PromptRetrievalTest,
  ArgumentValidationTest,
  TemplateRenderingTest,
} from '../../server-features/PromptsTests.js';

export class PromptsFeature extends ProtocolFeatureTests {
  readonly feature: ProtocolFeature = 'prompts';
  readonly category: ProtocolCategory = 'server-features';
  readonly displayName = 'Prompts';
  readonly requiredCapability = 'prompts' as const;

  readonly tests = [
    PromptsCapabilityTest,
    PromptListingTest,
    PromptRetrievalTest,
    ArgumentValidationTest,
    TemplateRenderingTest,
  ];
}
