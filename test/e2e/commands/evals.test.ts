/**
 * E2E tests for evaluation functionality using config file mode
 */

import { describe, beforeAll, afterAll, test, expect } from 'vitest';
import { EvalTestRunner } from '../../../src/commands/evals/runner.js';
import { ConfigLoader } from '../../../src/shared/config/loader.js';
import {
  TestServerLauncher,
  createTestServerLauncher,
  getTestServerConfigPath,
} from '../server-launcher.js';
import path from 'path';

describe.skipIf(!process.env.ANTHROPIC_API_KEY)('Eval Tests - Config Mode', () => {
  let serverLauncher: TestServerLauncher;
  const testServerConfigPath = getTestServerConfigPath();

  beforeAll(async () => {
    // Start the test server before running tests
    serverLauncher = createTestServerLauncher();
    await serverLauncher.start();
  }, 10000);

  afterAll(async () => {
    // Stop the test server after tests
    if (serverLauncher) {
      await serverLauncher.stop();
    }
  }, 10000);

  test('should fail immediately without API key', async () => {
    // Temporarily remove API key
    const originalKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    try {
      const testConfig = `
evals:
  models: ['claude-3-haiku-20240307']
  timeout: 10000
  max_steps: 2
  tests:
    - name: 'Should fail without API key'
      prompt: 'Hello'
      expected_tool_calls:
        allowed: []
`;

      const fs = await import('fs');
      const tempTestPath = path.resolve(process.cwd(), 'test/e2e/temp-no-api-key-test.yaml');
      fs.writeFileSync(tempTestPath, testConfig);

      try {
        const testConfigData = ConfigLoader.loadTestConfig(tempTestPath);
        // Load server config from file
        const serverConfig = ConfigLoader.loadServerConfig(testServerConfigPath, 'test-server');
        const runner = new EvalTestRunner(testConfigData.evals!, {
          serverConfig,
        });

        await expect(runner.run()).rejects.toThrow(
          /ANTHROPIC_API_KEY environment variable is required/
        );
      } finally {
        fs.unlinkSync(tempTestPath);
      }
    } finally {
      // Restore API key
      if (originalKey) {
        process.env.ANTHROPIC_API_KEY = originalKey;
      }
    }
  }, 15000);

  test('should connect to server and run basic evaluation via config mode', async () => {
    const testConfig = `
evals:
  models: ['claude-3-haiku-20240307']
  timeout: 30000
  max_steps: 2
  tests:
    - name: 'Lists available tools via config mode'
      prompt: 'What tools do you have available? Please list them.'
      expected_tool_calls:
        allowed: []  # Should not call any tools, just list them
      response_scorers:
        - type: 'regex'
          pattern: '(echo|add|tool|function)'
`;

    // Write temporary test file
    const fs = await import('fs');
    const tempTestPath = path.resolve(process.cwd(), 'test/e2e/temp-eval-config-test.yaml');
    fs.writeFileSync(tempTestPath, testConfig);

    try {
      const testConfigData = ConfigLoader.loadTestConfig(tempTestPath);
      // Load server config from file
      const serverConfig = ConfigLoader.loadServerConfig(testServerConfigPath, 'test-server');
      const runner = new EvalTestRunner(testConfigData.evals!, {
        serverConfig,
      });

      const summary = await runner.run();

      expect(summary.total).toBe(1);
      expect(summary.passed).toBe(1);
      expect(summary.failed).toBe(0);
      expect(summary.results[0].name).toBe('Lists available tools via config mode');
      expect(summary.results[0].passed).toBe(true);
      expect(summary.results[0].model).toBe('claude-3-haiku-20240307');
    } finally {
      // Clean up temp file
      fs.unlinkSync(tempTestPath);
    }
  }, 45000);

  test('should execute tool call evaluation via config mode', async () => {
    const testConfig = `
evals:
  models: ['claude-3-haiku-20240307']
  timeout: 30000
  max_steps: 3
  tests:
    - name: 'Uses echo tool correctly via config mode'
      prompt: 'Please echo the message "Hello from eval test"'
      expected_tool_calls:
        required: ['echo']
      response_scorers:
        - type: 'regex'
          pattern: 'Hello from eval test'
        - type: 'llm-judge'
          criteria: 'Did the assistant successfully echo the requested message?'
          threshold: 0.7
`;

    // Write temporary test file
    const fs = await import('fs');
    const tempTestPath = path.resolve(process.cwd(), 'test/e2e/temp-eval-echo-test.yaml');
    fs.writeFileSync(tempTestPath, testConfig);

    try {
      const testConfigData = ConfigLoader.loadTestConfig(tempTestPath);
      // Load server config from file
      const serverConfig = ConfigLoader.loadServerConfig(testServerConfigPath, 'test-server');
      const runner = new EvalTestRunner(testConfigData.evals!, {
        serverConfig,
      });

      const summary = await runner.run();

      expect(summary.total).toBe(1);
      expect(summary.passed).toBe(1);
      expect(summary.failed).toBe(0);
      expect(summary.results[0].name).toBe('Uses echo tool correctly via config mode');
      expect(summary.results[0].passed).toBe(true);
    } finally {
      // Clean up temp file
      fs.unlinkSync(tempTestPath);
    }
  }, 45000);

  test('should handle math task evaluation via config mode', async () => {
    const testConfig = `
evals:
  models: ['claude-3-haiku-20240307']
  timeout: 30000
  max_steps: 3
  tests:
    - name: 'Solves math problem via config mode'
      prompt: 'Please add 23 and 19 together using the available tools'
      expected_tool_calls:
        required: ['add']
        allowed: ['add']  # Only allow add tool, not echo
      response_scorers:
        - type: 'regex'
          pattern: '(42|23.*19|19.*23)'
        - type: 'llm-judge'
          criteria: 'Did the assistant correctly add 23 and 19 to get 42?'
          threshold: 0.8
`;

    // Write temporary test file
    const fs = await import('fs');
    const tempTestPath = path.resolve(process.cwd(), 'test/e2e/temp-eval-math-test.yaml');
    fs.writeFileSync(tempTestPath, testConfig);

    try {
      const testConfigData = ConfigLoader.loadTestConfig(tempTestPath);
      // Load server config from file
      const serverConfig = ConfigLoader.loadServerConfig(testServerConfigPath, 'test-server');
      const runner = new EvalTestRunner(testConfigData.evals!, {
        serverConfig,
      });

      const summary = await runner.run();

      expect(summary.total).toBe(1);
      expect(summary.passed).toBe(1);
      expect(summary.failed).toBe(0);
      expect(summary.results[0].name).toBe('Solves math problem via config mode');
      expect(summary.results[0].passed).toBe(true);
    } finally {
      // Clean up temp file
      fs.unlinkSync(tempTestPath);
    }
  }, 45000);

  test('should handle model override via config mode', async () => {
    const testConfig = `
evals:
  models: ['claude-3-haiku-20240307']  # This will be overridden
  timeout: 30000
  max_steps: 2
  tests:
    - name: 'Test with model override'
      prompt: 'Say hello'
      expected_tool_calls:
        allowed: []
      response_scorers:
        - type: 'regex'
          pattern: '(hello|hi|greetings)'
`;

    // Write temporary test file
    const fs = await import('fs');
    const tempTestPath = path.resolve(process.cwd(), 'test/e2e/temp-eval-override-test.yaml');
    fs.writeFileSync(tempTestPath, testConfig);

    try {
      const testConfigData = ConfigLoader.loadTestConfig(tempTestPath);
      // Load server config from file
      const serverConfig = ConfigLoader.loadServerConfig(testServerConfigPath, 'test-server');
      const runner = new EvalTestRunner(testConfigData.evals!, {
        serverConfig,
      });

      const summary = await runner.run();

      expect(summary.total).toBe(1);
      expect(summary.passed).toBe(1);
      expect(summary.failed).toBe(0);
      expect(summary.results[0].model).toBe('claude-3-haiku-20240307');
    } finally {
      // Clean up temp file
      fs.unlinkSync(tempTestPath);
    }
  }, 45000);
});
