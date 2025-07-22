/**
 * E2E tests for API functionality using config file mode
 */

import { describe, beforeAll, afterAll, test, expect } from 'vitest';
import { CapabilitiesTestRunner } from '../../../src/commands/tools/runner.js';
import { ConfigLoader } from '../../../src/shared/config/loader.js';
import {
  TestServerLauncher,
  createTestServerLauncher,
  getTestServerConfigPath,
} from '../server-launcher.js';
import path from 'path';

describe('API Tests - Config Mode', () => {
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

  test('should connect to server via config file and discover tools', async () => {
    const testConfigPath = path.resolve(process.cwd(), 'test/fixtures/valid-capabilities.yaml');
    const config = ConfigLoader.loadTestConfig(testConfigPath);

    // Load server config from file
    const serverConfig = ConfigLoader.loadServerConfig(testServerConfigPath, 'test-server');
    const runner = new CapabilitiesTestRunner(config.tools!, {
      serverConfig,
    });

    const summary = await runner.run();

    expect(summary.total).toBeGreaterThan(0);
    expect(summary.passed).toBe(summary.total);
    expect(summary.failed).toBe(0);
  }, 15000);

  test('should execute echo tool correctly via config mode', async () => {
    const toolsConfig = {
      expected_tool_list: ['echo'],
      tests: [
        {
          name: 'Echo test via config mode',
          calls: [
            {
              tool: 'echo',
              params: {
                message: 'Hello from config mode',
              },
              expect: {
                success: true,
                result: {
                  contains: 'Echo: Hello from config mode',
                },
              },
            },
          ],
        },
      ],
    };

    // Load server config from file
    const serverConfig = ConfigLoader.loadServerConfig(testServerConfigPath, 'test-server');
    const runner = new CapabilitiesTestRunner(toolsConfig, {
      serverConfig,
    });

    const summary = await runner.run();

    expect(summary.total).toBe(1);
    expect(summary.passed).toBe(1);
    expect(summary.failed).toBe(0);
    expect(summary.results[0].name).toBe('Echo test via config mode');
    expect(summary.results[0].passed).toBe(true);
  }, 15000);

  test('should execute add tool correctly via config mode', async () => {
    const toolsConfig = {
      tests: [
        {
          name: 'Add numbers via config mode',
          calls: [
            {
              tool: 'add',
              params: {
                a: 15,
                b: 25,
              },
              expect: {
                success: true,
                result: {
                  contains: '15 + 25 = 40',
                },
              },
            },
          ],
        },
      ],
    };

    // Load server config from file
    const serverConfig = ConfigLoader.loadServerConfig(testServerConfigPath, 'test-server');
    const runner = new CapabilitiesTestRunner(toolsConfig, {
      serverConfig,
    });

    const summary = await runner.run();

    expect(summary.total).toBe(1);
    expect(summary.passed).toBe(1);
    expect(summary.failed).toBe(0);
    expect(summary.results[0].name).toBe('Add numbers via config mode');
    expect(summary.results[0].passed).toBe(true);
  }, 15000);

  test('should handle tool errors correctly via config mode', async () => {
    const toolsConfig = {
      tests: [
        {
          name: 'Error handling via config mode',
          calls: [
            {
              tool: 'echo',
              params: {}, // Missing required 'message' parameter
              expect: {
                success: false,
                error: {
                  contains: 'Missing required parameter',
                },
              },
            },
          ],
        },
      ],
    };

    // Load server config from file
    const serverConfig = ConfigLoader.loadServerConfig(testServerConfigPath, 'test-server');
    const runner = new CapabilitiesTestRunner(toolsConfig, {
      serverConfig,
    });

    const summary = await runner.run();

    expect(summary.total).toBe(1);
    expect(summary.passed).toBe(1);
    expect(summary.failed).toBe(0);
    expect(summary.results[0].name).toBe('Error handling via config mode');
    expect(summary.results[0].passed).toBe(true);
  }, 15000);

  test('should handle multi-server config and require server name', async () => {
    // Create a multi-server config
    const multiServerConfig = {
      mcpServers: {
        'server-1': {
          command: 'node',
          args: [path.resolve(process.cwd(), 'test/fixtures/mock-servers/test-mcp-server.js')],
        },
        'server-2': {
          command: 'node',
          args: [path.resolve(process.cwd(), 'test/fixtures/mock-servers/test-mcp-server.js')],
        },
      },
    };

    const fs = await import('fs');
    const tempConfigPath = path.resolve(process.cwd(), 'test/e2e/temp-multi-config.json');
    fs.writeFileSync(tempConfigPath, JSON.stringify(multiServerConfig, null, 2));

    const testConfigPath = path.resolve(process.cwd(), 'test/fixtures/valid-capabilities.yaml');

    try {
      const config = ConfigLoader.loadTestConfig(testConfigPath);

      // Should fail without server name
      await expect(() => ConfigLoader.loadServerConfig(tempConfigPath)).toThrow(
        'Multiple servers found'
      );

      // Should work with server name
      const serverConfig = ConfigLoader.loadServerConfig(tempConfigPath, 'server-1');
      const runnerWithName = new CapabilitiesTestRunner(config.tools!, {
        serverConfig,
      });

      const summary = await runnerWithName.run();
      expect(summary.total).toBeGreaterThan(0);
    } finally {
      // Clean up temp file
      fs.unlinkSync(tempConfigPath);
    }
  }, 15000);
});
