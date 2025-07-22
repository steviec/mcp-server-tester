/**
 * Server Features Tests for MCP Compliance
 *
 * Comprehensive diagnostic tests for MCP server features including:
 * - Tools (capability, listing, execution, schema validation, error handling, annotations)
 * - Resources (capability, listing, reading, MIME types, URI validation, error handling)
 * - Prompts (capability, listing, retrieval, argument validation, template rendering)
 */

import { registerComplianceTest } from '../TestRegistry.js';

// Import all Tools tests
import {
  ToolsCapabilityTest,
  ToolSchemaValidationTest,
  ToolExecutionTest,
  ToolAnnotationsTest,
} from './ToolsTests.js';

// Import all Resources tests
import {
  ResourcesCapabilityTest,
  ResourceSchemaValidationTest,
  ResourceReadingTest,
  ResourceMimeTypeTest,
} from './ResourcesTests.js';

// Import all Prompts tests
import {
  PromptsCapabilityTest,
  PromptSchemaValidationTest,
  PromptRetrievalTest,
  PromptArgumentValidationTest,
} from './PromptsTests.js';

// Register all Tools tests
registerComplianceTest(new ToolsCapabilityTest());
registerComplianceTest(new ToolSchemaValidationTest());
registerComplianceTest(new ToolExecutionTest());
registerComplianceTest(new ToolAnnotationsTest());

// Register all Resources tests
registerComplianceTest(new ResourcesCapabilityTest());
registerComplianceTest(new ResourceSchemaValidationTest());
registerComplianceTest(new ResourceReadingTest());
registerComplianceTest(new ResourceMimeTypeTest());

// Register all Prompts tests
registerComplianceTest(new PromptsCapabilityTest());
registerComplianceTest(new PromptSchemaValidationTest());
registerComplianceTest(new PromptRetrievalTest());
registerComplianceTest(new PromptArgumentValidationTest());

// Export all test classes for individual use if needed
export {
  // Tools tests
  ToolsCapabilityTest,
  ToolSchemaValidationTest,
  ToolExecutionTest,
  ToolAnnotationsTest,

  // Resources tests
  ResourcesCapabilityTest,
  ResourceSchemaValidationTest,
  ResourceReadingTest,
  ResourceMimeTypeTest,

  // Prompts tests
  PromptsCapabilityTest,
  PromptSchemaValidationTest,
  PromptRetrievalTest,
  PromptArgumentValidationTest,
};
