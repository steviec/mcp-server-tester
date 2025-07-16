/**
 * Server Features Tests for MCP Doctor
 *
 * Comprehensive diagnostic tests for MCP server features including:
 * - Tools (capability, listing, execution, schema validation, error handling, annotations)
 * - Resources (capability, listing, reading, MIME types, URI validation, error handling)
 * - Prompts (capability, listing, retrieval, argument validation, template rendering)
 */

import { registerDoctorTest } from '../TestRegistry.js';

// Import all Tools tests
import {
  ToolsCapabilityTest,
  ToolListingTest,
  ToolSchemaValidationTest,
  ToolExecutionTest,
  ToolErrorHandlingTest,
  ToolAnnotationsTest,
} from './ToolsTests.js';

// Import all Resources tests
import {
  ResourcesCapabilityTest,
  ResourceListingTest,
  ResourceReadingTest,
  MimeTypeHandlingTest,
  UriValidationTest,
  ResourceNotFoundTest,
} from './ResourcesTests.js';

// Import all Prompts tests
import {
  PromptsCapabilityTest,
  PromptListingTest,
  PromptRetrievalTest,
  ArgumentValidationTest,
  TemplateRenderingTest,
} from './PromptsTests.js';

// Register all Tools tests
registerDoctorTest(new ToolsCapabilityTest());
registerDoctorTest(new ToolListingTest());
registerDoctorTest(new ToolSchemaValidationTest());
registerDoctorTest(new ToolExecutionTest());
registerDoctorTest(new ToolErrorHandlingTest());
registerDoctorTest(new ToolAnnotationsTest());

// Register all Resources tests
registerDoctorTest(new ResourcesCapabilityTest());
registerDoctorTest(new ResourceListingTest());
registerDoctorTest(new ResourceReadingTest());
registerDoctorTest(new MimeTypeHandlingTest());
registerDoctorTest(new UriValidationTest());
registerDoctorTest(new ResourceNotFoundTest());

// Register all Prompts tests
registerDoctorTest(new PromptsCapabilityTest());
registerDoctorTest(new PromptListingTest());
registerDoctorTest(new PromptRetrievalTest());
registerDoctorTest(new ArgumentValidationTest());
registerDoctorTest(new TemplateRenderingTest());

// Export all test classes for individual use if needed
export {
  // Tools tests
  ToolsCapabilityTest,
  ToolListingTest,
  ToolSchemaValidationTest,
  ToolExecutionTest,
  ToolErrorHandlingTest,
  ToolAnnotationsTest,

  // Resources tests
  ResourcesCapabilityTest,
  ResourceListingTest,
  ResourceReadingTest,
  MimeTypeHandlingTest,
  UriValidationTest,
  ResourceNotFoundTest,

  // Prompts tests
  PromptsCapabilityTest,
  PromptListingTest,
  PromptRetrievalTest,
  ArgumentValidationTest,
  TemplateRenderingTest,
};
