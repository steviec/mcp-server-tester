import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test file patterns
    include: ['test/**/*.test.ts'],

    // Setup files
    setupFiles: ['test/setup.ts'],

    // Test timeout
    testTimeout: 20000,

    // Coverage configuration
    coverage: {
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/commands/evals/providers/**', // Skip LLM providers
      ],
    },

    // Environment
    environment: 'node',
  },
});
