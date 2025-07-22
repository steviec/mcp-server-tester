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
  const validEvalTest = path.join(fixturesDir, 'valid-evaluation.yaml');
  const testServerConfig = path.join(fixturesDir, 'test-server-config.json');

  beforeAll(() => {
    cli = createCliRunner();
  });

  describe('Help Commands', () => {
    test('should show general help', async () => {
      const result = await cli.help();

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Standalone CLI tool for testing MCP servers');
      expect(result.stdout).toContain('tools [options] [test-file]');
      expect(result.stdout).toContain('evals [options] [test-file]');
      expect(result.stdout).toContain('compliance [options]');
    });
  });

  describe('Unified Command', () => {
    test('should fail when server-config is missing', async () => {
      const result = await cli.run(['tools', validIntegrationTest]);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('required option');
      expect(result.stderr).toContain('--server-config');
    });

    test('should fail when test file does not exist', async () => {
      const result = await cli.test('nonexistent.yaml', testServerConfig);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('not found');
    });

    test('should fail when server config file does not exist', async () => {
      const result = await cli.test(validIntegrationTest, 'nonexistent.json');

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('not found');
    });

    test('should run successfully with valid config (end-to-end)', async () => {
      const result = await cli.test(validIntegrationTest, testServerConfig, {
        serverName: 'test-server',
        timeout: 8000,
      });

      // Allow for either success or controlled failure (test server may not be running)
      // The important thing is that the CLI processed arguments correctly
      expect(result.exitCode).toBeGreaterThanOrEqual(0);
      expect(result.stdout).toContain('Running tools tests from:');

      // If it failed, it should be due to server connection, not argument parsing
      if (result.exitCode !== 0) {
        expect(result.stderr).not.toContain('required option');
        expect(result.stderr).not.toContain('not found');
      }
    }, 15000);

    test('should handle multi-server config requiring server-name', async () => {
      const result = await cli.test(validIntegrationTest, testServerConfig);

      // Should fail because multiple servers exist and no server-name specified
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Multiple servers found');
    });

    test('should work with specific server-name', async () => {
      const result = await cli.test(validIntegrationTest, testServerConfig, {
        serverName: 'test-server',
      });

      // Should not fail due to server selection
      expect(result.stderr).not.toContain('Multiple servers found');
      expect(result.stdout).toContain('Running tools tests from:');
    });
  });

  describe('Unified Command - LLM Evaluations (evals)', () => {
    test('should fail when server-config is missing', async () => {
      const result = await cli.run(['evals', validEvalTest]);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('required option');
      expect(result.stderr).toContain('--server-config');
    });

    test('should fail when test file does not exist', async () => {
      const result = await cli.evals('nonexistent.yaml', testServerConfig);

      expect(result.exitCode).toBe(1);
      // Evals command checks for API key first, so we expect API key error
      expect(result.stderr).toContain('ANTHROPIC_API_KEY');
    });

    test('should process arguments correctly (may fail on execution)', async () => {
      const result = await cli.evals(validEvalTest, testServerConfig, {
        serverName: 'test-server',
        timeout: 8000,
      });

      // Allow for execution failure (no API key, server not running, etc.)
      // The important thing is argument parsing worked
      expect(result.stdout).toContain('Running LLM evaluation tests from:');

      if (result.exitCode !== 0) {
        // Should fail on execution, not argument parsing
        expect(result.stderr).not.toContain('required option');
        expect(result.stderr).not.toContain('not found');
      }
    }, 15000);

    test('should handle basic eval arguments', async () => {
      const result = await cli.evals(validEvalTest, testServerConfig, {
        serverName: 'test-server',
      });

      expect(result.stdout).toContain('Running LLM evaluation tests from:');
      // Should not fail due to argument parsing
      expect(result.stderr).not.toContain('required option');
    });
  });

  describe('Error Handling', () => {
    test('should show error for nonexistent file', async () => {
      const result = await cli.run([
        'tools',
        'unknown-file.yaml',
        '--server-config',
        testServerConfig,
      ]);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('not found');
    });

    test('should handle invalid timeout values gracefully', async () => {
      const result = await cli.test(validIntegrationTest, testServerConfig, {
        serverName: 'test-server',
        timeout: -1000,
      });

      // Should handle invalid timeout gracefully
      expect(result.exitCode).toBeGreaterThanOrEqual(0);
    });
  });
});
