/**
 * Placeholder tests for MCP server categories not yet fully implemented
 */

import { registerDoctorTest } from '../TestRegistry.js';
import {
  PlaceholderSecurityTest,
  PlaceholderPerformanceTest,
  PlaceholderFeaturesTest,
  PlaceholderTransportTest,
} from '../PlaceholderTests.js';

// Register all placeholder tests
registerDoctorTest(new PlaceholderSecurityTest());
registerDoctorTest(new PlaceholderPerformanceTest());
registerDoctorTest(new PlaceholderFeaturesTest());
registerDoctorTest(new PlaceholderTransportTest());

// Export test classes for direct use if needed
export {
  PlaceholderSecurityTest,
  PlaceholderPerformanceTest,
  PlaceholderFeaturesTest,
  PlaceholderTransportTest,
};
