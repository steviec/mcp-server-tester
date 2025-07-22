/**
 * CLI test runner utility for executing mcp-tester commands in tests
 */

import { spawn } from 'child_process';
import path from 'path';

export interface CliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
}

export class CliRunner {
  private readonly cliPath: string;

  constructor() {
    // Path to the CLI entry point
    this.cliPath = path.resolve(process.cwd(), 'src/cli.ts');
  }

  /**
   * Execute a CLI command and return the result
   */
  async run(
    args: string[],
    options: {
      timeout?: number;
      cwd?: string;
      env?: Record<string, string>;
    } = {}
  ): Promise<CliResult> {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const { timeout = 10000, cwd = process.cwd(), env = {} } = options;

      const child = spawn('npx', ['tsx', this.cliPath, ...args], {
        cwd,
        env: { ...process.env, ...env },
        stdio: 'pipe',
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', data => {
        stdout += data.toString();
      });

      child.stderr?.on('data', data => {
        stderr += data.toString();
      });

      const timeoutHandle = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`CLI command timed out after ${timeout}ms`));
      }, timeout);

      child.on('close', exitCode => {
        clearTimeout(timeoutHandle);
        const duration = Date.now() - startTime;

        resolve({
          exitCode: exitCode || 0,
          stdout,
          stderr,
          duration,
        });
      });

      child.on('error', error => {
        clearTimeout(timeoutHandle);
        reject(error);
      });
    });
  }

  /**
   * Helper to run tools command
   */
  async tools(
    testFile: string,
    serverConfig: string,
    options: {
      serverName?: string;
      timeout?: number;
    } = {}
  ): Promise<CliResult> {
    const args = ['tools', testFile, '--server-config', serverConfig];

    if (options.serverName) {
      args.push('--server-name', options.serverName);
    }

    if (options.timeout) {
      args.push('--timeout', options.timeout.toString());
    }

    return this.run(args);
  }

  /**
   * Legacy helper for backward compatibility
   */
  async test(
    testFile: string,
    serverConfig: string,
    options: {
      serverName?: string;
      timeout?: number;
    } = {}
  ): Promise<CliResult> {
    return this.tools(testFile, serverConfig, options);
  }

  /**
   * Legacy helper for backward compatibility
   */
  async integration(
    testFile: string,
    serverConfig: string,
    options: {
      serverName?: string;
      timeout?: number;
    } = {}
  ): Promise<CliResult> {
    return this.tools(testFile, serverConfig, options);
  }

  /**
   * Helper to run evals command
   */
  async evals(
    testFile: string,
    serverConfig: string,
    options: {
      serverName?: string;
      timeout?: number;
    } = {}
  ): Promise<CliResult> {
    const args = ['evals', testFile, '--server-config', serverConfig];

    if (options.serverName) {
      args.push('--server-name', options.serverName);
    }

    if (options.timeout) {
      args.push('--timeout', options.timeout.toString());
    }

    return this.run(args);
  }

  /**
   * Helper to run compliance command
   */
  async compliance(
    serverConfig: string,
    options: {
      serverName?: string;
      timeout?: number;
      categories?: string;
      output?: string;
    } = {}
  ): Promise<CliResult> {
    const args = ['compliance', '--server-config', serverConfig];

    if (options.serverName) {
      args.push('--server-name', options.serverName);
    }

    if (options.timeout) {
      args.push('--timeout', options.timeout.toString());
    }

    if (options.categories) {
      args.push('--categories', options.categories);
    }

    if (options.output) {
      args.push('--output', options.output);
    }

    return this.run(args);
  }

  /**
   * Helper to get help text
   */
  async help(_command?: string): Promise<CliResult> {
    // Since we have a unified command now, just show general help
    const args = ['--help'];
    return this.run(args);
  }
}

/**
 * Create a new CLI runner instance
 */
export function createCliRunner(): CliRunner {
  return new CliRunner();
}
