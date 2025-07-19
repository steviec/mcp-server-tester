/**
 * E2E tests for evaluation functionality using CLI launch mode
 */

import { describe, test, expect } from 'vitest';
import { EvalTestRunner } from '../../../src/verify/evals/runner.js';
import { ConfigLoader } from '../../../src/config/loader.js';
import { getTestServerPath } from '../server-launcher.js';
import path from 'path';

describe.skipIf(!process.env.ANTHROPIC_API_KEY)('Eval Tests - CLI Launch Mode', () => {
  const testServerPath = getTestServerPath();

  test('should launch server and run basic evaluation via CLI mode', async () => {
    const testConfig = `
evals:
  models: ['claude-3-haiku-20240307']
  timeout: 30000
  max_steps: 2
  tests:
    - name: 'Lists available tools via CLI launch mode'
      prompt: 'What tools are available? Please list them without using any tools.'
      expected_tool_calls:
        allowed: []  # Should not call any tools, just list them
      response_scorers:
        - type: 'regex'
          pattern: '(echo|add|tool|function|available)'
`;

    // Write temporary test file
    const fs = await import('fs');
    const tempTestPath = path.resolve(process.cwd(), 'test/e2e/temp-eval-cli-test.yaml');
    fs.writeFileSync(tempTestPath, testConfig);

    try {
      const testConfigData = ConfigLoader.loadTestConfig(tempTestPath);
      const serverConfig = {
        command: 'node',
        args: [testServerPath],
      };
      const runner = new EvalTestRunner(testConfigData.evals!, {
        serverConfig,
      });

      const summary = await runner.run();

      expect(summary.total).toBe(1);
      expect(summary.passed).toBe(1);
      expect(summary.failed).toBe(0);
      expect(summary.results[0].name).toBe('Lists available tools via CLI launch mode');
      expect(summary.results[0].passed).toBe(true);
      expect(summary.results[0].model).toBe('claude-3-haiku-20240307');
    } finally {
      // Clean up temp file
      fs.unlinkSync(tempTestPath);
    }
  }, 45000);

  test('should execute tool call evaluation via CLI launch mode', async () => {
    const testConfig = `
evals:
  models: ['claude-3-haiku-20240307']
  timeout: 30000
  max_steps: 3
  tests:
    - name: 'Uses echo tool correctly via CLI launch mode'
      prompt: 'Please echo the message "Hello from CLI launch eval test"'
      expected_tool_calls:
        required: ['echo']
      response_scorers:
        - type: 'regex'
          pattern: 'Hello from CLI launch eval test'
        - type: 'llm-judge'
          criteria: 'Did the assistant successfully echo the requested message using the echo tool?'
          threshold: 0.7
`;

    // Write temporary test file
    const fs = await import('fs');
    const tempTestPath = path.resolve(process.cwd(), 'test/e2e/temp-eval-cli-echo-test.yaml');
    fs.writeFileSync(tempTestPath, testConfig);

    try {
      const testConfigData = ConfigLoader.loadTestConfig(tempTestPath);
      const serverConfig = {
        command: 'node',
        args: [testServerPath],
      };
      const runner = new EvalTestRunner(testConfigData.evals!, {
        serverConfig,
      });

      const summary = await runner.run();

      expect(summary.total).toBe(1);
      expect(summary.passed).toBe(1);
      expect(summary.failed).toBe(0);
      expect(summary.results[0].name).toBe('Uses echo tool correctly via CLI launch mode');
      expect(summary.results[0].passed).toBe(true);
    } finally {
      // Clean up temp file
      fs.unlinkSync(tempTestPath);
    }
  }, 45000);

  test('should handle complex math evaluation via CLI launch mode', async () => {
    const testConfig = `
evals:
  models: ['claude-3-haiku-20240307']
  timeout: 30000
  max_steps: 5
  tests:
    - name: 'Solves complex math via CLI launch mode'
      prompt: 'Please use the add tool to calculate the sum of 127 and 384, then use the echo tool to output the result with "The answer is: " prefix'
      expected_tool_calls:
        required: ['add', 'echo']
      response_scorers:
        - type: 'regex'
          pattern: '(511|127.*384|The answer is)'
        - type: 'llm-judge'
          criteria: 'Did the assistant correctly add 127 and 384 to get 511, then echo the result with the requested prefix?'
          threshold: 0.8
`;

    // Write temporary test file
    const fs = await import('fs');
    const tempTestPath = path.resolve(process.cwd(), 'test/e2e/temp-eval-cli-complex-test.yaml');
    fs.writeFileSync(tempTestPath, testConfig);

    try {
      const testConfigData = ConfigLoader.loadTestConfig(tempTestPath);
      const serverConfig = {
        command: 'node',
        args: [testServerPath],
      };
      const runner = new EvalTestRunner(testConfigData.evals!, {
        serverConfig,
      });

      const summary = await runner.run();

      expect(summary.total).toBe(1);
      expect(summary.passed).toBe(1);
      expect(summary.failed).toBe(0);
      expect(summary.results[0].name).toBe('Solves complex math via CLI launch mode');
      expect(summary.results[0].passed).toBe(true);
    } finally {
      // Clean up temp file
      fs.unlinkSync(tempTestPath);
    }
  }, 60000);

  test('should handle restricted tool usage via CLI launch mode', async () => {
    const testConfig = `
evals:
  models: ['claude-3-haiku-20240307']
  timeout: 30000
  max_steps: 3
  tests:
    - name: 'Restricted to echo only via CLI launch mode'
      prompt: 'Please add 5 and 3, but you can only use the echo tool to respond'
      expected_tool_calls:
        allowed: ['echo']  # Only echo allowed, add is prohibited
      response_scorers:
        - type: 'regex'
          pattern: '(8|five.*three|5.*3|cannot|can.*t|unable)'
        - type: 'llm-judge'
          criteria: 'Did the assistant recognize the restriction and either calculate mentally or explain the limitation?'
          threshold: 0.6
`;

    // Write temporary test file
    const fs = await import('fs');
    const tempTestPath = path.resolve(process.cwd(), 'test/e2e/temp-eval-cli-restricted-test.yaml');
    fs.writeFileSync(tempTestPath, testConfig);

    try {
      const testConfigData = ConfigLoader.loadTestConfig(tempTestPath);
      const serverConfig = {
        command: 'node',
        args: [testServerPath],
      };
      const runner = new EvalTestRunner(testConfigData.evals!, {
        serverConfig,
      });

      const summary = await runner.run();

      expect(summary.total).toBe(1);
      expect(summary.passed).toBe(1);
      expect(summary.failed).toBe(0);
      expect(summary.results[0].name).toBe('Restricted to echo only via CLI launch mode');
      expect(summary.results[0].passed).toBe(true);
    } finally {
      // Clean up temp file
      fs.unlinkSync(tempTestPath);
    }
  }, 45000);

  test('should handle CLI launch with environment variables in eval mode', async () => {
    const testConfig = `
evals:
  models: ['claude-3-haiku-20240307']
  timeout: 30000
  max_steps: 2
  tests:
    - name: 'CLI launch with env vars in eval mode'
      prompt: 'Please echo "Environment test successful"'
      expected_tool_calls:
        required: ['echo']
      response_scorers:
        - type: 'regex'
          pattern: 'Environment test successful'
`;

    // Write temporary test file
    const fs = await import('fs');
    const tempTestPath = path.resolve(process.cwd(), 'test/e2e/temp-eval-cli-env-test.yaml');
    fs.writeFileSync(tempTestPath, testConfig);

    try {
      const testConfigData = ConfigLoader.loadTestConfig(tempTestPath);
      const serverConfig = {
        command: 'node',
        args: [testServerPath],
        env: { NODE_ENV: 'test', EVAL_TEST: 'true' },
      };
      const runner = new EvalTestRunner(testConfigData.evals!, {
        serverConfig,
      });

      const summary = await runner.run();

      expect(summary.total).toBe(1);
      expect(summary.passed).toBe(1);
      expect(summary.failed).toBe(0);
    } finally {
      // Clean up temp file
      fs.unlinkSync(tempTestPath);
    }
  }, 45000);
});
