/**
 * E2E tests for API functionality using CLI launch mode
 */

import { describe, test, expect } from 'vitest';
import { CapabilitiesTestRunner } from '../../../src/testing/capabilities/runner.js';
import { ConfigLoader } from '../../../src/config/loader.js';
import { getTestServerPath } from '../server-launcher.js';
import path from 'path';

describe.skip('API Tests - CLI Launch Mode', () => {
  const testServerPath = getTestServerPath();

  test('should launch server and discover tools via CLI mode', async () => {
    const testConfigPath = path.resolve(process.cwd(), 'test/fixtures/valid-capabilities.yaml');
    const config = ConfigLoader.loadTestConfig(testConfigPath);

    const runner = new CapabilitiesTestRunner(config.tools!, {
      serverCommand: 'node',
      serverArgs: testServerPath,
    });

    const summary = await runner.run();

    expect(summary.total).toBeGreaterThan(0);
    expect(summary.passed).toBe(summary.total);
    expect(summary.failed).toBe(0);
  }, 15000);

  test('should execute echo tool correctly via CLI launch mode', async () => {
    const toolsConfig = {
      expected_tool_list: ['echo'],
      tests: [
        {
          name: 'Echo test via CLI launch mode',
          calls: [
            {
              tool: 'echo',
              params: {
                message: 'Hello from CLI launch mode',
              },
              expect: {
                success: true,
                result: {
                  contains: 'Echo: Hello from CLI launch mode',
                },
              },
            },
          ],
        },
      ],
    };

    const runner = new CapabilitiesTestRunner(toolsConfig, {
      serverCommand: 'node',
      serverArgs: testServerPath,
    });

    const summary = await runner.run();

    expect(summary.total).toBe(1);
    expect(summary.passed).toBe(1);
    expect(summary.failed).toBe(0);
    expect(summary.results[0].name).toBe('Echo test via CLI launch mode');
    expect(summary.results[0].passed).toBe(true);
  }, 15000);

  test('should execute add tool correctly via CLI launch mode', async () => {
    const toolsConfig = {
      tests: [
        {
          name: 'Add numbers via CLI launch mode',
          calls: [
            {
              tool: 'add',
              params: {
                a: 42,
                b: 8,
              },
              expect: {
                success: true,
                result: {
                  contains: '42 + 8 = 50',
                },
              },
            },
          ],
        },
      ],
    };

    const runner = new CapabilitiesTestRunner(toolsConfig, {
      serverCommand: 'node',
      serverArgs: testServerPath,
    });

    const summary = await runner.run();

    expect(summary.total).toBe(1);
    expect(summary.passed).toBe(1);
    expect(summary.failed).toBe(0);
    expect(summary.results[0].name).toBe('Add numbers via CLI launch mode');
    expect(summary.results[0].passed).toBe(true);
  }, 15000);

  test('should execute multi-step workflow via CLI launch mode', async () => {
    const toolsConfig = {
      tests: [
        {
          name: 'Multi-step workflow via CLI launch mode',
          calls: [
            {
              tool: 'echo',
              params: {
                message: 'Step 1',
              },
              expect: {
                success: true,
                result: {
                  contains: 'Echo: Step 1',
                },
              },
            },
            {
              tool: 'add',
              params: {
                a: 10,
                b: 5,
              },
              expect: {
                success: true,
                result: {
                  contains: '10 + 5 = 15',
                },
              },
            },
            {
              tool: 'echo',
              params: {
                message: 'Step 3 complete',
              },
              expect: {
                success: true,
                result: {
                  contains: 'Echo: Step 3 complete',
                },
              },
            },
          ],
        },
      ],
    };

    const runner = new CapabilitiesTestRunner(toolsConfig, {
      serverCommand: 'node',
      serverArgs: testServerPath,
    });

    const summary = await runner.run();

    expect(summary.total).toBe(1);
    expect(summary.passed).toBe(1);
    expect(summary.failed).toBe(0);
    expect(summary.results[0].name).toBe('Multi-step workflow via CLI launch mode');
    expect(summary.results[0].passed).toBe(true);

    // Check that all tool calls were executed
    expect(summary.results[0].calls).toHaveLength(3);
    expect(summary.results[0].calls.every(call => call.success)).toBe(true);
  }, 15000);

  test('should handle CLI launch mode with environment variables', async () => {
    const toolsConfig = {
      tests: [
        {
          name: 'CLI launch with environment test',
          calls: [
            {
              tool: 'echo',
              params: {
                message: 'Environment test',
              },
              expect: {
                success: true,
                result: {
                  contains: 'Echo: Environment test',
                },
              },
            },
          ],
        },
      ],
    };

    const runner = new CapabilitiesTestRunner(toolsConfig, {
      serverCommand: 'node',
      serverArgs: testServerPath,
      serverEnv: 'NODE_ENV=test,TEST_VAR=value',
    });

    const summary = await runner.run();

    expect(summary.total).toBe(1);
    expect(summary.passed).toBe(1);
    expect(summary.failed).toBe(0);
  }, 15000);

  test('should handle invalid server command gracefully', async () => {
    const toolsConfig = {
      tests: [
        {
          name: 'Basic test',
          calls: [
            {
              tool: 'echo',
              params: { message: 'test' },
              expect: { success: true },
            },
          ],
        },
      ],
    };

    const runner = new CapabilitiesTestRunner(toolsConfig, {
      serverCommand: 'nonexistent-command',
      serverArgs: 'some-args',
    });

    await expect(runner.run()).rejects.toThrow(/Failed to connect to MCP server/);
  }, 15000);
});
