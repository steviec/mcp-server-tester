/**
 * E2E tests for API functionality using config file mode
 */

import { describe, beforeAll, afterAll, test, expect } from 'vitest';
import { IntegrationTestRunner } from '../../../src/testing/integration/runner.js';
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
    const testConfigPath = path.resolve(process.cwd(), 'test/fixtures/valid-integration.yaml');

    const runner = new IntegrationTestRunner(testConfigPath, {
      serverConfig: testServerConfigPath,
      serverName: 'test-server',
    });

    const summary = await runner.run();

    expect(summary.total).toBeGreaterThan(0);
    expect(summary.passed).toBe(summary.total);
    expect(summary.failed).toBe(0);
  }, 15000);

  test('should execute echo tool correctly via config mode', async () => {
    const testConfig = `
discovery:
  expect_tools: ['echo']
  validate_schemas: true

tests:
  - name: 'Echo test via config mode'
    calls:
      - tool: 'echo'
        params:
          message: 'Hello from config mode'
        expect:
          success: true
          result:
            contains: 'Echo: Hello from config mode'
`;

    // Write temporary test file
    const fs = await import('fs');
    const tempTestPath = path.resolve(process.cwd(), 'test/e2e/temp-config-test.yaml');
    fs.writeFileSync(tempTestPath, testConfig);

    try {
      const runner = new IntegrationTestRunner(tempTestPath, {
        serverConfig: testServerConfigPath,
        serverName: 'test-server',
      });

      const summary = await runner.run();

      expect(summary.total).toBe(1);
      expect(summary.passed).toBe(1);
      expect(summary.failed).toBe(0);
      expect(summary.results[0].name).toBe('Echo test via config mode');
      expect(summary.results[0].passed).toBe(true);
    } finally {
      // Clean up temp file
      fs.unlinkSync(tempTestPath);
    }
  }, 15000);

  test('should execute add tool correctly via config mode', async () => {
    const testConfig = `
tests:
  - name: 'Add numbers via config mode'
    calls:
      - tool: 'add'
        params:
          a: 15
          b: 25
        expect:
          success: true
          result:
            contains: '15 + 25 = 40'
`;

    // Write temporary test file
    const fs = await import('fs');
    const tempTestPath = path.resolve(process.cwd(), 'test/e2e/temp-add-test.yaml');
    fs.writeFileSync(tempTestPath, testConfig);

    try {
      const runner = new IntegrationTestRunner(tempTestPath, {
        serverConfig: testServerConfigPath,
        serverName: 'test-server',
      });

      const summary = await runner.run();

      expect(summary.total).toBe(1);
      expect(summary.passed).toBe(1);
      expect(summary.failed).toBe(0);
      expect(summary.results[0].name).toBe('Add numbers via config mode');
      expect(summary.results[0].passed).toBe(true);
    } finally {
      // Clean up temp file
      fs.unlinkSync(tempTestPath);
    }
  }, 15000);

  test('should handle tool errors correctly via config mode', async () => {
    const testConfig = `
tests:
  - name: 'Error handling via config mode'
    calls:
      - tool: 'echo'
        params: {}  # Missing required 'message' parameter
        expect:
          success: false
          error:
            contains: 'Missing required parameter'
`;

    // Write temporary test file
    const fs = await import('fs');
    const tempTestPath = path.resolve(process.cwd(), 'test/e2e/temp-error-test.yaml');
    fs.writeFileSync(tempTestPath, testConfig);

    try {
      const runner = new IntegrationTestRunner(tempTestPath, {
        serverConfig: testServerConfigPath,
        serverName: 'test-server',
      });

      const summary = await runner.run();

      expect(summary.total).toBe(1);
      expect(summary.passed).toBe(1);
      expect(summary.failed).toBe(0);
      expect(summary.results[0].name).toBe('Error handling via config mode');
      expect(summary.results[0].passed).toBe(true);
    } finally {
      // Clean up temp file
      fs.unlinkSync(tempTestPath);
    }
  }, 15000);

  test('should handle multi-server config and require server name', async () => {
    // Create a multi-server config
    const multiServerConfig = {
      mcpServers: {
        'server-1': {
          command: 'node',
          args: [path.resolve(process.cwd(), 'examples/test-server.js')],
        },
        'server-2': {
          command: 'node',
          args: [path.resolve(process.cwd(), 'examples/test-server.js')],
        },
      },
    };

    const fs = await import('fs');
    const tempConfigPath = path.resolve(process.cwd(), 'test/e2e/temp-multi-config.json');
    fs.writeFileSync(tempConfigPath, JSON.stringify(multiServerConfig, null, 2));

    const testConfigPath = path.resolve(process.cwd(), 'test/fixtures/valid-integration.yaml');

    try {
      // Should fail without server name
      const runnerWithoutName = new IntegrationTestRunner(testConfigPath, {
        serverConfig: tempConfigPath,
      });

      await expect(runnerWithoutName.run()).rejects.toThrow('Multiple servers found');

      // Should work with server name
      const runnerWithName = new IntegrationTestRunner(testConfigPath, {
        serverConfig: tempConfigPath,
        serverName: 'server-1',
      });

      const summary = await runnerWithName.run();
      expect(summary.total).toBeGreaterThan(0);
    } finally {
      // Clean up temp file
      fs.unlinkSync(tempConfigPath);
    }
  }, 15000);
});
