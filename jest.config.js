/** @type {import('jest').Config} */
export default {
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest/presets/default-esm',

  // Enable ESM support
  extensionsToTreatAsEsm: ['.ts'],

  // Set up module name mapping for ESM imports
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },

  // Transform TypeScript files
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },

  // Test environment
  testEnvironment: 'node',

  // Test file patterns
  testMatch: ['<rootDir>/test/**/*.test.ts'],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/testing/evals/providers/**', // Skip LLM providers (external dependencies)
  ],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],

  // Module file extensions
  moduleFileExtensions: ['ts', 'js', 'json'],

  // Timeout for tests (E2E tests may take longer)
  testTimeout: 20000,

  // Verbose output
  verbose: true,
};
