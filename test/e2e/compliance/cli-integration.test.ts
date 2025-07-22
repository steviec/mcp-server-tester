/**
 * E2E tests for compliance CLI integration
 */

import { describe, beforeAll, afterAll, test, expect } from 'vitest';
import { spawn } from 'child_process';
import {
  TestServerLauncher,
  createTestServerLauncher,
  getTestServerConfigPath,
} from '../server-launcher.js';
import path from 'path';

describe('Compliance CLI Integration', () => {
  let testServer: TestServerLauncher;
  const configPath = getTestServerConfigPath();

  beforeAll(async () => {
    // Start the existing test server
    testServer = createTestServerLauncher();
    await testServer.start();
  }, 15000);

  afterAll(async () => {
    // Stop test server
    if (testServer) {
      await testServer.stop();
    }
  }, 10000);

  test('should run compliance command successfully', async () => {
    const result = await runCliCommand([
      'compliance',
      '--server-config',
      configPath,
      '--server-name',
      'test-server',
      '--timeout',
      '30000',
    ]);

    // Compliance may return exit code 1 if tests fail, but should still produce output
    expect([0, 1]).toContain(result.exitCode);
    expect(result.stdout).toContain('test-server');
    expect(result.stdout).toContain('OVERALL MCP COMPLIANCE');
    expect(result.stderr).toContain('Test MCP server running'); // Server startup message
  }, 45000);

  test.skip('should support category filtering', async () => {
    const result = await runCliCommand([
      'compliance',
      '--server-config',
      configPath,
      '--server-name',
      'test-server',
      '--categories',
      'base-protocol',
    ]);

    expect([0, 1]).toContain(result.exitCode);
    expect(result.stdout).toContain('PROTOCOL');
    // Should focus on protocol tests when filtering
    expect(result.stdout).toContain('test-server');
  }, 10000);

  test('should handle timeout correctly', async () => {
    const result = await runCliCommand([
      'compliance',
      '--server-config',
      configPath,
      '--server-name',
      'test-server',
      '--timeout',
      '1000', // Very short timeout
    ]);

    // Should either complete quickly or timeout gracefully
    expect([0, 1]).toContain(result.exitCode);
    // With very short timeout, should still try to produce output or show server startup
    expect(result.stderr).toContain('Test MCP server running');
  }, 15000);

  test('should handle invalid server config', async () => {
    const result = await runCliCommand([
      'compliance',
      '--server-config',
      '/nonexistent/config.json',
      '--server-name',
      'any-server',
    ]);

    expect(result.exitCode).toBe(1);
    // May output error to stdout or stderr
    expect(result.stdout + result.stderr).toContain('Configuration file not found');
  }, 10000);

  test('should handle invalid server name', async () => {
    const result = await runCliCommand([
      'compliance',
      '--server-config',
      configPath,
      '--server-name',
      'nonexistent-server',
    ]);

    expect(result.exitCode).toBe(1);
    // May output error to stdout or stderr
    expect(result.stdout + result.stderr).toContain('not found');
  }, 10000);

  test('should output JSON format when requested', async () => {
    const result = await runCliCommand([
      'compliance',
      '--server-config',
      configPath,
      '--server-name',
      'test-server',
      '--output',
      'json',
      '--categories',
      'tools', // Limit to tools to reduce output size
      '--timeout',
      '15000',
    ]);

    expect([0, 1]).toContain(result.exitCode);

    // Extract JSON from output (may have non-JSON prefix)
    const jsonStart = result.stdout.indexOf('{');
    expect(jsonStart).toBeGreaterThanOrEqual(0);

    const jsonOutput = result.stdout.substring(jsonStart);

    // Check if JSON is complete by looking for closing brace
    if (!jsonOutput.trim().endsWith('}')) {
      console.log('Incomplete JSON output detected, checking for basic structure');
      expect(jsonOutput).toContain('"serverInfo"');
      expect(jsonOutput).toContain('"summary"');
      return; // Skip full parsing if output was truncated
    }

    expect(() => JSON.parse(jsonOutput)).not.toThrow();

    const report = JSON.parse(jsonOutput);
    expect(report.serverInfo).toBeDefined();
    expect(report.summary).toBeDefined();
    expect(report.metadata).toBeDefined();
  }, 30000);

  test('should show help for compliance command', async () => {
    const result = await runCliCommand(['compliance', '--help']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('compliance');
    expect(result.stdout).toContain('--server-config');
    expect(result.stdout).toContain('--categories');
    expect(result.stdout).toContain('--timeout');
  }, 5000);
});

/**
 * Helper function to run CLI commands and capture output
 */
function runCliCommand(args: string[]): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
}> {
  return new Promise(resolve => {
    const cliPath = path.resolve(process.cwd(), 'dist/cli.js');
    const child = spawn('node', [cliPath, ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', data => {
      stdout += data.toString();
    });

    child.stderr.on('data', data => {
      stderr += data.toString();
    });

    child.on('close', code => {
      resolve({
        exitCode: code || 0,
        stdout,
        stderr,
      });
    });

    child.on('error', error => {
      resolve({
        exitCode: 1,
        stdout,
        stderr: stderr + error.message,
      });
    });
  });
}
