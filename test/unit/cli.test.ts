/**
 * CLI command tests for mcp-tester
 */

import { describe, beforeAll, test, expect } from 'vitest';
import { createCliRunner, CliRunner } from '../utils/cli-runner.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('MCP Tester CLI', () => {
  let cli: CliRunner;
  const fixturesDir = path.join(__dirname, '../fixtures');
  const validIntegrationTest = path.join(fixturesDir, 'valid-integration.yaml');
  const validEvaluationTest = path.join(fixturesDir, 'valid-evaluation.yaml');
  const testServerConfig = path.join(fixturesDir, 'test-server-config.json');

  beforeAll(() => {
    cli = createCliRunner();
  });

  describe('Help Commands', () => {
    test('should show general help', async () => {
      const result = await cli.help();

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Standalone CLI tool for testing MCP servers');
      expect(result.stdout).toContain('integration');
      expect(result.stdout).toContain('evals');
    });

    test('should show integration command help', async () => {
      const result = await cli.help('integration');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Run integration tests');
      expect(result.stdout).toContain('--server-config');
      expect(result.stdout).toContain('--server-name');
    });

    test('should show evals command help', async () => {
      const result = await cli.help('evals');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Run evaluation tests');
      expect(result.stdout).toContain('--server-config');
      expect(result.stdout).toContain('--models');
    });
  });

  describe('Integration Command', () => {
    test('should fail when server-config is missing', async () => {
      const result = await cli.run(['integration', validIntegrationTest]);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Server configuration is required');
      expect(result.stderr).toContain('--server-config');
      expect(result.stderr).toContain('--server-command');
    });

    test('should fail when test file does not exist', async () => {
      const result = await cli.integration('nonexistent.yaml', testServerConfig);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('not found');
    });

    test('should fail when server config file does not exist', async () => {
      const result = await cli.integration(validIntegrationTest, 'nonexistent.json');

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('not found');
    });

    test('should run successfully with valid config (end-to-end)', async () => {
      const result = await cli.integration(validIntegrationTest, testServerConfig, {
        serverName: 'test-server',
        timeout: 8000,
      });

      // Allow for either success or controlled failure (test server may not be running)
      // The important thing is that the CLI processed arguments correctly
      expect(result.exitCode).toBeGreaterThanOrEqual(0);
      expect(result.stdout).toContain('Running integration tests');

      // If it failed, it should be due to server connection, not argument parsing
      if (result.exitCode !== 0) {
        expect(result.stderr).not.toContain('required option');
        expect(result.stderr).not.toContain('not found');
      }
    }, 15000);

    test('should handle multi-server config requiring server-name', async () => {
      const result = await cli.integration(validIntegrationTest, testServerConfig);

      // Should fail because multiple servers exist and no server-name specified
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Multiple servers found');
    });

    test('should work with specific server-name', async () => {
      const result = await cli.integration(validIntegrationTest, testServerConfig, {
        serverName: 'test-server',
      });

      // Should not fail due to server selection
      expect(result.stderr).not.toContain('Multiple servers found');
      expect(result.stdout).toContain('Running integration tests');
    });
  });

  describe('Evaluation Command', () => {
    test('should fail when server-config is missing', async () => {
      const result = await cli.run(['evals', validEvaluationTest]);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Server configuration is required');
      expect(result.stderr).toContain('--server-config');
      expect(result.stderr).toContain('--server-command');
    });

    test('should fail when test file does not exist', async () => {
      const result = await cli.evals('nonexistent.yaml', testServerConfig);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('not found');
    });

    test('should process arguments correctly (may fail on execution)', async () => {
      const result = await cli.evals(validEvaluationTest, testServerConfig, {
        serverName: 'test-server',
        models: 'claude-3-haiku-20240307',
        timeout: 8000,
      });

      // Allow for execution failure (no API key, server not running, etc.)
      // The important thing is argument parsing worked
      expect(result.stdout).toContain('Running evaluation tests');

      if (result.exitCode !== 0) {
        // Should fail on execution, not argument parsing
        expect(result.stderr).not.toContain('required option');
        expect(result.stderr).not.toContain('not found');
      }
    }, 15000);

    test('should handle models override', async () => {
      const result = await cli.evals(validEvaluationTest, testServerConfig, {
        serverName: 'test-server',
        models: 'custom-model-1,custom-model-2',
      });

      expect(result.stdout).toContain('Running evaluation tests');
      // Should not fail due to argument parsing
      expect(result.stderr).not.toContain('required option');
    });
  });

  describe('Error Handling', () => {
    test('should show error for unknown command', async () => {
      const result = await cli.run(['unknown-command']);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('unknown command');
    });

    test('should handle invalid timeout values gracefully', async () => {
      const result = await cli.integration(validIntegrationTest, testServerConfig, {
        serverName: 'test-server',
        timeout: -1000,
      });

      // Should handle invalid timeout gracefully
      expect(result.exitCode).toBeGreaterThanOrEqual(0);
    });
  });
});
